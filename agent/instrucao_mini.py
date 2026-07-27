"""Monta o system prompt do turno do Mini a partir do MAPA.

A diferença de fundo pro `instrucao.py` do Tutor cabe numa frase:

> **O Tutor ADIVINHA o foco** lendo os termos entre crases do último turno.
> **O Mini SABE o foco: está no `mapa`.**

Por isso este módulo não generaliza aquele — importa os dois helpers que são
genuinamente genéricos (`_corpo`, `_secoes`) e decide o resto olhando o estado.
Generalizar acoplaria o trilho em validação (McKee Inspired, congelado) ao
trilho novo, e o modelo de foco é diferente de verdade.

Hipótese pré-registrada, que a telemetria da Fatia 5 mede sem esforço extra:
**a instrução do Mini pode ser MENOR por turno que a do Tutor, porque o estado
carrega o que o prompt carregava.** `instrucao_chars` na `telemetria_turno` é o
número que confirma ou derruba isso.

**O que é gerado e o que é escrito à mão.** Fórmulas, slots, sondas e formas
saem do `mini_mapa.ESQUELETO` — mesma decisão da descrição da tool na Fatia 3:
o vocabulário mora num lugar só, e card novo no método aparece pro modelo sem
ninguém lembrar de atualizar dois arquivos. O `.md` carrega o que exige
julgamento: quem o agente é, como escreve, o que nunca faz, o fluxo.
"""

from pathlib import Path

import mini_mapa
from instrucao import _corpo, _secoes

ARQUIVO = Path(__file__).parent / "metodos" / "mckee_mini.md"

# As seções do `.md` que vão inteiras, em ordem. Uma seção listada aqui e
# ausente do arquivo é ignorada em silêncio de propósito: o ciclo de validação
# é editar o `.md` e mandar a próxima mensagem, e um turno que estoura porque
# uma seção foi renomeada no meio da edição atrapalharia mais do que ajuda.
SECOES = (
    "__abertura__",
    "Como você escreve",
    "Regras de ouro",
    "O fluxo da sessão",
    "O mapa",
    "O desenho",
)


def espinha_literal() -> str:
    """As seis fórmulas, verbatim, em bloco cercado.

    Template literal é obedecido; regra em prosa escorrega. E o truque que faz
    isso funcionar sem camada de tradução: `PROTAGONISTA` na fórmula é
    exatamente `slot="protagonista"` na tool.
    """
    linhas = [
        f"{int(modelo['ordem'])}. {modelo['formula']}"
        for modelo in sorted(mini_mapa.ESQUELETO.values(), key=lambda m: m["ordem"])
    ]
    return "## A espinha\n\nSeis lacunas que, lidas em voz alta, são uma história inteira.\n" \
           "O nome em CAIXA ALTA é o `slot` que você usa na tool.\n\n```\n" \
           + "\n".join(linhas) + "\n```"


def _card_em_foco(mapa: dict) -> dict | None:
    """O card que a conversa está construindo agora.

    Regra: o primeiro, na ordem da espinha, que ainda não está `firme`. Ordem e
    não recência de propósito — o §4.4 diz que a espinha SUGERE a ordem 1→6, e
    um foco que pula pro card que o autor tocou por último transformaria uma
    digressão em mudança de assunto.
    """
    candidatos = [
        card for card in mapa.get("cards") or []
        if card.get("tipo") == "lacuna" and mini_mapa.estado_do_card(card) != "firme"
    ]
    candidatos.sort(key=lambda card: card.get("ordem", 0))
    return candidatos[0] if candidatos else None


def _bloco_do_card(card: dict) -> str:
    """Fórmula e a sonda de cada slot vazio: o que PERGUNTAR agora.

    Sem a forma de propósito, ainda que ela exista pra estes mesmos slots. A
    forma é restrição de ESCRITA e mora na descrição da tool, que vale pros
    seis cards; repeti-la aqui só pro card em foco criaria duas fontes que
    podem discordar, e a primeira sessão real mostrou que a que chega tarde é
    pior que inútil: dá a impressão de que a regra existe onde ela não está
    valendo.
    """
    linhas = [f"### {card['id']} · {card['nome']}", "", f"`{card['formula']}`", ""]
    for slot, dado in (card.get("slots") or {}).items():
        texto = (dado.get("texto") or "").strip()
        if texto:
            linhas.append(f"- **{slot}** · preenchido: \"{texto}\"")
        else:
            linhas.append(f"- **{slot}** · vazio. Pergunte: {dado.get('sonda', '')}")
    return "\n".join(linhas)


