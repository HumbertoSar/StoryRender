import { chaveOrdenacao, type EspinhaNo } from "@/lib/roteiro";

const LABELS: Record<string, string> = {
  incidente_incitante: "Incidente incitante",
  crise: "Crise",
  climax: "Clímax",
  resolucao: "Resolução",
};

export function EspinhaColuna({ espinha }: { espinha: EspinhaNo[] }) {
  const ordenado = espinha
    .filter((no) => !no.excluido)
    .sort((a, b) => chaveOrdenacao(a) - chaveOrdenacao(b));

  let posicao = 0;
  return (
    <section style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      <strong>Espinha dramática</strong>
      {ordenado.map((no) => {
        const rotulo =
          no.tipo === "complicacao" ? `Complicação ${++posicao}` : LABELS[no.id] ?? no.id;
        return (
          <div
            key={no.id}
            style={{
              border: "1px solid #ccc",
              borderLeft: no.tipo === "complicacao" ? "4px solid #b58900" : "4px solid #268bd2",
              borderRadius: 6,
              padding: "8px 12px",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: "#888" }}>
              <span>{rotulo}</span>
              <span>{no.status}</span>
            </div>
            <div>{no.conteudo || "—"}</div>
          </div>
        );
      })}
    </section>
  );
}
