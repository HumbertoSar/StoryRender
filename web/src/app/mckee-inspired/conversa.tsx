"use client";

import { useEffect } from "react";
import Link from "next/link";
import { CopilotKit } from "@copilotkit/react-core";
import {
  CopilotChat,
  useAgent,
  useCopilotChatConfiguration,
  type CopilotChatAssistantMessage,
} from "@copilotkit/react-core/v2";
import "@copilotkit/react-core/v2/styles.css";

import type { TurnoDeTexto } from "@/lib/sessoes";
import "./tutor.css";
import { ProvedorDeFeedback, TurnoDoTutor, useFeedback } from "./feedback";

const AGENTE = "tutor_agent";

// Slots do chat v2: passar uma string por slot manda um className pro
// componente interno (o pacote mescla com o dele). É o gancho estável pra
// estilizar a bolha do autor e o aviso — melhor que caçar as classes `cpk:`
// geradas, que mudam sem aviso entre versões.
// Fora do componente de propósito: o chat memoiza as mensagens comparando a
// identidade destes objetos, e recriá-los a cada render anularia o memo.
const SLOT_MENSAGENS = {
  userMessage: { messageRenderer: "sr-tutor__bolha" },
  // O tipo do slot pede o componente do pacote COM os estáticos dele
  // (MarkdownRenderer, Toolbar, …); em runtime só é chamado como componente,
  // e o TurnoDoTutor repassa tudo pro original. Daí o cast.
  assistantMessage: TurnoDoTutor as typeof CopilotChatAssistantMessage,
};
const SLOT_INPUT = { disclaimer: "sr-tutor__aviso" };

const ABERTURA =
  "Me conta tudo o que você já pensou sobre essa história, do jeito que estiver na sua cabeça. Pode vir bagunçado. Quando terminar, eu te mostro o mapa do que você já tem.";

function Topbar({ sessao, erroDoHistorico }: { sessao: string; erroDoHistorico: string | null }) {
  const { erro } = useFeedback();
  const avisos = [erroDoHistorico, erro].filter(Boolean);
  return (
    <div className="sr-tutor__topbar">
      <Link href="/mckee-inspired" className="sr-tutor__voltar">
        ← sessões
      </Link>
      <div className="sr-tutor__titulo">McKee Inspired</div>
      {/* O id curto fica visível de propósito: é ele que se passa pro
          `exportar_sessao.py` na hora de reler a sessão em Markdown. */}
      <div className="sr-tutor__selo" title={sessao}>
        sessão <span className="sr-tutor__id">{sessao.slice(0, 8)}</span>
      </div>
      {/* Falhas que o autor precisa ver: histórico que não carregou (a
          conversa parece mais curta do que é) e 👍/👎 que não gravou. */}
      {avisos.length > 0 && (
        <div className="sr-tutor__aviso-feedback">{avisos.join(" · ")}</div>
      )}
    </div>
  );
}

export function Conversa({
  sessao,
  historico,
  erroDoHistorico,
}: {
  sessao: string;
  historico: TurnoDeTexto[];
  erroDoHistorico: string | null;
}) {
  return (
    // enableInspector desligado: em dev o CopilotKit monta um inspetor
    // flutuante que anuncia novidades do produto por cima do chat — ruído em
    // cima justamente do que se quer observar numa sessão de validação. É
    // prop separada de `showDevConsole`, que segue ligada: os toasts de erro
    // do runtime precisam continuar aparecendo, senão uma falha passa batida.
    <CopilotKit runtimeUrl="/api/copilotkit" agent={AGENTE} enableInspector={false}>
      <ProvedorDeFeedback>
        <div className="sr-tutor">
          <Topbar sessao={sessao} erroDoHistorico={erroDoHistorico} />
          <div className="sr-tutor__chat">
            <SessaoDoChat sessao={sessao} historico={historico}>
              <CopilotChat
                key={sessao}
                agentId={AGENTE}
                messageView={SLOT_MENSAGENS}
                input={SLOT_INPUT}
                labels={{
                  welcomeMessageText: ABERTURA,
                  chatInputPlaceholder: "Despeje a história…",
                  chatDisclaimerText:
                    "O material é seu: o tutor testa, provoca e propõe. Quem decide é você.",
                }}
              />
            </SessaoDoChat>
          </div>
        </div>
      </ProvedorDeFeedback>
    </CopilotKit>
  );
}

/** Aponta o chat pra thread da URL e põe o histórico gravado dentro dele.
 *
 * Precisa ser o PAI do <CopilotChat>, não um irmão: o React roda os efeitos
 * dos filhos antes dos do pai, e o efeito do chat zera as mensagens quando
 * detecta troca de thread. Do lugar do pai, a reidratação acontece depois
 * dessa limpeza; de qualquer outro lugar, seria apagada por ela. */
function SessaoDoChat({
  sessao,
  historico,
  children,
}: {
  sessao: string;
  historico: TurnoDeTexto[];
  children: React.ReactNode;
}) {
  const config = useCopilotChatConfiguration();
  // `updates: []` = nenhuma inscrição: aqui só se quer a instância do agente
  // (a mesma que o <CopilotChat> usa), não re-render a cada chunk streamado.
  const { agent } = useAgent({ agentId: AGENTE, updates: [] });
  const trocarThread = config?.setActiveThreadId;
  const threadAtual = config?.threadId;

  useEffect(() => {
    // `explicit: false` é o detalhe que decide tudo aqui. O <CopilotKit> já
    // monta uma configuração de chat com uma thread SORTEADA, e é ela que
    // vence uma thread nossa passada por prop (por isso a sessão da URL não
    // basta: sem esta troca, a conversa era gravada na thread aleatória).
    // Trocar de forma NÃO explícita mantém as duas coisas que a fase de
    // validação precisa: a tela de abertura continua aparecendo em sessão
    // nova, e o chat não tenta reconectar a thread sozinho — neste modo SSE o
    // connect só sabe repetir o que estiver na memória do processo do Next,
    // enquanto a conversa de verdade está no Postgres. Quem reidrata do banco
    // somos nós, logo abaixo.
    trocarThread?.(sessao, { explicit: false });
  }, [sessao, trocarThread]);

  useEffect(() => {
    // Espera a troca acima valer: reidratar antes disso encheria a thread
    // errada, e o efeito do chat limparia tudo ao trocar.
    if (threadAtual !== sessao) return;
    // Só reidrata em chat vazio. É a condição honesta: se já existe mensagem
    // na tela, ou o histórico já entrou, ou o autor já escreveu — e reescrever
    // por cima apagaria turnos novos se a instância do agente for trocada no
    // meio da conversa (reconexão do runtime).
    if (agent.messages.length > 0 || historico.length === 0) return;
    // Os ids vêm do checkpointer, e é isso que torna a continuação segura: no
    // próximo turno o cliente reenvia estas mensagens, e o adaptador do lado
    // do agente só acrescenta id que ainda não existe no checkpoint.
    agent.setMessages(historico);
  }, [agent, historico, threadAtual, sessao]);

  return <>{children}</>;
}
