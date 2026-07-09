import { z } from "zod";
import { extrairBlocoMarcado } from "./blocoMarcado.js";

const acaoSchema = z.union([
  z.object({ tipo: z.literal("criar_complicacao"), posicao: z.number().int().min(1).optional() }),
  z.object({
    tipo: z.literal("reordenar_complicacao"),
    id_complicacao: z.string().min(1),
    nova_posicao: z.number().int().min(1),
  }),
]);
export type Acao = z.infer<typeof acaoSchema>;

export function extrairAcoes(respostaBruta: string): { texto: string; acoes: Acao[] } {
  const { texto, itens } = extrairBlocoMarcado(respostaBruta, "ACOES", acaoSchema);
  return { texto, acoes: itens };
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
