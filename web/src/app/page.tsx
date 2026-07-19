"use client";

import { CopilotKit, useCopilotAction } from "@copilotkit/react-core";
import { CopilotChat } from "@copilotkit/react-ui";
import "@copilotkit/react-ui/styles.css";

import { EspinhaColuna } from "@/components/EspinhaColuna";
import { CartaoAsset } from "@/components/CartaoAsset";
import { DiagnosticoCard, type ItemDiagnostico } from "@/components/DiagnosticoCard";
import { PropostaCard } from "@/components/PropostaCard";
import { CARTOES, type AssetId } from "@/lib/cartoes";
import { useRoteiro } from "@/lib/useRoteiro";

function Quadro() {
  // Estado compartilhado com o grafo LangGraph: chega via STATE_SNAPSHOT
  // (AG-UI) depois do primeiro turno; antes disso, roteiro é null.
  const { state, lerAsset, salvarCampo } = useRoteiro();

  // HITL: o agente propõe conteúdo de campo e ESPERA a decisão — o card
  // renderiza no chat e o respond() devolve o resultado pro agente.
  useCopilotAction({
    name: "propor_campo",
    description:
      "Propõe um texto para um campo de texto de um cartão do roteiro. " +
      "O usuário aceita ou rejeita; você recebe a decisão como resultado.",
    parameters: [
      {
        name: "asset",
        type: "string",
        description:
          "Qual cartão: protagonistas, antagonista, ideia_controladora, mundo ou genero",
        required: true,
      },
      {
        name: "campo",
        type: "string",
        description: "A chave do campo dentro do cartão (ex.: want, fonte_oposicao, valor, epoca, promessa)",
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
        asset={args.asset as AssetId}
        campo={(args.campo as string) ?? ""}
        valor={(args.valor as string) ?? ""}
        justificativa={args.justificativa as string | undefined}
        respond={respond}
        status={status}
      />
    ),
  });

  // Modo Diagnóstico: o agente roda os testes de coerência e entrega o
  // resultado como UI (lista renderizada no chat), não como prosa.
  useCopilotAction({
    name: "mostrar_diagnostico",
    description:
      "Exibe o resultado do diagnóstico de coerência como lista visual. " +
      "Chame com a lista de problemas encontrados (vazia se não houver).",
    parameters: [
      {
        name: "itens",
        type: "object[]",
        description: "Problemas encontrados nos testes de coerência",
        attributes: [
          { name: "campo", type: "string", description: "Campo/cartão afetado" },
          { name: "problema", type: "string", description: "Descrição objetiva do problema" },
          {
            name: "severidade",
            type: "string",
            description: "aviso ou critico",
          },
        ],
      },
    ],
    // handler trivial: sem ele (ou renderAndWait/available) o CopilotKit
    // rejeita a action ("Invalid action configuration") — render puro não basta.
    handler: async () => "diagnóstico exibido para o usuário",
    render: ({ args }) => <DiagnosticoCard itens={(args.itens as ItemDiagnostico[]) ?? []} />,
  });

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
        <div style={{ display: "flex", flexWrap: "wrap", gap: 16, flex: 1 }}>
          {CARTOES.map((def) => {
            const dados = lerAsset(def.asset);
            return (
              dados && (
                <CartaoAsset
                  key={def.asset}
                  def={def}
                  dados={dados}
                  onSalvar={(campo, valor) => salvarCampo(def.asset, campo, valor)}
                />
              )
            );
          })}
        </div>
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
