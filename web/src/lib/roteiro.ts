// Tipos do domínio — porte parcial de frontend/src/quadro/tipos.ts (legado).
// Só o que a fatia atual usa; cresce cartão a cartão.

export type Status = "vazio" | "rascunho" | "testado" | "validado";

export interface Protagonista {
  id: string;
  want: string;
  need: string;
  aposta: string;
  caracterizacao: string;
  carater_verdadeiro: string;
  arco: string;
  pov: string;
  status: Status;
}

export interface EspinhaNo {
  id: string;
  tipo: "no_fixo" | "complicacao";
  conteudo: string;
  status: Status;
  conecta_assets: string[];
  ordem?: number;
  excluido?: boolean;
}

// Assets além do protagonista têm campos de texto + listas; o cartão genérico
// só toca os campos de texto (config em cartoes.ts), então a forma fica solta.
export interface AssetBase {
  status: Status;
  [campo: string]: unknown;
}

export interface RoteiroData {
  template: string;
  titulo: string;
  fase_atual: "A" | "B" | "C" | "D";
  espinha: EspinhaNo[];
  assets: {
    protagonistas: Protagonista[];
    antagonista: AssetBase;
    ideia_controladora: AssetBase;
    mundo: AssetBase;
    genero: AssetBase;
    elenco_notas: { texto_livre: string };
  };
}

// Mesma chave de exibição do legado (frontend/src/quadro/EspinhaColuna.tsx):
// nós fixos têm rank fixo; complicações se espalham entre incidente e crise.
const ORDEM_FIXA: Record<string, number> = {
  incidente_incitante: 0,
  crise: 2,
  climax: 3,
  resolucao: 4,
};

export function chaveOrdenacao(no: EspinhaNo): number {
  if (no.tipo === "complicacao") return 1 + (no.ordem ?? 0) / 1000;
  return ORDEM_FIXA[no.id] ?? 99;
}

// Forma do estado compartilhado do grafo LangGraph (menos `messages`).
export interface AgentState {
  roteiro: RoteiroData | null;
}
