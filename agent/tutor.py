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

from langchain_core.messages import SystemMessage
from langgraph.graph import END, START, MessagesState, StateGraph

from forma import normalizar
from instrucao import montar


def carregar_instrucao(ultimo_turno_do_tutor: str = "") -> str:
    """A instrução deste turno, montada do disco A CADA TURNO.

    Ler do disco é o ciclo de validação desta fase: editar o .md e mandar a
    próxima mensagem já testa a versão nova do prompt, sem restart do agente,
    sem rebuild, sem commit. O custo (ler poucos KB) é irrelevante perto da
    latência da chamada ao modelo.

    Quem decide o que entra é `instrucao.montar`: o primeiro turno leva tudo
    (é o mapa, que classifica os nove degraus) e os seguintes levam só o que o
    foco pede. Ver o módulo pra saber por quê.
    """
    return montar(ultimo_turno_do_tutor)


def _texto(mensagem) -> str:
    conteudo = getattr(mensagem, "content", "")
    if isinstance(conteudo, str):
        return conteudo
    return "\n".join(
        b.get("text", "") for b in conteudo if isinstance(b, dict)
    )


def _ultimo_turno_do_tutor(mensagens) -> str:
    for mensagem in reversed(mensagens):
        if getattr(mensagem, "type", None) == "ai":
            return _texto(mensagem)
    return ""


def construir_grafo(model):
    """Grafo do Tutor. `model` vem de main.py — mesma instância e mesma config
    de OpenRouter do trilho McKee, pra comparar os dois métodos sem introduzir
    diferença de modelo como variável."""

    async def conversar(state: MessagesState) -> MessagesState:
        instrucao = carregar_instrucao(_ultimo_turno_do_tutor(state["messages"]))
        resposta = await model.ainvoke(
            [SystemMessage(content=instrucao), *state["messages"]]
        )
        # Correção determinística do que não precisa de modelo (travessão,
        # título de nível 1). Vale sobre a mensagem que fica gravada e que o
        # front recebe no snapshot do fim do run; os chunks já streamados
        # trazem o texto cru, e o turno se assenta no normalizado ao terminar.
        if isinstance(resposta.content, str):
            resposta.content = normalizar(resposta.content)
        elif isinstance(resposta.content, list):
            resposta.content = [
                {**b, "text": normalizar(b["text"])}
                if isinstance(b, dict) and isinstance(b.get("text"), str)
                else b
                for b in resposta.content
            ]
        return {"messages": [resposta]}

    grafo = StateGraph(MessagesState)
    grafo.add_node("conversar", conversar)
    grafo.add_edge(START, "conversar")
    grafo.add_edge("conversar", END)
    return grafo
