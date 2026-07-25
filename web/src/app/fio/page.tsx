"use client";

import { useState } from "react";
import Link from "next/link";
import { CopilotKit } from "@copilotkit/react-core";
import { CopilotChat } from "@copilotkit/react-core/v2";
import "@copilotkit/react-core/v2/styles.css";

import "./fio.css";

export default function Fio() {
  // Thread controlada aqui só pra permitir recomeçar do zero sem recarregar a
  // página — a validação do prompt é um ciclo de conversas curtas e repetidas.
  // Começa `undefined` (o chat cria a sua) porque gerar um id no primeiro
  // render quebraria a hidratação: servidor e cliente sorteariam ids diferentes.
  const [threadId, setThreadId] = useState<string | undefined>(undefined);

  return (
    <CopilotKit runtimeUrl="/api/copilotkit" agent="tutor_agent">
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
