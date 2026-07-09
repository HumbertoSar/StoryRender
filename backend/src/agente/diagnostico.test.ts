import { describe, expect, it } from "vitest";
import { extrairDiagnostico } from "./diagnostico.js";

describe("extrairDiagnostico", () => {
  it("retorna lista vazia quando não há bloco DIAGNOSTICO", () => {
    expect(extrairDiagnostico("Só uma resposta em texto, sem bloco nenhum.")).toEqual([]);
  });

  it("faz parse do bloco DIAGNOSTICO", () => {
    const bruta = `DIAGNOSTICO: [{"campo": "Aposta do Protagonista", "problema": "ainda vaga, sem exemplo concreto", "severidade": "aviso"}]`;
    expect(extrairDiagnostico(bruta)).toEqual([
      { campo: "Aposta do Protagonista", problema: "ainda vaga, sem exemplo concreto", severidade: "aviso" },
    ]);
  });

  it("aceita array vazio (nenhum problema encontrado)", () => {
    expect(extrairDiagnostico("DIAGNOSTICO: []")).toEqual([]);
  });

  it("aceita mais de um item", () => {
    const bruta = `DIAGNOSTICO: [{"campo": "a", "problema": "p1", "severidade": "aviso"}, {"campo": "b", "problema": "p2", "severidade": "critico"}]`;
    expect(extrairDiagnostico(bruta)).toHaveLength(2);
  });

  it("descarta só o item com severidade inválida, mantendo os outros", () => {
    const bruta = `DIAGNOSTICO: [{"campo": "a", "problema": "p1", "severidade": "urgente"}, {"campo": "b", "problema": "p2", "severidade": "critico"}]`;
    expect(extrairDiagnostico(bruta)).toEqual([{ campo: "b", problema: "p2", severidade: "critico" }]);
  });

  it("descarta item sem campo ou problema", () => {
    const bruta = `DIAGNOSTICO: [{"problema": "sem campo", "severidade": "aviso"}]`;
    expect(extrairDiagnostico(bruta)).toEqual([]);
  });

  it("retorna lista vazia com JSON malformado (fail soft)", () => {
    expect(extrairDiagnostico("DIAGNOSTICO: [nao e json valido]")).toEqual([]);
  });

  it("ignora prosa antes do bloco", () => {
    const bruta = `Aqui está a revisão.\nDIAGNOSTICO: [{"campo": "a", "problema": "p", "severidade": "aviso"}]`;
    expect(extrairDiagnostico(bruta)).toEqual([{ campo: "a", problema: "p", severidade: "aviso" }]);
  });

  it("descarta item que sinaliza campo vazio como problema, mesmo contra a instrução do prompt", () => {
    const bruta = `DIAGNOSTICO: [
      {"campo": "Mundo", "problema": "Todos os campos estão vazios", "severidade": "critico"},
      {"campo": "Ideia Controladora", "problema": "Valor e Causa completamente vazios", "severidade": "critico"},
      {"campo": "Antagonista", "problema": "Campo 'poder_relativo' não foi preenchido", "severidade": "critico"},
      {"campo": "Aposta", "problema": "Aposta definida como 'tudo' é vaga demais, falta um exemplo concreto", "severidade": "aviso"}
    ]`;
    expect(extrairDiagnostico(bruta)).toEqual([
      { campo: "Aposta", problema: "Aposta definida como 'tudo' é vaga demais, falta um exemplo concreto", severidade: "aviso" },
    ]);
  });
});
