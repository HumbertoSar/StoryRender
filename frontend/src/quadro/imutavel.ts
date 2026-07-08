import type { RoteiroUpdate } from "../api";

export function aplicarAtualizacoes<T>(data: T, updates: RoteiroUpdate[]): T {
  const proximo = structuredClone(data) as Record<string | number, unknown>;
  for (const { path, value } of updates) {
    if (path.length === 0) continue;
    let alvo: Record<string | number, unknown> = proximo;
    for (let i = 0; i < path.length - 1; i++) {
      alvo = alvo[path[i]] as Record<string | number, unknown>;
    }
    alvo[path[path.length - 1]] = value;
  }
  return proximo as T;
}
