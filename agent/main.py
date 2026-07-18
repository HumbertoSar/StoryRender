"""Agente Story Render — grafo LangGraph servido via AG-UI."""

import os
from contextlib import asynccontextmanager

from ag_ui_langgraph import LangGraphAgent, add_langgraph_fastapi_endpoint
from dotenv import load_dotenv
from fastapi import FastAPI
from langchain_openai import ChatOpenAI
from langgraph.checkpoint.memory import MemorySaver
from langgraph.graph import END, START, MessagesState, StateGraph

from roteiro import roteiro_mckee_vazio

load_dotenv()

# OpenRouter em vez da API da Anthropic direto — troca de modelo por env var,
# mesma decisão do backend legado (CLAUDE.md, seção Stack).
model = ChatOpenAI(
    model=os.environ.get("OPENROUTER_MODEL", "anthropic/claude-sonnet-4.5"),
    base_url="https://openrouter.ai/api/v1",
    # Placeholder permite o servidor subir sem chave (testes/CI); a chamada
    # real ao modelo falha com 401 até OPENROUTER_API_KEY existir no .env.
    api_key=os.environ.get("OPENROUTER_API_KEY", "sem-chave"),
)


class RoteiroState(MessagesState):
    # Estado compartilhado agente↔quadro: o adaptador AG-UI emite
    # STATE_SNAPSHOT dele na saída do nó, e o front lê via useCoAgent.
    roteiro: dict


async def conversar(state: RoteiroState) -> RoteiroState:
    roteiro = state.get("roteiro") or roteiro_mckee_vazio()
    resposta = await model.ainvoke(state["messages"])
    return {"messages": [resposta], "roteiro": roteiro}


grafo = StateGraph(RoteiroState)
grafo.add_node("conversar", conversar)
grafo.add_edge(START, "conversar")
grafo.add_edge("conversar", END)

# O adaptador AG-UI consulta aget_state entre turnos — o grafo PRECISA de
# checkpointer, senão "ValueError: No checkpointer set" em toda chamada.
# Com DATABASE_URL (Postgres da VPS via túnel SSH), o estado sobrevive a
# restart; sem ela (testes/CI, dev sem túnel), fica no MemorySaver.
DATABASE_URL = os.environ.get("DATABASE_URL", "")

# O agente nasce com grafo em memória; se há DATABASE_URL, o lifespan troca
# pelo grafo com Postgres ANTES do servidor aceitar requests — necessário
# porque AsyncPostgresSaver exige um event loop rodando na construção
# ("RuntimeError: no running event loop" se criado no import).
agente = LangGraphAgent(name="story_agent", graph=grafo.compile(checkpointer=MemorySaver()))
_pool = None


@asynccontextmanager
async def lifespan(app: FastAPI):
    global _pool
    if DATABASE_URL:
        from langgraph.checkpoint.postgres.aio import AsyncPostgresSaver
        from psycopg.rows import dict_row
        from psycopg_pool import AsyncConnectionPool

        _pool = AsyncConnectionPool(
            DATABASE_URL,
            open=False,
            kwargs={"autocommit": True, "row_factory": dict_row},
        )
        await _pool.open()
        saver = AsyncPostgresSaver(_pool)
        await saver.setup()  # cria as tabelas de checkpoint se não existem
        agente.graph = grafo.compile(checkpointer=saver)
    yield
    if _pool is not None:
        await _pool.close()


app = FastAPI(title="Story Render Agent", lifespan=lifespan)
add_langgraph_fastapi_endpoint(app, agente, "/agent")


@app.get("/health")
def health() -> dict:
    return {"ok": True}
