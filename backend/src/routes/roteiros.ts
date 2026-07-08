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

const eventoBodySchema = z.object({
  tipo: z.string().min(1),
  detalhes: z.record(z.string(), z.unknown()).default({}),
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

const resolverPropostaBodySchema = z.object({ acao: z.enum(["aceitar", "rejeitar"]) });

async function persistirPropostas(roteiroId: string, propostas: { path: (string | number)[]; valor: unknown }[]) {
  const persistidas = [];
  for (const p of propostas) {
    await pool.query(
      "UPDATE propostas SET status = 'substituida', resolvida_em = now() WHERE roteiro_id = $1 AND path = $2 AND status = 'pendente'",
      [roteiroId, JSON.stringify(p.path)],
    );
    const result = await pool.query(
      "INSERT INTO propostas (roteiro_id, path, valor) VALUES ($1, $2, $3) RETURNING id, path, valor",
      [roteiroId, JSON.stringify(p.path), JSON.stringify(p.valor)],
    );
    persistidas.push(result.rows[0]);
  }
  return persistidas;
}

roteirosRouter.get("/", async (_req, res) => {
  const result = await pool.query(
    `SELECT id, data->>'titulo' AS titulo, data->>'template' AS template,
            data->>'fase_atual' AS fase_atual, updated_at
     FROM roteiros
     ORDER BY updated_at DESC`,
  );
  res.json(result.rows);
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
    const persistidas = await persistirPropostas(parsedParams.data.id, propostas);
    res.json({ resposta: texto, propostas: persistidas });
  } catch (err) {
    res.status(502).json({ error: "falha ao chamar o agente", detalhes: (err as Error).message });
  }
});

roteirosRouter.post("/:id/eventos", async (req, res) => {
  const parsedParams = idParamSchema.safeParse(req.params);
  if (!parsedParams.success) {
    res.status(400).json({ error: "id inválido" });
    return;
  }
  const parsedBody = eventoBodySchema.safeParse(req.body);
  if (!parsedBody.success) {
    res.status(400).json({ error: "body inválido", detalhes: parsedBody.error.issues });
    return;
  }

  try {
    const result = await pool.query(
      "INSERT INTO eventos (roteiro_id, tipo, detalhes) VALUES ($1, $2, $3) RETURNING id, tipo, detalhes, criado_em",
      [parsedParams.data.id, parsedBody.data.tipo, parsedBody.data.detalhes],
    );
    res.status(201).json(result.rows[0]);
  } catch {
    res.status(404).json({ error: "roteiro não encontrado" });
  }
});

roteirosRouter.get("/:id/eventos", async (req, res) => {
  const parsedParams = idParamSchema.safeParse(req.params);
  if (!parsedParams.success) {
    res.status(400).json({ error: "id inválido" });
    return;
  }

  const result = await pool.query(
    "SELECT id, tipo, detalhes, criado_em FROM eventos WHERE roteiro_id = $1 ORDER BY criado_em ASC",
    [parsedParams.data.id],
  );
  res.json(result.rows);
});

roteirosRouter.get("/:id/propostas", async (req, res) => {
  const parsedParams = idParamSchema.safeParse(req.params);
  if (!parsedParams.success) {
    res.status(400).json({ error: "id inválido" });
    return;
  }
  const status = typeof req.query.status === "string" ? req.query.status : "pendente";

  const result = await pool.query(
    "SELECT id, path, valor, status, criado_em FROM propostas WHERE roteiro_id = $1 AND status = $2 ORDER BY criado_em ASC",
    [parsedParams.data.id, status],
  );
  res.json(result.rows);
});

roteirosRouter.post("/:id/propostas/:propostaId/resolver", async (req, res) => {
  const parsedParams = z.object({ id: z.uuid(), propostaId: z.uuid() }).safeParse(req.params);
  if (!parsedParams.success) {
    res.status(400).json({ error: "id inválido" });
    return;
  }
  const parsedBody = resolverPropostaBodySchema.safeParse(req.body);
  if (!parsedBody.success) {
    res.status(400).json({ error: "body inválido", detalhes: parsedBody.error.issues });
    return;
  }

  const proposta = await pool.query(
    "SELECT id, path, valor FROM propostas WHERE id = $1 AND roteiro_id = $2 AND status = 'pendente'",
    [parsedParams.data.propostaId, parsedParams.data.id],
  );
  if (proposta.rows.length === 0) {
    res.status(404).json({ error: "proposta pendente não encontrada" });
    return;
  }

  if (parsedBody.data.acao === "aceitar") {
    const roteiro = await pool.query("SELECT data FROM roteiros WHERE id = $1", [parsedParams.data.id]);
    const novaData = applyUpdates(roteiro.rows[0].data, [
      { path: proposta.rows[0].path, value: proposta.rows[0].valor },
    ]);
    await pool.query("UPDATE roteiros SET data = $1, updated_at = now() WHERE id = $2", [
      novaData,
      parsedParams.data.id,
    ]);
  }

  const novoStatus = parsedBody.data.acao === "aceitar" ? "aceita" : "rejeitada";
  const propostaAtualizada = await pool.query(
    "UPDATE propostas SET status = $1, resolvida_em = now() WHERE id = $2 RETURNING id, path, valor, status, criado_em, resolvida_em",
    [novoStatus, parsedParams.data.propostaId],
  );
  const roteiroAtualizado = await pool.query(
    "SELECT id, data, created_at, updated_at FROM roteiros WHERE id = $1",
    [parsedParams.data.id],
  );

  res.json({ proposta: propostaAtualizada.rows[0], roteiro: roteiroAtualizado.rows[0] });
});
