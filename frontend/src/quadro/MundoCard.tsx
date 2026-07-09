import { EditableField, StatusSelect } from "./campos";
import type { Mundo, SugestaoCampo } from "./tipos";

export function MundoCard({
  mundo,
  onSalvar,
  sugestaoPara,
}: {
  mundo: Mundo;
  onSalvar: (campo: keyof Mundo, valor: string) => void;
  sugestaoPara: (campo: keyof Mundo) => SugestaoCampo | undefined;
}) {
  return (
    <div className="sr-card">
      <div className="sr-card__header">
        <div className="sr-card__title">Mundo da História</div>
        <StatusSelect value={mundo.status} onSave={(v) => onSalvar("status", v)} />
      </div>
      <div className="sr-card__linha">
        <EditableField
          label="Época"
          value={mundo.epoca}
          onSave={(v) => onSalvar("epoca", v)}
          sugestao={sugestaoPara("epoca")}
        />
        <EditableField
          label="Local"
          value={mundo.local}
          onSave={(v) => onSalvar("local", v)}
          sugestao={sugestaoPara("local")}
        />
      </div>
      <EditableField
        label="Regras / custo"
        value={mundo.regras_custo}
        onSave={(v) => onSalvar("regras_custo", v)}
        sugestao={sugestaoPara("regras_custo")}
      />
      <div className="sr-card__nota">↳ pano de fundo de toda a espinha</div>
    </div>
  );
}
