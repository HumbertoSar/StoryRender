"""Agente McKee Mini — trilho open-ended (nível 3 da taxonomia CopilotKit).

Terceiro trilho, separado dos dois anteriores pelo mesmo motivo que o Tutor foi
separado do McKee: `/mckee` e `/mckee-inspired` estão congelados e em produção,
e nada da validação daqui pode regredi-los.

Grafo de dois nós: `conversar` e `tools`. A primitiva de escrita
(`escrever_no_mapa`, Fatia 3) grava no canal `mapa`, que nasce completo, com os
seis cards da espinha e todos os buracos à mostra. Desde a Fatia 6 a instrução
do turno é MONTADA a partir desse mapa (`instrucao_mini.montar`): o card em
foco vai inteiro, os outros viram uma linha de índice. As outras quatro tools
do plano entram nas fatias seguintes.

O desenho não é um nó do grafo: `generateSandboxedUi` é uma tool de FRONTEND,
registrada pelo `<CopilotKit>` quando `openGenerativeUI` está ligado no runtime.
Ela chega aqui em `state["tools"]`, o nó a binda junto das nossas, e a chamada
encerra o run — o CopilotKit intercepta, o middleware transcodifica os
argumentos streamados em eventos de activity, e o run de continuação acontece
sozinho porque a tool é registrada com `followUp: true`. É o roteador abaixo
que separa os dois casos.
"""

from inspect import cleandoc
from time import perf_counter
from typing import Annotated, Optional

from langchain_core.messages import SystemMessage, ToolMessage
from langchain_core.runnables import RunnableConfig
from langchain_core.tools import InjectedToolCallId, tool
from langgraph.graph import END, START, MessagesState, StateGraph
from langgraph.prebuilt import InjectedState, ToolNode
from langgraph.types import Command
from pydantic import BaseModel, Field

import instrucao_mini
import mini_mapa
import telemetria
from forma import normalizar


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


def carregar_instrucao(mapa: dict | None = None) -> str:
    """A instrução deste turno, montada A CADA TURNO a partir do mapa.

    Mesmo ciclo de validação do Tutor: editar o .md e mandar a próxima mensagem
    já testa a versão nova, sem restart, sem rebuild, sem commit.

    A montagem entrou na Fatia 6 (ver `instrucao_mini`): o card em foco vai
    inteiro, os outros viram uma linha de índice. Não é economia especulativa,
    é o que permite o prompt ficar do tamanho do FOCO e não do método inteiro
    conforme os cards 2 a 6 ganharem suas tabelas.
    """
    return instrucao_mini.montar(mapa)


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


def _indice_de_escrita() -> str:
    """Cards, slots e a FORMA de cada texto, gerados do ESQUELETO.

    A forma mora aqui, e não na instrução montada, por uma razão que uma
    conversa real ensinou: o primeiro turno distribui o braindump por seis
    cards de uma vez, e a instrução só abre o card em FOCO. A forma que só
    aparecia no foco chegava tarde demais justamente no turno que mais escreve,
    e `rotina` entrava no infinitivo ("segue cuidar da banca") enquanto
    `tentativa`, que era do card em foco, entrava certa.

    Restrição de escrita pertence à descrição da tool, ao lado do nome do slot.
    A instrução cuida de quando e por que escrever, que é o que exige
    julgamento.
    """
    linhas = []
    for mid, modelo in mini_mapa.ESQUELETO.items():
        nome_id = ("lacuna-3.1 (e 3.2, 3.3, 3.4 conforme a corrente cresce)"
                   if mid == "lacuna-3" else mid)
        linhas.append(f"\n{nome_id} · {modelo['nome']}")
        linhas.append(f'  frase: "{modelo["formula"]}"')
        for slot in modelo["slots"]:
            forma = (modelo.get("forma") or {}).get(slot)
            # Slot que não aparece na fórmula (o `rosto` do elo) não tem forma:
            # não há frase em que ele precise caber.
            linhas.append(f"  {slot}: {forma}" if forma
                          else f"  {slot}: texto livre, curto e concreto")
    return "\n".join(linhas)


escrever_no_mapa.description += (
    "\n\nCards e slots que existem. Escreva o texto JÁ na forma indicada: o "
    "autor fala em linguagem de história, e cabe a você encaixar na frase.\n"
    + _indice_de_escrita()
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

    def _medir(config, turno, chamada, marca, historico, instrucao,
               *, tools, uso=None, erro=None) -> None:
        """Uma linha por ida ao modelo. Não levanta e não espera (ver
        `telemetria.registrar`), então pode ficar no caminho quente do turno."""
        telemetria.registrar(
            thread_id=(config or {}).get("configurable", {}).get("thread_id"),
            trilho="mckee-mini",
            turno=turno,
            chamada=chamada,
            ms=round((perf_counter() - marca) * 1000),
            modelo=getattr(model, "model_name", "?"),
            # `usage_metadata` pode não vir (provedor que não reporta uso): a
            # coluna aceita NULL de propósito, porque "não sei" é um dado
            # diferente de zero.
            tokens_entrada=(uso or {}).get("input_tokens"),
            tokens_saida=(uso or {}).get("output_tokens"),
            instrucao_chars=len(instrucao),
            historico_chars=telemetria.tamanho(historico),
            mensagens=len(historico),
            tools=tools,
            erro=erro,
        )

    async def conversar(state: MapaState, config: RunnableConfig = None) -> dict:
        tools_do_front = state.get("tools") or []
        # parallel_tool_calls=False pelo mesmo motivo do trilho McKee: um lote
        # misto (uma tool nossa e uma do front na mesma resposta) não teria como
        # ser atendido por um roteador que precisa decidir entre executar aqui e
        # encerrar o run. Consequência de projeto: escrever no mapa e desenhá-lo
        # são sempre turnos diferentes, o que deixa o desenho visível como
        # evento em vez de efeito colateral de uma resposta de texto.
        modelo = model.bind_tools([*TOOLS, *tools_do_front], parallel_tool_calls=False)
        historico = state["messages"]
        # A instrução é função do MAPA: o card em foco vai inteiro, o resto
        # vira uma linha de índice. Por isso ela é montada aqui, depois do
        # estado chegar, e não uma vez no import.
        # `mapa_do_estado` e não `state.get("mapa")`: no PRIMEIRO turno o canal
        # ainda não existe (quem o cria é o update lá embaixo), e montar a
        # instrução com None deixaria justamente o turno do braindump sem a
        # seção de estado, sem foco e sem sonda nenhuma.
        instrucao = carregar_instrucao(mapa_do_estado(state))

        # Telemetria: o `config` é o único lugar onde o thread_id existe dentro
        # de um nó — o LangGraph só o passa porque a assinatura o declara.
        turno, chamada = telemetria.posicao(historico)
        marca = perf_counter()
        try:
            resposta = await modelo.ainvoke(
                [SystemMessage(content=instrucao), *historico]
            )
        except Exception as erro:
            # A linha de um turno que FALHOU vale tanto quanto a de um que deu
            # certo: sem ela, uma sessão que quebrou na metade some da medição
            # e a latência média fica otimista.
            _medir(config, turno, chamada, marca, historico, instrucao,
                   tools=[], erro=repr(erro))
            raise
        _medir(config, turno, chamada, marca, historico, instrucao,
               tools=[c["name"] for c in getattr(resposta, "tool_calls", None) or []],
               uso=getattr(resposta, "usage_metadata", None))

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
