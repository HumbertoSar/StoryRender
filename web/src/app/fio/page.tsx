"use client";

import { useState } from "react";
import Link from "next/link";
import { CopilotKit } from "@copilotkit/react-core";
import {
  CopilotChat,
  type CopilotChatAssistantMessage,
} from "@copilotkit/react-core/v2";
import "@copilotkit/react-core/v2/styles.css";

import "./fio.css";
import { ProvedorDeFeedback, TurnoDoTutor, useFeedback } from "./feedback";

// Slots do chat v2: passar uma string por slot manda um className pro
// componente interno (o pacote mescla com o dele). É o gancho estável pra
// estilizar a bolha do autor e o aviso — melhor que caçar as classes `cpk:`
// geradas, que mudam sem aviso entre versões.
// Fora do componente de propósito: o chat memoiza as mensagens comparando a
// identidade destes objetos, e recriá-los a cada render anularia o memo.
const SLOT_MENSAGENS = {
  userMessage: { messageRenderer: "sr-fio__bolha" },
  // O tipo do slot pede o componente do pacote COM os estáticos dele
  // (MarkdownRenderer, Toolbar, …); em runtime só é chamado como componente,
  // e o TurnoDoTutor repassa tudo pro original. Daí o cast.
  assistantMessage: TurnoDoTutor as typeof CopilotChatAssistantMessage,
};
const SLOT_INPUT = { disclaimer: "sr-fio__aviso" };

const ABERTURA =
  "Me conta tudo o que você já pensou sobre essa história — do jeito que estiver na sua cabeça. Pode vir bagunçado. Quando terminar, eu te mostro o mapa do que você já tem.";

function Topbar({ onNovaConversa }: { onNovaConversa: () => void }) {
  const { erro } = useFeedback();
  return (
    <div className="sr-fio__topbar">
      <Link href="/" className="sr-fio__voltar">
        ← métodos
      </Link>
      <div className="sr-fio__titulo">O Fio</div>
      <div className="sr-fio__selo">tutor · validação em texto</div>
      {/* Se o 👍/👎 não chegou ao banco, o aviso aparece aqui: a marca só vale
          se estiver gravada, e falhar calado estragaria o dado da sessão. */}
      {erro && <div className="sr-fio__aviso-feedback">{erro}</div>}
      <button type="button" className="sr-fio__nova" onClick={onNovaConversa}>
        nova conversa
      </button>
    </div>
  );
}

export default function Fio() {
  // Só um contador de remontagem — NÃO um threadId. Passar `threadId` pro
  // CopilotChat liga o `hasExplicitThreadId` dele, que suprime a tela de
  // abertura: a conversa nova nascia muda, sem o convite do Tutor. Deixando o
  // chat resolver a própria thread, o `key` remonta com tela limpa e abertura
  // no lugar — e quem precisa do id (a barra de 👍/👎) lê do contexto do chat.
  const [conversa, setConversa] = useState(0);

  return (
    // enableInspector desligado: em dev o CopilotKit monta um inspetor
    // flutuante que anuncia novidades do produto por cima do chat — ruído em
    // cima justamente do que se quer observar numa sessão de validação. É
    // prop separada de `showDevConsole`, que segue ligada: os toasts de erro
    // do runtime precisam continuar aparecendo, senão uma falha passa batida.
    <CopilotKit
      runtimeUrl="/api/copilotkit"
      agent="tutor_agent"
      enableInspector={false}
    >
      <ProvedorDeFeedback>
        <div className="sr-fio">
          <Topbar onNovaConversa={() => setConversa((n) => n + 1)} />
          <div className="sr-fio__chat">
            <CopilotChat
              key={conversa}
              agentId="tutor_agent"
              messageView={SLOT_MENSAGENS}
              input={SLOT_INPUT}
              labels={{
                welcomeMessageText: ABERTURA,
                chatInputPlaceholder: "Despeje a história…",
                chatDisclaimerText:
                  "O material é seu: o tutor testa, aperta e propõe — quem decide é você.",
              }}
            />
          </div>
        </div>
      </ProvedorDeFeedback>
    </CopilotKit>
  );
}
