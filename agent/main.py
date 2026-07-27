"""Agente Story Render — grafo LangGraph servido via AG-UI."""

import os
from contextlib import asynccontextmanager
from typing import Annotated, Optional

from ag_ui_langgraph import LangGraphAgent, add_langgraph_fastapi_endpoint, get_a2ui_tools
from dotenv import load_dotenv
from fastapi import FastAPI
from langchain_core.messages import SystemMessage, ToolMessage
from langchain_core.tools import InjectedToolCallId, tool
from langchain_openai import ChatOpenAI
from langgraph.checkpoint.memory import MemorySaver
from langgraph.graph import END, START, MessagesState, StateGraph
from langgraph.prebuilt import InjectedState, ToolNode
from langgraph.types import Command

from feedback import criar_tabela as criar_tabela_feedback
from feedback import router as router_feedback
from feedback import usar_pool as usar_pool_feedback
# O diretório vem de quem o LÊ, não de uma segunda cópia do caminho aqui: é o
# que garante que o /health confira exatamente a pasta que o Tutor abre.
from instrucao import DIRETORIO as DIRETORIO_METODOS
from roteiro import (
    adicionar_complicacao,
    resumo_assets,
    resumo_espinha,
    roteiro_mckee_vazio,
)
from mini import construir_grafo as construir_grafo_mini
from sessoes import router as router_sessoes
from sessoes import usar_pool as usar_pool_sessoes
from telemetria import criar_tabela as criar_tabela_telemetria
from telemetria import usar_pool as usar_pool_telemetria
from tutor import construir_grafo as construir_grafo_tutor

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
    # Tools do FRONTEND (useCopilotAction) chegam via RunAgentInput.tools e o
    # adaptador as injeta no estado — mas o LangGraph descarta chaves fora do
    # schema, então o canal precisa estar declarado aqui pra elas existirem.
    tools: list


def roteiro_do_estado(state: dict) -> dict:
    return state.get("roteiro") or roteiro_mckee_vazio()


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
    novo = adicionar_complicacao(roteiro_do_estado(state), conteudo, posicao)
    criada = novo["espinha"][-1]
    return Command(update={
        "roteiro": novo,
        "messages": [ToolMessage(f"complicação criada ({criada['id']})", tool_call_id=tool_call_id)],
    })


# Nível 2 (declarative): generate_a2ui delega a um SUBAGENTE a composição de
# uma superfície A2UI v0.9 (streamada pro chat via tool-call interna
# render_a2ui, que o CopilotKit pinta com o catálogo do provider).
a2ui = get_a2ui_tools({"model": model})

TOOLS = [criar_complicacao, a2ui]
BACKEND_TOOL_NAMES = {t.name for t in TOOLS}

INSTRUCAO = """Você é o agente do Story Render: ajuda escritores a estruturar \
histórias pelo método McKee. Responda sempre em português, de forma direta.

Regras de condução (não-negociáveis):
- UM item por vez: cada turno seu trata de um único campo, cartão ou nó. \
Nunca despeje perguntas sobre vários itens de uma vez — escolha o próximo \
item mais importante e conduza só ele.
- Seja direto e breve: 2 a 4 frases por resposta, no máximo. Isso é um chat, \
não um ensaio.
- Nunca peça permissão pra propor ("posso sugerir...?") — o aceitar/rejeitar \
do card já é a confirmação. Tendo conteúdo suficiente, proponha direto; \
faltando, faça UMA pergunta de conteúdo.

Regras de escrita no quadro:
- Estrutura (complicações na espinha): use criar_complicacao direto, \
escolhendo a posicao certa se o usuário indicar onde.
- Conteúdo dos campos de texto dos cartões (protagonistas, antagonista, \
ideia_controladora, mundo, genero): você NUNCA escreve direto. Quando tiver \
uma sugestão de texto pra um campo, use a tool propor_campo (com asset e \
campo exatos do resumo abaixo) — o usuário aceita ou rejeita no chat. Se \
rejeitar, pergunte o que ajustar em vez de insistir na mesma proposta. Uma \
proposta por vez.

Visualizações — quando o usuário pedir uma visão VISUAL da história (painel, \
resumo visual, linha do tempo, mapa da estrutura), use a tool generate_a2ui: \
descreva no intent o que mostrar a partir do estado atual do roteiro. Não \
tente desenhar em texto/markdown o que a tool pode renderizar.

Modo Diagnóstico — quando o usuário pedir revisão/diagnóstico do roteiro, \
rode estes testes de coerência e entregue o resultado chamando a tool \
mostrar_diagnostico (lista vazia se não achar nada), sem repetir os itens em \
texto:
1. Want × Need alinhados demais (o Want já resolve o Need)?
2. Aposta ainda vaga ("tudo", "muito"), sem exemplo concreto?
3. A Crise reflete o caráter verdadeiro ou só a caracterização?
4. O arco se paga no Clímax ou fica solto?
5. Antagonismo sistêmico sem avatar concreto pra dramatizar?
6. Poder do Antagonista claramente ≥ que o do Protagonista?
7. Ideia Controladora (valor+causa) se prova no Clímax?
8. Cada Complicação escala de verdade sobre a anterior?
9. As regras do Mundo geram os obstáculos das Complicações?
10. As convenções do Gênero ecoam em algum ponto da espinha?
Regra de ouro: campo VAZIO não é inconsistência — é só incompleto, e o \
quadro já mostra isso. Só aponte problema em conteúdo que EXISTE (vago, \
contraditório, desconectado). severidade "critico" só pra quebra estrutural \
do método; "aviso" pro resto. Máximo 8 itens, os mais importantes agora."""


