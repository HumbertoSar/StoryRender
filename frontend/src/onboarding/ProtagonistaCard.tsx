import "./onboarding.css";

export function ProtagonistaCard({ want, conectaAssets }: { want: string; conectaAssets: string[] }) {
  return (
    <div className="sr-card sr-card--floating">
      <div className="sr-card__header">
        <div className="sr-card__title">Protagonista</div>
        <div className="sr-badge sr-badge--rascunho">rascunho</div>
      </div>
      <div className="sr-field">
        <div className="sr-field__label">Desejo consciente (want)</div>
        <div className="sr-field__valor">{want}</div>
      </div>
      <div className="sr-field">
        <div className="sr-field__label">Necessidade inconsciente (need)</div>
        <div className="sr-field__valor sr-field__valor--vazio">—</div>
      </div>
      <div className="sr-field">
        <div className="sr-field__label">A aposta</div>
        <div className="sr-field__valor sr-field__valor--vazio">—</div>
      </div>
      {conectaAssets.length === 0 ? (
        <div className="sr-card__nota">os outros campos abrem no aprofundamento — Fase C</div>
      ) : (
        <div className="sr-card__conexoes">
          {conectaAssets.map((c) => (
            <span key={c} className="sr-chip-conexao">
              ↳ {c}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
