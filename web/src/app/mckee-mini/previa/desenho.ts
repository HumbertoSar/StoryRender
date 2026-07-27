/** O mapa radial do McKee Mini, escrito à MÃO e congelado.
 *
 * A ordem é deliberada (plano, Parte VII): o desenho de referência vem ANTES
 * da instrução que manda o agente desenhar. Assim o template literal que a
 * Fatia 7 vai colocar no prompt é derivado de um desenho que já se sabe que
 * funciona, em vez de prosa esperançosa. Enquanto isso, é aqui que se mexe em
 * cor, medida e tipografia sem gastar um único token.
 *
 * Este HTML/CSS vive DENTRO de um iframe sandboxed, documento separado do app.
 * Duas consequências que não são óbvias:
 *
 * 1. A regra do `@layer` (CLAUDE.md) não vale aqui: nada deste CSS encosta no
 *    chat, e nada do `mini.css` chega aqui. O reset solto abaixo é seguro
 *    exatamente por isso, e só por isso.
 * 2. As famílias do `next/font` NÃO atravessam: o iframe não tem same-origin e
 *    as variáveis `--font-*` do app não existem lá dentro. Por isso o `@import`
 *    de CDN na primeira linha do CSS. O renderer injeta este CSS como
 *    `<style>` imediatamente antes do `</head>`, então a regra `@import`
 *    continua sendo a primeira da folha, que é o que a especificação exige.
 *    A CSP do sandbox permite (`style-src *`, `font-src *`).
 *
 * As coordenadas são absolutas num palco de 920x660: o `<svg>` das ligações
 * usa o mesmo sistema, e cada card fica exatamente no centro que a linha
 * aponta. Card opaco por cima da linha é o que faz a aresta "nascer" na borda
 * do card sem nenhum cálculo de interseção.
 */

/** Centros dos cards no palco. Card e linha leem daqui, então mover um card é
 *  mover uma linha só. */
const P = {
  "lacuna-1": [460, 100],
  "lacuna-2": [702, 187],
  "lacuna-3.1": [762, 381],
  "lacuna-3.2": [594, 537],
  "lacuna-4": [326, 537],
  "lacuna-5": [158, 381],
  "lacuna-6": [218, 187],
} as const;

type Id = keyof typeof P;

const fio = (tipo: string, de: Id, para: Id) =>
  `<line class="fio fio--${tipo}" data-ligacao-id="${tipo}__${de}__${para}" ` +
  `x1="${P[de][0]}" y1="${P[de][1]}" x2="${P[para][0]}" y2="${P[para][1]}" />`;

/** Um card no palco. `estado` é derivado no Python (`estado_do_card`) e chega
 *  pronto: o desenho não decide o que está firme, só mostra. */
const card = (id: Id, estado: string, ordem: string, nome: string, corpo: string) =>
  `<article class="card card--${estado}" data-card-id="${id}" ` +
  `style="left:${P[id][0]}px;top:${P[id][1]}px">` +
  `<header class="card__cabeca"><span class="card__ordem">${ordem}</span>` +
  `<h2 class="card__nome">${nome}</h2>` +
  `<span class="card__selo card__selo--${estado}">${estado}</span></header>` +
  `<div class="card__corpo">${corpo}</div>` +
  `</article>`;

/** Texto do autor dentro da fórmula. */
const t = (texto: string) => `<b>${texto}</b>`;
/** Slot ainda vazio: aparece com o próprio nome, em caixa alta. O buraco é
 *  para ser visto (§4.3). */
const buraco = (slot: string) => `<i class="buraco">${slot}</i>`;
/** Empty state = sonda (§2): o card vazio ensina o que falta sem manual. */
const sonda = (texto: string) => `<p class="card__sonda">${texto}</p>`;

