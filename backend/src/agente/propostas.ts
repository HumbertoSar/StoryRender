import { z } from "zod";
import { extrairBlocoMarcado } from "./blocoMarcado.js";

export interface PropostaCampo {
  path: (string | number)[];
  valor: unknown;
}

const propostaSchema = z.object({
  path: z.array(z.union([z.string(), z.number()])).min(1),
  valor: z.unknown(),
});

const CAMPOS_PROIBIDOS = new Set(["status", "niveis", "generos", "conecta_assets"]);

function ehCampoLivre(p: PropostaCampo): boolean {
  const ultimo = p.path.at(-1);
  return !(typeof ultimo === "string" && CAMPOS_PROIBIDOS.has(ultimo));
}

export function extrairPropostas(respostaBruta: string): { texto: string; propostas: PropostaCampo[] } {
  const { texto, itens } = extrairBlocoMarcado(respostaBruta, "PROPOSTAS", propostaSchema);
  return { texto, propostas: itens.filter(ehCampoLivre) };
}
