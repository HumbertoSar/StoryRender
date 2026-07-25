"""Feedback por turno — 👍/👎 do autor gravados junto das sessões.

Na validação do método do Fio as sessões de teste SÃO o dado (LEARNINGS.md): é
lendo os turnos que se vê se o Tutor conduz como previsto. Só que a leitura
acontece depois, fora do calor da conversa, e nessa hora já não dá pra lembrar
qual turno acertou. Marcar na hora, no chat, e ver a marca no Markdown
exportado é o que fecha esse ciclo.

A marca é presa ao id da mensagem do agente, que é o MESMO dos dois lados: o
adaptador AG-UI emite o `message_id` a partir do id do chunk do LangChain, que
é o id com que a mensagem é gravada no checkpointer. Por isso o exportador
consegue casar feedback e turno sem guardar índice nenhum.
"""

from typing import Literal, Optional

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

Valor = Literal["positivo", "negativo"]

# Chave é (thread, mensagem): um turno tem no máximo uma marca, e marcar de
# novo sobrescreve. O CHECK deixa o banco recusar valor fora do vocabulário —
# mais barato do que descobrir isso lendo um export estranho meses depois.
TABELA = """
CREATE TABLE IF NOT EXISTS feedback_turno (
    thread_id   TEXT NOT NULL,
    mensagem_id TEXT NOT NULL,
    valor       TEXT NOT NULL CHECK (valor IN ('positivo', 'negativo')),
    criado_em   TIMESTAMPTZ NOT NULL DEFAULT now(),
    PRIMARY KEY (thread_id, mensagem_id)
)
"""

router = APIRouter()

_pool = None


def usar_pool(pool) -> None:
    """Chamado pelo lifespan do servidor: o pool só existe depois que o
    Postgres abre, e pode nunca existir (dev sem banco)."""
    global _pool
    _pool = pool


async def criar_tabela(pool) -> None:
    async with pool.connection() as conn:
        await conn.execute(TABELA)


class Marca(BaseModel):
    thread_id: str
    mensagem_id: str
    # None desmarca — clicar no mesmo botão de novo desfaz.
    valor: Optional[Valor] = None


@router.post("/feedback")
async def gravar(marca: Marca) -> dict:
    if _pool is None:
        # 503 em vez de silêncio: sem banco a marca não sobrevive, e o front
        # precisa saber pra desfazer o estado otimista em vez de mentir.
        raise HTTPException(503, "sem banco — o feedback não tem onde ser gravado")
    async with _pool.connection() as conn:
        if marca.valor is None:
            await conn.execute(
                "DELETE FROM feedback_turno WHERE thread_id = %s AND mensagem_id = %s",
                (marca.thread_id, marca.mensagem_id),
            )
        else:
            await conn.execute(
                "INSERT INTO feedback_turno (thread_id, mensagem_id, valor) "
                "VALUES (%s, %s, %s) "
                "ON CONFLICT (thread_id, mensagem_id) "
                "DO UPDATE SET valor = EXCLUDED.valor, criado_em = now()",
                (marca.thread_id, marca.mensagem_id, marca.valor),
            )
    return {"ok": True, "valor": marca.valor}


@router.get("/feedback")
async def listar(thread_id: str) -> dict:
    """As marcas da thread, pro chat repintar os turnos depois de um reload."""
    if _pool is None:
        raise HTTPException(503, "sem banco — não há feedback gravado")
    async with _pool.connection() as conn:
        cur = await conn.execute(
            "SELECT mensagem_id, valor FROM feedback_turno WHERE thread_id = %s",
            (thread_id,),
        )
        linhas = await cur.fetchall()
    return {"marcas": {l["mensagem_id"]: l["valor"] for l in linhas}}
