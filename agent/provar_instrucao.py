"""Banco de prova da instrução: um turno do Tutor, sem sessão e sem UI.

Editar a instrução e esperar a próxima conversa real pra saber se funcionou é
caro e lento. Este script roda UM turno com a instrução atual do disco, grava
o resultado no mesmo formato do `exportar_sessao.py` e chama o auditor em
cima. É o equivalente, pro prompt, do que `/mckee-inspired/previa` é pro CSS.

    uv run python provar_instrucao.py                  # 3 turnos, despejo padrão
    uv run python provar_instrucao.py 5                # 5 turnos
    uv run python provar_instrucao.py 3 meu_despejo.txt

**Rode mais de uma vez.** Medindo o mesmo prompt três vezes seguidas saíram 0,
0 e 4 travessões: obediência a regra de forma varia entre execuções, e uma
rodada só não distingue "o prompt melhorou" de "essa rodada deu sorte". Por
isso a saída é uma AGREGAÇÃO (em quantos turnos cada regra caiu), não um
veredito de uma amostra.

Não toca no checkpointer: nenhuma thread é criada, nada aparece na tela de
seleção de sessão. O custo é uma chamada ao modelo por turno.

O despejo padrão é o da sessão que gerou a auditoria da v2 (LEARNINGS.md): ele
força o MAPA, que é o turno onde as regras de forma mais falharam.
"""

import asyncio
import os
import re
import sys
from pathlib import Path

from dotenv import load_dotenv
from langchain_core.messages import AIMessage, HumanMessage, SystemMessage
from langchain_openai import ChatOpenAI

from auditar_sessao import auditar
from forma import normalizar
from tutor import carregar_instrucao

load_dotenv(Path(__file__).parent / ".env")

DESTINO = Path(__file__).parent / "sessoes" / "prova-da-instrucao.md"

DESPEJO_PADRAO = """Cadu, um garoto que adora fazer truques de mágica, em um \
encontro da família de domingo, chama todos para ver um truque: fazer a irmã \
mais velha dele entrar no armário e sumir. Só que a irmã dele some de verdade. \
Cadu perdeu de ano e toda a família está chateada e desconfiada dele. A irmã \
mais nova, Graça, é o oposto dele, disciplinada, esforçada, boa aluna. Cadu é o \
lado criativo de uma família só de engenheiros, uma ovelha negra. O armário que \
ele usou estava abandonado na garagem, era de um tio avô que era do circo e de \
quem ninguém fala, o Pompeu. Depois que a irmã some, a família trata como caso \
de polícia, e Cadu é o único que dá chance pro que não tem explicação."""

# Segunda fala do autor: força o turno de LAPIDAÇÃO, que é onde a montagem por
# turno (instrucao.py) corta o prompt. Sem ela o banco de prova mediria só o
# mapa, e o mapa recebe a instrução inteira de qualquer jeito.
SEGUIMENTO_PADRAO = """A aposta é a relação com os pais: Cadu foge de casa \
atrás da irmã, sabendo que isso queima de vez a confiança que já estava no \
chão. Primeira tentativa: ele volta ao armário sozinho e refaz o truque. Não \
acontece nada, mas quando sai está com um chapéu de palhaço na cabeça que não \
sai de jeito nenhum."""


def texto_da_resposta(resposta) -> str:
    conteudo = resposta.content
    if isinstance(conteudo, str):
        return conteudo
    return "\n".join(b.get("text", "") for b in conteudo if isinstance(b, dict))


async def uma_conversa(modelo, material: str, seguimento: str, indice: int) -> Path:
    """Dois turnos: o mapa e a lapidação.

    Espelha o caminho do agente de verdade (tutor.py): instrução montada pra
    ESTE turno e resposta passada pelo normalizador. Medir o prompt cru daria
    um número que a produção não vive.
    """
    primeiro = await modelo.ainvoke(
        [SystemMessage(content=carregar_instrucao()), HumanMessage(content=material)]
    )
    turno1 = normalizar(texto_da_resposta(primeiro))

    segundo = await modelo.ainvoke([
        SystemMessage(content=carregar_instrucao(turno1)),
        HumanMessage(content=material),
        AIMessage(content=turno1),
        HumanMessage(content=seguimento),
    ])
    turno2 = normalizar(texto_da_resposta(segundo))

    destino = DESTINO.with_name(f"prova-da-instrucao-{indice}.md")
    destino.write_text(
        f"# Prova da instrução, conversa {indice}\n\n---\n\n"
        f"## Autor\n\n{material}\n\n## Tutor\n\n{turno1}\n\n"
        f"## Autor\n\n{seguimento}\n\n## Tutor\n\n{turno2}\n",
        encoding="utf-8",
    )
    return destino


async def main() -> int:
    argumentos = sys.argv[1:]
    repeticoes = 3
    if argumentos and argumentos[0].isdigit():
        repeticoes = int(argumentos.pop(0))
    material = (
        Path(argumentos[0]).read_text(encoding="utf-8")
        if argumentos
        else DESPEJO_PADRAO
    )
    print(f"instrução do 1º turno: {len(carregar_instrucao())} caracteres")
    print(f"material: {len(material)} caracteres")
    print(f"conversas de 2 turnos: {repeticoes}\n")

    modelo = ChatOpenAI(
        model=os.environ.get("OPENROUTER_MODEL", "anthropic/claude-sonnet-4.5"),
        base_url="https://openrouter.ai/api/v1",
        api_key=os.environ.get("OPENROUTER_API_KEY", "sem-chave"),
    )
    DESTINO.parent.mkdir(exist_ok=True)
    arquivos = await asyncio.gather(
        *(uma_conversa(modelo, material, SEGUIMENTO_PADRAO, i)
          for i in range(1, repeticoes + 1))
    )

    # A regra é a unidade da agregação: o que interessa é em quantos turnos ela
    # caiu, não quantas violações somaram. Um turno com 20 travessões e outro
    # com 1 são o mesmo sintoma; um turno limpo e outro não é que é o dado.
    caiu_em: dict[str, int] = {}
    for arquivo in arquivos:
        print("=" * 60)
        print(f"### {arquivo.name}")
        problemas = auditar(arquivo.read_text(encoding="utf-8"))
        print(f"\n  -> {len(problemas)} violação(ões): {problemas or 'nenhuma'}\n")
        # Uma conversa tem dois turnos, e a mesma regra pode cair nos dois.
        # Conta uma vez por conversa: o denominador é conversa, não violação.
        for regra in {re.sub(r"^\d+ | \d+x|turno \d+ com \d+", "", p).strip() or p
                      for p in problemas}:
            caiu_em[regra] = caiu_em.get(regra, 0) + 1

    print("=" * 60)
    print(f"AGREGADO de {repeticoes} conversas (regra: em quantas caiu)\n")
    if not caiu_em:
        print("  nenhuma regra de forma violada em nenhuma conversa")
        return 0
    for regra, n in sorted(caiu_em.items(), key=lambda x: -x[1]):
        print(f"  {n}/{repeticoes}  {regra}")
    return 1


if __name__ == "__main__":
    sys.exit(asyncio.run(main()))
