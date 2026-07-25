"use client";

import { useState } from "react";
import Link from "next/link";
import { CopilotKit } from "@copilotkit/react-core";
import { CopilotChat } from "@copilotkit/react-core/v2";
import "@copilotkit/react-core/v2/styles.css";

import "./fio.css";

// Slots do chat v2: passar uma string por slot manda um className pro
// componente interno (o pacote mescla com o dele). É o gancho estável pra
// estilizar a bolha do autor e o aviso — melhor que caçar as classes `cpk:`
// geradas, que mudam sem aviso entre versões.
// Fora do componente de propósito: o chat memoiza as mensagens comparando a
// identidade destes objetos, e recriá-los a cada render anularia o memo.
const SLOT_MENSAGENS = { userMessage: { messageRenderer: "sr-fio__bolha" } };
const SLOT_INPUT = { disclaimer: "sr-fio__aviso" };

export default function Fio() {
  // Thread controlada aqui só pra permitir recomeçar do zero sem recarregar a
  // página — a validação do prompt é um ciclo de conversas curtas e repetidas.
  // Começa `undefined` (o chat cria a sua) porque gerar um id no primeiro
  // render quebraria a hidratação: servidor e cliente sorteariam ids diferentes.
  const [threadId, setThreadId] = useState<string | undefined>(undefined);

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
      <div className="sr-fio">
        <div className="sr-fio__topbar">
          <Link href="/" className="sr-fio__voltar">
            ← métodos
          </Link>
          <div className="sr-fio__titulo">O Fio</div>
          <div className="sr-fio__selo">tutor · validação em texto</div>
          <button
            type="button"
            className="sr-fio__nova"
            onClick={() => setThreadId(crypto.randomUUID())}
          >
            nova conversa
          </button>
        </div>
        <div className="sr-fio__chat">
          {/* key junto do threadId: trocar a thread remonta o chat, garantindo
              que a conversa anterior não fique na tela. */}
          <CopilotChat
            key={threadId ?? "inicial"}
            agentId="tutor_agent"
            threadId={threadId}
            messageView={SLOT_MENSAGENS}
            input={SLOT_INPUT}
            labels={{
              welcomeMessageText:
                "Me conta tudo o que você já pensou sobre essa história — do jeito que estiver na sua cabeça. Pode vir bagunçado. Quando terminar, eu te mostro o mapa do que você já tem.",
              chatInputPlaceholder: "Despeje a história…",
              chatDisclaimerText:
                "O material é seu: o tutor testa, aperta e propõe — quem decide é você.",
            }}
          />
        </div>
      </div>
    </CopilotKit>
  );
}
