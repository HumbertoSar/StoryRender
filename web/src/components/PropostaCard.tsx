"use client";

import { useState } from "react";

import { rotuloDoCampo, type AssetId } from "@/lib/cartoes";
import { useRoteiro } from "@/lib/useRoteiro";

export function PropostaCard({
  asset,
  campo,
  valor,
  justificativa,
  respond,
  status,
}: {
  asset: AssetId;
  campo: string;
  valor: string;
  justificativa?: string;
  respond?: (resultado: string) => void;
  status: "inProgress" | "executing" | "complete";
}) {
  const { salvarCampo } = useRoteiro();
  // O que ESTE card decidiu — o status do CopilotKit só diz "complete".
  const [decisao, setDecisao] = useState<"aceita" | "rejeitada" | null>(null);

  const pendente = status === "executing" && decisao === null;

  return (
    <div
      style={{
        border: "1px solid #b58900",
        borderRadius: 8,
        padding: 12,
        margin: "4px 0",
        display: "flex",
        flexDirection: "column",
        gap: 8,
      }}
    >
      <div style={{ fontSize: 12, color: "#888" }}>
        Proposta do agente · {rotuloDoCampo(asset, campo)}
      </div>
      <div style={{ fontStyle: "italic" }}>&ldquo;{valor}&rdquo;</div>
      {justificativa && <div style={{ fontSize: 13, color: "#888" }}>{justificativa}</div>}
      {pendente ? (
        <div style={{ display: "flex", gap: 8 }}>
          <button
            onClick={() => {
              salvarCampo(asset, campo, valor);
              setDecisao("aceita");
              respond?.("aceita — o campo foi atualizado no quadro");
            }}
            style={{ padding: "6px 14px", cursor: "pointer" }}
          >
            Aceitar
          </button>
          <button
            onClick={() => {
              setDecisao("rejeitada");
              respond?.("rejeitada pelo usuário");
            }}
            style={{ padding: "6px 14px", cursor: "pointer" }}
          >
            Rejeitar
          </button>
        </div>
      ) : (
        <div style={{ fontSize: 13, color: decisao === "aceita" ? "#2aa198" : "#888" }}>
          {decisao ? `Proposta ${decisao}` : "…"}
        </div>
      )}
    </div>
  );
}
