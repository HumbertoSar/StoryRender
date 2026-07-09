import type { ItemDiagnostico } from "../api";

export function DiagnosticoPainel({
  itens,
  carregando,
  erro,
}: {
  itens: ItemDiagnostico[] | null;
  carregando: boolean;
  erro: string | null;
}) {
  return (
    <div className="sr-diagnostico">
      {carregando && <div className="sr-diagnostico__estado">Revisando o esquema…</div>}
      {!carregando && erro && <div className="sr-agente-erro">Falha ao revisar: {erro}</div>}
      {!carregando && !erro && itens === null && (
        <div className="sr-diagnostico__estado">Clique em "Revisar" na barra superior pra rodar o diagnóstico.</div>
      )}
      {!carregando && !erro && itens !== null && itens.length === 0 && (
        <div className="sr-diagnostico__estado">Nenhum problema encontrado no estágio atual do roteiro.</div>
      )}
      {!carregando &&
        !erro &&
        itens !== null &&
        itens.length > 0 &&
        itens.map((item, i) => (
          <div key={i} className={`sr-diagnostico__item sr-diagnostico__item--${item.severidade}`}>
            <div className="sr-diagnostico__campo">{item.campo}</div>
            <div className="sr-diagnostico__problema">{item.problema}</div>
          </div>
        ))}
    </div>
  );
}
