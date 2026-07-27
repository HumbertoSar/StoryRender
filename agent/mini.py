"""Agente McKee Mini — trilho open-ended (nível 3 da taxonomia CopilotKit).

Terceiro trilho, separado dos dois anteriores pelo mesmo motivo que o Tutor foi
separado do McKee: `/mckee` e `/mckee-inspired` estão congelados e em produção,
e nada da validação daqui pode regredi-los.

**Fatia 3.** Grafo de dois nós: `conversar` e `tools`. A primeira primitiva de
escrita (`escrever_no_mapa`) já grava no canal `mapa`, que nasce completo, com
os seis cards da espinha e todos os buracos à mostra. As outras quatro tools do
plano e as fórmulas do método entram nas fatias seguintes.

O desenho não é um nó do grafo: `generateSandboxedUi` é uma tool de FRONTEND,
registrada pelo `<CopilotKit>` quando `openGenerativeUI` está ligado no runtime.
Ela chega aqui em `state["tools"]`, o nó a binda junto das nossas, e a chamada
encerra o run — o CopilotKit intercepta, o middleware transcodifica os
argumentos streamados em eventos de activity, e o run de continuação acontece
sozinho porque a tool é registrada com `followUp: true`. É o roteador abaixo
que separa os dois casos.
"""

from inspect import cleandoc
from pathlib import Path
from typing import Annotated, Optional

from langchain_core.messages import SystemMessage, ToolMessage
from langchain_core.tools import InjectedToolCallId, tool
from langgraph.graph import END, START, MessagesState, StateGraph
from langgraph.prebuilt import InjectedState, ToolNode
from langgraph.types import Command
from pydantic import BaseModel, Field

import mini_mapa
from forma import normalizar

ARQUIVO_INSTRUCAO = Path(__file__).parent / "metodos" / "mckee_mini.md"


class MapaState(MessagesState):
    # O mapa da história, no contrato de `mini_mapa.py`. Mesmo sem nada escrito
    # o canal precisa existir desde o checkpoint nº 1, porque
    # `sessoes.trilho_dos_canais` deduz o trilho do FORMATO do estado — sem
    # ele, toda sessão do Mini seria classificada como McKee Inspired e
    # apareceria na lista do trilho errado, calada.
    mapa: dict
    # Tools do FRONTEND (aqui, generateSandboxedUi) chegam via
    # RunAgentInput.tools e o adaptador as injeta no estado; o LangGraph
    # descarta chaves fora do schema, então o canal precisa estar declarado.
    tools: list


def carregar_instrucao() -> str:
    """A instrução deste turno, lida do disco A CADA TURNO.

    Mesmo ciclo de validação do Tutor: editar o .md e mandar a próxima mensagem
    já testa a versão nova, sem restart, sem rebuild, sem commit. O cabeçalho
    editorial (tudo antes da primeira linha `---` nas dez primeiras) é
    documentação pra humano e não vai pro modelo.

    Sem montagem por turno de propósito: ela foi otimização pra um prompt de
    23 KB, e este ainda não tem tamanho que justifique. Medir antes.
    """
    linhas = ARQUIVO_INSTRUCAO.read_text(encoding="utf-8").splitlines()
    for i, linha in enumerate(linhas[:10]):
        if linha.strip() == "---":
            return "\n".join(linhas[i + 1:]).strip()
    return "\n".join(linhas).strip()


def mapa_do_estado(state: dict) -> dict:
    return state.get("mapa") or mini_mapa.mapa_vazio()


class Preenchimento(BaseModel):
    """Um slot de um card recebendo texto."""

    card_id: str = Field(description="id do card, como 'lacuna-1' ou 'lacuna-3.1'")
    slot: str = Field(description="id do slot dentro desse card, como 'protagonista'")
    texto: str = Field(
        description="o que o autor contou, curto e concreto, na voz dele. Não invente"
    )
    hipotese: Optional[bool] = Field(
        default=None,
        description="true quando o texto é hipótese SUA, não do autor: o card "
        "fica fantasma no mapa até ele confirmar. Omita quando for do autor",
    )


@tool
def escrever_no_mapa(
    preenchimentos: list[Preenchimento],
    state: Annotated[dict, InjectedState] = None,
    tool_call_id: Annotated[str, InjectedToolCallId] = "",
) -> Command:
    """Escreve no mapa da história o que o autor já contou.

    Use assim que o autor der material, sem pedir permissão: o mapa é a
    memória da sessão, e o que não está nele não existe. Vários slots de uma
    vez são bem-vindos quando o autor despeja a história solta.
    """
    # O ToolNode entrega os argumentos já validados pelo pydantic; a
    # normalização pra dict é o que deixa `mini_mapa` puro (sem saber de
    # LangChain) e testável sem LLM.
    pedidos = [
        item.model_dump() if isinstance(item, BaseModel) else dict(item)
        for item in preenchimentos or []
    ]
    novo, relato = mini_mapa.escrever(mapa_do_estado(state), pedidos)

    partes = []
    if relato["aplicados"]:
        partes.append("escrito em " + ", ".join(relato["aplicados"]))
    for recusa in relato["recusados"]:
        partes.append(f"RECUSADO {recusa}")
    update: dict = {
        "messages": [ToolMessage("; ".join(partes) or "nada a escrever",
                                 tool_call_id=tool_call_id)]
    }
    # Só grava o canal quando algo mudou de fato: um lote inteiro recusado não
    # tem por que emitir STATE_SNAPSHOT igual ao anterior pro front.
    if relato["aplicados"]:
        update["mapa"] = novo
    return Command(update=update)


