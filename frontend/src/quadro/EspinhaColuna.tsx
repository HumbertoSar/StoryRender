import { useEffect, useRef, useState } from "react";
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

function useMenuAberto() {
  const [aberto, setAberto] = useState<number | null>(null);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (aberto === null) return;
    function aoClicarFora(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setAberto(null);
    }
    document.addEventListener("mousedown", aoClicarFora);
    return () => document.removeEventListener("mousedown", aoClicarFora);
  }, [aberto]);

  return { aberto, setAberto, ref };
}

export function EspinhaColuna({
  espinha,
  onSalvar,
  sugestaoPara,
  onAdicionarComplicacao,
  onExcluirComplicacao,
  onMoverComplicacao,
}: {
  espinha: EspinhaNo[];
  onSalvar: (indice: number, campo: "conteudo" | "status", valor: string) => void;
  sugestaoPara: (indice: number) => SugestaoCampo | undefined;
  onAdicionarComplicacao: () => void;
  onExcluirComplicacao: (indice: number) => void;
  onMoverComplicacao: (indice: number, direcao: "cima" | "baixo") => void;
}) {
  const menu = useMenuAberto();

  const visiveis = espinha
    .map((no, indiceReal) => ({ no, indiceReal }))
    .filter(({ no }) => !no.excluido);
  const ordenado = visiveis.slice().sort((a, b) => chaveOrdenacao(a.no) - chaveOrdenacao(b.no));
  const complicacoesVisiveis = ordenado.filter(({ no }) => no.tipo === "complicacao");

  return (
    <div className="sr-rail" ref={menu.ref}>
      {ordenado.flatMap(({ no, indiceReal }, i) => {
        const sugestao = sugestaoPara(indiceReal);
        const preenchido = !!no.conteudo || !!sugestao;
        const posicaoComplicacao = complicacoesVisiveis.findIndex((c) => c.indiceReal === indiceReal);
        const label = no.tipo === "complicacao" ? `Complicação ${posicaoComplicacao + 1}` : LABELS[no.id] ?? no.id;

        const elementos = [
          <div key={no.id} className={`sr-node ${preenchido ? "sr-node--preenchido" : "sr-node--vazio"}`}>
            <div className="sr-node__topo">
              <div className="sr-node__label">{label}</div>
              {no.tipo === "complicacao" && (
                <div className="sr-node__menu">
                  <button
                    type="button"
                    className="sr-node__menu-botao"
                    onClick={() => menu.setAberto(menu.aberto === indiceReal ? null : indiceReal)}
                  >
                    ⋯
                  </button>
                  {menu.aberto === indiceReal && (
                    <div className="sr-node__menu-lista">
                      <button
                        type="button"
                        disabled={posicaoComplicacao === 0}
                        onClick={() => {
                          onMoverComplicacao(indiceReal, "cima");
                          menu.setAberto(null);
                        }}
                      >
                        mover pra cima
                      </button>
                      <button
                        type="button"
                        disabled={posicaoComplicacao === complicacoesVisiveis.length - 1}
                        onClick={() => {
                          onMoverComplicacao(indiceReal, "baixo");
                          menu.setAberto(null);
                        }}
                      >
                        mover pra baixo
                      </button>
                      <div className="sr-node__menu-separador" />
                      <button
                        type="button"
                        className="sr-node__menu-destrutivo"
                        onClick={() => {
                          onExcluirComplicacao(indiceReal);
                          menu.setAberto(null);
                        }}
                      >
                        excluir complicação
                      </button>
                    </div>
                  )}
                </div>
              )}
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
