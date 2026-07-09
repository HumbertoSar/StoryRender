const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:3001";

export interface RoteiroUpdate {
  path: (string | number)[];
  value: unknown;
}

export interface RoteiroResponse {
  id: string;
  data: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface RoteiroResumo {
  id: string;
  titulo: string | null;
  template: string;
  fase_atual: string;
  updated_at: string;
}

export async function listarRoteiros(): Promise<RoteiroResumo[]> {
  const res = await fetch(`${API_URL}/roteiros`);
  if (!res.ok) throw new Error(`Falha ao listar roteiros: ${res.status}`);
  return res.json();
}

export async function criarRoteiro(): Promise<RoteiroResponse> {
  const res = await fetch(`${API_URL}/roteiros`, { method: "POST" });
  if (!res.ok) throw new Error(`Falha ao criar roteiro: ${res.status}`);
  return res.json();
}

export async function buscarRoteiro(id: string): Promise<RoteiroResponse> {
  const res = await fetch(`${API_URL}/roteiros/${id}`);
  if (!res.ok) throw new Error(`Falha ao buscar roteiro: ${res.status}`);
  return res.json();
}

export async function atualizarRoteiro(id: string, updates: RoteiroUpdate[]): Promise<RoteiroResponse> {
  const res = await fetch(`${API_URL}/roteiros/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ updates }),
  });
  if (!res.ok) throw new Error(`Falha ao atualizar roteiro: ${res.status}`);
  return res.json();
}

export interface HistoricoMensagem {
  from: "agente" | "usuario";
  texto: string;
}

export interface PropostaCampo {
  id: string;
  path: (string | number)[];
  valor: unknown;
}

export interface RespostaAgente {
  resposta: string;
  propostas: PropostaCampo[];
}

export async function enviarMensagemAgente(
  roteiroId: string,
  mensagem: string,
  historico: HistoricoMensagem[],
): Promise<RespostaAgente> {
  const res = await fetch(`${API_URL}/roteiros/${roteiroId}/mensagens`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ mensagem, historico }),
  });
  if (!res.ok) throw new Error(`Falha ao falar com o agente: ${res.status}`);
  const json = await res.json();
  return { resposta: json.resposta as string, propostas: (json.propostas as PropostaCampo[]) ?? [] };
}

export async function listarPropostasPendentes(roteiroId: string): Promise<PropostaCampo[]> {
  const res = await fetch(`${API_URL}/roteiros/${roteiroId}/propostas`);
  if (!res.ok) throw new Error(`Falha ao listar propostas: ${res.status}`);
  return res.json();
}

export async function resolverProposta(
  roteiroId: string,
  propostaId: string,
  acao: "aceitar" | "rejeitar",
): Promise<RoteiroResponse> {
  const res = await fetch(`${API_URL}/roteiros/${roteiroId}/propostas/${propostaId}/resolver`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ acao }),
  });
  if (!res.ok) throw new Error(`Falha ao resolver proposta: ${res.status}`);
  const json = await res.json();
  return json.roteiro as RoteiroResponse;
}

export async function adicionarComplicacao(roteiroId: string): Promise<RoteiroResponse> {
  const res = await fetch(`${API_URL}/roteiros/${roteiroId}/espinha/complicacoes`, { method: "POST" });
  if (!res.ok) throw new Error(`Falha ao adicionar complicação: ${res.status}`);
  return res.json();
}

export async function excluirComplicacao(roteiroId: string, indice: number): Promise<RoteiroResponse> {
  const res = await fetch(`${API_URL}/roteiros/${roteiroId}/espinha/complicacoes/${indice}/excluir`, {
    method: "POST",
  });
  if (!res.ok) throw new Error(`Falha ao excluir complicação: ${res.status}`);
  return res.json();
}

export async function moverComplicacao(
  roteiroId: string,
  indice: number,
  direcao: "cima" | "baixo",
): Promise<RoteiroResponse> {
  const res = await fetch(`${API_URL}/roteiros/${roteiroId}/espinha/complicacoes/${indice}/mover`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ direcao }),
  });
  if (!res.ok) throw new Error(`Falha ao mover complicação: ${res.status}`);
  return res.json();
}

export function registrarEvento(roteiroId: string, tipo: string, detalhes: Record<string, unknown> = {}): void {
  fetch(`${API_URL}/roteiros/${roteiroId}/eventos`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ tipo, detalhes }),
  }).catch((err) => {
    console.error("Falha ao registrar evento:", err);
  });
}
