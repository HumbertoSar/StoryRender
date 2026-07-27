"""Telemetria por chamada ao modelo — o instrumento que faltava.

O `docs/plan.md` promete "medir e escrever o número" umas oito vezes, e até
aqui não havia com o quê: existe feedback 👍/👎 e exportação de sessão, mas
nada registrava latência, tokens ou tools. O legado tinha uma tabela `eventos`
pra isso e ela se perdeu no pivô. Sem instrumento, "reduziu o prompt em 40%"
vira cronômetro na mão e estimativa — que é a raiz documentada do erro da v4.

Por isso esta fatia vem ANTES das que prometem números (6 em diante).

**Guardar fato, derivar forma**, a mesma doutrina do `mini_mapa.py`: a tabela
guarda a lista de tools chamadas, não um booleano `desenhou`. Se a pergunta
mudar ("quantos turnos escreveram E desenharam?"), a resposta sai de uma
consulta, não de uma migração.

**Fire-and-forget de verdade:** a gravação não pode derrubar nem atrasar um
turno. Sem banco, `registrar` é no-op silencioso — é o que deixa
`provar_mini.py` e os scripts de prova rodarem o grafo sem Postgres nenhum.
"""

import asyncio
import json
from typing import Optional

# Uma linha por CHAMADA ao modelo, não por turno do autor: com tools, um turno
# vira duas idas ao modelo (a que chama a tool e a que responde ao autor), e
# somar as duas numa linha só esconderia justamente o custo que as tools
# adicionam. `turno` + `chamada` deixam agrupar de volta quando a pergunta for
# por turno.
#
# `instrucao_chars` e `historico_chars` separados porque as duas crescem por
# motivos diferentes: a instrução cresce quando ALGUÉM a edita, o histórico
# cresce sozinho a cada turno. O segundo é o risco nº 2 do plano (contexto
# quadrático), e é por isso que o histórico é medido incluindo os ARGUMENTOS
# das tool calls: o HTML de um desenho vive lá, não em `content`, e é reenviado
# como entrada em todo turno seguinte. Medir só `content` mediria tudo menos o
# que interessa.
TABELA = """
CREATE TABLE IF NOT EXISTS telemetria_turno (
    id              BIGSERIAL PRIMARY KEY,
    thread_id       TEXT        NOT NULL,
    trilho          TEXT        NOT NULL,
    turno           INT         NOT NULL,
    chamada         INT         NOT NULL,
    ms              INT         NOT NULL,
    modelo          TEXT        NOT NULL,
    tokens_entrada  INT,
    tokens_saida    INT,
    instrucao_chars INT         NOT NULL,
    historico_chars INT         NOT NULL,
    mensagens       INT         NOT NULL,
    tools           TEXT[]      NOT NULL DEFAULT '{}',
    erro            TEXT,
    criado_em       TIMESTAMPTZ NOT NULL DEFAULT now()
)
"""

INDICE = """
CREATE INDEX IF NOT EXISTS telemetria_turno_thread
    ON telemetria_turno (thread_id, criado_em)
"""

_pool = None

# asyncio guarda só uma referência FRACA às tasks: uma task solta pode ser
# coletada no meio do voo e a gravação some sem erro nenhum. Manter o conjunto
# vivo até o `done_callback` é o que impede essa perda silenciosa — que num
# módulo de telemetria seria especialmente cruel, já que o sintoma é
# exatamente "às vezes falta linha".
_tarefas: set = set()


def usar_pool(pool) -> None:
    """Chamado pelo lifespan. Sem banco o módulo inteiro vira no-op."""
    global _pool
    _pool = pool


async def criar_tabela(pool) -> None:
    async with pool.connection() as conn:
        await conn.execute(TABELA)
        await conn.execute(INDICE)


def tamanho(mensagens) -> int:
    """Tamanho em caracteres do que de fato vai pro modelo.

    Inclui os argumentos das tool calls de propósito: é lá que mora o HTML dos
    desenhos, que é reenviado como ENTRADA em todo turno seguinte. Medir só
    `content` daria um histórico que parece estável enquanto a conta cresce.
    """
    total = 0
    for m in mensagens:
        total += len(str(getattr(m, "content", "") or ""))
        for chamada in getattr(m, "tool_calls", None) or []:
            total += len(json.dumps(chamada.get("args") or {}, ensure_ascii=False))
    return total


def posicao(mensagens) -> tuple[int, int]:
    """(turno, chamada): o turno é a nª fala do autor na thread; a chamada é a
    nª ida ao modelo DENTRO desse turno (a 2ª acontece depois de uma tool)."""
    turno = sum(1 for m in mensagens if getattr(m, "type", None) == "human")
    chamada = 1
    for m in reversed(mensagens):
        if getattr(m, "type", None) == "human":
            break
        if getattr(m, "type", None) == "ai":
            chamada += 1
    return turno, chamada


