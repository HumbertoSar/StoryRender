"""Agente Tutor — método McKee Inspired (9 degraus), em validação SÓ TEXTO.

Trilho separado do agente McKee original (`main.py`): grafo de um nó, sem tools
e sem estado de roteiro. Tudo o que o Tutor produz nesta fase (mapa, mural de
promessas, backlog de pendências, dossiê do antagonista) sai como texto no
chat; transformar isso em superfície de UI é a fase seguinte, e só começa
depois que a instrução estiver validada em conversa real.

Nomenclatura: o MÉTODO se chama McKee Inspired (antes "O Fio"); a PERSONA que
o conduz continua sendo o Tutor. Por isso este módulo e o agente seguem com
nome de tutor, e só o método foi renomeado.
"""

from pathlib import Path

from langchain_core.messages import SystemMessage
from langgraph.graph import END, START, MessagesState, StateGraph

ARQUIVO_INSTRUCAO = Path(__file__).parent / "metodos" / "mckee_inspired.md"


def carregar_instrucao() -> str:
    """Lê a instrução do disco A CADA TURNO.

    É o ciclo de validação desta fase: editar o .md e mandar a próxima
    mensagem já testa a versão nova do prompt — sem restart do agente, sem
    rebuild, sem commit. O custo (ler poucos KB) é irrelevante perto da
    latência da chamada ao modelo.

    Convenção do arquivo: se as primeiras linhas forem cabeçalho editorial
    fechado por uma linha `---`, só o que vem DEPOIS vai pro modelo — assim o
    arquivo continua legível como documento (título, proveniência) sem sujar o
    system prompt. O limite de 10 linhas evita cortar num `---` do meio do
    corpo caso o cabeçalho não exista.
    """
    linhas = ARQUIVO_INSTRUCAO.read_text(encoding="utf-8").splitlines()
    for i, linha in enumerate(linhas[:10]):
        if linha.strip() == "---":
            return "\n".join(linhas[i + 1 :]).strip()
    return "\n".join(linhas).strip()


def construir_grafo(model):
    """Grafo do Tutor. `model` vem de main.py — mesma instância e mesma config
    de OpenRouter do trilho McKee, pra comparar os dois métodos sem introduzir
    diferença de modelo como variável."""

    async def conversar(state: MessagesState) -> MessagesState:
        resposta = await model.ainvoke(
            [SystemMessage(content=carregar_instrucao()), *state["messages"]]
        )
        return {"messages": [resposta]}

    grafo = StateGraph(MessagesState)
    grafo.add_node("conversar", conversar)
    grafo.add_edge(START, "conversar")
    grafo.add_edge("conversar", END)
    return grafo
