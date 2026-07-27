"""Sessões gravadas — listar o acervo e reabrir uma conversa.

O checkpointer do LangGraph já guarda toda conversa no Postgres; o que faltava
era **endereço**. Sem uma lista e sem um id na URL, sair do dispositivo era
perder a sessão de vista — não os dados, que continuavam lá, mas o caminho de
volta pra eles. Este módulo é esse caminho: a lista pra tela de seleção e o
histórico de uma thread no formato AG-UI, que o chat do front carrega ao abrir.

Só LEITURA. Escrever no checkpointer continua sendo trabalho exclusivo do
grafo — nada aqui altera uma conversa.

As mesmas funções servem o servidor (router abaixo) e o `exportar_sessao.py`,
pra não existirem duas verdades sobre o que é uma sessão.
"""

from typing import Optional

from ag_ui_langgraph.utils import langchain_messages_to_agui
from fastapi import APIRouter, HTTPException
from langchain_core.messages import SystemMessage
from langgraph.checkpoint.postgres.aio import AsyncPostgresSaver

# Quantas threads varrer no máximo antes de desistir, independente do filtro de
# trilho. O filtro só dá pra aplicar depois de abrir o checkpoint (é o estado
# que diz o trilho), então o LIMIT do SQL não serve — este teto é o que impede
# uma base grande de virar uma varredura sem fim numa tela de seleção.
TETO_DE_VARREDURA = 300


def texto_da_mensagem(mensagem) -> str:
    """O conteúdo pode vir como string ou como lista de blocos, dependendo do
    modelo — normaliza os dois casos."""
    conteudo = getattr(mensagem, "content", "")
    if isinstance(conteudo, str):
        return conteudo
    partes = [
        bloco.get("text", "")
        for bloco in conteudo
        if isinstance(bloco, dict) and bloco.get("type") == "text"
    ]
    return "\n".join(p for p in partes if p)


def trilho_dos_canais(canais: dict) -> str:
    """Qual método produziu a sessão.

    Deduzido do formato do estado, não de um campo gravado: o McKee Mini tem o
    canal `mapa`; o trilho McKee original tem o canal `roteiro` (quadro
    compartilhado); o McKee Inspired, conduzido pelo Tutor, só tem `messages`.
    Por ser derivado na leitura, renomear o trilho não exige migração nenhuma
    no banco.

    O fallback é o McKee Inspired, então trilho novo com canal próprio precisa
    entrar ANTES dele — senão as sessões novas aparecem caladas na lista do
    trilho errado. É por isso que o nó do Mini grava `mapa` já no primeiro
    turno, mesmo com o mapa ainda vazio.
    """
    if "mapa" in canais:
        return "mckee-mini"
    return "mckee" if "roteiro" in canais else "mckee-inspired"


async def carregar(saver: AsyncPostgresSaver, thread_id: str):
    return await saver.aget_tuple(
        {"configurable": {"thread_id": thread_id, "checkpoint_ns": ""}}
    )


def resumir(thread_id: str, tupla) -> Optional[dict]:
    """Uma linha da tela de seleção. `None` pra thread sem mensagem: existe no
    banco (o adaptador AG-UI cria checkpoint ao consultar estado), mas não é
    conversa nenhuma e só sujaria a lista."""
    canais = tupla.checkpoint.get("channel_values", {})
    mensagens = canais.get("messages") or []
    if not mensagens:
        return None
    inicio = ""
    for m in mensagens:
        if getattr(m, "type", None) == "human":
            inicio = " ".join(texto_da_mensagem(m).split())[:180]
            break
    return {
        "thread_id": thread_id,
        "trilho": trilho_dos_canais(canais),
        "turnos": sum(1 for m in mensagens if getattr(m, "type", None) == "human"),
        "atualizado_em": str(tupla.checkpoint.get("ts", "")),
        "inicio": inicio,
    }


async def listar_sessoes(
    pool, saver: AsyncPostgresSaver, trilho: Optional[str] = None, limite: int = 60
) -> list[dict]:
    """As sessões, mais recentes primeiro.

    `MAX(checkpoint_id)` ordena por recência porque o id do checkpoint é um
    UUIDv6 (monotônico no tempo) — não precisa ler o `ts` de cada um só pra
    ordenar. `checkpoint_ns = ''` mantém a busca no grafo principal.
    """
    async with pool.connection() as conn:
        cur = await conn.execute(
            "SELECT thread_id, MAX(checkpoint_id) AS ultimo FROM checkpoints "
            "WHERE checkpoint_ns = '' "
            "GROUP BY thread_id ORDER BY ultimo DESC LIMIT %s",
            (TETO_DE_VARREDURA,),
        )
        linhas = await cur.fetchall()

    sessoes: list[dict] = []
    for linha in linhas:
        if len(sessoes) >= limite:
            break
        tupla = await carregar(saver, linha["thread_id"])
        if tupla is None:
            continue
        resumo = resumir(linha["thread_id"], tupla)
        if resumo is None or (trilho and resumo["trilho"] != trilho):
            continue
        sessoes.append(resumo)
    return sessoes


def mensagens_agui(tupla) -> list[dict]:
    """As mensagens da thread no formato do protocolo AG-UI (camelCase), que é
    o que o chat do front consome direto.

    Os ids são os do checkpointer, e é isso que torna a retomada segura: ao
    mandar o próximo turno o cliente reenvia o histórico, e o adaptador
    (`langgraph_default_merge_state`) só acrescenta id que ainda não existe no
    checkpoint — histórico reidratado não duplica.

    SystemMessage fica de fora: a instrução do Tutor é montada a cada turno
    (tutor.py), não faz parte da conversa.
    """
    canais = tupla.checkpoint.get("channel_values", {})
    mensagens = [
        m
        for m in (canais.get("messages") or [])
        if not isinstance(m, SystemMessage)
    ]
    return [
        m.model_dump(by_alias=True, exclude_none=True)
        for m in langchain_messages_to_agui(mensagens)
    ]


# ------------------------------------------------------------------ #
# HTTP
# ------------------------------------------------------------------ #

router = APIRouter()

_pool = None
_saver: Optional[AsyncPostgresSaver] = None


def usar_pool(pool) -> None:
    """Chamado pelo lifespan do servidor: o pool só existe depois que o
    Postgres abre, e pode nunca existir (dev sem banco)."""
    global _pool, _saver
    _pool = pool
    _saver = AsyncPostgresSaver(pool)


def _exigir_banco() -> None:
    if _pool is None or _saver is None:
        # 503 e não lista vazia: sem banco não existe sessão gravada, e
        # responder `[]` faria a tela de seleção mentir que o acervo está
        # vazio quando na verdade ela nem conseguiu perguntar.
        raise HTTPException(503, "sem banco — não há sessão gravada")


@router.get("/sessoes")
async def listar(trilho: Optional[str] = None, limite: int = 60) -> dict:
    _exigir_banco()
    return {"sessoes": await listar_sessoes(_pool, _saver, trilho, limite)}


@router.get("/sessoes/{thread_id}")
async def abrir(thread_id: str) -> dict:
    _exigir_banco()
    tupla = await carregar(_saver, thread_id)
    if tupla is None:
        # Sessão nova é exatamente isto: um id que ainda não tem checkpoint.
        # Quem chama decide se é 404 de verdade ou conversa em branco.
        raise HTTPException(404, "sessão não encontrada")
    canais = tupla.checkpoint.get("channel_values", {})
    return {
        "thread_id": thread_id,
        "trilho": trilho_dos_canais(canais),
        "mensagens": mensagens_agui(tupla),
    }