async def _gravar(linha: dict) -> None:
    try:
        async with _pool.connection() as conn:
            await conn.execute(
                "INSERT INTO telemetria_turno (thread_id, trilho, turno, chamada, "
                "ms, modelo, tokens_entrada, tokens_saida, instrucao_chars, "
                "historico_chars, mensagens, tools, erro) "
                "VALUES (%(thread_id)s, %(trilho)s, %(turno)s, %(chamada)s, "
                "%(ms)s, %(modelo)s, %(tokens_entrada)s, %(tokens_saida)s, "
                "%(instrucao_chars)s, %(historico_chars)s, %(mensagens)s, "
                "%(tools)s, %(erro)s)",
                linha,
            )
    except Exception as erro:  # telemetria nunca derruba o agente
        print(f"AVISO: telemetria não gravou ({erro!r})")


def registrar(
    *,
    thread_id: Optional[str],
    trilho: str,
    turno: int,
    chamada: int,
    ms: int,
    modelo: str,
    tokens_entrada: Optional[int],
    tokens_saida: Optional[int],
    instrucao_chars: int,
    historico_chars: int,
    mensagens: int,
    tools: list[str],
    erro: Optional[str] = None,
) -> None:
    """Enfileira a linha e devolve na hora. Nunca levanta, nunca espera.

    Só argumentos nomeados: são treze colunas, e uma troca de posição entre
    `tokens_entrada` e `tokens_saida` produziria um dado errado que passa
    despercebido por meses.
    """
    if _pool is None or not thread_id:
        return
    linha = {
        "thread_id": thread_id,
        "trilho": trilho,
        "turno": turno,
        "chamada": chamada,
        "ms": ms,
        "modelo": modelo,
        "tokens_entrada": tokens_entrada,
        "tokens_saida": tokens_saida,
        "instrucao_chars": instrucao_chars,
        "historico_chars": historico_chars,
        "mensagens": mensagens,
        "tools": tools,
        "erro": erro,
    }
    try:
        tarefa = asyncio.get_running_loop().create_task(_gravar(linha))
    except RuntimeError:
        # Sem event loop rodando não há como agendar; num módulo de telemetria
        # isso é motivo pra desistir, nunca pra estourar no caminho do turno.
        return
    _tarefas.add(tarefa)
    tarefa.add_done_callback(_tarefas.discard)


if __name__ == "__main__":
    # `uv run python telemetria.py` — as duas derivações puras, sem banco e sem
    # LLM. O que NÃO dá pra testar aqui é a gravação; essa é a prova de fatia,
    # numa sessão real (ver LEARNINGS.md).
    from langchain_core.messages import AIMessage, HumanMessage, ToolMessage

    casos = 0

    # --- tamanho: o argumento da tool conta, e é o ponto todo ---------------
    assert tamanho([]) == 0
    assert tamanho([HumanMessage(content="abcde")]) == 5
    com_desenho = AIMessage(
        content="",
        tool_calls=[{"name": "generateSandboxedUi", "args": {"html": "<div/>"},
                     "id": "1", "type": "tool_call"}],
    )
    # `content` vazio: medir só ele daria 0 pro turno mais caro da sessão.
    assert len(str(com_desenho.content)) == 0
    assert tamanho([com_desenho]) == len('{"html": "<div/>"}')
    # Acentuado não vira \uXXXX: com `ensure_ascii=True` o HTML em português
    # mediria maior do que é, e o número existe justamente pra ser comparável.
    acento = AIMessage(content="", tool_calls=[
        {"name": "escrever_no_mapa", "args": {"t": "ção"}, "id": "2", "type": "tool_call"}])
    assert tamanho([acento]) == len('{"t": "ção"}')
    casos += 5

    # --- posicao: turno é fala do autor; chamada é ida ao modelo no turno ---
    primeiro = [HumanMessage(content="oi")]
    assert posicao(primeiro) == (1, 1), posicao(primeiro)

    # Depois da tool, o mesmo turno vai ao modelo uma segunda vez: é o que
    # separa "o turno demorou 12s" de "as duas chamadas do turno somam 12s".
    depois_da_tool = [
        HumanMessage(content="oi"),
        AIMessage(content="", tool_calls=[
            {"name": "escrever_no_mapa", "args": {}, "id": "3", "type": "tool_call"}]),
        ToolMessage(content="escrito em lacuna-1.protagonista", tool_call_id="3"),
    ]
    assert posicao(depois_da_tool) == (1, 2), posicao(depois_da_tool)

    segundo_turno = [*depois_da_tool, AIMessage(content="guardei"),
                     HumanMessage(content="segue")]
    assert posicao(segundo_turno) == (2, 1), posicao(segundo_turno)
    casos += 3

    # --- registrar sem pool não estoura e não grava ------------------------
    # É o que deixa os scripts de prova rodarem o grafo sem Postgres nenhum.
    assert _pool is None
    registrar(thread_id="t", trilho="mckee-mini", turno=1, chamada=1, ms=1,
              modelo="x", tokens_entrada=None, tokens_saida=None,
              instrucao_chars=0, historico_chars=0, mensagens=0, tools=[])
    assert not _tarefas
    casos += 1

    print(f"{casos} casos ok")
