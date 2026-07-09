import { Router, type Request, type Response } from "express";
import { z } from "zod";
import { pool } from "../db.js";
import {
  adicionarComplicacao,
  applyUpdates,
  excluirComplicacao,
  moverComplicacao,
  reordenarComplicacao,
  roteiroMckeeVazio,
} from "../roteiro.js";
import { chamarAgente, type MensagemChat } from "../agente/openrouter.js";
import { montarSystemPrompt, montarSystemPromptDiagnostico } from "../agente/prompt.js";
import { extrairPropostas } from "../agente/propostas.js";
import { extrairAcoes, remapearNovasComplicacoes } from "../agente/acoes.js";
import { extrairDiagnostico } from "../agente/diagnostico.js";

export const roteirosRouter = Router();

const idParamSchema = z.object({ id: z.uuid() });
const indiceParamSchema = z.object({ id: z.uuid(), indice: z.coerce.number().int().min(0) });
const propostaParamSchema = z.object({ id: z.uuid(), propostaId: z.uuid() });

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
const moverBodySchema = z.object({ direcao: z.enum(["cima", "baixo"]) });

function parseParamsOu400<T extends z.ZodTypeAny>(
  schema: T,
  req: Request,
  res: Response,
  erro: string,
): z.infer<T> | undefined {
  const parsed = schema.safeParse(req.params);
  if (!parsed.success) {
    res.status(400).json({ error: erro });
    return undefined;
  }
  return parsed.data;
}

function parseBodyOu400<T extends z.ZodTypeAny>(schema: T, req: Request, res: Response): z.infer<T> | undefined {
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "body inválido", detalhes: parsed.error.issues });
    return undefined;
  }
  return parsed.data;
}

async function buscarDataOu404(id: string, res: Response): Promise<unknown> {
  const existente = await pool.query("SELECT data FROM roteiros WHERE id = $1", [id]);
  if (existente.rows.length === 0) {
    res.status(404).json({ error: "roteiro não encontrado" });
    return undefined;
  }
  return existente.rows[0].data;
}

async function salvarRoteiro(id: string, data: unknown) {
  const result = await pool.query(
    "UPDATE roteiros SET data = $1, updated_at = now() WHERE id = $2 RETURNING id, data, created_at, updated_at",
    [data, id],
  );
  return result.rows[0];
}

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
  const parsedParams = parseParamsOu400(idParamSchema, req, res, "id inválido");
  if (!parsedParams) return;

  const result = await pool.query(
    "SELECT id, data, created_at, updated_at FROM roteiros WHERE id = $1",
    [parsedParams.id],
  );
  if (result.rows.length === 0) {
    res.status(404).json({ error: "roteiro não encontrado" });
    return;
  }
  res.json(result.rows[0]);
});

roteirosRouter.patch("/:id", async (req, res) => {
  const parsedParams = parseParamsOu400(idParamSchema, req, res, "id inválido");
  if (!parsedParams) return;
  const parsedBody = parseBodyOu400(patchBodySchema, req, res);
  if (!parsedBody) return;

  const data = await buscarDataOu404(parsedParams.id, res);
  if (data === undefined) return;

  const novaData = applyUpdates(data, parsedBody.updates);
  res.json(await salvarRoteiro(parsedParams.id, novaData));
});

roteirosRouter.post("/:id/espinha/complicacoes", async (req, res) => {
  const parsedParams = parseParamsOu400(idParamSchema, req, res, "id inválido");
  if (!parsedParams) return;

  const data = await buscarDataOu404(parsedParams.id, res);
  if (data === undefined) return;

  const novaData = adicionarComplicacao(data);
  res.status(201).json(await salvarRoteiro(parsedParams.id, novaData));
});

