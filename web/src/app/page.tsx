"use client";

import { CopilotKit, useCoAgent } from "@copilotkit/react-core";
import { CopilotChat } from "@copilotkit/react-ui";
import "@copilotkit/react-ui/styles.css";

import { ProtagonistaCard } from "@/components/ProtagonistaCard";
import type { AgentState } from "@/lib/roteiro";

function Quadro() {
  // Estado compartilhado com o grafo LangGraph: chega via STATE_SNAPSHOT
  // (AG-UI) depois do primeiro turno; antes disso, roteiro é null.
  const { state } = useCoAgent<AgentState>({
    name: "story_agent",
    initialState: { roteiro: null },
  });

  const protagonista = state.roteiro?.assets?.protagonistas?.[0];

  return (
    <div style={{ flex: 1, padding: 24, overflowY: "auto" }}>
      <h1 style={{ fontSize: 18, marginBottom: 4 }}>
        {state.roteiro?.titulo || "Sem título"}
      </h1>
      <div style={{ fontSize: 12, color: "#888", marginBottom: 16 }}>
        {state.roteiro
          ? `template ${state.roteiro.template} · fase ${state.roteiro.fase_atual}`
          : "aguardando o primeiro turno do agente…"}
      </div>
      {protagonista && <ProtagonistaCard protagonista={protagonista} />}
    </div>
  );
}

export default function Home() {
  return (
    <CopilotKit runtimeUrl="/api/copilotkit" agent="story_agent">
      <main style={{ height: "100vh", display: "flex" }}>
        <Quadro />
        <div style={{ width: 420, borderLeft: "1px solid #ddd", height: "100%" }}>
          <CopilotChat
            labels={{
              title: "Story Render",
              initial: "Fase 1: o roteiro agora é estado compartilhado agente↔quadro.",
            }}
          />
        </div>
      </main>
    </CopilotKit>
  );
}
