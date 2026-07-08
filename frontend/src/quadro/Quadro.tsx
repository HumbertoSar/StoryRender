import { useEffect, useState } from "react";
import "./quadro.css";
import { EspinhaColuna } from "./EspinhaColuna";
import { ProtagonistaCardCompleto } from "./ProtagonistaCardCompleto";
import { AntagonistaCard } from "./AntagonistaCard";
import { IdeiaControladoraCard } from "./IdeiaControladoraCard";
import { AgenteChat } from "./AgenteChat";
import { aplicarAtualizacoes } from "./imutavel";
import {
  atualizarRoteiro,
  listarPropostasPendentes,
  registrarEvento,
  resolverProposta,
  type PropostaCampo,
  type RoteiroResponse,
  type RoteiroUpdate,
} from "../api";
import type { RoteiroData, SugestaoCampo } from "./tipos";

export function Quadro({ roteiro }: { roteiro: RoteiroResponse }) {
  const [data, setData] = useState<RoteiroData>(roteiro.data as unknown as RoteiroData);
  const [propostas, setPropostas] = useState<PropostaCampo[]>([]);

  useEffect(() => {
    registrarEvento(roteiro.id, "tela", { tela: "quadro" });
  }, [roteiro.id]);

  useEffect(() => {
    listarPropostasPendentes(roteiro.id)
      .then(setPropostas)
      .catch((err) => console.error("Falha ao carregar propostas pendentes:", err));
  }, [roteiro.id]);

  function salvar(updates: RoteiroUpdate[]) {
    setData((prev) => aplicarAtualizacoes(prev, updates));
    for (const u of updates) registrarEvento(roteiro.id, "campo_editado", { path: u.path });
    atualizarRoteiro(roteiro.id, updates).catch((err) => {
      registrarEvento(roteiro.id, "erro", { contexto: "patch_roteiro", mensagem: (err as Error).message });
      console.error("Falha ao persistir edição:", err);
    });
  }

  function encontrarProposta(path: (string | number)[]): PropostaCampo | undefined {
    const chave = JSON.stringify(path);
    return propostas.find((p) => JSON.stringify(p.path) === chave);
  }

  function removerProposta(alvo: PropostaCampo) {
    setPropostas((prev) => prev.filter((p) => p !== alvo));
  }

  function resolver(proposta: PropostaCampo, acao: "aceitar" | "rejeitar") {
    registrarEvento(roteiro.id, "sugestao", { acao: acao === "aceitar" ? "aceita" : "rejeitada", path: proposta.path });
    if (acao === "aceitar") {
      setData((prev) => aplicarAtualizacoes(prev, [{ path: proposta.path, value: proposta.valor }]));
    }
    removerProposta(proposta);
    resolverProposta(roteiro.id, proposta.id, acao).catch((err) => {
      registrarEvento(roteiro.id, "erro", { contexto: "resolver_proposta", mensagem: (err as Error).message });
      console.error(`Falha ao ${acao} proposta:`, err);
    });
  }

  function sugestaoDoPath(path: (string | number)[]): SugestaoCampo | undefined {
    const proposta = encontrarProposta(path);
    if (!proposta) return undefined;
    return {
      valor: String(proposta.valor),
      aceitar: () => resolver(proposta, "aceitar"),
      rejeitar: () => resolver(proposta, "rejeitar"),
    };
  }

  function receberPropostas(novas: PropostaCampo[]) {
    for (const p of novas) registrarEvento(roteiro.id, "sugestao", { acao: "recebida", path: p.path });
    setPropostas((prev) => {
      const chavesNovas = new Set(novas.map((p) => JSON.stringify(p.path)));
      return [...prev.filter((p) => !chavesNovas.has(JSON.stringify(p.path))), ...novas];
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
          sugestaoPara={(indice) => sugestaoDoPath(["espinha", indice, "conteudo"])}
        />
        <div className="sr-cartoes">
          <ProtagonistaCardCompleto
            protagonista={protagonista}
            onSalvar={(campo, valor) =>
              salvar([{ path: ["assets", "protagonistas", 0, campo], value: valor }])
            }
            sugestaoPara={(campo) => sugestaoDoPath(["assets", "protagonistas", 0, campo])}
          />
          <AntagonistaCard
            antagonista={data.assets.antagonista}
            onSalvar={(campo, valor) => salvar([{ path: ["assets", "antagonista", campo], value: valor }])}
            sugestaoPara={(campo) => sugestaoDoPath(["assets", "antagonista", campo])}
          />
          <IdeiaControladoraCard
            ideia={data.assets.ideia_controladora}
            onSalvar={(campo, valor) =>
              salvar([{ path: ["assets", "ideia_controladora", campo], value: valor }])
            }
            sugestaoPara={(campo) => sugestaoDoPath(["assets", "ideia_controladora", campo])}
          />
        </div>
        <AgenteChat roteiroId={roteiro.id} onPropostas={receberPropostas} />
      </div>
    </div>
  );
}