roteirosRouter.post("/:id/espinha/complicacoes/:indice/excluir", async (req, res) => {
  const parsedParams = parseParamsOu400(indiceParamSchema, req, res, "id ou índice inválido");
  if (!parsedParams) return;

  const data = await buscarDataOu404(parsedParams.id, res);
  if (data === undefined) return;

  let novaData;
  try {
    novaData = excluirComplicacao(data, parsedParams.indice);
  } catch (err) {
    res.status(400).json({ error: (err as Error).message });
    return;
  }

  const roteiroAtualizado = await salvarRoteiro(parsedParams.id, novaData);
  await pool.query(
    `UPDATE propostas SET status = 'rejeitada', resolvida_em = now()
     WHERE roteiro_id = $1 AND status = 'pendente' AND path->>0 = 'espinha' AND (path->>1)::int = $2`,
    [parsedParams.id, parsedParams.indice],
  );
  res.json(roteiroAtualizado);
});

roteirosRouter.post("/:id/espinha/complicacoes/:indice/mover", async (req, res) => {
  const parsedParams = parseParamsOu400(indiceParamSchema, req, res, "id ou índice inválido");
  if (!parsedParams) return;
  const parsedBody = parseBodyOu400(moverBodySchema, req, res);
  if (!parsedBody) return;

  const data = await buscarDataOu404(parsedParams.id, res);
  if (data === undefined) return;

  let novaData;
  try {
    novaData = moverComplicacao(data, parsedParams.indice, parsedBody.direcao);
  } catch (err) {
    res.status(400).json({ error: (err as Error).message });
    return;
  }

  res.json(await salvarRoteiro(parsedParams.id, novaData));
});

roteirosRouter.post("/:id/mensagens", async (req, res) => {
  const parsedParams = parseParamsOu400(idParamSchema, req, res, "id inválido");
  if (!parsedParams) return;
  const parsedBody = parseBodyOu400(mensagemBodySchema, req, res);
  if (!parsedBody) return;

  const data = await buscarDataOu404(parsedParams.id, res);
  if (data === undefined) return;

  const mensagens: MensagemChat[] = [
    { role: "system", content: montarSystemPrompt(data) },
    ...parsedBody.historico.map(
      (m): MensagemChat => ({ role: m.from === "agente" ? "assistant" : "user", content: m.texto }),
    ),
    { role: "user", content: parsedBody.mensagem },
  ];

  try {
    const respostaBruta = await chamarAgente(mensagens);
    const { texto: semPropostas, propostas: propostasBrutas } = extrairPropostas(respostaBruta);
    const { texto, acoes } = extrairAcoes(semPropostas);

    let dados: unknown = data;
    let algumaAcaoAplicada = false;
    const indicesNovasComplicacoes: number[] = [];
    for (const acao of acoes) {
      try {
        if (acao.tipo === "criar_complicacao") {
          dados = adicionarComplicacao(dados, acao.posicao);
          indicesNovasComplicacoes.push((dados as { espinha: unknown[] }).espinha.length - 1);
          algumaAcaoAplicada = true;
        } else if (acao.tipo === "reordenar_complicacao") {
          dados = reordenarComplicacao(dados, acao.id_complicacao, acao.nova_posicao);
          algumaAcaoAplicada = true;
        }
      } catch {
        // ação estruturalmente válida mas não aplicável agora (ex: id_complicacao
        // não existe mais) — ignora essa ação e segue com as outras da resposta
      }
    }

    const roteiroAtualizado = algumaAcaoAplicada ? await salvarRoteiro(parsedParams.id, dados) : undefined;

    const propostas = remapearNovasComplicacoes(propostasBrutas, indicesNovasComplicacoes);
    const persistidas = await persistirPropostas(parsedParams.id, propostas);
    res.json({ resposta: texto, propostas: persistidas, roteiro: roteiroAtualizado });
  } catch (err) {
    res.status(502).json({ error: "falha ao chamar o agente", detalhes: (err as Error).message });
  }
});

