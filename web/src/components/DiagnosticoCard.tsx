"use client";

export interface ItemDiagnostico {
  campo: string;
  problema: string;
  severidade: "aviso" | "critico";
}

// Porte do legado (backend/src/agente/diagnostico.ts): o prompt proíbe
// flagar campo vazio como problema, mas o modelo não obedece de forma
// confiável — o filtro de texto segura o que a instrução sozinha não segura.
const PADRAO_CAMPO_VAZIO =
  /\b(vazi[oa]s?|n[ãa]o\s+(?:foi|foram)?\s*preenchid|falta\s+preencher|sem\s+preencher|n[ãa]o\s+estabelecid|n[ãa]o\s+definid)/i;

export function DiagnosticoCard({ itens: itensBrutos }: { itens: ItemDiagnostico[] }) {
  const itens = (itensBrutos ?? []).filter((i) => !PADRAO_CAMPO_VAZIO.test(i?.problema ?? ""));
  if (itens.length === 0) {
    return (
      <div style={{ border: "1px solid #2aa198", borderRadius: 8, padding: 12, margin: "4px 0" }}>
        Diagnóstico: nenhuma inconsistência encontrada nos testes de coerência.
      </div>
    );
  }
  return (
    <div
      style={{
        border: "1px solid #ccc",
        borderRadius: 8,
        padding: 12,
        margin: "4px 0",
        display: "flex",
        flexDirection: "column",
        gap: 10,
      }}
    >
      <strong style={{ fontSize: 13 }}>Diagnóstico · {itens.length} ponto(s)</strong>
      {itens.map((item, i) => (
        <div key={i} style={{ display: "flex", gap: 8, alignItems: "baseline" }}>
          <span
            style={{
              fontSize: 11,
              padding: "1px 8px",
              borderRadius: 10,
              whiteSpace: "nowrap",
              border: `1px solid ${item.severidade === "critico" ? "#dc322f" : "#b58900"}`,
              color: item.severidade === "critico" ? "#dc322f" : "#b58900",
            }}
          >
            {item.severidade}
          </span>
          <span>
            <strong>{item.campo}:</strong> {item.problema}
          </span>
        </div>
      ))}
    </div>
  );
}
