import { useState } from "react";
import "./metodo.css";
import { criarRoteiro } from "../api";

export function MetodoScreen() {
  const [criando, setCriando] = useState(false);

  function continuarComMcKee() {
    if (criando) return;
    setCriando(true);
    criarRoteiro()
      .then((r) => {
        window.location.href = `/r/${r.id}`;
      })
      .catch((err) => {
        console.error("Falha ao criar roteiro:", err);
        setCriando(false);
      });
  }

  return (
    <div className="sr-metodo">
      <div className="sr-metodo__titulo">Escolha a lente estrutural</div>
      <div className="sr-metodo__subtitulo">
        O método define a espinha e os cartões do seu quadro — não a sua história.
      </div>
      <div className="sr-metodo__cards">
        <div className="sr-metodo__card sr-metodo__card--disponivel">
          <svg viewBox="0 0 210 56" className="sr-metodo__icone">
            <polyline
              points="10,44 52,38 94,30 136,16 168,10 198,40"
              fill="none"
              stroke="#7A2E2E"
              strokeWidth="1.5"
              strokeDasharray="2 4"
            />
            <circle cx="10" cy="44" r="4" fill="#9C7A3C" />
            <circle cx="52" cy="38" r="4" fill="#9C7A3C" />
            <circle cx="94" cy="30" r="4" fill="#9C7A3C" />
            <circle cx="136" cy="16" r="4" fill="#9C7A3C" />
            <circle cx="168" cy="10" r="4" fill="#7A2E2E" />
            <circle cx="198" cy="40" r="4" fill="#9C7A3C" />
          </svg>
          <div className="sr-metodo__nome">McKee</div>
          <div className="sr-metodo__descricao">
            Espinha de 5 nós movida a decisão sob pressão: incidente, complicações progressivas, crise, clímax,
            resolução.
          </div>
          <div className="sr-metodo__badge sr-metodo__badge--disponivel">disponível</div>
        </div>
        <div className="sr-metodo__card sr-metodo__card--em-breve">
          <svg viewBox="0 0 210 56" className="sr-metodo__icone">
            <circle cx="105" cy="28" r="22" fill="none" stroke="#9C7A3C" strokeWidth="1.5" strokeDasharray="2 4" />
            <circle cx="105" cy="6" r="4" fill="#9C7A3C" />
            <circle cx="127" cy="28" r="4" fill="#9C7A3C" />
            <circle cx="105" cy="50" r="4" fill="#9C7A3C" />
            <circle cx="83" cy="28" r="4" fill="#9C7A3C" />
          </svg>
          <div className="sr-metodo__nome">Jornada do Herói</div>
          <div className="sr-metodo__descricao">
            O círculo de partida, provação e retorno transformado, de Campbell a Vogler.
          </div>
          <div className="sr-metodo__badge">em breve</div>
        </div>
        <div className="sr-metodo__card sr-metodo__card--em-breve">
          <svg viewBox="0 0 210 56" className="sr-metodo__icone">
            <circle cx="30" cy="14" r="4" fill="#9C7A3C" />
            <circle cx="80" cy="14" r="4" fill="#9C7A3C" />
            <circle cx="130" cy="14" r="4" fill="#9C7A3C" />
            <circle cx="180" cy="14" r="4" fill="#9C7A3C" />
            <circle cx="30" cy="42" r="4" fill="#9C7A3C" />
            <circle cx="80" cy="42" r="4" fill="#9C7A3C" />
            <circle cx="130" cy="42" r="4" fill="#9C7A3C" />
            <circle cx="180" cy="42" r="4" fill="#9C7A3C" />
          </svg>
          <div className="sr-metodo__nome">Save the Cat</div>
          <div className="sr-metodo__descricao">Os 15 beats de Snyder, batidos em sequência com marcos de página.</div>
          <div className="sr-metodo__badge">em breve</div>
        </div>
      </div>
      <div className="sr-metodo__rodape">
        <button className="sr-metodo__continuar" onClick={continuarComMcKee} disabled={criando} type="button">
          Continuar com McKee →
        </button>
        <div className="sr-metodo__nota">TRIÂNGULO DA HISTÓRIA: ARCHPLOT (PADRÃO NO V1)</div>
      </div>
    </div>
  );
}
