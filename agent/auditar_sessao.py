"""Audita uma sessão exportada contra as regras de FORMA da instrução.

Durante a validação do McKee Inspired, "melhorou?" precisa deixar de ser
impressão. Este script mede o que é mecanicamente verificável nos turnos do
Tutor: vício de linguagem, travessão, marcação de termo, formato de teste,
nível de título e quantidade de perguntas. Qualidade de condução continua
sendo leitura humana; isto aqui só tira do caminho o que dá pra contar.

    uv run python exportar_sessao.py <thread_id>     # gera o Markdown
    uv run python auditar_sessao.py sessoes/2026-07-25-1e931871.md

Saída: um relatório por regra e um código de saída diferente de zero quando
alguma regra de forma foi violada, pra dar pra usar em script.

O glossário e os limites abaixo espelham a seção "Como você escreve" de
`metodos/mckee_inspired.md`. Mudou lá, muda aqui.
"""

import re
import sys
from pathlib import Path

GLOSSARIO = [
    "SEMENTE", "GÊNERO", "TODO DIA", "RACHADURA", "QUEBRA", "DESEJO",
    "NECESSIDADE", "APOSTA", "PROMESSA", "CENA OBRIGATÓRIA", "TENTATIVA",
    "PONTO SEM RETORNO", "ESCOLHA", "AÇÃO FINAL", "SABOR", "DESDE ENTÃO",
    "ARCO", "IDEIA CONTROLADORA", "CONTRAIDEIA", "FORÇA ANTAGÔNICA",
    "DOSSIÊ DO ANTAGONISTA", "MURAL", "PROMESSA PLANTADA", "PENDÊNCIA",
]

VICIOS = [
    "isso muda tudo", "isso é ouro", "isso é poderoso", "isso é ótimo",
    "aqui está o ponto", "vamos ser honestos", "deixa eu ser direto",
    "que ideia interessante",
]

MAX_PERGUNTAS = 3  # por turno, fora dos blocos de teste

# Palavras do glossário que também são palavra comum do português: contá-las
# sem marca geraria falso positivo em toda frase do dia a dia. Ficam de fora
# da checagem automática e voltam na leitura humana.
AMBIGUAS = {"PROMESSA", "ESCOLHA", "ARCO", "SABOR", "DESEJO", "TENTATIVA", "QUEBRA"}


def turnos_do_tutor(markdown: str) -> list[str]:
    """Só o que o Tutor escreveu. O autor escreve como quiser."""
    turnos, atual, dentro = [], [], False
    for linha in markdown.splitlines():
        if linha.startswith("## Tutor"):
            dentro, atual = True, []
            continue
        if linha.startswith("## Autor"):
            if dentro and atual:
                turnos.append("\n".join(atual))
            dentro = False
            continue
        if dentro:
            atual.append(linha)
    if dentro and atual:
        turnos.append("\n".join(atual))
    return turnos


