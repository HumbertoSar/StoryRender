import { NextRequest } from "next/server";
import {
  CopilotRuntime,
  ExperimentalEmptyAdapter,
  copilotRuntimeNextJSAppRouterEndpoint,
} from "@copilotkit/runtime";
import { LangGraphHttpAgent } from "@ag-ui/langgraph";

// Runtime SEPARADO do /api/copilotkit de propósito, e não um agente a mais lá.
//
// `openGenerativeUI` é um flag GLOBAL do runtime: o /info devolve
// `openGenerativeUIEnabled: !!runtime.openGenerativeUI` sem quebra por agente
// (o A2UI, no mesmo objeto, exporta `agents` — este não). O <CopilotKit> lê
// esse booleano e registra a frontend tool `generateSandboxedUi` para QUALQUER
// página apontada nesse runtimeUrl. Como o nó do trilho McKee binda cegamente
// o que chega em state["tools"], ligar aqui daria ao story_agent congelado uma
// capacidade que ninguém pediu. Doze linhas de arquivo próprio compram
// isolamento completo.
const runtime = new CopilotRuntime({
  agents: {
    mckee_mini: new LangGraphHttpAgent({
      url: process.env.AGENT_MINI_URL ?? "http://127.0.0.1:8000/agent-mini",
    }),
  },
  // Nível open-ended: instala o middleware que varre o stream procurando a tool
  // `generateSandboxedUi` e transcodifica os argumentos ENQUANTO streamam em
  // activities `open-generative-ui` — é daí que sai a pintura progressiva.
  openGenerativeUI: {},
});

export const POST = async (req: NextRequest) => {
  const { handleRequest } = copilotRuntimeNextJSAppRouterEndpoint({
    runtime,
    serviceAdapter: new ExperimentalEmptyAdapter(),
    endpoint: "/api/copilotkit-mini",
  });
  return handleRequest(req);
};
