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

export async function atualizarRoteiro(id: string, updates: RoteiroUpdate[]): Promise<RoteiroResponse> {
  const res = await fetch(`${API_URL}/roteiros/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ updates }),
  });
  if (!res.ok) throw new Error(`Falha ao atualizar roteiro: ${res.status}`);
  return res.json();
}
