"use client";

import { useCoAgent } from "@copilotkit/react-core";

import type { AgentState, Protagonista } from "@/lib/roteiro";

export const CAMPOS_PROTAGONISTA = ["want", "need", "aposta"] as const;
export type CampoProtagonista = (typeof CAMPOS_PROTAGONISTA)[number];

// Um único ponto de acesso ao estado compartilhado + a mutação de campo do
// protagonista, usado tanto pelo quadro quanto pelo card de proposta no chat.
export function useRoteiro() {
  const { state, setState } = useCoAgent<AgentState>({
    name: "story_agent",
    initialState: { roteiro: null },
  });

  const salvarCampoProtagonista = (campo: CampoProtagonista, valor: string) => {
    if (!state.roteiro) return;
    const roteiro = structuredClone(state.roteiro);
    const prot: Protagonista = roteiro.assets.protagonistas[0];
    roteiro.assets.protagonistas[0] = {
      ...prot,
      [campo]: valor,
      status: prot.status === "vazio" ? "rascunho" : prot.status,
    };
    setState({ ...state, roteiro });
  };

  return { state, setState, salvarCampoProtagonista };
}