export const CSS = `@import url('https://fonts.googleapis.com/css2?family=Alegreya:ital,wght@0,400;0,700;1,400&family=JetBrains+Mono:wght@400;500&family=Source+Sans+3:wght@400;600&display=swap');

:root {
  --papel: #F0E9D8;
  --tinta: #211E1A;
  --vinho: #7A2E2E;
  --latao: #9C7A3C;
  --neutro: #C9BFA8;
  --fundo: #17130F;
}

* { box-sizing: border-box; }

body {
  margin: 0;
  padding: 16px 0 28px;
  background:
    radial-gradient(ellipse at 50% 45%, rgba(240, 233, 216, 0.06), transparent 62%),
    var(--fundo);
  font-family: 'Source Sans 3', system-ui, sans-serif;
  color: var(--papel);
}

.palco {
  position: relative;
  width: 920px;
  height: 660px;
  margin: 0 auto;
}

.palco__fios {
  position: absolute;
  inset: 0;
  width: 920px;
  height: 660px;
}

/* --- as ligações (§14) ------------------------------------------------- */

.fio { stroke: var(--neutro); stroke-opacity: 0.38; stroke-width: 1.5; }

/* Motor e corrente são a causalidade da história, não a ordem de leitura:
   ganham a cor do vinho e mais peso. */
.fio--motor,
.fio--corrente { stroke: var(--vinho); stroke-opacity: 0.85; stroke-width: 2.5; }

/* O fantasma é promessa, ainda não é fato: tracejado, cor de latão. */
.fio--fantasma {
  stroke: var(--latao);
  stroke-opacity: 0.75;
  stroke-width: 2;
  stroke-dasharray: 5 6;
}

.rotulo {
  font-family: 'JetBrains Mono', ui-monospace, monospace;
  font-size: 9px;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  fill: var(--latao);
}

/* --- os cards ---------------------------------------------------------- */

.card {
  position: absolute;
  width: 190px;
  transform: translate(-50%, -50%);
  background: var(--papel);
  color: var(--tinta);
  border: 1px solid var(--neutro);
  border-radius: 3px;
  padding: 9px 11px 11px;
  box-shadow: 0 12px 26px rgba(0, 0, 0, 0.42);
}

.card__cabeca {
  display: flex;
  align-items: baseline;
  gap: 6px;
  margin-bottom: 6px;
}

.card__ordem {
  font-family: 'JetBrains Mono', ui-monospace, monospace;
  font-size: 10px;
  color: var(--vinho);
}

.card__nome {
  font-family: 'Alegreya', Georgia, serif;
  font-size: 13px;
  font-weight: 700;
  margin: 0;
  flex: 1;
}

/* Latão sobre papel dá ~3:1 de contraste: serve pra selo curto e borda, nunca
   pra texto corrido. */
.card__selo {
  font-family: 'JetBrains Mono', ui-monospace, monospace;
  font-size: 8px;
  letter-spacing: 0.09em;
  text-transform: uppercase;
  color: var(--latao);
}

.card__selo--rascunho,
.card__selo--vazio { color: #8b8271; }

.card__corpo {
  font-size: 11.5px;
  line-height: 1.45;
  color: #4a443c;
}

.card__corpo b { color: var(--tinta); font-weight: 600; }

.buraco {
  font-family: 'JetBrains Mono', ui-monospace, monospace;
  font-size: 10px;
  font-style: normal;
  letter-spacing: 0.04em;
  color: #a2988a;
}

.card__sonda {
  font-family: 'Alegreya', Georgia, serif;
  font-style: italic;
  font-size: 11.5px;
  line-height: 1.4;
  color: var(--vinho);
  margin: 7px 0 0;
  padding-top: 7px;
  border-top: 1px dotted var(--neutro);
}

/* --- os quatro estados (§2) -------------------------------------------- *
   Literais e curtos de propósito: são estes cinco blocos que a instrução da
   Fatia 7 vai carregar verbatim, pra que o mesmo mapa não pareça outro a cada
   render. */

.card--firme { border-color: var(--vinho); }
.card--firme .card__selo { color: var(--latao); }

.card--rascunho { border-color: var(--neutro); }

.card--vazio {
  background: rgba(240, 233, 216, 0.66);
  border-style: dashed;
  border-color: rgba(201, 191, 168, 0.85);
}

.card--fantasma {
  opacity: 0.55;
  border-style: dashed;
  border-color: var(--vinho);
}

/* --- o card-coração (§2, §5) ------------------------------------------- */

.coracao {
  position: absolute;
  left: 460px;
  top: 330px;
  width: 252px;
  transform: translate(-50%, -50%);
  background: #f6f1e4;
  color: var(--tinta);
  border: 1px solid var(--latao);
  border-radius: 4px;
  padding: 12px 14px 13px;
  box-shadow: 0 18px 40px rgba(0, 0, 0, 0.5);
}

.coracao__selo {
  font-family: 'JetBrains Mono', ui-monospace, monospace;
  font-size: 8px;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: var(--latao);
}

.coracao__frase {
  font-family: 'Alegreya', Georgia, serif;
  font-size: 12px;
  line-height: 1.5;
  margin: 7px 0 0;
  color: #3a352e;
}

.coracao__frase b { color: var(--tinta); font-weight: 700; }

.coracao__conta {
  font-family: 'JetBrains Mono', ui-monospace, monospace;
  font-size: 8.5px;
  letter-spacing: 0.06em;
  color: #8b8271;
  margin: 10px 0 0;
  padding-top: 8px;
  border-top: 1px solid rgba(201, 191, 168, 0.8);
}
`;

