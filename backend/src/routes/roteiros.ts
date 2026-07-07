import { Router } from "express";
import { z } from "zod";
import { pool } from "../db.js";
import { roteiroMckeeVazio } from "../roteiro.js";

export const roteirosRouter = Router();

const idParamSchema = z.object({ id: z.uuid() });

roteirosRouter.post("/", async (_req, res) => {
  const data = roteiroMckeeVazio();
  const result = await pool.query(
    "INSERT INTO roteiros (data) VALUES ($1) RETURNING id, data, created_at, updated_at",
    [data],
  );
  res.status(201).json(result.rows[0]);
});

roteirosRouter.get("/:id", async (req, res) => {
  const parsed = idParamSchema.safeParse(req.params);
  if (!parsed.success) {
    res.status(400).json({ error: "id inválido" });
    return;
  }

  const result = await pool.query(
    "SELECT id, data, created_at, updated_at FROM roteiros WHERE id = $1",
    [parsed.data.id],
  );
  if (result.rows.length === 0) {
    res.status(404).json({ error: "roteiro não encontrado" });
    return;
  }
  res.json(result.rows[0]);
});
