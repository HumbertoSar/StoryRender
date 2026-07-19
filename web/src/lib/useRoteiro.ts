"use client";

import { useCoAgent } from "@copilotkit/react-core";

import type { AssetId } from "@/lib/cartoes";
import type { AgentState, Status } from "@/lib/roteiro";

interface AssetComCampos {
  status: Status;
  [campo: string]: unknown;
}

// Um único ponto de acesso ao estado compartilhado + a mutação genérica de
// campo de asset, usada pelo quadro e pelo card de proposta no chat.
export function useRoteiro() {
  const { state, setState } = useCoAgent<AgentState>({
    name: "story_agent",
    initialState: { roteiro: null },
  });

  const lerAsset = (asset: AssetId): AssetComCampos | undefined => {
    const assets = state.roteiro?.assets;
    if (!assets) return undefined;
    // protagonistas é lista (multiprotagonista é P2); os demais são objetos.
    return asset === "protagonistas"
      ? (assets.protagonistas[0] as unknown as AssetComCampos)
      : (assets[asset] as AssetComCampos);
  };

  const salvarCampo = (asset: AssetId, campo: string, valor: string) => {
    if (!state.roteiro) return;
    const roteiro = structuredClone(state.roteiro);
    const alvo =
      asset === "protagonistas"
        ? (roteiro.assets.protagonistas[0] as unknown as AssetComCampos)
        : (roteiro.assets[asset] as AssetComCampos);
    alvo[campo] = valor;
    if (alvo.status === "vazio") alvo.status = "rascunho";
    setState({ ...state, roteiro });
  };

  return { state, setState, lerAsset, salvarCampo };
}
