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
}

export function adicionarComplicacao(data: unknown): unknown {
  const proximo = structuredClone(data) as { espinha: EspinhaNo[] };
  const complicacoes = proximo.espinha.filter((no) => no.tipo === "complicacao");
  const proximaOrdem = complicacoes.length + 1;
  proximo.espinha.push({
    id: `complicacao_${proximaOrdem}`,
    tipo: "complicacao",
    ordem: proximaOrdem,
    conteudo: "",
    status: "vazio",
    conecta_assets: ["antagonista", "protagonista"],
  });
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
