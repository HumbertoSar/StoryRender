import { EditableField, StatusSelect } from "./campos";
import type { Protagonista, SugestaoCampo } from "./tipos";

export function ProtagonistaCardCompleto({
  protagonista,
  onSalvar,
  sugestaoPara,
}: {
  protagonista: Protagonista;
  onSalvar: (campo: keyof Protagonista, valor: string) => void;
  sugestaoPara: (campo: keyof Protagonista) => SugestaoCampo | undefined;
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
        sugestao={sugestaoPara("want")}
      />
      <EditableField
        label="Necessidade inconsciente (need)"
        value={protagonista.need}
        onSave={(v) => onSalvar("need", v)}
        sugestao={sugestaoPara("need")}
      />
      <EditableField
        label="A aposta"
        value={protagonista.aposta}
        onSave={(v) => onSalvar("aposta", v)}
        sugestao={sugestaoPara("aposta")}
      />
      <EditableField
        label="Caracterização"
        value={protagonista.caracterizacao}
        onSave={(v) => onSalvar("caracterizacao", v)}
        sugestao={sugestaoPara("caracterizacao")}
      />
      <EditableField
        label="Caráter verdadeiro"
        value={protagonista.carater_verdadeiro}
        onSave={(v) => onSalvar("carater_verdadeiro", v)}
        sugestao={sugestaoPara("carater_verdadeiro")}
      />
      <EditableField
        label="Arco"
        value={protagonista.arco}
        onSave={(v) => onSalvar("arco", v)}
        sugestao={sugestaoPara("arco")}
      />
      <EditableField
        label="POV / Distância narrativa"
        value={protagonista.pov}
        onSave={(v) => onSalvar("pov", v)}
        sugestao={sugestaoPara("pov")}
      />
    </div>
  );
}
