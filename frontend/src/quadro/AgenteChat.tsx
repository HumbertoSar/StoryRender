import { useEffect, useRef, useState } from "react";
import { enviarMensagemAgente, registrarEvento, type HistoricoMensagem, type PropostaCampo } from "../api";

export function AgenteChat({
  roteiroId,
  onPropostas,
}: {
  roteiroId: string;
  onPropostas: (propostas: PropostaCampo[]) => void;
}) {
  const [mensagens, setMensagens] = useState<HistoricoMensagem[]>([
    { from: "agente", texto: "Estou vendo o esquema inteiro. Pergunta, peça uma revisão, ou edite os cartões direto — o que fizer sentido." },
  ]);
  const [texto, setTexto] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const mensagensRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = mensagensRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [mensagens]);

  async function enviar() {
    const mensagem = texto.trim();
    if (!mensagem || enviando) return;
    setTexto("");
    setErro(null);
    const historicoAtual = mensagens;
    setMensagens((prev) => [...prev, { from: "usuario", texto: mensagem }]);
    registrarEvento(roteiroId, "mensagem_agente", { direcao: "usuario", texto: mensagem });
    setEnviando(true);
    try {
      const { resposta, propostas } = await enviarMensagemAgente(roteiroId, mensagem, historicoAtual);
      setMensagens((prev) => [...prev, { from: "agente", texto: resposta }]);
      registrarEvento(roteiroId, "mensagem_agente", { direcao: "agente", texto: resposta });
      if (propostas.length > 0) onPropostas(propostas);
    } catch (err) {
      setErro((err as Error).message);
      registrarEvento(roteiroId, "erro", { contexto: "chat_agente", mensagem: (err as Error).message });
    } finally {
      setEnviando(false);
    }
  }

  return (
    <div className="sr-agente-chat">
      <div className="sr-chat__header">
        <div className="sr-chat__avatar">S</div>
        <div className="sr-chat__titulo">Agente</div>
        <div className="sr-chat__contador">condução</div>
      </div>
      <div className="sr-chat__mensagens" ref={mensagensRef}>
        {mensagens.map((m, i) => (
          <div key={i} className={`sr-msg sr-msg--${m.from}`}>
            {m.texto}
          </div>
        ))}
        {enviando && <div className="sr-msg sr-msg--agente sr-msg--pensando">…</div>}
        {erro && <div className="sr-agente-erro">Falha ao falar com o agente: {erro}</div>}
      </div>
      <div className="sr-chat__composer">
        <div className="sr-composer-box">
          <textarea
            className="sr-composer-input sr-composer-input--editavel"
            value={texto}
            onChange={(e) => setTexto(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                enviar();
              }
            }}
            placeholder="Responder ao agente…"
            rows={1}
          />
          <button className="sr-composer-enviar" onClick={enviar} type="button" disabled={enviando}>
            ↑
          </button>
        </div>
      </div>
    </div>
  );
}
