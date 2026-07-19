import { useEffect, useState } from "react";

import type { CartaoDef } from "@/lib/cartoes";

function CampoEditavel({
  rotulo,
  valor,
  onSalvar,
}: {
  rotulo: string;
  valor: string;
  onSalvar: (valor: string) => void;
}) {
  // Rascunho local enquanto digita; sincroniza quando o agente muda o valor.
  const [texto, setTexto] = useState(valor);
  useEffect(() => setTexto(valor), [valor]);

  return (
    <div>
      <div style={{ fontSize: 12, color: "#888" }}>{rotulo}</div>
      <textarea
        value={texto}
        placeholder="—"
        onChange={(e) => setTexto(e.target.value)}
        onBlur={() => {
          if (texto !== valor) onSalvar(texto);
        }}
        rows={2}
        style={{
          width: "100%",
          resize: "vertical",
          font: "inherit",
          background: "transparent",
          color: "inherit",
          border: "1px solid transparent",
          borderRadius: 4,
          padding: 4,
        }}
      />
    </div>
  );
}

export function CartaoAsset({
  def,
  dados,
  onSalvar,
}: {
  def: CartaoDef;
  dados: Record<string, unknown>;
  onSalvar: (campo: string, valor: string) => void;
}) {
  return (
    <section
      style={{
        border: "1px solid #ccc",
        borderRadius: 8,
        padding: 16,
        display: "flex",
        flexDirection: "column",
        gap: 12,
        minWidth: 300,
        flex: "1 1 300px",
        maxWidth: 420,
      }}
    >
      <header style={{ display: "flex", justifyContent: "space-between" }}>
        <strong>{def.titulo}</strong>
        <span style={{ fontSize: 12, color: "#888" }}>{String(dados.status ?? "")}</span>
      </header>
      {def.campos.map(({ chave, rotulo }) => (
        <CampoEditavel
          key={chave}
          rotulo={rotulo}
          valor={String(dados[chave] ?? "")}
          onSalvar={(valor) => onSalvar(chave, valor)}
        />
      ))}
    </section>
  );
}
