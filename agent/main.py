"""Agente Story Render — Fase 0: grafo mínimo de um nó, servido via AG-UI.

Sem domínio ainda: só prova o caminho chat → LangGraph → OpenRouter → streaming.
"""

import os

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

app = FastAPI(title="Story Render Agent")
add_langgraph_fastapi_endpoint(
    app,
    # O adaptador AG-UI consulta aget_state entre turnos — o grafo PRECISA de
    # checkpointer, senão "ValueError: No checkpointer set" em toda chamada.
    # Em memória por enquanto; persistência real é fatia da Fase 1.
    LangGraphAgent(name="story_agent", graph=grafo.compile(checkpointer=MemorySaver())),
    "/agent",
)


@app.get("/health")
def health() -> dict:
    return {"ok": True}
