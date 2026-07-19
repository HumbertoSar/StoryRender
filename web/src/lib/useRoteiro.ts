"use client";

import { useCoAgent } from "@copilotkit/react-core";

import type { AssetId } from "@/lib/cartoes";
import type { AgentState, AssetBase, RoteiroData } from "@/lib/roteiro";

// protagonistas é lista (multiprotagonista é P2); os demais são objetos.
function alvoDoAsset(roteiro: RoteiroData, asset: AssetId): AssetBase | undefined {
  const alvo =
    asset === "protagonistas" ? roteiro.assets.protagonistas?.[0] : roteiro.assets?.[asset];
  return alvo as unknown as AssetBase | undefined;
}

// Um único ponto de acesso ao estado compartilhado + a mutação genérica de
// campo de asset, usada pelo quadro e pelo card de proposta no chat.
export function useRoteiro() {
  const { state, setState } = useCoAgent<AgentState>({
    name: "story_agent",
    initialState: { roteiro: null },
  });

  const lerAsset = (asset: AssetId): AssetBase | undefined =>
    state.roteiro ? alvoDoAsset(state.roteiro, asset) : undefined;

  const salvarCampo = (asset: AssetId, campo: string, valor: string) => {
    if (!state.roteiro) return;
    const roteiro = structuredClone(state.roteiro);
    const alvo = alvoDoAsset(roteiro, asset);
    // O asset vem do MODELO (via propor_campo) — um nome inválido não pode
    // derrubar o clique de Aceitar.
    if (!alvo) return;
    alvo[campo] = valor;
    if (alvo.status === "vazio") alvo.status = "rascunho";
    setState({ ...state, roteiro });
  };

  return { state, setState, lerAsset, salvarCampo };
}
