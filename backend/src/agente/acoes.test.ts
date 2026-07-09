import { describe, expect, it } from "vitest";
import { extrairAcoes, remapearNovasComplicacoes } from "./acoes.js";

describe("extrairAcoes", () => {
  it("retorna lista vazia quando não há bloco ACOES", () => {
    const { texto, acoes } = extrairAcoes("Só uma resposta em texto, sem ação nenhuma.");
    expect(texto).toBe("Só uma resposta em texto, sem ação nenhuma.");
    expect(acoes).toEqual([]);
  });

  it("separa o texto do bloco ACOES e faz parse do JSON", () => {
    const bruta = `Beleza, vou criar uma complicação nova.\nACOES: ["criar_complicacao"]`;
    const { texto, acoes } = extrairAcoes(bruta);
    expect(texto).toBe("Beleza, vou criar uma complicação nova.");
    expect(acoes).toEqual(["criar_complicacao"]);
  });

  it("ignora silenciosamente uma ação não suportada (fail soft)", () => {
    const bruta = `Ok.\nACOES: ["excluir_tudo"]`;
    const { texto, acoes } = extrairAcoes(bruta);
    expect(texto).toBe(bruta.trim());
    expect(acoes).toEqual([]);
  });

  it("ignora silenciosamente JSON malformado", () => {
    const bruta = `Ok.\nACOES: [nao e json valido]`;
    const { texto, acoes } = extrairAcoes(bruta);
    expect(texto).toBe(bruta.trim());
    expect(acoes).toEqual([]);
  });
});

describe("remapearNovasComplicacoes", () => {
  it("substitui o placeholder nova_0 pelo índice real", () => {
    const propostas = [{ path: ["espinha", "nova_0", "conteudo"], valor: "texto" }];
    const resultado = remapearNovasComplicacoes(propostas, [5]);
    expect(resultado).toEqual([{ path: ["espinha", 5, "conteudo"], valor: "texto" }]);
  });

  it("não mexe em paths sem placeholder", () => {
    const propostas = [{ path: ["assets", "protagonistas", 0, "want"], valor: "texto" }];
    const resultado = remapearNovasComplicacoes(propostas, [5]);
    expect(resultado).toEqual(propostas);
  });

  it("resolve múltiplos placeholders na ordem em que as ações foram criadas", () => {
    const propostas = [
      { path: ["espinha", "nova_0", "conteudo"], valor: "primeira" },
      { path: ["espinha", "nova_1", "conteudo"], valor: "segunda" },
    ];
    const resultado = remapearNovasComplicacoes(propostas, [5, 6]);
    expect(resultado).toEqual([
      { path: ["espinha", 5, "conteudo"], valor: "primeira" },
      { path: ["espinha", 6, "conteudo"], valor: "segunda" },
    ]);
  });

  it("descarta a proposta se o placeholder não corresponde a nenhuma ação criada", () => {
    const propostas = [
      { path: ["espinha", "nova_0", "conteudo"], valor: "válida" },
      { path: ["espinha", "nova_1", "conteudo"], valor: "inválida, só uma ação foi criada" },
    ];
    const resultado = remapearNovasComplicacoes(propostas, [5]);
    expect(resultado).toEqual([{ path: ["espinha", 5, "conteudo"], valor: "válida" }]);
  });
});
