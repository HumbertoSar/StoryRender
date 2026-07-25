import { useEffect, useRef, useState } from "react";

import type { CartaoDef } from "@/lib/cartoes";

// Porte do legado (frontend/src/quadro/campos.tsx): o campo cresce sozinho
// pra caber o texto (ex.: proposta aceita); o usuário ainda pode encolher
// pelo resize do textarea se quiser.
function useAutoAltura(valor: string) {
  const ref = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${el.scrollHeight}px`;
  }, [valor]);

  return ref;
}

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
  // O ajuste é feito DURANTE o render (padrão do React pra estado derivado de
  // prop), não num useEffect: setState dentro de efeito só roda depois da
  // pintura, então o campo chegava a exibir o rascunho velho por um frame — e
  // gerava render em cascata (era o erro react-hooks/set-state-in-effect).
  const [texto, setTexto] = useState(valor);
  const [valorSincronizado, setValorSincronizado] = useState(valor);
  if (valor !== valorSincronizado) {
    setValorSincronizado(valor);
    setTexto(valor);
  }
  const ref = useAutoAltura(texto);

  return (
    <div>
      <div style={{ fontSize: 12, color: "#888" }}>{rotulo}</div>
      <textarea
        ref={ref}
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
