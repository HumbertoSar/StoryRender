export interface RoteiroUpdate {
  path: (string | number)[];
  value: unknown;
}

export function applyUpdates(data: unknown, updates: RoteiroUpdate[]): unknown {
  const proximo = structuredClone(data) as Record<string | number, unknown>;
  for (const { path, value } of updates) {
    if (path.length === 0) continue;
    let alvo: Record<string | number, unknown> = proximo;
    for (let i = 0; i < path.length - 1; i++) {
      const chave = path[i];
      const proximoAlvo = alvo[chave];
      if (typeof proximoAlvo !== "object" || proximoAlvo === null) {
        alvo[chave] = typeof path[i + 1] === "number" ? [] : {};
      }
      alvo = alvo[chave] as Record<string | number, unknown>;
    }
    alvo[path[path.length - 1]] = value;
  }
  return proximo;
}

interface EspinhaNo {
  id: string;
  tipo: string;
  ordem?: number;
  conteudo: string;
  status: string;
  conecta_assets: string[];
  excluido?: boolean;
}

/**
 * Calcula um `ordem` (a chave de ordenação de exibição das complicações,
 * puramente numérica — não precisa ser inteira) que encaixa uma
 * complicação na posição de exibição `posicao` (1-based) entre as
 * complicações de `visiveis` (que NÃO inclui a que está sendo posicionada).
 * `posicao` omitida ou além do fim vai pro final da lista. Insere entre a
 * vizinha anterior e a seguinte usando um valor fracionário, pra nunca
 * precisar renumerar mais ninguém.
 */
function calcularOrdemParaPosicao(visiveis: EspinhaNo[], posicao: number | undefined, maiorOrdem: number): number {
  if (posicao === undefined || posicao > visiveis.length) {
    return maiorOrdem + 1;
  }
  const alvo = Math.max(1, posicao);
  const anterior = visiveis[alvo - 2];
  const seguinte = visiveis[alvo - 1];
  const ordemAnterior = anterior?.ordem ?? 0;
  const ordemSeguinte = seguinte?.ordem ?? ordemAnterior + 2;
  return (ordemAnterior + ordemSeguinte) / 2;
}

/**
 * `posicao` (1-based) é a posição de exibição que a complicação nova deve
 * ocupar entre as complicações visíveis atuais — omitida, ela vai pro fim
 * (mesmo comportamento de sempre). O índice real dela no array `espinha`
 * continua sendo sempre o último elemento (nunca insere no meio do array
 * de verdade — ver o porquê na fatia do nó repetível); o que muda é só o
 * campo `ordem`, a chave de ordenação pra exibição.
 */
export function adicionarComplicacao(data: unknown, posicao?: number): unknown {
  const proximo = structuredClone(data) as { espinha: EspinhaNo[] };
  const todasComplicacoes = proximo.espinha.filter((no) => no.tipo === "complicacao");
  const proximoId = todasComplicacoes.length + 1;

  const visiveis = todasComplicacoes.filter((no) => !no.excluido).sort((a, b) => (a.ordem ?? 0) - (b.ordem ?? 0));
  const maiorOrdem = todasComplicacoes.reduce((max, no) => Math.max(max, no.ordem ?? 0), 0);
  const ordem = calcularOrdemParaPosicao(visiveis, posicao, maiorOrdem);

  proximo.espinha.push({
    id: `complicacao_${proximoId}`,
    tipo: "complicacao",
    ordem,
    conteudo: "",
    status: "vazio",
    conecta_assets: ["antagonista", "protagonista"],
  });
  return proximo;
}

/**
 * Reposiciona uma complicação que já existe pro seu novo lugar de exibição
 * (1-based), identificada pelo `id` (nunca por índice — o índice real no
 * array nunca muda). Mesmo cálculo de `ordem` fracionário do
 * `adicionarComplicacao`, mas contra a lista de vizinhas SEM a própria
 * complicação que está sendo movida.
 */
