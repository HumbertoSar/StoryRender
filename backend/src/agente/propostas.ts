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

const CAMPOS_PROIBIDOS = new Set(["status", "niveis", "generos", "conecta_assets"]);

function ehCampoLivre(p: PropostaCampo): boolean {
  const ultimo = p.path.at(-1);
  return !(typeof ultimo === "string" && CAMPOS_PROIBIDOS.has(ultimo));
}

/**
 * Sempre retira o bloco PROPOSTAS do texto mostrado ao usuário, mesmo
 * quando o conteúdo não é válido — sem isso, um JSON malformado vaza pro
 * chat como texto técnico bruto. E cada item é validado individualmente
 * (não a lista inteira de uma vez): uma proposta malformada no meio não
 * deve descartar as outras propostas válidas da mesma resposta.
 */
export function extrairPropostas(respostaBruta: string): { texto: string; propostas: PropostaCampo[] } {
  const match = respostaBruta.match(MARCADOR);
  if (!match) return { texto: respostaBruta.trim(), propostas: [] };

  const texto = respostaBruta.slice(0, match.index).trim();
  try {
    const bruta = z.array(z.unknown()).parse(JSON.parse(match[1]));
    const propostas = bruta
      .map((item) => propostaSchema.safeParse(item))
      .filter((resultado) => resultado.success)
      .map((resultado) => resultado.data)
      .filter(ehCampoLivre);
    return { texto, propostas };
  } catch {
    return { texto, propostas: [] };
  }
}
