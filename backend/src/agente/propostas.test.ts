import { describe, expect, it } from "vitest";
import { extrairPropostas } from "./propostas.js";

describe("extrairPropostas", () => {
  it("retorna texto sem propostas quando não há bloco PROPOSTAS", () => {
    const { texto, propostas } = extrairPropostas("Só uma resposta em texto, sem sugestão nenhuma.");
    expect(texto).toBe("Só uma resposta em texto, sem sugestão nenhuma.");
    expect(propostas).toEqual([]);
  });

  it("separa o texto do bloco PROPOSTAS e faz parse do JSON", () => {
    const bruta = `Beleza, vou propor um want.\nPROPOSTAS: [{"path": ["assets","protagonistas",0,"want"], "valor": "Encontrar o irmão"}]`;
    const { texto, propostas } = extrairPropostas(bruta);
    expect(texto).toBe("Beleza, vou propor um want.");
    expect(propostas).toEqual([{ path: ["assets", "protagonistas", 0, "want"], valor: "Encontrar o irmão" }]);
  });

  it("aceita mais de uma proposta no mesmo bloco", () => {
    const bruta = `Ok.\nPROPOSTAS: [{"path": ["a"], "valor": "1"}, {"path": ["b", 2], "valor": "2"}]`;
    const { propostas } = extrairPropostas(bruta);
    expect(propostas).toHaveLength(2);
  });

  it("ignora o bloco e devolve o texto bruto se o JSON for inválido", () => {
    const bruta = `Resposta.\nPROPOSTAS: [{path sem aspas}]`;
    const { texto, propostas } = extrairPropostas(bruta);
    expect(texto).toBe(bruta.trim());
    expect(propostas).toEqual([]);
  });

  it("ignora o bloco se um item não bater com o schema (sem path)", () => {
    const bruta = `Resposta.\nPROPOSTAS: [{"valor": "sem path"}]`;
    const { texto, propostas } = extrairPropostas(bruta);
    expect(texto).toBe(bruta.trim());
    expect(propostas).toEqual([]);
  });

  it("filtra propostas pro campo status, mesmo que o modelo ignore a instrução", () => {
    const bruta = `Ok.\nPROPOSTAS: [{"path": ["espinha", 1, "status"], "valor": "rascunho"}, {"path": ["espinha", 1, "conteudo"], "valor": "algo"}]`;
    const { propostas } = extrairPropostas(bruta);
    expect(propostas).toEqual([{ path: ["espinha", 1, "conteudo"], valor: "algo" }]);
  });

  it("filtra propostas pra niveis e generos (campos de lista)", () => {
    const bruta = `Ok.\nPROPOSTAS: [{"path": ["assets","antagonista","niveis"], "valor": "interno"}, {"path": ["assets","genero","generos"], "valor": "Drama"}]`;
    const { propostas } = extrairPropostas(bruta);
    expect(propostas).toEqual([]);
  });

  it("filtra propostas pro campo conecta_assets (sem UI pra mostrar sugestão pendente nele)", () => {
    const bruta = `Ok.\nPROPOSTAS: [{"path": ["espinha", 1, "conecta_assets"], "valor": ["antagonista"]}, {"path": ["espinha", 1, "conteudo"], "valor": "algo"}]`;
    const { propostas } = extrairPropostas(bruta);
    expect(propostas).toEqual([{ path: ["espinha", 1, "conteudo"], valor: "algo" }]);
  });
});
