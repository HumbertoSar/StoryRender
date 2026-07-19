"""Agente Story Render — grafo LangGraph servido via AG-UI."""

import os
from contextlib import asynccontextmanager
from typing import Annotated, Optional

from ag_ui_langgraph import LangGraphAgent, add_langgraph_fastapi_endpoint
from dotenv import load_dotenv
from fastapi import FastAPI
from langchain_core.messages import SystemMessage, ToolMessage
from langchain_core.tools import InjectedToolCallId, tool
from langchain_openai import ChatOpenAI
from langgraph.checkpoint.memory import MemorySaver
from langgraph.graph import END, START, MessagesState, StateGraph
from langgraph.prebuilt import InjectedState, ToolNode, tools_condition
from langgraph.types import Command

from roteiro import (
    adicionar_complicacao,
    resumo_espinha,
    resumo_protagonista,
    roteiro_mckee_vazio,
)

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


@tool
def criar_complicacao(
    conteudo: str,
    posicao: Optional[int] = None,
    state: Annotated[dict, InjectedState] = None,
    tool_call_id: Annotated[str, InjectedToolCallId] = "",
) -> Command:
    """Cria uma complicação nova na espinha dramática do roteiro.

    Args:
        conteudo: o texto da complicação (o evento que intensifica o conflito).
        posicao: posição de exibição 1-based entre as complicações existentes;
            omitida, a complicação vai pro fim.
    """
    roteiro = state.get("roteiro") or roteiro_mckee_vazio()
    novo = adicionar_complicacao(roteiro, conteudo, posicao)
    criada = novo["espinha"][-1]
    return Command(update={
        "roteiro": novo,
        "messages": [ToolMessage(f"complicação criada ({criada['id']})", tool_call_id=tool_call_id)],
    })


TOOLS = [criar_complicacao]
model_com_tools = model.bind_tools(TOOLS)

INSTRUCAO = """Você é o agente do Story Render: ajuda escritores a estruturar \
histórias pelo método McKee. Responda sempre em português, de forma direta. \
Quando o usuário descrever ou pedir uma complicação nova pra espinha, use a \
tool criar_complicacao (escolhendo a posicao certa se ele indicar onde)."""


async def conversar(state: RoteiroState) -> RoteiroState:
    roteiro = state.get("roteiro") or roteiro_mckee_vazio()
    # Contexto enxuto por turno: só a espinha atual (posições 1-based), não o
    # JSON inteiro do roteiro — o modelo precisa disso pra escolher `posicao`.
    system = SystemMessage(
        content=f"{INSTRUCAO}\n\nEspinha atual:\n{resumo_espinha(roteiro)}"
        f"\n\nProtagonista:\n{resumo_protagonista(roteiro)}"
    )
    resposta = await model_com_tools.ainvoke([system, *state["messages"]])
    return {"messages": [resposta], "roteiro": roteiro}


grafo = StateGraph(RoteiroState)
grafo.add_node("conversar", conversar)
grafo.add_node("tools", ToolNode(TOOLS))
grafo.add_edge(START, "conversar")
# tools_condition roteia pra "tools" quando a resposta tem tool_calls, senão END.
grafo.add_conditional_edges("conversar", tools_condition)
grafo.add_edge("tools", "conversar")

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
