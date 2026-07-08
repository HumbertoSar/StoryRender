import { EditableField, StatusSelect } from "./campos";
import type { IdeiaControladora } from "./tipos";

export function IdeiaControladoraCard({
  ideia,
  onSalvar,
}: {
  ideia: IdeiaControladora;
  onSalvar: (campo: keyof IdeiaControladora, valor: string) => void;
}) {
  return (
    <div className="sr-card">
      <div className="sr-card__header">
        <div className="sr-card__title">Ideia Controladora</div>
        <StatusSelect value={ideia.status} onSave={(v) => onSalvar("status", v)} />
      </div>
      <EditableField label="Valor" value={ideia.valor} onSave={(v) => onSalvar("valor", v)} />
      <EditableField label="Causa" value={ideia.causa} onSave={(v) => onSalvar("causa", v)} />
      <EditableField label="Contraideia" value={ideia.contraideia} onSave={(v) => onSalvar("contraideia", v)} />
      <div className="sr-card__nota">↳ prova-se no Clímax</div>
    </div>
  );
}
