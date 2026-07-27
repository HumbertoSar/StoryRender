"""Monta o system prompt do turno a partir das seções da instrução.

A instrução chegou a 21 mil caracteres, e a hipótese que a medição levantou é
de diluição: quanto mais texto, menos peso cada regra carrega (o travessão
estava resolvido na v2 e voltou na v3, que é 27% maior). Em vez de mandar tudo
sempre, aqui se monta o que o turno precisa.

O que muda por turno:

- **Fluxo.** O bloco da abertura e o do mapa só servem no primeiro turno; o da
  lapidação só nos seguintes. São excludentes por definição.
- **Degraus.** No primeiro turno o Tutor classifica os nove, então precisa dos
  nove por inteiro. Nos seguintes ele trabalha um foco por vez (regra de ouro
  4), e aí vão por inteiro só os degraus que o turno anterior tocou, mais os
  vizinhos imediatos. Os demais entram como índice de uma linha.

O que NÃO muda: núcleo, forma, regras de ouro, comportamentos, tom e glossário
vão sempre inteiros. São o que faz o Tutor ser o Tutor.

O foco sai do texto do último turno do Tutor, não de estado novo: os termos
marcados dizem em que degrau ele estava. Se nada casar, manda tudo, porque
errar pra menos aqui é pior que gastar contexto.
"""

import re
from pathlib import Path

DIRETORIO = Path(__file__).parent / "metodos"
ARQUIVO = DIRETORIO / "mckee_inspired.md"

# Cada degrau da seção "Os 9 degraus" e os termos que denunciam foco nele. O
# 6b (linhas paralelas) anda junto com o 6, que é de quem ele é variação.
TERMOS_DO_DEGRAU = {
    "1": ["SEMENTE", "GÊNERO"],
    "2": ["TODO DIA", "RACHADURA", "NECESSIDADE"],
    "3": ["QUEBRA", "DESEJO"],
    "4": ["APOSTA"],
    "5": ["PROMESSA", "CENA OBRIGATÓRIA"],
    "6": ["TENTATIVA", "TENTATIVAS", "PONTO SEM RETORNO", "DOSSIÊ DO ANTAGONISTA", "FORÇA ANTAGÔNICA"],
    "7": ["ESCOLHA"],
    "8": ["AÇÃO FINAL", "SABOR", "IDEIA CONTROLADORA", "CONTRAIDEIA"],
    "9": ["DESDE ENTÃO", "ARCO"],
}


def _corpo() -> str:
    """O arquivo sem o cabeçalho editorial (tudo antes da primeira linha `---`
    é documentação pra humano e não vai pro modelo)."""
    linhas = ARQUIVO.read_text(encoding="utf-8").splitlines()
    for i, linha in enumerate(linhas[:10]):
        if linha.strip() == "---":
            return "\n".join(linhas[i + 1:]).strip()
    return "\n".join(linhas).strip()


def _secoes(corpo: str) -> dict[str, str]:
    """Divide por título de nível 2, ignorando os `##` que vivem dentro de
    bloco de código (os modelos de turno usam títulos como exemplo)."""
    sem_cerca = re.sub(r"^```.*?^```", lambda m: "\x00" * len(m.group(0)), corpo,
                       flags=re.MULTILINE | re.DOTALL)
    marcas = [(m.start(), m.group(1).strip())
              for m in re.finditer(r"^## (.+)$", sem_cerca, re.MULTILINE)]
    secoes = {"__abertura__": corpo[:marcas[0][0]].strip()} if marcas else {}
    for i, (inicio, titulo) in enumerate(marcas):
        fim = marcas[i + 1][0] if i + 1 < len(marcas) else len(corpo)
        secoes[titulo] = corpo[inicio:fim].rstrip()
    return secoes


def _blocos_do_fluxo(fluxo: str) -> dict[str, str]:
    """O fluxo tem três blocos em negrito: abertura, mapa e lapidação."""
    partes = re.split(r"^(?=\*\*(?:Abertura|O mapa|A lapidação))", fluxo, flags=re.MULTILINE)
    saida = {"cabeca": partes[0].rstrip()}
    for parte in partes[1:]:
        if parte.startswith("**Abertura"):
            saida["abertura"] = parte.rstrip()
        elif parte.startswith("**O mapa"):
            saida["mapa"] = parte.rstrip()
        elif parte.startswith("**A lapidação"):
            saida["lapidacao"] = parte.rstrip()
    return saida


