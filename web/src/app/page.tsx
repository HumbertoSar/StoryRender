import Link from "next/link";
import type { ReactNode } from "react";

import "./metodo.css";

type Metodo = {
  nome: string;
  descricao: string;
  icone: ReactNode;
  // href presente = método disponível (cartão clicável); ausente = "em breve".
  href?: string;
};

const METODOS: Metodo[] = [
  {
    nome: "McKee",
    descricao:
      "Espinha de 5 nós movida a decisão sob pressão: incidente, complicações progressivas, crise, clímax, resolução.",
    href: "/mckee",
    icone: (
      <svg viewBox="0 0 210 56" className="sr-metodo__icone">
        <polyline
          points="10,44 52,38 94,30 136,16 168,10 198,40"
          fill="none"
          stroke="var(--sr-accent)"
          strokeWidth="1.5"
          strokeDasharray="2 4"
        />
        <circle cx="10" cy="44" r="4" fill="var(--sr-brass)" />
        <circle cx="52" cy="38" r="4" fill="var(--sr-brass)" />
        <circle cx="94" cy="30" r="4" fill="var(--sr-brass)" />
        <circle cx="136" cy="16" r="4" fill="var(--sr-brass)" />
        <circle cx="168" cy="10" r="4" fill="var(--sr-accent)" />
        <circle cx="198" cy="40" r="4" fill="var(--sr-brass)" />
      </svg>
    ),
  },
  {
    nome: "O Fio",
    descricao:
      "Um fio único de 9 degraus, conduzido por um tutor socrático: da semente ao novo equilíbrio, testando cada passo com você.",
    href: "/fio",
    icone: (
      // Linha contínua (o fio) em oposição à espinha pontilhada do McKee.
      <svg viewBox="0 0 210 56" className="sr-metodo__icone">
        <polyline
          points="10,46 33,43 57,38 80,33 104,27 128,20 151,11 174,5 198,30"
          fill="none"
          stroke="var(--sr-accent)"
          strokeWidth="1.5"
        />
        {[
          [10, 46],
          [33, 43],
          [57, 38],
          [80, 33],
          [104, 27],
          [128, 20],
          [151, 11],
          [198, 30],
        ].map(([cx, cy]) => (
          <circle key={`${cx}-${cy}`} cx={cx} cy={cy} r="3.5" fill="var(--sr-brass)" />
        ))}
        <circle cx="174" cy="5" r="4" fill="var(--sr-accent)" />
      </svg>
    ),
  },
  {
    nome: "Jornada do Herói",
    descricao: "O círculo de partida, provação e retorno transformado, de Campbell a Vogler.",
    icone: (
      <svg viewBox="0 0 210 56" className="sr-metodo__icone">
        <circle
          cx="105"
          cy="28"
          r="22"
          fill="none"
          stroke="var(--sr-brass)"
          strokeWidth="1.5"
          strokeDasharray="2 4"
        />
        <circle cx="105" cy="6" r="4" fill="var(--sr-brass)" />
        <circle cx="127" cy="28" r="4" fill="var(--sr-brass)" />
        <circle cx="105" cy="50" r="4" fill="var(--sr-brass)" />
        <circle cx="83" cy="28" r="4" fill="var(--sr-brass)" />
      </svg>
    ),
  },
  {
    nome: "Save the Cat",
    descricao: "Os 15 beats de Snyder, batidos em sequência com marcos de página.",
    icone: (
      <svg viewBox="0 0 210 56" className="sr-metodo__icone">
        {[30, 80, 130, 180].map((cx) => (
          <circle key={`topo-${cx}`} cx={cx} cy="14" r="4" fill="var(--sr-brass)" />
        ))}
        {[30, 80, 130, 180].map((cx) => (
          <circle key={`base-${cx}`} cx={cx} cy="42" r="4" fill="var(--sr-brass)" />
        ))}
      </svg>
    ),
  },
];

function CartaoMetodo({ metodo }: { metodo: Metodo }) {
  const conteudo = (
    <>
      {metodo.icone}
      <div className="sr-metodo__nome">{metodo.nome}</div>
      <div className="sr-metodo__descricao">{metodo.descricao}</div>
      <div
        className={`sr-metodo__badge${metodo.href ? " sr-metodo__badge--disponivel" : ""}`}
      >
        {metodo.href ? "disponível" : "em breve"}
      </div>
    </>
  );

  if (!metodo.href) {
    return <div className="sr-metodo__card sr-metodo__card--em-breve">{conteudo}</div>;
  }
  return (
    <Link href={metodo.href} className="sr-metodo__card sr-metodo__card--disponivel">
      {conteudo}
    </Link>
  );
}

export default function EscolhaDeMetodo() {
  return (
    <div className="sr-metodo">
      <div className="sr-metodo__titulo">Escolha a lente estrutural</div>
      <div className="sr-metodo__subtitulo">
        O método define a espinha e os cartões do seu quadro — não a sua história.
      </div>
      <div className="sr-metodo__cards">
        {METODOS.map((metodo) => (
          <CartaoMetodo key={metodo.nome} metodo={metodo} />
        ))}
      </div>
      <div className="sr-metodo__rodape">
        <div className="sr-metodo__nota">TRIÂNGULO DA HISTÓRIA: ARCHPLOT (PADRÃO NO V1)</div>
      </div>
    </div>
  );
}
