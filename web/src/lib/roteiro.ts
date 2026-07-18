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

export interface RoteiroData {
  template: string;
  titulo: string;
  fase_atual: "A" | "B" | "C" | "D";
  assets: {
    protagonistas: Protagonista[];
  };
}

// Forma do estado compartilhado do grafo LangGraph (menos `messages`).
export interface AgentState {
  roteiro: RoteiroData | null;
}
