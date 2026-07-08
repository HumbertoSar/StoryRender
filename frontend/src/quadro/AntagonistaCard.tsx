import { ChipsField, EditableField, StatusSelect } from "./campos";
import type { Antagonista, SugestaoCampo } from "./tipos";

const NIVEIS_OPCOES = ["interno", "pessoal", "extra_pessoal"];

export function AntagonistaCard({
  antagonista,
  onSalvar,
  sugestaoPara,
}: {
  antagonista: Antagonista;
  onSalvar: (campo: keyof Antagonista, valor: string | string[]) => void;
  sugestaoPara: (campo: keyof Antagonista) => SugestaoCampo | undefined;
}) {
  return (
    <div className="sr-card">
      <div className="sr-card__header">
        <div className="sr-card__title">Forças Antagônicas</div>
        <StatusSelect value={antagonista.status} onSave={(v) => onSalvar("status", v)} />
      </div>
      <ChipsField
        label="Nível(is) da oposição"
        opcoes={NIVEIS_OPCOES}
        valores={antagonista.niveis}
        onSave={(v) => onSalvar("niveis", v)}
      />
      <EditableField
        label="Fonte de oposição"
        value={antagonista.fonte_oposicao}
        onSave={(v) => onSalvar("fonte_oposicao", v)}
        sugestao={sugestaoPara("fonte_oposicao")}
      />
      <EditableField
        label="Lógica interna do sistema"
        value={antagonista.logica_interna}
        onSave={(v) => onSalvar("logica_interna", v)}
        sugestao={sugestaoPara("logica_interna")}
      />
      <EditableField
        label="Avatar / manifestação concreta"
        value={antagonista.avatar}
        onSave={(v) => onSalvar("avatar", v)}
        sugestao={sugestaoPara("avatar")}
      />
      <EditableField
        label="Poder relativo"
        value={antagonista.poder_relativo}
        onSave={(v) => onSalvar("poder_relativo", v)}
        sugestao={sugestaoPara("poder_relativo")}
      />
    </div>
  );
}
