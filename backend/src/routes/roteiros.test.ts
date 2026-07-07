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
});
