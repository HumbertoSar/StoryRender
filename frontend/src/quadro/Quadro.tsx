import { useEffect, useState } from "react";
import "./quadro.css";
import { EspinhaColuna } from "./EspinhaColuna";
import { ProtagonistaCardCompleto } from "./ProtagonistaCardCompleto";
import { AntagonistaCard } from "./AntagonistaCard";
import { IdeiaControladoraCard } from "./IdeiaControladoraCard";
import { MundoCard } from "./MundoCard";
import { GeneroCard } from "./GeneroCard";
import { AgenteChat } from "./AgenteChat";
import { aplicarAtualizacoes } from "./imutavel";
import {
  adicionarComplicacao,
  atualizarRoteiro,
  excluirComplicacao,
  listarPropostasPendentes,
  moverComplicacao,
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

  function aplicarAcaoDeEspinha(
    promessa: Promise<RoteiroResponse>,
    aoSucesso: (roteiro: RoteiroResponse) => void,
    contextoErro: string,
  ) {
    promessa.then(aoSucesso).catch((err) => {
      registrarEvento(roteiro.id, "erro", { contexto: contextoErro, mensagem: (err as Error).message });
      console.error(`Falha ao ${contextoErro}:`, err);
    });
  }

  function adicionarNovaComplicacao() {
    aplicarAcaoDeEspinha(
      adicionarComplicacao(roteiro.id),
      (r) => {
        setData(r.data as unknown as RoteiroData);
        registrarEvento(roteiro.id, "espinha_no_adicionado", { tipo: "complicacao", origem: "manual" });
      },
      "adicionar_complicacao",
    );
  }

  function excluirComplicacaoDaEspinha(indice: number) {
    aplicarAcaoDeEspinha(
      excluirComplicacao(roteiro.id, indice),
      (r) => {
        setData(r.data as unknown as RoteiroData);
        setPropostas((prev) => prev.filter((p) => !(p.path[0] === "espinha" && p.path[1] === indice)));
        registrarEvento(roteiro.id, "espinha_no_excluido", { indice });
      },
      "excluir_complicacao",
    );
  }

  function moverComplicacaoNaEspinha(indice: number, direcao: "cima" | "baixo") {
    aplicarAcaoDeEspinha(
      moverComplicacao(roteiro.id, indice, direcao),
      (r) => {
        setData(r.data as unknown as RoteiroData);
        registrarEvento(roteiro.id, "espinha_no_movido", { indice, direcao });
      },
      "mover_complicacao",
    );
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
          onAdicionarComplicacao={adicionarNovaComplicacao}
          onExcluirComplicacao={excluirComplicacaoDaEspinha}
          onMoverComplicacao={moverComplicacaoNaEspinha}
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
            elencoNotas={data.assets.elenco_notas.texto_livre}
            onSalvarElenco={(valor) => salvar([{ path: ["assets", "elenco_notas", "texto_livre"], value: valor }])}
            sugestaoElenco={sugestaoDoPath(["assets", "elenco_notas", "texto_livre"])}
          />
          <IdeiaControladoraCard
            ideia={data.assets.ideia_controladora}
            onSalvar={(campo, valor) =>
              salvar([{ path: ["assets", "ideia_controladora", campo], value: valor }])
            }
            sugestaoPara={(campo) => sugestaoDoPath(["assets", "ideia_controladora", campo])}
          />
          <MundoCard
            mundo={data.assets.mundo}
            onSalvar={(campo, valor) => salvar([{ path: ["assets", "mundo", campo], value: valor }])}
            sugestaoPara={(campo) => sugestaoDoPath(["assets", "mundo", campo])}
          />
          <GeneroCard
            genero={data.assets.genero}
            onSalvar={(campo, valor) => salvar([{ path: ["assets", "genero", campo], value: valor }])}
            sugestaoPara={(campo) => sugestaoDoPath(["assets", "genero", campo])}
          />
        </div>
        <AgenteChat
          roteiroId={roteiro.id}
          onPropostas={receberPropostas}
          onRoteiroAtualizado={(r) => setData(r.data as unknown as RoteiroData)}
        />
      </div>
    </div>
  );
}
