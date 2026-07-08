import { EditableField, StatusSelect } from "./campos";
import type { IdeiaControladora, SugestaoCampo } from "./tipos";

export function IdeiaControladoraCard({
  ideia,
  onSalvar,
  sugestaoPara,
}: {
  ideia: IdeiaControladora;
  onSalvar: (campo: keyof IdeiaControladora, valor: string) => void;
  sugestaoPara: (campo: keyof IdeiaControladora) => SugestaoCampo | undefined;
}) {
  return (
    <div className="sr-card">
      <div className="sr-card__header">
        <div className="sr-card__title">Ideia Controladora</div>
        <StatusSelect value={ideia.status} onSave={(v) => onSalvar("status", v)} />
      </div>
      <EditableField
        label="Valor"
        value={ideia.valor}
        onSave={(v) => onSalvar("valor", v)}
        sugestao={sugestaoPara("valor")}
      />
      <EditableField
        label="Causa"
        value={ideia.causa}
        onSave={(v) => onSalvar("causa", v)}
        sugestao={sugestaoPara("causa")}
      />
      <EditableField
        label="Contraideia"
        value={ideia.contraideia}
        onSave={(v) => onSalvar("contraideia", v)}
        sugestao={sugestaoPara("contraideia")}
      />
      <div className="sr-card__nota">↳ prova-se no Clímax</div>
    </div>
  );
}