export function reordenarComplicacao(data: unknown, idComplicacao: string, novaPosicao: number): unknown {
  const proximo = structuredClone(data) as { espinha: EspinhaNo[] };
  const no = proximo.espinha.find((n) => n.id === idComplicacao);
  if (!no || no.tipo !== "complicacao" || no.excluido) {
    throw new Error(`complicação "${idComplicacao}" não encontrada ou não está visível`);
  }

  const todasComplicacoes = proximo.espinha.filter((n) => n.tipo === "complicacao");
  const maiorOrdem = todasComplicacoes.reduce((max, n) => Math.max(max, n.ordem ?? 0), 0);
  const visiveisSemAlvo = todasComplicacoes
    .filter((n) => !n.excluido && n.id !== idComplicacao)
    .sort((a, b) => (a.ordem ?? 0) - (b.ordem ?? 0));

  no.ordem = calcularOrdemParaPosicao(visiveisSemAlvo, novaPosicao, maiorOrdem);
  return proximo;
}

export function excluirComplicacao(data: unknown, indice: number): unknown {
  const proximo = structuredClone(data) as { espinha: EspinhaNo[] };
  const no = proximo.espinha[indice];
  if (!no || no.tipo !== "complicacao") {
    throw new Error("índice não corresponde a uma complicação");
  }
  no.excluido = true;
  return proximo;
}

export function moverComplicacao(data: unknown, indice: number, direcao: "cima" | "baixo"): unknown {
  const proximo = structuredClone(data) as { espinha: EspinhaNo[] };
  const no = proximo.espinha[indice];
  if (!no || no.tipo !== "complicacao" || no.excluido) {
    throw new Error("índice não corresponde a uma complicação visível");
  }

  const visiveis = proximo.espinha
    .map((n, i) => ({ n, i }))
    .filter(({ n }) => n.tipo === "complicacao" && !n.excluido)
    .sort((a, b) => (a.n.ordem ?? 0) - (b.n.ordem ?? 0));
  const posicao = visiveis.findIndex(({ i }) => i === indice);
  const vizinho = direcao === "cima" ? visiveis[posicao - 1] : visiveis[posicao + 1];
  if (!vizinho) {
    throw new Error("não há complicação vizinha nessa direção");
  }

  const ordemDoNo = no.ordem;
  no.ordem = vizinho.n.ordem;
  vizinho.n.ordem = ordemDoNo;
  return proximo;
}

export function espinhaVazia() {
  return [
    { id: "incidente_incitante", tipo: "no_fixo", conteudo: "", status: "vazio", conecta_assets: ["protagonista", "mundo"] },
    { id: "complicacao_1", tipo: "complicacao", ordem: 1, conteudo: "", status: "vazio", conecta_assets: ["antagonista", "protagonista"] },
    { id: "crise", tipo: "no_fixo", conteudo: "", status: "vazio", conecta_assets: ["protagonista"] },
    { id: "climax", tipo: "no_fixo", conteudo: "", status: "vazio", conecta_assets: ["protagonista", "ideia_controladora"] },
    { id: "resolucao", tipo: "no_fixo", conteudo: "", status: "vazio", conecta_assets: [] },
  ];
}

export function roteiroMckeeVazio() {
  return {
    template: "mckee",
    titulo: "",
    fase_atual: "A",
    espinha: espinhaVazia(),
    assets: {
      protagonistas: [
        {
          id: "prot_1",
          want: "",
          need: "",
          aposta: "",
          caracterizacao: "",
          carater_verdadeiro: "",
          arco: "",
          pov: "",
          status: "vazio",
        },
      ],
      antagonista: {
        niveis: [],
        fonte_oposicao: "",
        logica_interna: "",
        avatar: "",
        poder_relativo: "",
        pontos_contato: [],
        status: "vazio",
      },
      ideia_controladora: { valor: "", causa: "", contraideia: "", status: "vazio" },
      mundo: { epoca: "", local: "", regras_custo: "", status: "vazio" },
      genero: { generos: [], promessa: "", status: "vazio" },
      elenco_notas: { texto_livre: "" },
    },
  };
}