async def conversar(state: RoteiroState) -> RoteiroState:
    roteiro = roteiro_do_estado(state)
    # Tools do frontend (ex.: propor_campo) chegam via RunAgentInput.tools e o
    # adaptador as põe em state["tools"] como dicts JSON-schema — o bind aceita.
    # parallel_tool_calls=False: uma tool por resposta — evita o caso misto
    # (backend+frontend juntos) que o roteador abaixo não tem como atender.
    tools_do_front = state.get("tools") or []
    modelo = model.bind_tools([*TOOLS, *tools_do_front], parallel_tool_calls=False)
    # Contexto enxuto por turno: resumos, não o JSON inteiro do roteiro.
    system = SystemMessage(
        content=f"{INSTRUCAO}\n\nEspinha atual:\n{resumo_espinha(roteiro)}"
        f"\n\nCartões:\n{resumo_assets(roteiro)}"
    )
    resposta = await modelo.ainvoke([system, *state["messages"]])
    update: dict = {"messages": [resposta]}
    if not state.get("roteiro"):
        # Só grava o canal quando o roteiro nasce aqui; nos demais turnos o
        # canal já está correto (cliente/ToolNode) e reescrever é redundante.
        update["roteiro"] = roteiro
    return update


def rotear_apos_conversar(state: RoteiroState) -> str:
    """Só tool de backend vai pro ToolNode. Tool do frontend encerra o run:
    o CopilotKit intercepta a tool call, renderiza a UI (HITL) e manda o
    resultado de volta num run de continuação."""
    ultima = state["messages"][-1]
    calls = getattr(ultima, "tool_calls", None) or []
    if calls and all(c["name"] in BACKEND_TOOL_NAMES for c in calls):
        return "tools"
    return END


grafo = StateGraph(RoteiroState)
grafo.add_node("conversar", conversar)
grafo.add_node("tools", ToolNode(TOOLS))
grafo.add_edge(START, "conversar")
grafo.add_conditional_edges("conversar", rotear_apos_conversar, ["tools", END])
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

# Segundo trilho: método McKee Inspired, conduzido pelo agente Tutor. Grafo
# próprio, sem tools e sem estado compartilhado. Separado de propósito: o
# trilho McKee original está fechado e em produção, e nada da validação do
# McKee Inspired pode regredi-lo.
grafo_tutor = construir_grafo_tutor(model)
agente_tutor = LangGraphAgent(
    name="tutor_agent", graph=grafo_tutor.compile(checkpointer=MemorySaver())
)

# Terceiro trilho: método McKee Mini, nível open-ended. Endpoint próprio no
# mesmo servidor, e runtime próprio do lado do web (/api/copilotkit-mini): o
# flag openGenerativeUI é GLOBAL por runtime, então ligá-lo no runtime
# compartilhado daria a tool generateSandboxedUi também ao story_agent, que
# está congelado.
grafo_mini = construir_grafo_mini(model)
agente_mini = LangGraphAgent(
    name="mckee_mini", graph=grafo_mini.compile(checkpointer=MemorySaver())
)

