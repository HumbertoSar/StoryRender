import { useState } from "react";
import "./quadro.css";
import { EspinhaColuna } from "./EspinhaColuna";
import { ProtagonistaCardCompleto } from "./ProtagonistaCardCompleto";
import { AntagonistaCard } from "./AntagonistaCard";
import { IdeiaControladoraCard } from "./IdeiaControladoraCard";
import { aplicarAtualizacoes } from "./imutavel";
import { atualizarRoteiro, type RoteiroResponse, type RoteiroUpdate } from "../api";
import type { RoteiroData } from "./tipos";

export function Quadro({ roteiro }: { roteiro: RoteiroResponse }) {
  const [data, setData] = useState<RoteiroData>(roteiro.data as unknown as RoteiroData);

  function salvar(updates: RoteiroUpdate[]) {
    setData((prev) => aplicarAtualizacoes(prev, updates));
    atualizarRoteiro(roteiro.id, updates).catch((err) => {
      console.error("Falha ao persistir edição:", err);
    });
  }

  const protagonista = data.assets.protagonistas[0];

  return (
    <div className="sr-onboarding">
      <div className="sr-topbar">
        <div className="sr-topbar__titulo">{data.titulo || "Story Render"}</div>
        <div className="sr-topbar__metodo">McKee</div>
        <div style={{ flex: 1 }} />
        <div className="sr-topbar__fase">
          {["A", "B", "C", "D"].map((f) => (
            <span key={f} className={f === data.fase_atual ? "sr-fase-ativa" : "sr-fase-inativa"}>
              {f}
            </span>
          ))}
        </div>
      </div>
      <div className="sr-quadro-corpo">
        <EspinhaColuna
          espinha={data.espinha}
          onSalvar={(indice, campo, valor) => salvar([{ path: ["espinha", indice, campo], value: valor }])}
        />
        <div className="sr-cartoes">
          <ProtagonistaCardCompleto
            protagonista={protagonista}
            onSalvar={(campo, valor) =>
              salvar([{ path: ["assets", "protagonistas", 0, campo], value: valor }])
            }
          />
          <AntagonistaCard
            antagonista={data.assets.antagonista}
            onSalvar={(campo, valor) => salvar([{ path: ["assets", "antagonista", campo], value: valor }])}
          />
          <IdeiaControladoraCard
            ideia={data.assets.ideia_controladora}
            onSalvar={(campo, valor) =>
              salvar([{ path: ["assets", "ideia_controladora", campo], value: valor }])
            }
          />
        </div>
        <div className="sr-agente-placeholder">
          <div className="sr-agente-placeholder__titulo">Agente</div>
          <div className="sr-agente-placeholder__texto">
            Os modos Condução e Diagnóstico chegam numa próxima fatia — por enquanto, edite os cartões e a espinha
            direto aqui ao lado.
          </div>
        </div>
      </div>
    </div>
  );
}
