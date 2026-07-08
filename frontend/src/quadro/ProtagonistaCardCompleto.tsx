import { EditableField, StatusSelect } from "./campos";
import type { Protagonista } from "./tipos";

export function ProtagonistaCardCompleto({
  protagonista,
  onSalvar,
}: {
  protagonista: Protagonista;
  onSalvar: (campo: keyof Protagonista, valor: string) => void;
}) {
  return (
    <div className="sr-card">
      <div className="sr-card__header">
        <div className="sr-card__title">Protagonista</div>
        <StatusSelect value={protagonista.status} onSave={(v) => onSalvar("status", v)} />
      </div>
      <EditableField
        label="Desejo consciente (want)"
        value={protagonista.want}
        onSave={(v) => onSalvar("want", v)}
      />
      <EditableField
        label="Necessidade inconsciente (need)"
        value={protagonista.need}
        onSave={(v) => onSalvar("need", v)}
      />
      <EditableField label="A aposta" value={protagonista.aposta} onSave={(v) => onSalvar("aposta", v)} />
      <EditableField
        label="Caracterização"
        value={protagonista.caracterizacao}
        onSave={(v) => onSalvar("caracterizacao", v)}
      />
      <EditableField
        label="Caráter verdadeiro"
        value={protagonista.carater_verdadeiro}
        onSave={(v) => onSalvar("carater_verdadeiro", v)}
      />
      <EditableField label="Arco" value={protagonista.arco} onSave={(v) => onSalvar("arco", v)} />
      <EditableField
        label="POV / Distância narrativa"
        value={protagonista.pov}
        onSave={(v) => onSalvar("pov", v)}
      />
    </div>
  );
}
