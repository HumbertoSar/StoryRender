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
  },
});

export const POST = async (req: NextRequest) => {
  const { handleRequest } = copilotRuntimeNextJSAppRouterEndpoint({
    runtime,
    serviceAdapter: new ExperimentalEmptyAdapter(),
    endpoint: "/api/copilotkit",
  });
  return handleRequest(req);
};