def _degraus(secao: str) -> dict[str, str]:
    """Cada degrau é um parágrafo que começa com `**N · `."""
    partes = re.split(r"^(?=\*\*\d)", secao, flags=re.MULTILINE)
    saida = {"cabeca": partes[0].rstrip()}
    for parte in partes[1:]:
        numero = re.match(r"\*\*(\d)", parte)
        if numero:
            chave = numero.group(1)
            saida[chave] = (saida.get(chave, "") + "\n\n" + parte.rstrip()).strip()
    return saida


def _resumo_do_degrau(texto: str) -> str:
    """A primeira frase do degrau serve de índice: dá o nome e o que ele é."""
    titulo = texto.split("\n", 1)[0]
    corte = titulo.find(".** ")
    return (titulo[:corte + 2] if corte > 0 else titulo[:160]).strip()


def foco_do_turno(ultimo_turno: str) -> set[str]:
    """Quais degraus o último turno do Tutor estava trabalhando.

    Conta os termos marcados (`ASSIM`) e devolve os degraus dos dois termos
    mais citados. Vazio quando não dá pra dizer, e aí quem chama manda tudo.
    """
    if not ultimo_turno:
        return set()
    marcados = [m.upper() for m in re.findall(r"`([^`\n]+)`", ultimo_turno)]
    if not marcados:
        return set()
    peso: dict[str, int] = {}
    for termo in marcados:
        for degrau, termos in TERMOS_DO_DEGRAU.items():
            if termo in termos:
                peso[degrau] = peso.get(degrau, 0) + 1
    ordenados = sorted(peso.items(), key=lambda x: -x[1])[:2]
    return {d for d, _ in ordenados}


def montar(ultimo_turno_do_tutor: str = "") -> str:
    """O system prompt deste turno.

    Sem turno anterior (conversa nova), manda tudo: o primeiro turno é o mapa,
    e o mapa classifica os nove degraus.
    """
    secoes = _secoes(_corpo())
    fluxo = _blocos_do_fluxo(secoes.get("O fluxo", ""))
    degraus = _degraus(secoes.get("Os 9 degraus", ""))
    primeiro_turno = not ultimo_turno_do_tutor.strip()

    partes = [secoes.get("__abertura__", "")]
    for titulo in ("Como você escreve (forma, não conteúdo)", "Regras de ouro (nunca quebre)"):
        if titulo in secoes:
            partes.append(secoes[titulo])

    partes.append(fluxo["cabeca"])
    if primeiro_turno:
        partes += [fluxo.get("abertura", ""), fluxo.get("mapa", "")]
    else:
        partes.append(fluxo.get("lapidacao", ""))

    partes.append(degraus["cabeca"])
    numeros = sorted(k for k in degraus if k.isdigit())
    if primeiro_turno:
        foco = set(numeros)
    else:
        detectado = foco_do_turno(ultimo_turno_do_tutor)
        if detectado:
            # Vizinhos entram junto: o Tutor costuma andar um degrau por turno,
            # e cortar o degrau seguinte seria cortar justamente pra onde ele vai.
            foco = set()
            for d in detectado:
                foco |= {str(int(d) - 1), d, str(int(d) + 1)}
            foco &= set(numeros)
        else:
            foco = set(numeros)
    for numero in numeros:
        partes.append(degraus[numero] if numero in foco else _resumo_do_degrau(degraus[numero]))

    for titulo in ("Comportamentos permanentes", "Tom", "Glossário do McKee Inspired"):
        if titulo in secoes:
            partes.append(secoes[titulo])

    return "\n\n".join(p for p in partes if p.strip())


if __name__ == "__main__":
    completo = montar()
    print(f"primeiro turno (tudo):        {len(completo):>6} caracteres")
    for descricao, turno in [
        ("foco em `TENTATIVA` (degrau 6)", "estamos nas `TENTATIVAS`, e cada `TENTATIVA` nasce da anterior"),
        ("foco em `QUEBRA` (degrau 3)", "a `QUEBRA` acende o `DESEJO` com causalidade nua"),
        ("sem termo marcado", "não sei do que estamos falando"),
    ]:
        montado = montar(turno)
        economia = 100 * (1 - len(montado) / len(completo))
        print(f"{descricao:30} {len(montado):>6} caracteres  ({economia:>4.1f}% menor)")
        assert "Glossário" in montado, "glossário sempre vai"
        assert "Regras de ouro" in montado, "regras de ouro sempre vão"
    assert "Abertura (primeiro turno" in completo, "primeiro turno leva a abertura"
    assert "Abertura (primeiro turno" not in montar("falando de `TENTATIVA`"), \
        "turno seguinte não leva a abertura"
    print("\nchecagens ok")
