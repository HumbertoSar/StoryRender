import { z } from "zod";

export interface PropostaCampo {
  path: (string | number)[];
  valor: unknown;
}

const propostaSchema = z.object({
  path: z.array(z.union([z.string(), z.number()])).min(1),
  valor: z.unknown(),
});

const MARCADOR = /\n?PROPOSTAS:\s*(\[[\s\S]*\])\s*$/;

export function extrairPropostas(respostaBruta: string): { texto: string; propostas: PropostaCampo[] } {
  const match = respostaBruta.match(MARCADOR);
  if (!match) return { texto: respostaBruta.trim(), propostas: [] };

  try {
    const propostas = z.array(propostaSchema).parse(JSON.parse(match[1]));
    return { texto: respostaBruta.slice(0, match.index).trim(), propostas };
  } catch {
    return { texto: respostaBruta.trim(), propostas: [] };
  }
}