const FIOS = [
  fio("sequencia", "lacuna-1", "lacuna-2"),
  fio("motor", "lacuna-2", "lacuna-3.1"),
  fio("corrente", "lacuna-3.1", "lacuna-3.2"),
  fio("sequencia", "lacuna-3.2", "lacuna-4"),
  fio("sequencia", "lacuna-4", "lacuna-5"),
  fio("sequencia", "lacuna-5", "lacuna-6"),
  fio("fantasma", "lacuna-2", "lacuna-5"),
].join("\n      ");

export const HTML = `<!doctype html>
<html lang="pt-BR">
  <head>
    <meta charset="utf-8" />
  </head>
  <body>
    <div class="palco">
      <svg class="palco__fios" viewBox="0 0 920 660" aria-hidden="true">
      ${FIOS}
      <text class="rotulo" x="738" y="280">motor</text>
      <text class="rotulo" x="684" y="452">corrente</text>
      <text class="rotulo" x="236" y="330">cena prometida</text>
      </svg>

      ${card(
        "lacuna-1",
        "firme",
        "1",
        "O Mundo como Era",
        `Todo dia ${t("Fernando, 34 anos")} segue ${t(
          "passa o dia no computador, no quarto da mãe",
        )}, isso porque no passado ${t("o pai foi embora quando ele tinha 12")}`,
      )}

      ${card(
        "lacuna-2",
        "firme",
        "2",
        "Até Que Um Dia",
        `Até que um dia ${t("a mãe tem um AVC no meio da tarde")}, e por isso ele passou a querer ${t(
          "doze mil reais pro tratamento, em duas semanas",
        )}`,
      )}

      ${card(
        "lacuna-3.1",
        "rascunho",
        "3.1",
        "Tenta, Mas",
        `Ele tenta ${t("vender o computador")}, mas ${t("a loja diz que não vale nada")}`,
      )}

      ${card(
        "lacuna-3.2",
        "rascunho",
        "3.2",
        "Tenta, Mas",
        `Ele tenta ${t("pedir o dinheiro ao tio")}, mas ${t(
          "o tio oferece emprego na loja, não o dinheiro",
        )}`,
      )}

      ${card(
        "lacuna-4",
        "vazio",
        "4",
        "A Escolha",
        `Até que só restou a escolha: ou ${buraco("ESCOLHA_A")}, pagando ${buraco(
          "PRECO_A",
        )}; ou ${buraco("ESCOLHA_B")}, pagando ${buraco("PRECO_B")}` +
          sonda("Qual é a primeira mão? O que ele escolhe se escolher esta?"),
      )}

      ${card(
        "lacuna-5",
        "fantasma",
        "5",
        "E Então Ele",
        `E então ele ${t("veste o uniforme da loja na frente da mãe acordada")}`,
      )}

      ${card(
        "lacuna-6",
        "vazio",
        "6",
        "O Mundo como Ficou",
        `E desde então, todo dia ele ${buraco("NOVA_ROTINA")}` +
          sonda("O que a gente VÊ ele fazendo agora, num dia comum?"),
      )}

      <article class="coracao" data-card-id="espinha">
        <div class="coracao__selo">a espinha</div>
        <p class="coracao__frase">
          Todo dia <b>Fernando</b> segue <b>passando o dia no computador, no quarto da
          mãe</b>, isso porque <b>o pai foi embora quando ele tinha 12</b>. Até que um dia
          <b>a mãe tem um AVC</b>, e por isso ele passou a querer <b>doze mil reais em
          duas semanas</b>. Ele tenta <b>vender o computador</b>, mas <b>não vale nada</b>.
          Tenta <b>pedir ao tio</b>, mas <b>o tio oferece emprego, não dinheiro</b>. Até
          que só restou a escolha: ou <i class="buraco">ESCOLHA_A</i>, ou
          <i class="buraco">ESCOLHA_B</i>. E então ele <b>veste o uniforme</b>. E desde
          então, todo dia ele <i class="buraco">NOVA_ROTINA</i>.
        </p>
        <p class="coracao__conta">2 firmes · 2 rascunhos · 1 hipótese · 2 buracos</p>
      </article>
    </div>
  </body>
</html>
`;

/** O que o renderer do CopilotKit recebe. Os `*Complete` são o que diz "parou
 *  de streamar": sem eles o componente fica no modo de pintura progressiva e
 *  nunca monta o iframe final. */
export const CONTEUDO = {
  initialHeight: 700,
  generating: false,
  css: CSS,
  cssComplete: true,
  html: [HTML],
  htmlComplete: true,
};
