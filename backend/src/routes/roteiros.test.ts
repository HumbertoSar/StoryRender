import { describe, it, expect, beforeAll, afterAll, afterEach, vi } from "vitest";
import express from "express";
import request from "supertest";
import { pool } from "../db.js";
import { roteirosRouter } from "./roteiros.js";

const app = express();
app.use(express.json());
app.use("/roteiros", roteirosRouter);

const hasDb = !!process.env.DATABASE_URL;

describe.skipIf(!hasDb)("roteirosRouter", () => {
  let inicioSuite: Date;

  beforeAll(async () => {
    const agora = await pool.query("SELECT now() AS agora");
    inicioSuite = agora.rows[0].agora;
  });

  afterAll(async () => {
    // limpa só os roteiros criados durante esta suíte (e eventos/propostas em cascata) —
    // evita poluir um DATABASE_URL apontado pro Postgres de dev com dado real do usuário
    await pool.query("DELETE FROM roteiros WHERE created_at >= $1", [inicioSuite]);
    await pool.end();
  });

  it("lista roteiros com os campos resumidos, mais recente primeiro", async () => {
    const created = await request(app).post("/roteiros").send();
    await request(app)
      .patch(`/roteiros/${created.body.id}`)
      .send({ updates: [{ path: ["titulo"], value: "Roteiro de teste da listagem" }] });

    const res = await request(app).get("/roteiros");
    expect(res.status).toBe(200);
    const item = res.body.find((r: { id: string }) => r.id === created.body.id);
    expect(item).toBeDefined();
    expect(item.titulo).toBe("Roteiro de teste da listagem");
    expect(item.template).toBe("mckee");
    expect(item.fase_atual).toBe("A");
    expect(item.data).toBeUndefined();
    expect(res.body[0].id).toBe(created.body.id);
  });

  it("cria um roteiro McKee vazio e lê de volta", async () => {
    const created = await request(app).post("/roteiros").send();
    expect(created.status).toBe(201);
    expect(created.body.data.template).toBe("mckee");
    expect(created.body.data.fase_atual).toBe("A");
    expect(created.body.data.espinha).toHaveLength(5);
    expect(created.body.data.espinha.every((no: { status: string }) => no.status === "vazio")).toBe(true);

    const fetched = await request(app).get(`/roteiros/${created.body.id}`);
    expect(fetched.status).toBe(200);
    expect(fetched.body.data).toEqual(created.body.data);
  });

  it("retorna 404 pra id inexistente", async () => {
    const res = await request(app).get("/roteiros/00000000-0000-0000-0000-000000000000");
    expect(res.status).toBe(404);
  });

  it("retorna 400 pra id malformado", async () => {
    const res = await request(app).get("/roteiros/nao-e-um-uuid");
    expect(res.status).toBe(400);
  });

  it("aplica updates por path e persiste", async () => {
    const created = await request(app).post("/roteiros").send();
    const id = created.body.id;

    const patched = await request(app)
      .patch(`/roteiros/${id}`)
      .send({
        updates: [
          { path: ["titulo"], value: "Um faroleiro encontra uma garrafa" },
          { path: ["espinha", 0, "conteudo"], value: "A carta chega" },
          { path: ["espinha", 0, "status"], value: "rascunho" },
          { path: ["assets", "protagonistas", 0, "want"], value: "Encontrar o irmão" },
        ],
      });

    expect(patched.status).toBe(200);
    expect(patched.body.data.titulo).toBe("Um faroleiro encontra uma garrafa");
    expect(patched.body.data.espinha[0].conteudo).toBe("A carta chega");
    expect(patched.body.data.espinha[0].status).toBe("rascunho");
    expect(patched.body.data.assets.protagonistas[0].want).toBe("Encontrar o irmão");

    const fetched = await request(app).get(`/roteiros/${id}`);
    expect(fetched.body.data).toEqual(patched.body.data);
  });

  it("PATCH retorna 404 pra id inexistente", async () => {
    const res = await request(app)
      .patch("/roteiros/00000000-0000-0000-0000-000000000000")
      .send({ updates: [{ path: ["titulo"], value: "x" }] });
    expect(res.status).toBe(404);
  });

  it("PATCH retorna 400 sem updates", async () => {
    const created = await request(app).post("/roteiros").send();
    const res = await request(app).patch(`/roteiros/${created.body.id}`).send({ updates: [] });
    expect(res.status).toBe(400);
  });

  describe("POST /:id/espinha/complicacoes", () => {
    it("adiciona uma nova complicação no fim do array, sem mexer nos nós existentes", async () => {
      const created = await request(app).post("/roteiros").send();

      const res = await request(app).post(`/roteiros/${created.body.id}/espinha/complicacoes`).send();
      expect(res.status).toBe(201);
      expect(res.body.data.espinha).toHaveLength(6);

      const nova = res.body.data.espinha[5];
      expect(nova.id).toBe("complicacao_2");
      expect(nova.tipo).toBe("complicacao");
      expect(nova.ordem).toBe(2);
      expect(nova.conteudo).toBe("");
      expect(nova.status).toBe("vazio");

      expect(res.body.data.espinha[1].id).toBe("complicacao_1");
      expect(res.body.data.espinha[2].id).toBe("crise");
    });

    it("a ordem incrementa a cada complicação nova, mesmo com mais de uma", async () => {
      const created = await request(app).post("/roteiros").send();
      await request(app).post(`/roteiros/${created.body.id}/espinha/complicacoes`).send();
      const res = await request(app).post(`/roteiros/${created.body.id}/espinha/complicacoes`).send();

      expect(res.body.data.espinha).toHaveLength(7);
      expect(res.body.data.espinha[6].id).toBe("complicacao_3");
      expect(res.body.data.espinha[6].ordem).toBe(3);
    });

    it("retorna 404 pra roteiro inexistente", async () => {
      const res = await request(app)
        .post("/roteiros/00000000-0000-0000-0000-000000000000/espinha/complicacoes")
        .send();
      expect(res.status).toBe(404);
    });
  });

  describe("POST /:id/espinha/complicacoes/:indice/excluir", () => {
    it("marca a complicação como excluída sem remover do array nem mexer nos outros índices", async () => {
      const created = await request(app).post("/roteiros").send();
      const id = created.body.id;

      const res = await request(app).post(`/roteiros/${id}/espinha/complicacoes/1/excluir`).send();
      expect(res.status).toBe(200);
      expect(res.body.data.espinha).toHaveLength(5);
      expect(res.body.data.espinha[1].id).toBe("complicacao_1");
      expect(res.body.data.espinha[1].excluido).toBe(true);
      expect(res.body.data.espinha[2].id).toBe("crise");
    });

    it("rejeita qualquer proposta pendente pro conteúdo do nó excluído", async () => {
      process.env.OPENROUTER_API_KEY = "chave-de-teste";
      const conteudo = `Beleza.\nPROPOSTAS: [{"path": ["espinha",1,"conteudo"], "valor": "texto proposto"}]`;
      vi.stubGlobal(
        "fetch",
        vi.fn().mockResolvedValue({ ok: true, json: async () => ({ choices: [{ message: { content: conteudo } }] }) }),
      );
      const created = await request(app).post("/roteiros").send();
      const id = created.body.id;
      await request(app).post(`/roteiros/${id}/mensagens`).send({ mensagem: "propõe a complicação", historico: [] });
      vi.unstubAllGlobals();
      delete process.env.OPENROUTER_API_KEY;

      await request(app).post(`/roteiros/${id}/espinha/complicacoes/1/excluir`).send();

      const pendentes = await request(app).get(`/roteiros/${id}/propostas`);
      expect(pendentes.body).toEqual([]);
      const rejeitadas = await request(app).get(`/roteiros/${id}/propostas?status=rejeitada`);
      expect(rejeitadas.body).toHaveLength(1);
    });

    it("retorna 400 se o índice não for uma complicação", async () => {
      const created = await request(app).post("/roteiros").send();
      const res = await request(app).post(`/roteiros/${created.body.id}/espinha/complicacoes/2/excluir`).send();
      expect(res.status).toBe(400);
    });

    it("retorna 404 pra roteiro inexistente", async () => {
      const res = await request(app)
        .post("/roteiros/00000000-0000-0000-0000-000000000000/espinha/complicacoes/1/excluir")
        .send();
      expect(res.status).toBe(404);
    });
  });

  describe("POST /:id/espinha/complicacoes/:indice/mover", () => {
    it("troca a ordem com a complicação vizinha visível", async () => {
      const created = await request(app).post("/roteiros").send();
      const id = created.body.id;
      await request(app).post(`/roteiros/${id}/espinha/complicacoes`).send();

      const res = await request(app)
        .post(`/roteiros/${id}/espinha/complicacoes/1/mover`)
        .send({ direcao: "baixo" });

      expect(res.status).toBe(200);
      expect(res.body.data.espinha[1].id).toBe("complicacao_1");
      expect(res.body.data.espinha[1].ordem).toBe(2);
      expect(res.body.data.espinha[5].id).toBe("complicacao_2");
      expect(res.body.data.espinha[5].ordem).toBe(1);
    });

    it("pula complicações excluídas ao achar a vizinha", async () => {
      const created = await request(app).post("/roteiros").send();
      const id = created.body.id;
      await request(app).post(`/roteiros/${id}/espinha/complicacoes`).send();
      await request(app).post(`/roteiros/${id}/espinha/complicacoes`).send();
      await request(app).post(`/roteiros/${id}/espinha/complicacoes/5/excluir`).send();

      const res = await request(app)
        .post(`/roteiros/${id}/espinha/complicacoes/6/mover`)
        .send({ direcao: "cima" });

      expect(res.status).toBe(200);
      expect(res.body.data.espinha[1].ordem).toBe(3);
      expect(res.body.data.espinha[6].ordem).toBe(1);
    });

    it("retorna 400 se não houver vizinha nessa direção", async () => {
      const created = await request(app).post("/roteiros").send();
      const res = await request(app)
        .post(`/roteiros/${created.body.id}/espinha/complicacoes/1/mover`)
        .send({ direcao: "cima" });
      expect(res.status).toBe(400);
    });

    it("retorna 400 com direção inválida", async () => {
      const created = await request(app).post("/roteiros").send();
      const res = await request(app)
        .post(`/roteiros/${created.body.id}/espinha/complicacoes/1/mover`)
        .send({ direcao: "lado" });
      expect(res.status).toBe(400);
    });

    it("retorna 404 pra roteiro inexistente", async () => {
      const res = await request(app)
        .post("/roteiros/00000000-0000-0000-0000-000000000000/espinha/complicacoes/1/mover")
        .send({ direcao: "cima" });
      expect(res.status).toBe(404);
    });
  });

  describe("POST /:id/mensagens", () => {
    afterEach(() => {
      vi.unstubAllGlobals();
      delete process.env.OPENROUTER_API_KEY;
    });

    it("injeta o esquema no system prompt e retorna a resposta do agente", async () => {
      process.env.OPENROUTER_API_KEY = "chave-de-teste";
      const fetchMock = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ choices: [{ message: { content: "boa pergunta, me fala mais" } }] }),
      });
      vi.stubGlobal("fetch", fetchMock);

      const created = await request(app).post("/roteiros").send();
      const res = await request(app)
        .post(`/roteiros/${created.body.id}/mensagens`)
        .send({ mensagem: "o want da protagonista é encontrar o irmão", historico: [] });

      expect(res.status).toBe(200);
      expect(res.body.resposta).toBe("boa pergunta, me fala mais");

      const corpoEnviado = JSON.parse(fetchMock.mock.calls[0][1].body);
      expect(corpoEnviado.messages[0].role).toBe("system");
      expect(corpoEnviado.messages[0].content).toContain("mckee");
      expect(corpoEnviado.messages.at(-1)).toEqual({
        role: "user",
        content: "o want da protagonista é encontrar o irmão",
      });
    });

    it("retorna as propostas extraídas do bloco PROPOSTAS", async () => {
      process.env.OPENROUTER_API_KEY = "chave-de-teste";
      const conteudo = `Beleza, vou sugerir um want.\nPROPOSTAS: [{"path": ["assets","protagonistas",0,"want"], "valor": "Encontrar o irmão"}]`;
      vi.stubGlobal(
        "fetch",
        vi.fn().mockResolvedValue({ ok: true, json: async () => ({ choices: [{ message: { content: conteudo } }] }) }),
      );

      const created = await request(app).post("/roteiros").send();
      const res = await request(app)
        .post(`/roteiros/${created.body.id}/mensagens`)
        .send({ mensagem: "propõe um want pra mim", historico: [] });

      expect(res.status).toBe(200);
      expect(res.body.resposta).toBe("Beleza, vou sugerir um want.");
      expect(res.body.propostas).toEqual([
        { id: expect.any(String), path: ["assets", "protagonistas", 0, "want"], valor: "Encontrar o irmão" },
      ]);
    });

    it("retorna 404 pra roteiro inexistente", async () => {
      const res = await request(app)
        .post("/roteiros/00000000-0000-0000-0000-000000000000/mensagens")
        .send({ mensagem: "oi" });
      expect(res.status).toBe(404);
    });

    it("retorna 400 sem mensagem", async () => {
      const created = await request(app).post("/roteiros").send();
      const res = await request(app).post(`/roteiros/${created.body.id}/mensagens`).send({});
      expect(res.status).toBe(400);
    });

    it("retorna 502 se o OpenRouter falhar", async () => {
      process.env.OPENROUTER_API_KEY = "chave-de-teste";
      vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: false, status: 500, text: async () => "erro" }));

      const created = await request(app).post("/roteiros").send();
      const res = await request(app).post(`/roteiros/${created.body.id}/mensagens`).send({ mensagem: "oi" });
      expect(res.status).toBe(502);
    });

    it("não inclui roteiro na resposta quando não há ACOES", async () => {
      process.env.OPENROUTER_API_KEY = "chave-de-teste";
      vi.stubGlobal(
        "fetch",
        vi.fn().mockResolvedValue({ ok: true, json: async () => ({ choices: [{ message: { content: "só um papo" } }] }) }),
      );
      const created = await request(app).post("/roteiros").send();
      const res = await request(app).post(`/roteiros/${created.body.id}/mensagens`).send({ mensagem: "oi", historico: [] });
      expect(res.body.roteiro).toBeUndefined();
    });

    it("ACOES criar_complicacao adiciona o nó e devolve o roteiro atualizado", async () => {
      process.env.OPENROUTER_API_KEY = "chave-de-teste";
      const conteudo = `Boa, vou criar uma complicação nova pra isso.\nACOES: [{"tipo": "criar_complicacao"}]`;
      vi.stubGlobal(
        "fetch",
        vi.fn().mockResolvedValue({ ok: true, json: async () => ({ choices: [{ message: { content: conteudo } }] }) }),
      );
      const created = await request(app).post("/roteiros").send();
      const id = created.body.id;

      const res = await request(app)
        .post(`/roteiros/${id}/mensagens`)
        .send({ mensagem: "e depois disso ele perde o emprego também", historico: [] });

      expect(res.status).toBe(200);
      expect(res.body.resposta).toBe("Boa, vou criar uma complicação nova pra isso.");
      expect(res.body.propostas).toEqual([]);
      expect(res.body.roteiro.data.espinha).toHaveLength(6);
      expect(res.body.roteiro.data.espinha[5].id).toBe("complicacao_2");

      const fetched = await request(app).get(`/roteiros/${id}`);
      expect(fetched.body.data.espinha).toHaveLength(6);
    });

    it("ACOES + PROPOSTAS no mesmo turno propõe conteúdo pro nó recém-criado via placeholder nova_0", async () => {
      process.env.OPENROUTER_API_KEY = "chave-de-teste";
      const conteudo = `Beleza.\nACOES: [{"tipo": "criar_complicacao"}]\nPROPOSTAS: [{"path": ["espinha","nova_0","conteudo"], "valor": "ele perde o emprego"}]`;
      vi.stubGlobal(
        "fetch",
        vi.fn().mockResolvedValue({ ok: true, json: async () => ({ choices: [{ message: { content: conteudo } }] }) }),
      );
      const created = await request(app).post("/roteiros").send();
      const id = created.body.id;

      const res = await request(app)
        .post(`/roteiros/${id}/mensagens`)
        .send({ mensagem: "ele perde o emprego também", historico: [] });

      expect(res.status).toBe(200);
      expect(res.body.roteiro.data.espinha).toHaveLength(6);
      expect(res.body.propostas).toEqual([
        { id: expect.any(String), path: ["espinha", 5, "conteudo"], valor: "ele perde o emprego" },
      ]);

      const pendentes = await request(app).get(`/roteiros/${id}/propostas`);
      expect(pendentes.body[0].path).toEqual(["espinha", 5, "conteudo"]);
    });

    it("ACOES criar_complicacao com posicao insere entre as complicações existentes sem afetar as outras", async () => {
      process.env.OPENROUTER_API_KEY = "chave-de-teste";
      const created = await request(app).post("/roteiros").send();
      const id = created.body.id;
      await request(app).post(`/roteiros/${id}/espinha/complicacoes`).send();
      await request(app).post(`/roteiros/${id}/espinha/complicacoes`).send();

      const conteudo = `Vou colocar como a 3ª complicação.\nACOES: [{"tipo": "criar_complicacao", "posicao": 3}]`;
      vi.stubGlobal(
        "fetch",
        vi.fn().mockResolvedValue({ ok: true, json: async () => ({ choices: [{ message: { content: conteudo } }] }) }),
      );

      const res = await request(app)
        .post(`/roteiros/${id}/mensagens`)
        .send({ mensagem: "quero inserir uma complicação aqui, na 3ª posição", historico: [] });

      expect(res.status).toBe(200);
      const espinha = res.body.roteiro.data.espinha;
      expect(espinha).toHaveLength(8);

      const novoNo = espinha[7];
      expect(novoNo.tipo).toBe("complicacao");
      expect(novoNo.ordem).toBe(2.5);

      const outrasComplicacoes = espinha.filter((n: { tipo: string; id: string }) => n.tipo === "complicacao" && n.id !== novoNo.id);
      expect(outrasComplicacoes.map((n: { ordem: number }) => n.ordem).sort()).toEqual([1, 2, 3]);

      const ordenadas = espinha
        .filter((n: { tipo: string }) => n.tipo === "complicacao")
        .sort((a: { ordem: number }, b: { ordem: number }) => a.ordem - b.ordem);
      expect(ordenadas.map((n: { id: string }) => n.id)).toEqual([
        "complicacao_1",
        "complicacao_2",
        novoNo.id,
        "complicacao_3",
      ]);
    });

    it("ACOES criar_complicacao com posicao 1 insere antes de todas as complicações existentes", async () => {
      process.env.OPENROUTER_API_KEY = "chave-de-teste";
      const created = await request(app).post("/roteiros").send();
      const id = created.body.id;

      const conteudo = `Ok.\nACOES: [{"tipo": "criar_complicacao", "posicao": 1}]`;
      vi.stubGlobal(
        "fetch",
        vi.fn().mockResolvedValue({ ok: true, json: async () => ({ choices: [{ message: { content: conteudo } }] }) }),
      );

      const res = await request(app)
        .post(`/roteiros/${id}/mensagens`)
        .send({ mensagem: "quero uma complicação antes da que já existe", historico: [] });

      const espinha = res.body.roteiro.data.espinha;
      const novoNo = espinha[5];
      expect(novoNo.ordem).toBeLessThan(1);

      const ordenadas = espinha
        .filter((n: { tipo: string }) => n.tipo === "complicacao")
        .sort((a: { ordem: number }, b: { ordem: number }) => a.ordem - b.ordem);
      expect(ordenadas.map((n: { id: string }) => n.id)).toEqual(["complicacao_2", "complicacao_1"]);
    });

    it("descarta proposta com placeholder nova_N sem ação correspondente", async () => {
      process.env.OPENROUTER_API_KEY = "chave-de-teste";
      const conteudo = `Ok.\nPROPOSTAS: [{"path": ["espinha","nova_0","conteudo"], "valor": "não devia existir"}]`;
      vi.stubGlobal(
        "fetch",
        vi.fn().mockResolvedValue({ ok: true, json: async () => ({ choices: [{ message: { content: conteudo } }] }) }),
      );
      const created = await request(app).post("/roteiros").send();
      const res = await request(app)
        .post(`/roteiros/${created.body.id}/mensagens`)
        .send({ mensagem: "oi", historico: [] });

      expect(res.body.propostas).toEqual([]);
      expect(res.body.roteiro).toBeUndefined();
    });
  });

  describe("eventos", () => {
    it("registra um evento e devolve na ordem em que foram criados", async () => {
      const created = await request(app).post("/roteiros").send();
      const id = created.body.id;

      const registrado = await request(app)
        .post(`/roteiros/${id}/eventos`)
        .send({ tipo: "tela", detalhes: { tela: "onboarding_pergunta_1" } });
      expect(registrado.status).toBe(201);
      expect(registrado.body.tipo).toBe("tela");
      expect(registrado.body.detalhes).toEqual({ tela: "onboarding_pergunta_1" });

      await request(app).post(`/roteiros/${id}/eventos`).send({ tipo: "tela", detalhes: { tela: "quadro" } });

      const listados = await request(app).get(`/roteiros/${id}/eventos`);
      expect(listados.status).toBe(200);
      expect(listados.body.map((e: { tipo: string }) => e.tipo)).toEqual(["tela", "tela"]);
      expect(listados.body[1].detalhes).toEqual({ tela: "quadro" });
    });

    it("aceita evento sem detalhes (usa objeto vazio)", async () => {
      const created = await request(app).post("/roteiros").send();
      const res = await request(app).post(`/roteiros/${created.body.id}/eventos`).send({ tipo: "erro" });
      expect(res.status).toBe(201);
      expect(res.body.detalhes).toEqual({});
    });

    it("retorna 404 ao registrar evento pra roteiro inexistente", async () => {
      const res = await request(app)
        .post("/roteiros/00000000-0000-0000-0000-000000000000/eventos")
        .send({ tipo: "tela" });
      expect(res.status).toBe(404);
    });

    it("retorna 400 sem tipo", async () => {
      const created = await request(app).post("/roteiros").send();
      const res = await request(app).post(`/roteiros/${created.body.id}/eventos`).send({});
      expect(res.status).toBe(400);
    });

    it("GET retorna lista vazia pra roteiro sem eventos", async () => {
      const created = await request(app).post("/roteiros").send();
      const res = await request(app).get(`/roteiros/${created.body.id}/eventos`);
      expect(res.status).toBe(200);
      expect(res.body).toEqual([]);
    });
  });

  describe("propostas", () => {
    afterEach(() => {
      vi.unstubAllGlobals();
      delete process.env.OPENROUTER_API_KEY;
    });

    async function criarComProposta(valor: string) {
      process.env.OPENROUTER_API_KEY = "chave-de-teste";
      const conteudo = `Ok.\nPROPOSTAS: [{"path": ["assets","protagonistas",0,"want"], "valor": "${valor}"}]`;
      vi.stubGlobal(
        "fetch",
        vi.fn().mockResolvedValue({ ok: true, json: async () => ({ choices: [{ message: { content: conteudo } }] }) }),
      );
      const created = await request(app).post("/roteiros").send();
      const res = await request(app)
        .post(`/roteiros/${created.body.id}/mensagens`)
        .send({ mensagem: "propõe um want", historico: [] });
      return { roteiroId: created.body.id, propostaId: res.body.propostas[0].id };
    }

    it("GET lista só as propostas pendentes por padrão", async () => {
      const { roteiroId } = await criarComProposta("Encontrar o irmão");
      const res = await request(app).get(`/roteiros/${roteiroId}/propostas`);
      expect(res.status).toBe(200);
      expect(res.body).toHaveLength(1);
      expect(res.body[0].status).toBe("pendente");
      expect(res.body[0].valor).toBe("Encontrar o irmão");
    });

    it("aceitar aplica o valor no roteiro e marca a proposta como aceita", async () => {
      const { roteiroId, propostaId } = await criarComProposta("Encontrar o irmão");

      const res = await request(app)
        .post(`/roteiros/${roteiroId}/propostas/${propostaId}/resolver`)
        .send({ acao: "aceitar" });

      expect(res.status).toBe(200);
      expect(res.body.proposta.status).toBe("aceita");
      expect(res.body.roteiro.data.assets.protagonistas[0].want).toBe("Encontrar o irmão");

      const pendentes = await request(app).get(`/roteiros/${roteiroId}/propostas`);
      expect(pendentes.body).toEqual([]);
    });

    it("rejeitar não altera o roteiro, só marca a proposta como rejeitada", async () => {
      const { roteiroId, propostaId } = await criarComProposta("Encontrar o irmão");

      const res = await request(app)
        .post(`/roteiros/${roteiroId}/propostas/${propostaId}/resolver`)
        .send({ acao: "rejeitar" });

      expect(res.status).toBe(200);
      expect(res.body.proposta.status).toBe("rejeitada");
      expect(res.body.roteiro.data.assets.protagonistas[0].want).toBe("");

      const pendentes = await request(app).get(`/roteiros/${roteiroId}/propostas`);
      expect(pendentes.body).toEqual([]);
    });

    it("uma nova proposta pro mesmo campo substitui a pendente anterior", async () => {
      const { roteiroId } = await criarComProposta("Primeira versão");

      process.env.OPENROUTER_API_KEY = "chave-de-teste";
      const conteudo = `Ok.\nPROPOSTAS: [{"path": ["assets","protagonistas",0,"want"], "valor": "Segunda versão"}]`;
      vi.stubGlobal(
        "fetch",
        vi.fn().mockResolvedValue({ ok: true, json: async () => ({ choices: [{ message: { content: conteudo } }] }) }),
      );
      await request(app).post(`/roteiros/${roteiroId}/mensagens`).send({ mensagem: "de novo", historico: [] });

      const pendentes = await request(app).get(`/roteiros/${roteiroId}/propostas`);
      expect(pendentes.body).toHaveLength(1);
      expect(pendentes.body[0].valor).toBe("Segunda versão");
    });

    it("retorna 404 ao resolver proposta que não existe ou já foi resolvida", async () => {
      const created = await request(app).post("/roteiros").send();
      const res = await request(app)
        .post(`/roteiros/${created.body.id}/propostas/00000000-0000-0000-0000-000000000000/resolver`)
        .send({ acao: "aceitar" });
      expect(res.status).toBe(404);
    });

    it("retorna 400 com ação inválida", async () => {
      const { roteiroId, propostaId } = await criarComProposta("Encontrar o irmão");
      const res = await request(app)
        .post(`/roteiros/${roteiroId}/propostas/${propostaId}/resolver`)
        .send({ acao: "esperar" });
      expect(res.status).toBe(400);
    });
  });
});
