import { z } from "zod";
import { extrairBlocoMarcado } from "./blocoMarcado.js";

const itemSchema = z.object({
  campo: z.string().min(1),
  problema: z.string().min(1),
  severidade: z.enum(["aviso", "critico"]),
});
export type ItemDiagnostico = z.infer<typeof itemSchema>;

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
  const { itens } = extrairBlocoMarcado(respostaBruta, "DIAGNOSTICO", itemSchema);
  return itens.filter((item) => !PADRAO_CAMPO_VAZIO.test(item.problema));
}
