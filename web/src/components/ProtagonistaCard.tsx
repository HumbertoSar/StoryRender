import type { Protagonista } from "@/lib/roteiro";

const CAMPOS: Array<{ chave: keyof Protagonista; rotulo: string }> = [
  { chave: "want", rotulo: "Want (desejo consciente)" },
  { chave: "need", rotulo: "Need (necessidade inconsciente)" },
  { chave: "aposta", rotulo: "Aposta (o que está em jogo)" },
];

export function ProtagonistaCard({ protagonista }: { protagonista: Protagonista }) {
  return (
    <section
      style={{
        border: "1px solid #ccc",
        borderRadius: 8,
        padding: 16,
        display: "flex",
        flexDirection: "column",
        gap: 12,
      }}
    >
      <header style={{ display: "flex", justifyContent: "space-between" }}>
        <strong>Protagonista</strong>
        <span style={{ fontSize: 12, color: "#888" }}>{protagonista.status}</span>
      </header>
      {CAMPOS.map(({ chave, rotulo }) => (
        <div key={chave}>
          <div style={{ fontSize: 12, color: "#888" }}>{rotulo}</div>
          <div>{protagonista[chave] || "—"}</div>
        </div>
      ))}
    </section>
  );
}