def estado_do_mapa(mapa: dict) -> str:
    """O mapa em texto: como a espinha lê agora, em que estado está cada card,
    e o card em foco aberto por inteiro.

    É isto que substitui o prompt gigante: os cards fora de foco entram como
    uma linha de índice, porque o que o modelo precisa saber deles é que
    existem e como estão, não como preenchê-los.
    """
    cards = sorted(
        [c for c in mapa.get("cards") or [] if c.get("tipo") == "lacuna"],
        key=lambda c: c.get("ordem", 0),
    )
    if not cards:
        return ""

    foco = _card_em_foco(mapa)
    indice = "\n".join(
        f"- `{c['id']}` {c['nome']} — {mini_mapa.estado_do_card(c)}"
        + ("  ← foco" if foco and c["id"] == foco["id"] else "")
        for c in cards
    )
    partes = ["## Onde a história está agora", "", indice]

    frase = mini_mapa.frase_da_espinha(mapa).strip()
    # Só vale mostrar a leitura quando já há o que ler: uma espinha com os seis
    # slots em CAIXA ALTA não ensina nada e ainda ocupa o dobro do índice.
    if frase and not frase.isupper() and any(
        (d.get("texto") or "").strip() for c in cards for d in (c.get("slots") or {}).values()
    ):
        partes += ["", "Como a espinha lê agora (os nomes em CAIXA ALTA são os buracos):",
                   "", "> " + frase]

    if foco is not None:
        partes += ["", _bloco_do_card(foco)]
    return "\n".join(partes)


def montar(mapa: dict | None = None) -> str:
    """O system prompt deste turno.

    Lido do disco a cada chamada, como no Tutor: editar o `.md` e mandar a
    próxima mensagem já testa a versão nova, sem restart e sem rebuild.
    """
    secoes = _secoes(_corpo(ARQUIVO))
    partes = [secoes[nome] for nome in SECOES if secoes.get(nome)]
    partes.append(espinha_literal())
    estado = estado_do_mapa(mapa or {})
    if estado:
        partes.append(estado)
    return "\n\n".join(partes).strip()


if __name__ == "__main__":
    # `uv run python instrucao_mini.py` — montagem sem LLM e sem banco.
    casos = 0

    vazio = montar(mini_mapa.mapa_vazio())
    assert "## A espinha" in vazio
    assert "Todo dia o(a) PROTAGONISTA" in vazio
    # Mapa recém-nascido: o foco é o card 1 e nenhuma leitura é mostrada, porque
    # a espinha ainda é só CAIXA ALTA.
    assert "`lacuna-1` O Mundo como Era — vazio  ← foco" in vazio, vazio
    assert "Como a espinha lê agora" not in vazio
    assert "### lacuna-1 · O Mundo como Era" in vazio
    assert "**rotina** · vazio. Pergunte: O que a gente VÊ ele fazendo?" in vazio, vazio
    # A forma NÃO vem por aqui: ela é restrição de escrita e mora na descrição
    # da tool, que vale pros seis cards e não só pro foco.
    assert "terminando em -ndo" not in vazio
    casos += 7

    # Com o card 1 preenchido, o foco anda e a leitura aparece.
    mapa = mini_mapa.mapa_vazio()
    for slot, texto in [("protagonista", "Marta"),
                        ("rotina", "abrindo uma banca vazia"),
                        ("passado", "o filho sumiu")]:
        mapa, _ = mini_mapa.escrever(
            mapa, [{"card_id": "lacuna-1", "slot": slot, "texto": texto}])
    andou = montar(mapa)
    assert "Como a espinha lê agora" in andou
    assert "Todo dia o(a) Marta segue abrindo uma banca vazia" in andou, andou
    # O card 1 está `rascunho` (sem teste registrado ainda), então continua
    # sendo o foco. Quem tira o foco dele é `registrar_teste`, na Fatia 9.
    assert "`lacuna-1` O Mundo como Era — rascunho  ← foco" in andou, andou
    # Fora de foco, uma linha só: é onde a economia acontece.
    assert "### lacuna-2" not in andou
    casos += 4

    # O foco pula o que está firme.
    firme = mini_mapa.mapa_vazio()
    for card in firme["cards"]:
        if card["id"] == "lacuna-1":
            for slot in card["slots"]:
                card["slots"][slot]["texto"] = "x"
            for teste in card["testes"]:
                teste["veredito"] = "passa"
    assert mini_mapa.estado_do_card(firme["cards"][0]) == "firme"
    assert _card_em_foco(firme)["id"] == "lacuna-2"
    casos += 2

    # Sem mapa nenhum (o primeiro turno, antes do canal nascer) a montagem não
    # estoura e ainda entrega a espinha.
    assert "## A espinha" in montar(None)
    assert "Onde a história está agora" not in montar(None)
    casos += 2

    print(f"{casos} casos ok · prompt do 1º turno: {len(vazio)} chars")
