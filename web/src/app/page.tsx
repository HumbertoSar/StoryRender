"use client";

import { CopilotKit, useCoAgent } from "@copilotkit/react-core";
import { CopilotChat } from "@copilotkit/react-ui";
import "@copilotkit/react-ui/styles.css";

import { EspinhaColuna } from "@/components/EspinhaColuna";
import { ProtagonistaCard } from "@/components/ProtagonistaCard";
import type { AgentState } from "@/lib/roteiro";

function Quadro() {
  // Estado compartilhado com o grafo LangGraph: chega via STATE_SNAPSHOT
  // (AG-UI) depois do primeiro turno; antes disso, roteiro é null.
  const { state, setState } = useCoAgent<AgentState>({
    name: "story_agent",
    initialState: { roteiro: null },
  });

  const protagonista = state.roteiro?.assets?.protagonistas?.[0];

  // Volta do ciclo (quadro → agente): setState grava no estado compartilhado
  // e o CopilotKit envia esse estado junto do próximo turno.
  const salvarCampoProtagonista = (campo: string, valor: string) => {
    if (!state.roteiro) return;
    const roteiro = structuredClone(state.roteiro);
    const prot = roteiro.assets.protagonistas[0];
    roteiro.assets.protagonistas[0] = {
      ...prot,
      [campo]: valor,
      status: prot.status === "vazio" ? "rascunho" : prot.status,
    };
    setState({ ...state, roteiro });
  };

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
      <div style={{ display: "flex", gap: 24, alignItems: "flex-start" }}>
        {state.roteiro && <EspinhaColuna espinha={state.roteiro.espinha} />}
        {protagonista && (
          <ProtagonistaCard protagonista={protagonista} onSalvar={salvarCampoProtagonista} />
        )}
      </div>
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
