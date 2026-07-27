"use client";

// Banco de prova do DESENHO do McKee Mini: à esquerda o mapa fixo, escrito à
// mão, passando pelo mesmo `OpenGenerativeUIActivityRenderer` que pinta o que o
// agente compõe; à direita o estado que ele mostra. Sem agente, sem runtime,
// sem um token gasto — é o equivalente, pro desenho, do que
// `/mckee-inspired/previa` é pro CSS do chat.
//
// A prévia vem ANTES da instrução de render (plano, Parte VII): mexer em cor,
// medida e tipografia aqui custa um F5; mexer via prompt custa uma conversa
// inteira e ainda mistura "o desenho está errado" com "o modelo desobedeceu".
//
// O `mapa.json` NÃO foi escrito à mão: saiu do contrato em Python, com o
// exemplo do §5 do método (o Fernando), passando por `escrever` e
// `estado_do_card` como uma sessão de verdade passaria. Pra regerar depois de
// mudar o esqueleto, é uma sequência de `mini_mapa.escrever(...)` seguida de
// `json.dump` — o que garante que a prévia mostre um estado possível, e não um
// estado bonito.
//
// Nenhum provider do CopilotKit aqui: o renderer recebe `content` e sua única
// dependência de contexto tem default vazio. `message` e `agent` são `unknown`
// na interface e não são lidos nesta versão; passar `null` é honesto, e um dia
// que passarem a ser lidos o type-check reclama.

import Link from "next/link";
import { OpenGenerativeUIActivityRenderer, OpenGenerativeUIActivityType } from "@copilotkit/react-core/v2";

import "../mini.css";
import { CONTEUDO } from "./desenho";
import MAPA from "./mapa.json";

const ESTADOS = ["firme", "rascunho", "vazio", "fantasma"] as const;

export default function PreviaDoMapa() {
  return (
    <div className="sr-mini">
      <div className="sr-mini__topbar">
        <Link href="/mckee-mini" className="sr-mini__voltar">
          ← McKee Mini
        </Link>
        <div className="sr-mini__titulo">McKee Mini</div>
        <div className="sr-mini__selo">prévia do desenho · sem modelo</div>
      </div>
      <div className="sr-mini__corpo">
        <div className="sr-mini__quadro">
          <OpenGenerativeUIActivityRenderer
            activityType={OpenGenerativeUIActivityType}
            content={CONTEUDO}
            message={null}
            agent={null}
          />
        </div>
        <div className="sr-mini__estado">
          <div className="sr-mini__estado-cabeca">
            <span className="sr-mini__estado-titulo">o estado que o desenho mostra</span>
            <span className="sr-mini__estado-nota">
              {MAPA.cards.length} cards · schema v{MAPA.versao_schema}
            </span>
          </div>
          <div className="sr-mini__legenda">
            {ESTADOS.map((estado) => (
              <span key={estado} className={`sr-mini__amostra sr-mini__amostra--${estado}`}>
                {estado}
              </span>
            ))}
          </div>
          <pre className="sr-mini__json">{JSON.stringify(MAPA, null, 2)}</pre>
        </div>
      </div>
    </div>
  );
}