TOOLS = [escrever_no_mapa]
BACKEND_TOOL_NAMES = {t.name for t in TOOLS}

# A lista de cards e slots vem do ESQUELETO, não de uma segunda cópia escrita à
# mão aqui: card novo no método aparece na descrição da tool sem ninguém
# lembrar de atualizar dois lugares. Fica na DESCRIÇÃO da tool, e não na
# instrução do método, porque é vocabulário de chamada — a instrução da Fatia 6
# cuida de quando e por que escrever.
#
# `cleandoc` porque o `@tool` NÃO tira a indentação do docstring: sem ele as
# linhas de continuação chegam ao modelo com quatro espaços na frente, que em
# markdown é bloco de código.
escrever_no_mapa.description = cleandoc(escrever_no_mapa.description)
escrever_no_mapa.description += "\n\nCards e slots que existem:\n" + "\n".join(
    f"- {'lacuna-3.1 (e 3.2, 3.3, 3.4 conforme a corrente cresce)' if mid == 'lacuna-3' else mid}"
    f" · {modelo['nome']}: {', '.join(modelo['slots'])}"
    for mid, modelo in mini_mapa.ESQUELETO.items()
)


def _normalizar_conteudo(resposta):
    """Normaliza SÓ o texto do turno, nunca os argumentos de tool.

    Cuidado que não é óbvio e quebra em silêncio: `forma.normalizar` troca
    travessão no meio da linha por vírgula. Os argumentos de
    `generateSandboxedUi` (o HTML e o CSS do desenho) vivem em
    `resposta.tool_calls`, e passar o normalizador por cima deles corromperia
    a marcação. Se alguém "melhorar" isto depois, o sintoma é um quadro em
    branco sem erro nenhum.
    """
    if isinstance(resposta.content, str):
        resposta.content = normalizar(resposta.content)
    elif isinstance(resposta.content, list):
        resposta.content = [
            {**b, "text": normalizar(b["text"])}
            if isinstance(b, dict) and isinstance(b.get("text"), str)
            else b
            for b in resposta.content
        ]
    return resposta


def construir_grafo(model):
    """Grafo do Mini. `model` vem de main.py — mesma instância dos outros dois
    trilhos, pra não introduzir diferença de modelo como variável na hora de
    comparar open-ended com declarative."""

    async def conversar(state: MapaState) -> dict:
        tools_do_front = state.get("tools") or []
        # parallel_tool_calls=False pelo mesmo motivo do trilho McKee: um lote
        # misto (uma tool nossa e uma do front na mesma resposta) não teria como
        # ser atendido por um roteador que precisa decidir entre executar aqui e
        # encerrar o run. Consequência de projeto: escrever no mapa e desenhá-lo
        # são sempre turnos diferentes, o que deixa o desenho visível como
        # evento em vez de efeito colateral de uma resposta de texto.
        modelo = model.bind_tools([*TOOLS, *tools_do_front], parallel_tool_calls=False)
        resposta = await modelo.ainvoke(
            [SystemMessage(content=carregar_instrucao()), *state["messages"]]
        )
        update: dict = {"messages": [_normalizar_conteudo(resposta)]}
        if not state.get("mapa"):
            # Só grava quando o mapa nasce: nos turnos seguintes quem escreve é
            # a tool. O que importa é que o canal exista no PRIMEIRO checkpoint
            # (ver o comentário em MapaState) — e que ele já nasça com os seis
            # cards, porque o §4.3 quer o autor VENDO os buracos da própria
            # história no primeiro minuto.
            update["mapa"] = mini_mapa.mapa_vazio()
        return update

    def rotear(state: MapaState) -> str:
        """Tool nossa executa aqui; tool do frontend encerra o run.

        `generateSandboxedUi` não tem implementação em Python: quem a executa é
        o CopilotKit, do outro lado do AG-UI. Mandá-la pro ToolNode daria
        "tool não encontrada" e mataria o run no meio do desenho.
        """
        ultima = state["messages"][-1]
        calls = getattr(ultima, "tool_calls", None) or []
        if calls and all(c["name"] in BACKEND_TOOL_NAMES for c in calls):
            return "tools"
        return END

    grafo = StateGraph(MapaState)
    grafo.add_node("conversar", conversar)
    grafo.add_node("tools", ToolNode(TOOLS))
    grafo.add_edge(START, "conversar")
    grafo.add_conditional_edges("conversar", rotear, ["tools", END])
    # De volta pro modelo depois de escrever: é o turno em que ele conta ao
    # autor o que entrou no mapa e faz a próxima pergunta.
    grafo.add_edge("tools", "conversar")
    return grafo
