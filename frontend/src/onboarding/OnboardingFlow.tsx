import { useEffect, useRef, useState } from "react";
import "./onboarding.css";
import { EspinhaRail, type NoEspinha, type NoStatus } from "./EspinhaRail";
import { ProtagonistaCard } from "./ProtagonistaCard";
import { ChatPanel, type ChatMessage } from "./ChatPanel";
import { A_DEFINIR, NAO_SEI, ONBOARDING_STEPS } from "./script";
import { atualizarRoteiro, criarRoteiro, type RoteiroUpdate } from "../api";

const INDICE_ESPINHA = { incidente_incitante: 0, crise: 2, climax: 3 } as const;

function updatesParaPasso(passo: number, resposta: string, generos?: string[]): RoteiroUpdate[] {
  switch (passo) {
    case 0:
      return [{ path: ["titulo"], value: resposta }];
    case 1:
      return [
        { path: ["assets", "genero", "generos"], value: generos ?? [resposta] },
        { path: ["assets", "genero", "status"], value: "rascunho" },
      ];
    case 2:
      return [
        { path: ["assets", "protagonistas", 0, "want"], value: resposta },
        { path: ["assets", "protagonistas", 0, "status"], value: "rascunho" },
      ];
    case 3:
      return [
        { path: ["espinha", INDICE_ESPINHA.incidente_incitante, "conteudo"], value: resposta },
        { path: ["espinha", INDICE_ESPINHA.incidente_incitante, "status"], value: "rascunho" },
        { path: ["fase_atual"], value: "B" },
      ];
    case 4: {
      const valor = resposta === NAO_SEI ? A_DEFINIR : resposta;
      return [
        { path: ["espinha", INDICE_ESPINHA.crise, "conteudo"], value: valor },
        { path: ["espinha", INDICE_ESPINHA.crise, "status"], value: "esboço" },
      ];
    }
    case 5: {
      const valor = resposta === NAO_SEI ? A_DEFINIR : resposta;
      return [
        { path: ["espinha", INDICE_ESPINHA.climax, "conteudo"], value: valor },
        { path: ["espinha", INDICE_ESPINHA.climax, "status"], value: "esboço" },
      ];
    }
    default:
      return [];
  }
}

interface OnboardingState {
  passo: number;
  concluido: boolean;
  titulo: string;
  generos: string[];
  want: string;
  incidente: { conteudo: string; status: NoStatus };
  crise: { conteudo: string; status: NoStatus };
  climax: { conteudo: string; status: NoStatus };
  mensagens: ChatMessage[];
}

const ESTADO_INICIAL: OnboardingState = {
  passo: 0,
  concluido: false,
  titulo: "",
  generos: [],
  want: "",
  incidente: { conteudo: "", status: "vazio" },
  crise: { conteudo: "", status: "vazio" },
  climax: { conteudo: "", status: "vazio" },
  mensagens: [{ from: "agente", texto: ONBOARDING_STEPS[0].pergunta }],
};

