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

export async function enviarMensagemAgente(
  roteiroId: string,
  mensagem: string,
  historico: HistoricoMensagem[],
): Promise<string> {
  const res = await fetch(`${API_URL}/roteiros/${roteiroId}/mensagens`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ mensagem, historico }),
  });
  if (!res.ok) throw new Error(`Falha ao falar com o agente: ${res.status}`);
  const json = await res.json();
  return json.resposta as string;
}
