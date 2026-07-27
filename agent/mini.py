"""Agente McKee Mini — trilho open-ended (nível 3 da taxonomia CopilotKit).

Terceiro trilho, separado dos dois anteriores pelo mesmo motivo que o Tutor foi
separado do McKee: `/mckee` e `/mckee-inspired` estão congelados e em produção,
e nada da validação daqui pode regredi-los.

**Fatia 1.** Grafo de um nó, sem tools de backend e sem método nenhum: só o
caminho de ponta a ponta com um desenho FIXO, pra medir latência, custo e o que
o iframe deixa passar antes de construir qualquer coisa em cima. O contrato do
mapa (`mini_mapa.py`), as tools de escrita e as fórmulas do método entram nas
fatias seguintes.

O desenho não é um nó do grafo: `generateSandboxedUi` é uma tool de FRONTEND,
registrada pelo `<CopilotKit>` quando `openGenerativeUI` está ligado no runtime.
Ela chega aqui em `state["tools"]`, o nó a binda junto das nossas (nenhuma, por
ora), e a chamada encerra o run — o CopilotKit intercepta, o middleware
transcodifica os argumentos streamados em eventos de activity, e o run de
continuação acontece sozinho porque a tool é registrada com `followUp: true`.
"""

from pathlib import Path

from langchain_core.messages import SystemMessage
from langgraph.graph import END, START, MessagesState, StateGraph

from forma import normalizar

ARQUIVO_INSTRUCAO = Path(__file__).parent / "metodos" / "mckee_mini.md"


class MapaState(MessagesState):
    # O mapa da história. Na Fatia 1 carrega só a versão do schema: o contrato
    # de verdade nasce em mini_mapa.py. Mesmo vazio o canal precisa existir
    # desde o checkpoint nº 1, porque `sessoes.trilho_dos_canais` deduz o
    # trilho do FORMATO do estado — sem ele, toda sessão do Mini seria
    # classificada como McKee Inspired e apareceria na lista do trilho errado.
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
        # misto não teria como ser atendido por um roteador que precisa decidir
        # entre executar aqui e encerrar o run. Consequência de projeto: falar e
        # desenhar são sempre turnos diferentes, o que deixa o desenho visível
        # como evento em vez de efeito colateral de uma resposta de texto.
        modelo = (
            model.bind_tools(tools_do_front, parallel_tool_calls=False)
            if tools_do_front
            else model
        )
        resposta = await modelo.ainvoke(
            [SystemMessage(content=carregar_instrucao()), *state["messages"]]
        )
        update: dict = {"messages": [_normalizar_conteudo(resposta)]}
        if not state.get("mapa"):
            # Só grava quando o mapa nasce: nos turnos seguintes o canal já
            # está correto e reescrever seria redundante. O que importa é que
            # ele exista no PRIMEIRO checkpoint (ver o comentário em MapaState).
            update["mapa"] = {"versao_schema": 1}
        return update

    # Sem ToolNode: nenhuma tool de backend nesta fatia. A única tool em jogo é
    # do frontend, e chamada dela encerra o run naturalmente — quem executa é o
    # CopilotKit, do outro lado.
    grafo = StateGraph(MapaState)
    grafo.add_node("conversar", conversar)
    grafo.add_edge(START, "conversar")
    grafo.add_edge("conversar", END)
    return grafo
