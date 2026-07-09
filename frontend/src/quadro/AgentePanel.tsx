import { AgenteChat } from "./AgenteChat";
import { DiagnosticoPainel } from "./DiagnosticoPainel";
import type { ItemDiagnostico, PropostaCampo, RoteiroResponse } from "../api";

export type AbaAgente = "conducao" | "diagnostico";

export function AgentePanel({
  roteiroId,
  aba,
  onAbaChange,
  onPropostas,
  onRoteiroAtualizado,
  diagnostico,
  diagnosticoCarregando,
  diagnosticoErro,
}: {
  roteiroId: string;
  aba: AbaAgente;
  onAbaChange: (aba: AbaAgente) => void;
  onPropostas: (propostas: PropostaCampo[]) => void;
  onRoteiroAtualizado: (roteiro: RoteiroResponse) => void;
  diagnostico: ItemDiagnostico[] | null;
  diagnosticoCarregando: boolean;
  diagnosticoErro: string | null;
}) {
  return (
    <div className="sr-agente-chat">
      <div className="sr-chat__header">
        <div className="sr-chat__avatar">S</div>
        <div className="sr-chat__titulo">Agente</div>
        <div className="sr-chat__abas">
          <button
            type="button"
            className={`sr-chat__aba ${aba === "conducao" ? "sr-chat__aba--ativa" : ""}`}
            onClick={() => onAbaChange("conducao")}
          >
            Condução
          </button>
          <button
            type="button"
            className={`sr-chat__aba ${aba === "diagnostico" ? "sr-chat__aba--ativa" : ""}`}
            onClick={() => onAbaChange("diagnostico")}
          >
            Diagnóstico
          </button>
        </div>
      </div>
      <AgenteChat
        roteiroId={roteiroId}
        onPropostas={onPropostas}
        onRoteiroAtualizado={onRoteiroAtualizado}
        visivel={aba === "conducao"}
      />
      {aba === "diagnostico" && (
        <DiagnosticoPainel itens={diagnostico} carregando={diagnosticoCarregando} erro={diagnosticoErro} />
      )}
    </div>
  );
}
