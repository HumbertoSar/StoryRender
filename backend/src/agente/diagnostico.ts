import { z } from "zod";

const itemSchema = z.object({
  campo: z.string().min(1),
  problema: z.string().min(1),
  severidade: z.enum(["aviso", "critico"]),
});
export type ItemDiagnostico = z.infer<typeof itemSchema>;

const MARCADOR = /\n?DIAGNOSTICO:\s*(\[[\s\S]*\])\s*$/;

/**
 * O prompt já instrui "nunca sinalize campo vazio como problema", mas o
 * modelo não segue essa instrução de forma confiável (confirmado testando
 * ao vivo — ~metade das rodadas ainda flagava campos vazios como
 * "crítico"). Defesa igual à de CAMPOS_PROIBIDOS em propostas.ts: filtro
 * de texto pega o que a instrução sozinha não segura.
 */
const PADRAO_CAMPO_VAZIO =
  /\b(vazi[oa]s?|n[ãa]o\s+(?:foi|foram)?\s*preenchid|falta\s+preencher|sem\s+preencher|n[ãa]o\s+estabelecid|n[ãa]o\s+definid)/i;

/**
 * Diferente de extrairPropostas/extrairAcoes, aqui não existe "texto pra
 * mostrar no chat" — o Modo Diagnóstico não conversa, só devolve a lista.
 * Qualquer prosa que o modelo insista em incluir é descartada.
 */
export function extrairDiagnostico(respostaBruta: string): ItemDiagnostico[] {
  const match = respostaBruta.match(MARCADOR);
  if (!match) return [];

  try {
    const bruta = z.array(z.unknown()).parse(JSON.parse(match[1]));
    return bruta
      .map((item) => itemSchema.safeParse(item))
      .filter((resultado) => resultado.success)
      .map((resultado) => resultado.data)
      .filter((item) => !PADRAO_CAMPO_VAZIO.test(item.problema));
  } catch {
    return [];
  }
}
