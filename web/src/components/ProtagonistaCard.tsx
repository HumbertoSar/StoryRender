import { useEffect, useState } from "react";

import type { Protagonista } from "@/lib/roteiro";
import type { CampoProtagonista } from "@/lib/useRoteiro";

const CAMPOS: Array<{ chave: CampoProtagonista; rotulo: string }> = [
  { chave: "want", rotulo: "Want (desejo consciente)" },
  { chave: "need", rotulo: "Need (necessidade inconsciente)" },
  { chave: "aposta", rotulo: "Aposta (o que está em jogo)" },
];

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

export function ProtagonistaCard({
  protagonista,
  onSalvar,
}: {
  protagonista: Protagonista;
  onSalvar: (campo: CampoProtagonista, valor: string) => void;
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
        minWidth: 320,
      }}
    >
      <header style={{ display: "flex", justifyContent: "space-between" }}>
        <strong>Protagonista</strong>
        <span style={{ fontSize: 12, color: "#888" }}>{protagonista.status}</span>
      </header>
      {CAMPOS.map(({ chave, rotulo }) => (
        <CampoEditavel
          key={chave}
          rotulo={rotulo}
          valor={protagonista[chave] as string}
          onSalvar={(valor) => onSalvar(chave, valor)}
        />
      ))}
    </section>
  );
}