def auditar(markdown: str) -> list[str]:
    """Devolve a lista de violações (vazia = tudo em ordem)."""
    turnos = turnos_do_tutor(markdown)
    tudo = "\n".join(turnos)
    violacoes: list[str] = []

    media = len(tudo) // max(len(turnos), 1)
    print(f"turnos do Tutor: {len(turnos)}  ({len(tudo)} caracteres, ~{media} por turno)\n")

    print("== vícios proibidos ==")
    achou = False
    for vicio in VICIOS:
        for m in re.finditer(re.escape(vicio), tudo, re.IGNORECASE):
            achou = True
            trecho = tudo[max(0, m.start() - 50):m.end() + 30].replace("\n", " ")
            print(f"  {vicio!r}: …{trecho}…")
            violacoes.append(f"vício {vicio!r}")
    if not achou:
        print("  nenhum")

    print("\n== travessão ==")
    traços = [m.start() for m in re.finditer("—", tudo)]
    print(f"  {len(traços)} ocorrência(s)")
    for i in traços[:5]:
        print(f"    …{tudo[max(0, i - 50):i + 40]}…".replace("\n", " "))
    if traços:
        violacoes.append(f"{len(traços)} travessão(ões)")

    print("\n== marcação de termos ==")
    marcados = re.findall(r"`([^`\n]+)`", tudo)
    canon = [g.rstrip("S") for g in GLOSSARIO]
    fora = sorted({m for m in set(marcados) if m.upper().rstrip("S") not in canon})
    print(f"  {len(marcados)} marcações, {len(set(marcados))} termos distintos")
    print(f"  marcados FORA do glossário: {fora or 'nenhum'}")

    sem_marca: dict[str, int] = {}
    for termo in GLOSSARIO:
        if " " in termo or termo in AMBIGUAS:
            continue
        for m in re.finditer(rf"(?<![`\w]){termo}(?![`\w])", tudo, re.IGNORECASE):
            trecho = tudo[max(0, m.start() - 2):m.end() + 2]
            if trecho.startswith("`") or trecho.endswith("`"):
                continue
            sem_marca[termo] = sem_marca.get(termo, 0) + 1
    total_sem = sum(sem_marca.values())
    if total_sem:
        detalhe = ", ".join(f"{t} {n}x" for t, n in sorted(sem_marca.items(), key=lambda x: -x[1]))
        print(f"  termos SEM marcação: {total_sem} ({detalhe})")
        violacoes.append(f"{total_sem} termo(s) sem marcação")
    else:
        print("  termos sem marcação: nenhum")

    print("\n== primeira aparição explicada ==")
    faltando = []
    for termo in GLOSSARIO:
        m = re.search(rf"`{re.escape(termo)}S?`", tudo)
        if not m:
            continue
        # Entre a marca e o parêntese cabem fechamento de negrito e espaço:
        # `**1 · `SEMENTE`** (a frase...)` é o formato pedido pro mapa.
        vizinhanca = tudo[m.end():m.end() + 60]
        if not re.match(r"(?:[\s*_:·]|\+|`[^`\n]+`)*\(", vizinhanca):
            faltando.append(termo)
    if faltando:
        print(f"  sem parêntese na 1ª aparição: {', '.join(faltando)}")
        violacoes.append(f"{len(faltando)} termo(s) sem explicação na 1ª aparição")
    else:
        print("  todos explicados")

    print("\n== formato dos testes ==")
    blocos = re.findall(r"^> \*\*TESTE ·[^\n]*\n(?:>.*\n?)*", tudo, re.MULTILINE)
    completos = [b for b in blocos if re.search(r"\*\*(Passa|Não passa|Pendente)", b)]
    print(f"  blocos no formato fixo: {len(blocos)}, com veredito: {len(completos)}")
    if len(completos) != len(blocos):
        violacoes.append(f"{len(blocos) - len(completos)} bloco(s) de teste sem veredito")
    prosa = [
        l.strip() for l in tudo.splitlines()
        if not l.startswith(">") and re.search(r"\bpassa no teste\b|\bteste d[eo] ", l, re.IGNORECASE)
    ]
    if prosa:
        print(f"  veredito/teste em PROSA (deveria ser bloco): {len(prosa)}")
        for p in prosa[:4]:
            print(f"    …{p[:100]}")
        violacoes.append(f"{len(prosa)} teste(s) fora do bloco")

    print("\n== níveis de título ==")
    n1 = len(re.findall(r"^# (?!#)", tudo, re.MULTILINE))
    n2 = len(re.findall(r"^## (?!#)", tudo, re.MULTILINE))
    n3 = len(re.findall(r"^### ", tudo, re.MULTILINE))
    print(f"  nível 1: {n1}   nível 2: {n2}   nível 3: {n3}")
    if n1:
        violacoes.append(f"{n1} título(s) em nível 1")

    print(f"\n== perguntas por turno (máximo {MAX_PERGUNTAS}, fora dos testes) ==")
    for i, turno in enumerate(turnos, 1):
        fora_teste = "\n".join(l for l in turno.splitlines() if not l.startswith(">"))
        n = fora_teste.count("?")
        marca = "" if n <= MAX_PERGUNTAS else "  <-- acima do limite"
        print(f"  turno {i}: {n}{marca}")
        if n > MAX_PERGUNTAS:
            violacoes.append(f"turno {i} com {n} perguntas")

    return violacoes


if __name__ == "__main__":
    if len(sys.argv) < 2:
        sys.exit(__doc__)
    arquivo = Path(sys.argv[1])
    if not arquivo.exists():
        sys.exit(f"arquivo não encontrado: {arquivo}")
    problemas = auditar(arquivo.read_text(encoding="utf-8"))
    print("\n" + "=" * 60)
    if problemas:
        print(f"{len(problemas)} violação(ões) de forma:")
        for p in problemas:
            print(f"  · {p}")
        sys.exit(1)
    print("nenhuma violação de forma")
