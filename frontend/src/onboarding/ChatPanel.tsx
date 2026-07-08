import { useEffect, useRef, useState } from "react";
import "./onboarding.css";
import { GENEROS, NAO_SEI, type StepInputType } from "./script";

export interface ChatMessage {
  from: "agente" | "usuario";
  texto: string;
}

interface ChatPanelProps {
  mensagens: ChatMessage[];
  passoAtual: number;
  totalPassos: number;
  tipoInput: StepInputType | null;
  onResponderTexto: (texto: string) => void;
  onResponderGenero: (generos: string[]) => void;
  onPularModoLivre: () => void;
  concluido: boolean;
  onContinuarComAgente?: () => void;
  onEditarNoQuadro?: () => void;
}

export function ChatPanel({
  mensagens,
  passoAtual,
  totalPassos,
  tipoInput,
  onResponderTexto,
  onResponderGenero,
  onPularModoLivre,
  concluido,
  onContinuarComAgente,
  onEditarNoQuadro,
}: ChatPanelProps) {
  const [texto, setTexto] = useState("");
  const [generosSelecionados, setGenerosSelecionados] = useState<string[]>([]);
  const mensagensRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = mensagensRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [mensagens, concluido]);

  function enviarTexto() {
    if (!texto.trim()) return;
    onResponderTexto(texto.trim());
    setTexto("");
  }

  function alternarGenero(g: string) {
    setGenerosSelecionados((prev) => (prev.includes(g) ? prev.filter((x) => x !== g) : [...prev, g]));
  }

  function enviarGenero() {
    if (generosSelecionados.length === 0) return;
    onResponderGenero(generosSelecionados);
    setGenerosSelecionados([]);
  }

  return (
    <div className={`sr-chat ${concluido ? "sr-chat--recuado" : ""}`}>
      <div className="sr-chat__header">
        <div className="sr-chat__avatar">S</div>
        <div className="sr-chat__titulo">Agente</div>
        <div className="sr-chat__contador">
          {passoAtual} DE {totalPassos}
          {concluido ? " ✓" : ""}
        </div>
      </div>
      <div className="sr-chat__mensagens" ref={mensagensRef}>
        {mensagens.map((m, i) => (
          <div key={i} className={`sr-msg sr-msg--${m.from}`}>
            {m.texto}
          </div>
        ))}
        {tipoInput === "genero" && !concluido && (
          <div className="sr-chip-row">
            {GENEROS.map((g) => (
              <button
                key={g}
                className={`sr-chip sr-chip--selecionavel ${generosSelecionados.includes(g) ? "sr-chip--ativo" : ""}`}
                onClick={() => alternarGenero(g)}
                type="button"
              >
                {g}
              </button>
            ))}
          </div>
        )}
        {tipoInput === "texto-opcional" && !concluido && (
          <div className="sr-chip-row">
            <button className="sr-chip sr-chip--fantasma" onClick={() => onResponderTexto(NAO_SEI)} type="button">
              {NAO_SEI}
            </button>
          </div>
        )}
        {concluido && (
          <div className="sr-transicao">
            <div className="sr-transicao__texto">
              Isso já é o esqueleto. A partir daqui você manda: edita qualquer cartão direto no quadro, ou continua
              comigo.
            </div>
            <button className="sr-btn sr-btn--primario" onClick={onContinuarComAgente} type="button">
              Continuar com o agente — Fase C
            </button>
            <button className="sr-btn sr-btn--secundario" onClick={onEditarNoQuadro} type="button">
              Editar direto no quadro
            </button>
          </div>
        )}
      </div>
      {!concluido && (
        <>
          <div className="sr-chat__pular">
            <button className="sr-link-discreto" onClick={onPularModoLivre} type="button">
              pular pro modo livre →
            </button>
          </div>
          <div className="sr-chat__composer">
            {tipoInput === "genero" ? (
              <div className="sr-composer-box">
                <div className="sr-composer-input">
                  {generosSelecionados.length > 0 ? generosSelecionados.join(", ") : "ou descreva com suas palavras…"}
                </div>
                <button className="sr-composer-enviar" onClick={enviarGenero} type="button">
                  ↑
                </button>
              </div>
            ) : (
              <div className="sr-composer-box">
                <input
                  className="sr-composer-input sr-composer-input--editavel"
                  value={texto}
                  onChange={(e) => setTexto(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && enviarTexto()}
                  placeholder="Responder ao agente…"
                />
                <button className="sr-composer-enviar" onClick={enviarTexto} type="button">
                  ↑
                </button>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
