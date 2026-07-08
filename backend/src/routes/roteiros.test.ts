import { describe, it, expect, afterAll } from "vitest";
import express from "express";
import request from "supertest";
import { pool } from "../db.js";
import { roteirosRouter } from "./roteiros.js";

const app = express();
app.use(express.json());
app.use("/roteiros", roteirosRouter);

const hasDb = !!process.env.DATABASE_URL;

describe.skipIf(!hasDb)("roteirosRouter", () => {
  afterAll(async () => {
    await pool.end();
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
});