export function OnboardingFlow({ onFaseC, onModoLivre }: { onFaseC: () => void; onModoLivre: () => void }) {
  const [estado, setEstado] = useState<OnboardingState>(ESTADO_INICIAL);
  const roteiroIdRef = useRef<string | null>(null);

  useEffect(() => {
    let cancelado = false;
    criarRoteiro()
      .then((r) => {
        if (!cancelado) roteiroIdRef.current = r.id;
      })
      .catch((err) => {
        console.error("Falha ao criar roteiro:", err);
      });
    return () => {
      cancelado = true;
    };
  }, []);

  const passoAtual = ONBOARDING_STEPS[estado.passo];

  function avancar(resposta: string, generosResposta?: string[]) {
    const passo = estado.passo;
    if (roteiroIdRef.current) {
      const updates = updatesParaPasso(passo, resposta, generosResposta);
      if (updates.length > 0) {
        atualizarRoteiro(roteiroIdRef.current, updates).catch((err) => {
          console.error("Falha ao persistir resposta:", err);
        });
      }
    }

    setEstado((prev) => {
      const proximo = { ...prev };
      proximo.mensagens = [...prev.mensagens, { from: "usuario", texto: resposta }];

      switch (prev.passo) {
        case 0:
          proximo.titulo = resposta;
          break;
        case 1:
          proximo.generos = generosResposta ?? [resposta];
          break;
        case 2:
          proximo.want = resposta;
          break;
        case 3:
          proximo.incidente = { conteudo: resposta, status: "rascunho" };
          break;
        case 4:
          proximo.crise = {
            conteudo: resposta === NAO_SEI ? A_DEFINIR : resposta,
            status: "esboço",
          };
          break;
        case 5:
          proximo.climax = {
            conteudo: resposta === NAO_SEI ? A_DEFINIR : resposta,
            status: "esboço",
          };
          break;
      }

      const proximoPasso = prev.passo + 1;
      const terminou = proximoPasso >= ONBOARDING_STEPS.length;

      proximo.mensagens.push({ from: "agente", texto: passoAtual.ack });
      if (!terminou) {
        proximo.mensagens.push({ from: "agente", texto: ONBOARDING_STEPS[proximoPasso].pergunta });
      }

      proximo.passo = proximoPasso;
      proximo.concluido = terminou;
      return proximo;
    });
  }

  const nos: NoEspinha[] = [
    { label: "Incidente incitante", conteudo: estado.incidente.conteudo, status: estado.incidente.status },
    { label: "Complicações progressivas", conteudo: "", status: "vazio" },
    { label: "Crise", conteudo: estado.crise.conteudo, status: estado.crise.status },
    { label: "Clímax", conteudo: estado.climax.conteudo, status: estado.climax.status },
    { label: "Resolução", conteudo: "", status: "vazio" },
  ];

  const conectaAssets: string[] = [];
  if (estado.incidente.conteudo) conectaAssets.push("Incidente");
  if (estado.crise.conteudo) conectaAssets.push("Crise");
  if (estado.climax.conteudo) conectaAssets.push("Clímax");

  return (
    <div className="sr-onboarding">
      <div className="sr-topbar">
        <div className="sr-topbar__titulo">Story Render</div>
        <div className="sr-topbar__metodo">McKee</div>
        <div style={{ flex: 1 }} />
        <div className={`sr-topbar__fase ${estado.concluido ? "sr-topbar__fase--concluida" : ""}`}>
          {estado.concluido ? "FASE B ✓ — ESQUELETO PRONTO" : `FASE ${passoAtual?.fase ?? "B"}`}
        </div>
      </div>
      <div className="sr-corpo">
        <div className="sr-quadro">
          {estado.titulo && (
            <div className="sr-quadro__semente">
              <div className="sr-quadro__semente-label">semente</div>
              <div className="sr-quadro__semente-texto">{estado.titulo}</div>
            </div>
          )}
          {estado.generos.length > 0 && (
            <div className="sr-quadro__generos">{estado.generos.join(" · ")}</div>
          )}
          <EspinhaRail nos={nos} />
          {estado.want && <ProtagonistaCard want={estado.want} conectaAssets={conectaAssets} />}
        </div>
        <ChatPanel
          mensagens={estado.mensagens}
          passoAtual={Math.min(estado.passo + 1, ONBOARDING_STEPS.length)}
          totalPassos={ONBOARDING_STEPS.length}
          tipoInput={estado.concluido ? null : passoAtual.tipo}
          onResponderTexto={avancar}
          onResponderGenero={(generos) => avancar(generos.join(", "), generos)}
          onPularModoLivre={onModoLivre}
          concluido={estado.concluido}
          onContinuarComAgente={onFaseC}
          onEditarNoQuadro={onModoLivre}
        />
      </div>
    </div>
  );
}
