import { Router } from "express";
import { z } from "zod";
import { pool } from "../db.js";
import { applyUpdates, roteiroMckeeVazio } from "../roteiro.js";
import { chamarAgente, type MensagemChat } from "../agente/openrouter.js";
import { montarSystemPrompt } from "../agente/prompt.js";
import { extrairPropostas } from "../agente/propostas.js";

export const roteirosRouter = Router();

const idParamSchema = z.object({ id: z.uuid() });

const mensagemBodySchema = z.object({
  mensagem: z.string().min(1),
  historico: z
    .array(
      z.object({
        from: z.enum(["agente", "usuario"]),
        texto: z.string(),
      }),
    )
    .default([]),
});

const patchBodySchema = z.object({
  updates: z
    .array(
      z.object({
        path: z.array(z.union([z.string(), z.number()])).min(1),
        value: z.unknown(),
      }),
    )
    .min(1),
});

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

roteirosRouter.patch("/:id", async (req, res) => {
  const parsedParams = idParamSchema.safeParse(req.params);
  if (!parsedParams.success) {
    res.status(400).json({ error: "id inválido" });
    return;
  }
  const parsedBody = patchBodySchema.safeParse(req.body);
  if (!parsedBody.success) {
    res.status(400).json({ error: "body inválido", detalhes: parsedBody.error.issues });
    return;
  }

  const existente = await pool.query("SELECT data FROM roteiros WHERE id = $1", [parsedParams.data.id]);
  if (existente.rows.length === 0) {
    res.status(404).json({ error: "roteiro não encontrado" });
    return;
  }

  const novaData = applyUpdates(existente.rows[0].data, parsedBody.data.updates);
  const result = await pool.query(
    "UPDATE roteiros SET data = $1, updated_at = now() WHERE id = $2 RETURNING id, data, created_at, updated_at",
    [novaData, parsedParams.data.id],
  );
  res.json(result.rows[0]);
});

roteirosRouter.post("/:id/mensagens", async (req, res) => {
  const parsedParams = idParamSchema.safeParse(req.params);
  if (!parsedParams.success) {
    res.status(400).json({ error: "id inválido" });
    return;
  }
  const parsedBody = mensagemBodySchema.safeParse(req.body);
  if (!parsedBody.success) {
    res.status(400).json({ error: "body inválido", detalhes: parsedBody.error.issues });
    return;
  }

  const existente = await pool.query("SELECT data FROM roteiros WHERE id = $1", [parsedParams.data.id]);
  if (existente.rows.length === 0) {
    res.status(404).json({ error: "roteiro não encontrado" });
    return;
  }

  const mensagens: MensagemChat[] = [
    { role: "system", content: montarSystemPrompt(existente.rows[0].data) },
    ...parsedBody.data.historico.map(
      (m): MensagemChat => ({ role: m.from === "agente" ? "assistant" : "user", content: m.texto }),
    ),
    { role: "user", content: parsedBody.data.mensagem },
  ];

  try {
    const respostaBruta = await chamarAgente(mensagens);
    const { texto, propostas } = extrairPropostas(respostaBruta);
    res.json({ resposta: texto, propostas });
  } catch (err) {
    res.status(502).json({ error: "falha ao chamar o agente", detalhes: (err as Error).message });
  }
});
