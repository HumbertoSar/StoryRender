import { NextRequest } from "next/server";

// O agente Python escuta em 127.0.0.1 e não é exposto ao navegador — mesmo
// arranjo de /api/copilotkit. Este handler é só a ponte pro POST/GET de
// feedback; a regra de negócio (upsert, desmarcar, 503 sem banco) mora lá.
const AGENTE = process.env.AGENT_FEEDBACK_URL ?? "http://127.0.0.1:8000/feedback";

async function repassar(resposta: Response) {
  const corpo = await resposta.text();
  return new Response(corpo, {
    status: resposta.status,
    headers: { "content-type": "application/json" },
  });
}

// Falha de rede (agente fora do ar) vira 503 com o mesmo formato de erro do
// agente: pro front, "não gravou" é a mesma coisa nos dois casos.
function foraDoAr(erro: unknown) {
  return Response.json(
    { detail: `agente indisponível: ${erro instanceof Error ? erro.message : erro}` },
    { status: 503 },
  );
}

export async function GET(req: NextRequest) {
  const thread = req.nextUrl.searchParams.get("thread");
  if (!thread) {
    return Response.json({ detail: "falta o parâmetro thread" }, { status: 400 });
  }
  try {
    return repassar(
      await fetch(`${AGENTE}?thread_id=${encodeURIComponent(thread)}`, {
        cache: "no-store",
      }),
    );
  } catch (erro) {
    return foraDoAr(erro);
  }
}

export async function POST(req: NextRequest) {
  try {
    return repassar(
      await fetch(AGENTE, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: await req.text(),
      }),
    );
  } catch (erro) {
    return foraDoAr(erro);
  }
}
