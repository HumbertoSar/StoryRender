"use client";

import Link from "next/link";
import { CopilotKit } from "@copilotkit/react-core";
import { CopilotChat } from "@copilotkit/react-core/v2";
import "@copilotkit/react-core/v2/styles.css";

import "./mini.css";
import { AGENTE, Quadro, RENDERERS } from "./quadro";

// Objeto de módulo, não literal inline: o provider compara identidade em vários
// memos, e um `{}` novo a cada render anularia todos eles.
//
// `designSkill` fica DELIBERADAMENTE de fora. Ele entraria como agent context, e
// o adaptador AG-UI escreve context em `state["ag-ui"]` — chave que o grafo do
// Mini não declara (nem seria identificador Python válido), então o LangGraph
// descarta. Medido: o checkpoint sai com `mapa`, `messages` e `tools`, sem
// `ag-ui`. Nem o default shadcn do pacote nem um nosso chegariam ao modelo. A
// gramática visual mora em `agent/metodos/mckee_mini.md`, que o agente lê do
// disco a cada turno — o que também é o ciclo de validação do prompt.
//
// O objeto vazio existe só pra ligar a tool de forma determinística: sem ele a
// ativação dependeria do fetch de /info terminar antes da primeira mensagem.
const OPEN_GEN_UI = {};

// Fatia 1: sem seleção de sessão. O <CopilotKit> sorteia a thread, a conversa é
// gravada nela, e recarregar a página começa outra. A tela de sessões e a
// reidratação do histórico entram numa fatia própria, com o padrão já provado
// no McKee Inspired (setActiveThreadId com explicit:false + reidratador PAI do
// chat, ids vindos do checkpointer).
export default function McKeeMini() {
  return (
    <CopilotKit
      runtimeUrl="/api/copilotkit-mini"
      agent={AGENTE}
      openGenerativeUI={OPEN_GEN_UI}
      renderActivityMessages={RENDERERS}
      enableInspector={false}
    >
      <div className="sr-mini">
        <div className="sr-mini__topbar">
          <Link href="/" className="sr-mini__voltar">
            ← métodos
          </Link>
          <div className="sr-mini__titulo">McKee Mini</div>
          <div className="sr-mini__selo">open-ended · fatia 1</div>
        </div>
        <div className="sr-mini__corpo">
          <Quadro />
          <div className="sr-mini__chat">
            <CopilotChat
              agentId={AGENTE}
              labels={{
                welcomeMessageText:
                  "Me conte a história que você quer estruturar, do jeito que estiver. Quando quiser ver, é só pedir.",
                chatInputPlaceholder: "Conte a história…",
                chatDisclaimerText:
                  "Nesta fatia o agente desenha uma coisa só: o cartão com o título.",
              }}
            />
          </div>
        </div>
      </div>
    </CopilotKit>
  );
}
