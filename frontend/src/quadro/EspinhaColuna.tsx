import { EditableField, StatusSelect } from "./campos";
import type { EspinhaNo, SugestaoCampo } from "./tipos";

const LABELS: Record<string, string> = {
  incidente_incitante: "Incidente incitante",
  crise: "Crise",
  climax: "Clímax",
  resolucao: "Resolução",
};

const ORDEM_FIXA: Record<string, number> = { incidente_incitante: 0, crise: 2, climax: 3, resolucao: 4 };

function chaveOrdenacao(no: EspinhaNo): number {
  if (no.tipo === "complicacao") return 1 + (no.ordem ?? 0) / 1000;
  return ORDEM_FIXA[no.id] ?? 99;
}

export function EspinhaColuna({
  espinha,
  onSalvar,
  sugestaoPara,
  onAdicionarComplicacao,
}: {
  espinha: EspinhaNo[];
  onSalvar: (indice: number, campo: "conteudo" | "status", valor: string) => void;
  sugestaoPara: (indice: number) => SugestaoCampo | undefined;
  onAdicionarComplicacao: () => void;
}) {
  const ordenado = espinha
    .map((no, indiceReal) => ({ no, indiceReal }))
    .sort((a, b) => chaveOrdenacao(a.no) - chaveOrdenacao(b.no));

  return (
    <div className="sr-rail">
      {ordenado.flatMap(({ no, indiceReal }, i) => {
        const sugestao = sugestaoPara(indiceReal);
        const preenchido = !!no.conteudo || !!sugestao;
        const elementos = [
          <div key={no.id} className={`sr-node ${preenchido ? "sr-node--preenchido" : "sr-node--vazio"}`}>
            <div className="sr-node__label">
              {no.tipo === "complicacao" ? `Complicação ${no.ordem}` : LABELS[no.id] ?? no.id}
            </div>
            <EditableField
              label=""
              value={no.conteudo}
              onSave={(v) => onSalvar(indiceReal, "conteudo", v)}
              placeholder="—"
              sugestao={sugestao}
            />
            <StatusSelect value={no.status} onSave={(v) => onSalvar(indiceReal, "status", v)} />
          </div>,
        ];

        const proximoNaoEComplicacao = ordenado[i + 1]?.no.tipo !== "complicacao";
        if (no.tipo === "complicacao" && proximoNaoEComplicacao) {
          elementos.push(
            <button key={`${no.id}-add`} className="sr-node__adicionar" onClick={onAdicionarComplicacao} type="button">
              + complicação
            </button>,
          );
        }
        return elementos;
      })}
    </div>
  );
}
