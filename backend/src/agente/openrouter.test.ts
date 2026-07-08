import { afterEach, describe, expect, it, vi } from "vitest";
import { chamarAgente } from "./openrouter.js";

describe("chamarAgente", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    delete process.env.OPENROUTER_API_KEY;
  });

  it("lança erro claro se a API key não está configurada", async () => {
    delete process.env.OPENROUTER_API_KEY;
    await expect(chamarAgente([{ role: "user", content: "oi" }])).rejects.toThrow("OPENROUTER_API_KEY");
  });

  it("chama o OpenRouter e retorna o texto da resposta", async () => {
    process.env.OPENROUTER_API_KEY = "chave-de-teste";
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ choices: [{ message: { content: "resposta do agente" } }] }),
    });
    vi.stubGlobal("fetch", fetchMock);

    const resposta = await chamarAgente([{ role: "user", content: "oi" }]);

    expect(resposta).toBe("resposta do agente");
    expect(fetchMock).toHaveBeenCalledWith(
      "https://openrouter.ai/api/v1/chat/completions",
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({ Authorization: "Bearer chave-de-teste" }),
      }),
    );
  });

  it("lança erro com detalhes se o OpenRouter responde com falha", async () => {
    process.env.OPENROUTER_API_KEY = "chave-de-teste";
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({ ok: false, status: 401, text: async () => "unauthorized" }),
    );

    await expect(chamarAgente([{ role: "user", content: "oi" }])).rejects.toThrow("401");
  });
});
