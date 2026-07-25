"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import {
  CopilotChatAssistantMessage,
  useCopilotChatConfiguration,
  type CopilotChatAssistantMessageProps,
} from "@copilotkit/react-core/v2";

export type Valor = "positivo" | "negativo";

type Contexto = {
  marcas: Record<string, Valor>;
  erro: string | null;
  alternar: (threadId: string, mensagemId: string, valor: Valor) => void;
  usarThread: (threadId: string) => void;
};

const FeedbackCtx = createContext<Contexto | null>(null);

/** Marcas 👍/👎 dos turnos da conversa aberta, sincronizadas com o agente.
 *
 * Fica fora do <CopilotChat> porque a barra de ações de CADA turno precisa
 * ler o mesmo mapa — e quem descobre o id da thread é o componente de dentro
 * (ver TurnoDoTutor), já que o chat resolve a thread sozinho. */
export function ProvedorDeFeedback({ children }: { children: ReactNode }) {
  const [threadId, setThreadId] = useState<string | null>(null);
  const [marcas, setMarcas] = useState<Record<string, Valor>>({});
  const [erro, setErro] = useState<string | null>(null);
  // Espelho do estado: `alternar` precisa do valor anterior pra alternar e pra
  // desfazer, e ler do state fecharia sobre uma versão velha.
  const marcasRef = useRef<Record<string, Valor>>({});

  const aplicar = useCallback((proximo: Record<string, Valor>) => {
    marcasRef.current = proximo;
    setMarcas(proximo);
  }, []);

  const usarThread = useCallback((id: string) => {
    setThreadId((atual) => (atual === id ? atual : id));
  }, []);

  // Thread nova (ou reload): recarrega o que já estava marcado, pra marca
  // sobreviver a recarregar a página no meio de uma sessão longa.
  useEffect(() => {
    if (!threadId) return;
    let vivo = true;
    fetch(`/api/mckee-inspired/feedback?thread=${encodeURIComponent(threadId)}`)
      .then((r) => (r.ok ? r.json() : { marcas: {} }))
      .then((d) => {
        if (!vivo) return;
        marcasRef.current = d.marcas ?? {};
        setMarcas(marcasRef.current);
      })
      .catch(() => {
        // Não marcar erro aqui: não conseguir LER as marcas antigas não
        // atrapalha a conversa. Só gravar em silêncio seria mentira.
      });
    return () => {
      vivo = false;
    };
  }, [threadId]);

  const alternar = useCallback(
    async (thread: string, mensagemId: string, valor: Valor) => {
      const anterior = marcasRef.current;
      // Clicar no botão já marcado desfaz a marca.
      const novo = anterior[mensagemId] === valor ? null : valor;
      const otimista = { ...anterior };
      if (novo) otimista[mensagemId] = novo;
      else delete otimista[mensagemId];
      aplicar(otimista);
      setErro(null);
      try {
        const r = await fetch("/api/mckee-inspired/feedback", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            thread_id: thread,
            mensagem_id: mensagemId,
            valor: novo,
          }),
        });
        if (!r.ok) throw new Error(String(r.status));
      } catch {
        // Desfaz: uma marca que não foi gravada não pode continuar na tela
        // parecendo que foi — é justamente ela que vai virar dado depois.
        aplicar(anterior);
        setErro("feedback não gravado");
      }
    },
    [aplicar],
  );

  return (
    <FeedbackCtx.Provider value={{ marcas, erro, alternar, usarThread }}>
      {children}
    </FeedbackCtx.Provider>
  );
}

export function useFeedback(): Contexto {
  const ctx = useContext(FeedbackCtx);
  if (!ctx) throw new Error("useFeedback fora do ProvedorDeFeedback");
  return ctx;
}

/** Turno do Tutor com 👍/👎 ligados ao agente.
 *
 * Entra como slot `assistantMessage` do chat. Os botões de polegar só são
 * renderizados pelo componente do pacote quando existe handler — sem isto, a
 * barra de ações teria só o copiar. */
export function TurnoDoTutor(props: CopilotChatAssistantMessageProps) {
  const { marcas, alternar, usarThread } = useFeedback();
  // A thread é resolvida pelo próprio chat (a página não passa threadId, pra
  // não suprimir a tela de abertura); aqui dentro ela está no contexto.
  const threadId = useCopilotChatConfiguration()?.threadId;

  useEffect(() => {
    if (threadId) usarThread(threadId);
  }, [threadId, usarThread]);

  const valor = marcas[props.message.id];

  return (
    <CopilotChatAssistantMessage
      {...props}
      onThumbsUp={(m) => threadId && alternar(threadId, m.id, "positivo")}
      onThumbsDown={(m) => threadId && alternar(threadId, m.id, "negativo")}
      // `aria-pressed` faz os dois trabalhos: anuncia o estado do botão de
      // alternância pro leitor de tela e serve de gancho pro fio.css. Vai
      // sempre, marcado ou não — botão de alternância sem estado declarado é
      // pior que nenhum. Quem manda aqui é o que veio do servidor, não um
      // :focus: a marca precisa continuar certa depois de recarregar a página.
      thumbsUpButton={{ "aria-pressed": valor === "positivo" }}
      thumbsDownButton={{ "aria-pressed": valor === "negativo" }}
    />
  );
}
