"""Agente Story Render — Fase 0: grafo mínimo de um nó, servido via AG-UI.

Sem domínio ainda: só prova o caminho chat → LangGraph → OpenRouter → streaming.
"""

import os

from ag_ui_langgraph import LangGraphAgent, add_langgraph_fastapi_endpoint
from dotenv import load_dotenv
from fastapi import FastAPI
from langchain_openai import ChatOpenAI
from langgraph.graph import END, START, MessagesState, StateGraph

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


async def conversar(state: MessagesState) -> MessagesState:
    resposta = await model.ainvoke(state["messages"])
    return {"messages": [resposta]}


grafo = StateGraph(MessagesState)
grafo.add_node("conversar", conversar)
grafo.add_edge(START, "conversar")
grafo.add_edge("conversar", END)

app = FastAPI(title="Story Render Agent")
add_langgraph_fastapi_endpoint(
    app,
    LangGraphAgent(name="story_agent", graph=grafo.compile()),
    "/agent",
)


@app.get("/health")
def health() -> dict:
    return {"ok": True}
