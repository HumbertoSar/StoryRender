"""Exporta uma conversa gravada no checkpointer pra um arquivo Markdown.

Durante a validação do método do Fio, as sessões de teste SÃO o dado: é nelas
que se vê se o Tutor conduz como previsto. Elas vivem no Postgres (checkpoints
do LangGraph), que é durável mas nada prático de reler — daí este script.

    # listar as threads gravadas (mais recentes primeiro)
    uv run python exportar_sessao.py

    # exportar uma delas
    uv run python exportar_sessao.py 6b823067-db73-4f78-9981-403f17505ee0

Os arquivos vão pra `agent/sessoes/`, que está no .gitignore: o repositório é
público e o material das sessões é criação do autor. Se um dia precisar
versionar isso, o caminho é um repositório privado — não este.
"""

import asyncio
import os
import sys
from pathlib import Path

from dotenv import load_dotenv
from langgraph.checkpoint.postgres.aio import AsyncPostgresSaver
from psycopg.rows import dict_row
from psycopg_pool import AsyncConnectionPool

load_dotenv(Path(__file__).parent / ".env")

DESTINO = Path(__file__).parent / "sessoes"


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


async def abrir_pool() -> AsyncConnectionPool:
    url = os.environ.get("DATABASE_URL")
    if not url:
        sys.exit("DATABASE_URL não definida — sem banco não há sessão gravada.")
    pool = AsyncConnectionPool(
        url, open=False, timeout=10, kwargs={"autocommit": True, "row_factory": dict_row}
    )
    await pool.open(wait=True, timeout=10)
    return pool


async def carregar(saver: AsyncPostgresSaver, thread_id: str):
    return await saver.aget_tuple(
        {"configurable": {"thread_id": thread_id, "checkpoint_ns": ""}}
    )


async def listar() -> None:
    pool = await abrir_pool()
    async with pool.connection() as conn:
        cur = await conn.execute(
            "SELECT thread_id, MAX(checkpoint_id) AS ultimo FROM checkpoints "
            "GROUP BY thread_id ORDER BY ultimo DESC"
        )
        threads = await cur.fetchall()

    saver = AsyncPostgresSaver(pool)
    print(f"{'thread_id':40} {'trilho':7} {'turnos':>6}  {'quando':20} início da conversa")
    print("-" * 128)
    for linha in threads:
        tupla = await carregar(saver, linha["thread_id"])
        if tupla is None:
            continue
        canais = tupla.checkpoint.get("channel_values", {})
        mensagens = canais.get("messages") or []
        # O trilho McKee tem o canal `roteiro` no estado; o do Fio só `messages`.
        trilho = "mckee" if "roteiro" in canais else "fio"
        turnos = sum(1 for m in mensagens if getattr(m, "type", None) == "human")
        quando = str(tupla.checkpoint.get("ts", ""))[:19].replace("T", " ")
        inicio = ""
        for m in mensagens:
            if getattr(m, "type", None) == "human":
                inicio = texto_da_mensagem(m)[:44].replace("\n", " ")
                break
        print(f"{linha['thread_id']:40} {trilho:7} {turnos:>6}  {quando:20} {inicio}")
    await pool.close()


async def exportar(thread_id: str) -> None:
    pool = await abrir_pool()
    saver = AsyncPostgresSaver(pool)
    tupla = await carregar(saver, thread_id)
    await pool.close()

    if tupla is None:
        sys.exit(f"thread {thread_id} não encontrada no checkpointer.")

    canais = tupla.checkpoint.get("channel_values", {})
    mensagens = canais.get("messages") or []
    if not mensagens:
        sys.exit(f"thread {thread_id} existe mas não tem mensagens.")

    trilho = "McKee (story_agent)" if "roteiro" in canais else "Fio (tutor_agent)"
    quando = str(tupla.checkpoint.get("ts", ""))
    turnos = sum(1 for m in mensagens if getattr(m, "type", None) == "human")

    linhas = [
        f"# Sessão — {quando[:10]}",
        "",
        f"- **Trilho:** {trilho}",
        f"- **Thread:** `{thread_id}`",
        f"- **Turnos do autor:** {turnos}",
        f"- **Modelo:** `{os.environ.get('OPENROUTER_MODEL', 'anthropic/claude-sonnet-4.5')}`",
        f"- **Último checkpoint:** {quando}",
        "",
        "---",
        "",
    ]
    for mensagem in mensagens:
        tipo = getattr(mensagem, "type", None)
        texto = texto_da_mensagem(mensagem).strip()
        if not texto:
            continue  # tool calls sem texto não interessam à leitura da sessão
        if tipo == "human":
            linhas += ["## Autor", "", texto, ""]
        elif tipo == "ai":
            linhas += ["## Tutor", "", texto, "", "---", ""]

    DESTINO.mkdir(exist_ok=True)
    arquivo = DESTINO / f"{quando[:10]}-{thread_id[:8]}.md"
    arquivo.write_text("\n".join(linhas), encoding="utf-8")
    print(f"gravado: {arquivo}  ({turnos} turnos, {len(mensagens)} mensagens)")


if __name__ == "__main__":
    if len(sys.argv) > 1:
        asyncio.run(exportar(sys.argv[1]))
    else:
        asyncio.run(listar())
