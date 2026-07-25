import { NextRequest } from "next/server";
import {
  CopilotRuntime,
  ExperimentalEmptyAdapter,
  copilotRuntimeNextJSAppRouterEndpoint,
} from "@copilotkit/runtime";
import { LangGraphHttpAgent } from "@ag-ui/langgraph";

// Ponte AG-UI: todo o LLM roda no agente Python (agent/, porta 8000);
// por isso o service adapter é o vazio — o runtime só repassa eventos.
const runtime = new CopilotRuntime({
  agents: {
    story_agent: new LangGraphHttpAgent({
      url: process.env.AGENT_URL ?? "http://127.0.0.1:8000/agent",
    }),
    // Método McKee Inspired: agente Tutor, endpoint próprio no mesmo servidor
    // Python. O id do agente é a PERSONA (tutor), não o método — por isso ele
    // não mudou junto com o rename.
    tutor_agent: new LangGraphHttpAgent({
      url: process.env.AGENT_TUTOR_URL ?? "http://127.0.0.1:8000/agent-tutor",
    }),
  },
  // Nível declarative: liga o middleware A2UI (converte as operações emitidas
  // pelo agente em activities `a2ui-surface` que o chat v2 renderiza).
  a2ui: {},
});

export const POST = async (req: NextRequest) => {
  const { handleRequest } = copilotRuntimeNextJSAppRouterEndpoint({
    runtime,
    serviceAdapter: new ExperimentalEmptyAdapter(),
    endpoint: "/api/copilotkit",
  });
  return handleRequest(req);
};
