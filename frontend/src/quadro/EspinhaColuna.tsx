import { EditableField, StatusSelect } from "./campos";
import type { EspinhaNo, SugestaoCampo } from "./tipos";

export function EspinhaColuna({
  espinha,
  onSalvar,
  sugestaoPara,
}: {
  espinha: EspinhaNo[];
  onSalvar: (indice: number, campo: "conteudo" | "status", valor: string) => void;
  sugestaoPara: (indice: number) => SugestaoCampo | undefined;
}) {
  const LABELS: Record<string, string> = {
    incidente_incitante: "Incidente incitante",
    crise: "Crise",
    climax: "Clímax",
    resolucao: "Resolução",
  };

  return (
    <div className="sr-rail">
      {espinha.map((no, i) => (
        <div key={no.id} className={`sr-node ${no.conteudo ? "sr-node--preenchido" : "sr-node--vazio"}`}>
          <div className="sr-node__label">
            {no.tipo === "complicacao" ? `Complicação ${no.ordem}` : LABELS[no.id] ?? no.id}
          </div>
          <EditableField
            label=""
            value={no.conteudo}
            onSave={(v) => onSalvar(i, "conteudo", v)}
            placeholder="—"
            sugestao={sugestaoPara(i)}
          />
          <StatusSelect value={no.status} onSave={(v) => onSalvar(i, "status", v)} />
        </div>
      ))}
    </div>
  );
}
