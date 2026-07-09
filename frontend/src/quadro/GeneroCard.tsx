import { ChipsField, EditableField, StatusSelect } from "./campos";
import type { Genero, SugestaoCampo } from "./tipos";

const GENEROS_OPCOES = ["Mistério", "Ficção especulativa", "Drama", "Thriller", "Fantasia", "Romance"];

export function GeneroCard({
  genero,
  onSalvar,
  sugestaoPara,
}: {
  genero: Genero;
  onSalvar: (campo: keyof Genero, valor: string | string[]) => void;
  sugestaoPara: (campo: keyof Genero) => SugestaoCampo | undefined;
}) {
  return (
    <div className="sr-card">
      <div className="sr-card__header">
        <div className="sr-card__title">Gênero & Promessa</div>
        <StatusSelect value={genero.status} onSave={(v) => onSalvar("status", v)} />
      </div>
      <ChipsField
        label="Gênero(s)"
        opcoes={GENEROS_OPCOES}
        valores={genero.generos}
        onSave={(v) => onSalvar("generos", v)}
      />
      <EditableField
        label="Promessa emocional"
        value={genero.promessa}
        onSave={(v) => onSalvar("promessa", v)}
        sugestao={sugestaoPara("promessa")}
      />
    </div>
  );
}
