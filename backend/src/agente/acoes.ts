import { z } from "zod";

const acaoSchema = z.object({
  tipo: z.enum(["criar_complicacao"]),
  posicao: z.number().int().min(1).optional(),
});
export type Acao = z.infer<typeof acaoSchema>;

const MARCADOR = /\n?ACOES:\s*(\[[\s\S]*\])\s*$/;

export function extrairAcoes(respostaBruta: string): { texto: string; acoes: Acao[] } {
  const match = respostaBruta.match(MARCADOR);
  if (!match) return { texto: respostaBruta.trim(), acoes: [] };

  try {
    const acoes = z.array(acaoSchema).parse(JSON.parse(match[1]));
    return { texto: respostaBruta.slice(0, match.index).trim(), acoes };
  } catch {
    return { texto: respostaBruta.trim(), acoes: [] };
  }
}

const SENTINELA_NOVA_COMPLICACAO = /^nova_(\d+)$/;

/**
 * Substitui o placeholder "nova_N" (a N-ésima complicação criada pela ação
 * ACOES desta resposta, na ordem em que apareceu) pelo índice real que o
 * backend acabou de atribuir a ela. O modelo nunca sabe esse índice de
 * antemão — só o backend, depois de criar o nó de verdade. Propostas que
 * referenciam um "nova_N" sem ação correspondente são descartadas.
 */
export function remapearNovasComplicacoes<T extends { path: (string | number)[] }>(
  propostas: T[],
  indicesNovasComplicacoes: number[],
): T[] {
  return propostas.flatMap((proposta) => {
    let invalida = false;
    const path = proposta.path.map((segmento) => {
      const match = typeof segmento === "string" ? segmento.match(SENTINELA_NOVA_COMPLICACAO) : null;
      if (!match) return segmento;
      const indice = indicesNovasComplicacoes[Number(match[1])];
      if (indice === undefined) {
        invalida = true;
        return segmento;
      }
      return indice;
    });
    return invalida ? [] : [{ ...proposta, path }];
  });
}
