// Config dos cartões de asset: um componente genérico renderiza todos.
// Fonte dos campos: docs/STORY_RENDER_MVP_MCKEE.md (seções de cartões).
// Campos de lista (niveis, pontos_contato, generos) ficam pra fatia própria.

export type AssetId =
  | "protagonistas"
  | "antagonista"
  | "ideia_controladora"
  | "mundo"
  | "genero";

export interface CampoDef {
  chave: string;
  rotulo: string;
}

export interface CartaoDef {
  asset: AssetId;
  titulo: string;
  campos: CampoDef[];
}

export const CARTOES: CartaoDef[] = [
  {
    asset: "protagonistas",
    titulo: "Protagonista",
    campos: [
      { chave: "want", rotulo: "Want (desejo consciente)" },
      { chave: "need", rotulo: "Need (necessidade inconsciente)" },
      { chave: "aposta", rotulo: "Aposta (o que está em jogo)" },
    ],
  },
  {
    asset: "antagonista",
    titulo: "Antagonista",
    campos: [
      { chave: "fonte_oposicao", rotulo: "Fonte de oposição" },
      { chave: "logica_interna", rotulo: "Lógica interna" },
      { chave: "avatar", rotulo: "Avatar" },
      { chave: "poder_relativo", rotulo: "Poder relativo" },
    ],
  },
  {
    asset: "ideia_controladora",
    titulo: "Ideia Controladora",
    campos: [
      { chave: "valor", rotulo: "Valor" },
      { chave: "causa", rotulo: "Causa" },
      { chave: "contraideia", rotulo: "Contraideia" },
    ],
  },
  {
    asset: "mundo",
    titulo: "Mundo da História",
    campos: [
      { chave: "epoca", rotulo: "Época" },
      { chave: "local", rotulo: "Local" },
      { chave: "regras_custo", rotulo: "Regras & custo" },
    ],
  },
  {
    asset: "genero",
    titulo: "Gênero & Promessa",
    campos: [{ chave: "promessa", rotulo: "Promessa ao público" }],
  },
];

export function rotuloDoCampo(asset: string, campo: string): string {
  const cartao = CARTOES.find((c) => c.asset === asset);
  const def = cartao?.campos.find((c) => c.chave === campo);
  return def ? `${cartao!.titulo} · ${def.rotulo}` : `${asset} · ${campo}`;
}
