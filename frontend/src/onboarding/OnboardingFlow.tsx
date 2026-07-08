import { useEffect, useRef, useState } from "react";
import "./onboarding.css";
import { EspinhaRail, type NoEspinha, type NoStatus } from "./EspinhaRail";
import { ProtagonistaCard } from "./ProtagonistaCard";
import { ChatPanel, type ChatMessage } from "./ChatPanel";
import { A_DEFINIR, NAO_SEI, ONBOARDING_STEPS } from "./script";
import { atualizarRoteiro, registrarEvento, type RoteiroResponse, type RoteiroUpdate } from "../api";

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

function estadoDoRoteiro(data: Record<string, unknown>): OnboardingState {
  const assets = data.assets as Record<string, unknown>;
  const protagonista = (assets.protagonistas as Array<Record<string, unknown>>)[0];
  const genero = assets.genero as { generos: string[] };
  const espinha = data.espinha as Array<{ conteudo: string; status: NoStatus }>;

  const titulo = (data.titulo as string) ?? "";
  const generos = genero.generos ?? [];
  const want = (protagonista.want as string) ?? "";
  const incidente = espinha[INDICE_ESPINHA.incidente_incitante];
  const crise = espinha[INDICE_ESPINHA.crise];
  const climax = espinha[INDICE_ESPINHA.climax];

  let passo = 0;
  if (titulo) passo = 1;
  if (generos.length > 0) passo = 2;
  if (want) passo = 3;
  if (incidente.conteudo) passo = 4;
  if (crise.conteudo) passo = 5;
  if (climax.conteudo) passo = 6;

  const concluido = passo >= ONBOARDING_STEPS.length;

  const mensagens: ChatMessage[] =
    passo > 0 ? [{ from: "agente", texto: "Bem-vindo de volta — retomando de onde você parou." }] : [];
  if (!concluido) {
    mensagens.push({ from: "agente", texto: ONBOARDING_STEPS[passo].pergunta });
  }

  return {
    passo,
    concluido,
    titulo,
    generos,
    want,
    incidente: { conteudo: incidente.conteudo, status: incidente.status },
    crise: { conteudo: crise.conteudo, status: crise.status },
    climax: { conteudo: climax.conteudo, status: climax.status },
    mensagens,
  };
}

export function OnboardingFlow({
  onFaseC,
  onModoLivre,
  roteiroExistente,
}: {
  onFaseC: (roteiroId: string) => void;
  onModoLivre: (roteiroId: string) => void;
  roteiroExistente: RoteiroResponse;
}) {
  const [estado, setEstado] = useState<OnboardingState>(() => estadoDoRoteiro(roteiroExistente.data));
  const roteiroId = roteiroExistente.id;
  const passoInicialRef = useRef(estado.passo);

  useEffect(() => {
    registrarEvento(roteiroId, "tela", {
      tela: `onboarding_passo_${passoInicialRef.current}`,
      retomado: passoInicialRef.current > 0,
    });
    // roda só na montagem — transições subsequentes são registradas em avancar()
  }, [roteiroId]);

  const passoAtual = ONBOARDING_STEPS[estado.passo];

  function avancar(resposta: string, generosResposta?: string[]) {
    const passo = estado.passo;
    const updates = updatesParaPasso(passo, resposta, generosResposta);
    if (updates.length > 0) {
      atualizarRoteiro(roteiroId, updates).catch((err) => {
        registrarEvento(roteiroId, "erro", { contexto: "onboarding_avancar", mensagem: (err as Error).message });
        console.error("Falha ao persistir resposta:", err);
      });
    }
    registrarEvento(roteiroId, "tela", { tela: `onboarding_passo_${passo + 1}` });

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
          onPularModoLivre={() => onModoLivre(roteiroId)}
          concluido={estado.concluido}
          onContinuarComAgente={() => onFaseC(roteiroId)}
          onEditarNoQuadro={() => onModoLivre(roteiroId)}
        />
      </div>
    </div>
  );
}
