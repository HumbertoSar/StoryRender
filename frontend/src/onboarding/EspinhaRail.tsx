import "./onboarding.css";

export type NoStatus = "vazio" | "rascunho" | "esboço" | "testado" | "validado";

export interface NoEspinha {
  label: string;
  conteudo: string;
  status: NoStatus;
}

export function EspinhaRail({ nos }: { nos: NoEspinha[] }) {
  return (
    <div className="sr-rail">
      {nos.map((no) => (
        <div key={no.label} className={`sr-node sr-node--${no.status === "vazio" ? "vazio" : "preenchido"}`}>
          <div className="sr-node__label">{no.label}</div>
          <div className={`sr-node__conteudo ${no.conteudo ? "" : "sr-node__conteudo--vazio"}`}>
            {no.conteudo || "—"}
          </div>
          <div className={`sr-badge sr-badge--${no.status}`}>{no.status}</div>
        </div>
      ))}
    </div>
  );
}
