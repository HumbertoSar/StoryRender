"use client";

import { CopilotKit, useCopilotAction } from "@copilotkit/react-core";
import { CopilotChat } from "@copilotkit/react-ui";
import "@copilotkit/react-ui/styles.css";

import { EspinhaColuna } from "@/components/EspinhaColuna";
import { PropostaCard } from "@/components/PropostaCard";
import { ProtagonistaCard } from "@/components/ProtagonistaCard";
import { useRoteiro, type CampoProtagonista } from "@/lib/useRoteiro";

function Quadro() {
  // Estado compartilhado com o grafo LangGraph: chega via STATE_SNAPSHOT
  // (AG-UI) depois do primeiro turno; antes disso, roteiro é null.
  const { state, salvarCampoProtagonista } = useRoteiro();

  // HITL: o agente propõe conteúdo de campo e ESPERA a decisão — o card
  // renderiza no chat e o respond() devolve o resultado pro agente.
  useCopilotAction({
    name: "propor_campo",
    description:
      "Propõe um texto para um campo do protagonista (want, need ou aposta). " +
      "O usuário aceita ou rejeita; você recebe a decisão como resultado.",
    parameters: [
      {
        name: "campo",
        type: "string",
        description: "Qual campo: want, need ou aposta",
        required: true,
      },
      {
        name: "valor",
        type: "string",
        description: "O texto proposto para o campo",
        required: true,
      },
      {
        name: "justificativa",
        type: "string",
        description: "Por que essa proposta funciona dramaticamente (1 frase)",
        required: false,
      },
    ],
    renderAndWaitForResponse: ({ args, respond, status }) => (
      <PropostaCard
        campo={args.campo as CampoProtagonista}
        valor={(args.valor as string) ?? ""}
        justificativa={args.justificativa as string | undefined}
        respond={respond}
        status={status}
      />
    ),
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
