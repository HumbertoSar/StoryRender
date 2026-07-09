import { z } from "zod";

/**
 * PROPOSTAS/ACOES/DIAGNOSTICO seguem todos o mesmo formato: um bloco
 * "NOME: [...]" numa linha própria no fim da resposta do agente. Extração
 * compartilhada evita repetir (e desalinhar) a mesma lógica em 3 lugares —
 * já aconteceu uma vez (o fix de "sempre cortar o marcador do texto, mesmo
 * com JSON inválido" precisou ser aplicado em propostas.ts E acoes.ts
 * separadamente antes desta função existir).
 *
 * Sempre corta o bloco do texto mostrado ao usuário, mesmo quando o
 * conteúdo não é válido — sem isso, JSON malformado ou um item que o
 * modelo inventou vaza pro chat como texto técnico bruto. E cada item da
 * lista é validado individualmente (não a lista inteira de uma vez): um
 * item inválido no meio não derruba os outros itens válidos da mesma
 * resposta.
 */
export function extrairBlocoMarcado<T>(
  respostaBruta: string,
  nomeMarcador: string,
  itemSchema: z.ZodType<T>,
): { texto: string; itens: T[] } {
  const marcador = new RegExp(`\\n?${nomeMarcador}:\\s*(\\[[\\s\\S]*\\])\\s*$`);
  const match = respostaBruta.match(marcador);
  if (!match) return { texto: respostaBruta.trim(), itens: [] };

  const texto = respostaBruta.slice(0, match.index).trim();
  try {
    const bruta = z.array(z.unknown()).parse(JSON.parse(match[1]));
    const itens = bruta
      .map((item) => itemSchema.safeParse(item))
      .filter((resultado) => resultado.success)
      .map((resultado) => resultado.data);
    return { texto, itens };
  } catch {
    return { texto, itens: [] };
  }
}