# (agente, grafo) — o lifespan recompila cada um com o checkpointer do Postgres.
AGENTES = [(agente, grafo), (agente_tutor, grafo_tutor), (agente_mini, grafo_mini)]
_pool = None

# Qual checkpointer está de fato em uso. O fallback pra memória é silencioso de
# propósito (banco fora não pode derrubar o dev), e é justamente por isso que
# precisa aparecer em algum lugar consultável: este campo no /health.
_checkpointer = "memoria"


@asynccontextmanager
async def lifespan(app: FastAPI):
    global _pool, _checkpointer
    if DATABASE_URL:
        from langgraph.checkpoint.postgres.aio import AsyncPostgresSaver
        from psycopg.rows import dict_row
        from psycopg_pool import AsyncConnectionPool

        try:
            _pool = AsyncConnectionPool(
                DATABASE_URL,
                open=False,
                timeout=10,
                kwargs={"autocommit": True, "row_factory": dict_row},
            )
            await _pool.open(wait=True, timeout=10)
            saver = AsyncPostgresSaver(_pool)
            await saver.setup()  # cria as tabelas de checkpoint se não existem
            for ag, g in AGENTES:
                ag.graph = g.compile(checkpointer=saver)
            # Feedback por turno vive na MESMA base das sessões de propósito:
            # é o que deixa o exportador casar marca e turno numa consulta só.
            await criar_tabela_feedback(_pool)
            usar_pool_feedback(_pool)
            # Leitura do acervo (tela de seleção de sessão) — mesmo pool, mesmo
            # checkpointer que o grafo escreve.
            usar_pool_sessoes(_pool)
            # Telemetria por chamada ao modelo. Hoje só o Mini grava; os dois
            # trilhos congelados seguem sem instrumento de propósito, porque
            # instrumentá-los seria evoluí-los. Sem esta linha o módulo é
            # no-op silencioso, que é o comportamento certo em dev sem banco.
            await criar_tabela_telemetria(_pool)
            usar_pool_telemetria(_pool)
            _checkpointer = "postgres"
            print("checkpointer: Postgres")
        except Exception as e:  # túnel/banco fora não pode impedir o dev local
            print(f"AVISO: Postgres indisponível ({e!r}) — usando checkpointer em MEMÓRIA; estado NÃO sobrevive a restart")
            if _pool is not None:
                await _pool.close()
                _pool = None
    yield
    if _pool is not None:
        await _pool.close()


app = FastAPI(title="Story Render Agent", lifespan=lifespan)
add_langgraph_fastapi_endpoint(app, agente, "/agent")
add_langgraph_fastapi_endpoint(app, agente_tutor, "/agent-tutor")
add_langgraph_fastapi_endpoint(app, agente_mini, "/agent-mini")
app.include_router(router_feedback)
app.include_router(router_sessoes)


@app.get("/health")
def health() -> dict:
    """Diagnóstico, não só sinal de vida.

    Um /health que devolve `{"ok": True}` e nada mais responde ok com o
    Postgres em fallback silencioso, com a chave do modelo ausente e com os
    arquivos de método fora da imagem. O último aconteceu: `metodos/` ficou de
    fora do Dockerfile e o Tutor levantou FileNotFoundError em todo turno sem
    que nada aqui mudasse. Cada campo abaixo é uma falha já vivida.
    """
    metodos: dict[str, int | str] = {}
    # glob em diretório inexistente devolve vazio sem erro — e é exatamente
    # esse o sintoma do bug do Dockerfile: dicionário vazio, `ok` falso.
    for arquivo in sorted(DIRETORIO_METODOS.glob("*.md")):
        try:
            metodos[arquivo.name] = len(arquivo.read_text(encoding="utf-8"))
        except OSError as erro:
            metodos[arquivo.name] = f"ilegível: {erro}"
    return {
        # Falso quando um método não pôde ser lido: o servidor sobe, mas o
        # trilho que depende dele responderia erro em todo turno.
        "ok": bool(metodos) and all(isinstance(v, int) for v in metodos.values()),
        "checkpointer": _checkpointer,
        "metodos": metodos,
        "modelo": model.model_name,
        # Só a presença, nunca o valor.
        "chave_do_modelo": "presente" if os.environ.get("OPENROUTER_API_KEY") else "ausente",
    }