roteirosRouter.post("/:id/diagnostico", async (req, res) => {
  const parsedParams = parseParamsOu400(idParamSchema, req, res, "id inválido");
  if (!parsedParams) return;

  const data = await buscarDataOu404(parsedParams.id, res);
  if (data === undefined) return;

  const mensagens: MensagemChat[] = [
    { role: "system", content: montarSystemPromptDiagnostico(data) },
    { role: "user", content: "Revise o esquema atual e liste os problemas encontrados." },
  ];

  try {
    const respostaBruta = await chamarAgente(mensagens);
    const itens = extrairDiagnostico(respostaBruta);
    res.json({ itens });
  } catch (err) {
    res.status(502).json({ error: "falha ao chamar o agente", detalhes: (err as Error).message });
  }
});

roteirosRouter.post("/:id/eventos", async (req, res) => {
  const parsedParams = parseParamsOu400(idParamSchema, req, res, "id inválido");
  if (!parsedParams) return;
  const parsedBody = parseBodyOu400(eventoBodySchema, req, res);
  if (!parsedBody) return;

  try {
    const result = await pool.query(
      "INSERT INTO eventos (roteiro_id, tipo, detalhes) VALUES ($1, $2, $3) RETURNING id, tipo, detalhes, criado_em",
      [parsedParams.id, parsedBody.tipo, parsedBody.detalhes],
    );
    res.status(201).json(result.rows[0]);
  } catch {
    res.status(404).json({ error: "roteiro não encontrado" });
  }
});

roteirosRouter.get("/:id/eventos", async (req, res) => {
  const parsedParams = parseParamsOu400(idParamSchema, req, res, "id inválido");
  if (!parsedParams) return;

  const result = await pool.query(
    "SELECT id, tipo, detalhes, criado_em FROM eventos WHERE roteiro_id = $1 ORDER BY criado_em ASC",
    [parsedParams.id],
  );
  res.json(result.rows);
});

roteirosRouter.get("/:id/propostas", async (req, res) => {
  const parsedParams = parseParamsOu400(idParamSchema, req, res, "id inválido");
  if (!parsedParams) return;
  const status = typeof req.query.status === "string" ? req.query.status : "pendente";

  const result = await pool.query(
    "SELECT id, path, valor, status, criado_em FROM propostas WHERE roteiro_id = $1 AND status = $2 ORDER BY criado_em ASC",
    [parsedParams.id, status],
  );
  res.json(result.rows);
});

roteirosRouter.post("/:id/propostas/:propostaId/resolver", async (req, res) => {
  const parsedParams = parseParamsOu400(propostaParamSchema, req, res, "id inválido");
  if (!parsedParams) return;
  const parsedBody = parseBodyOu400(resolverPropostaBodySchema, req, res);
  if (!parsedBody) return;

  const proposta = await pool.query(
    "SELECT id, path, valor FROM propostas WHERE id = $1 AND roteiro_id = $2 AND status = 'pendente'",
    [parsedParams.propostaId, parsedParams.id],
  );
  if (proposta.rows.length === 0) {
    res.status(404).json({ error: "proposta pendente não encontrada" });
    return;
  }

  if (parsedBody.acao === "aceitar") {
    const roteiro = await pool.query("SELECT data FROM roteiros WHERE id = $1", [parsedParams.id]);
    const novaData = applyUpdates(roteiro.rows[0].data, [
      { path: proposta.rows[0].path, value: proposta.rows[0].valor },
    ]);
    await pool.query("UPDATE roteiros SET data = $1, updated_at = now() WHERE id = $2", [
      novaData,
      parsedParams.id,
    ]);
  }

  const novoStatus = parsedBody.acao === "aceitar" ? "aceita" : "rejeitada";
  const propostaAtualizada = await pool.query(
    "UPDATE propostas SET status = $1, resolvida_em = now() WHERE id = $2 RETURNING id, path, valor, status, criado_em, resolvida_em",
    [novoStatus, parsedParams.propostaId],
  );
  const roteiroAtualizado = await pool.query(
    "SELECT id, data, created_at, updated_at FROM roteiros WHERE id = $1",
    [parsedParams.id],
  );

  res.json({ proposta: propostaAtualizada.rows[0], roteiro: roteiroAtualizado.rows[0] });
});
