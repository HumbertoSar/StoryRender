import { useEffect, useState } from "react";
import "./home.css";
import { listarRoteiros, type RoteiroResumo } from "../api";

function editadoHa(iso: string): string {
  const dias = Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000);
  if (dias <= 0) return "editado hoje";
  if (dias === 1) return "editado ontem";
  if (dias < 7) return `editado há ${dias} dias`;
  const semanas = Math.floor(dias / 7);
  if (semanas === 1) return "editado há 1 semana";
  return `editado há ${semanas} semanas`;
}

export function Home() {
  const [roteiros, setRoteiros] = useState<RoteiroResumo[] | null>(null);

  useEffect(() => {
    listarRoteiros()
      .then(setRoteiros)
      .catch((err) => console.error("Falha ao listar roteiros:", err));
  }, []);

  function abrirRoteiro(id: string) {
    window.location.href = `/r/${id}`;
  }

  function novoRoteiro() {
    window.location.href = "/novo";
  }

  return (
    <div className="sr-home">
      <div className="sr-home__conteudo">
        <div className="sr-home__titulo">Story Render</div>
        <div className="sr-home__subtitulo">estruture antes de escrever</div>
        <div className="sr-home__secao-label">Seus roteiros</div>
        <div className="sr-home__lista">
          {roteiros?.length === 0 && <div className="sr-home__vazio">Nenhum roteiro ainda — comece um abaixo.</div>}
          {roteiros?.map((r) => (
            <button key={r.id} className="sr-home__card" onClick={() => abrirRoteiro(r.id)} type="button">
              <div className="sr-home__card-info">
                <div className="sr-home__card-titulo">{r.titulo || "Sem título"}</div>
                <div className="sr-home__card-meta">
                  {r.template.toUpperCase()} · FASE {r.fase_atual} · {editadoHa(r.updated_at).toUpperCase()}
                </div>
              </div>
            </button>
          ))}
          <button className="sr-home__novo" onClick={novoRoteiro} type="button">
            <div className="sr-home__novo-icone">+</div>
            <div className="sr-home__card-info">
              <div className="sr-home__novo-titulo">Novo roteiro</div>
              <div className="sr-home__novo-legenda">escolha o método e comece pela semente</div>
            </div>
          </button>
        </div>
      </div>
    </div>
  );
}
