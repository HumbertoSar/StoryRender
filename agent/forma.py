"""Normalização de forma do turno: o que regex faz melhor que instrução.

Duas regras de forma da instrução não precisam de modelo nenhum: travessão e
título de nível 1 são substituição de caractere e de linha. Medindo a mesma
instrução três vezes, elas oscilaram (0, 0 e 4 travessões no mesmo prompt), e
cada regra escrita disputa atenção com as que realmente precisam de julgamento
(qual termo marcar, como formular o teste). Então saíram do prompt e vieram
pra cá, onde o resultado é garantido e de graça.

O que continua no prompt é o que exige decisão: marcação de termo, explicação
na estreia, formato do teste, limite de perguntas, vícios de linguagem.
"""

import re

# Todo travessão no MEIO da linha vira vírgula, com ou sem espaço em volta.
# NÃO se mexe em travessão no INÍCIO da linha: ali ele é fala de personagem (o
# autor pode ter escrito diálogo, e o Tutor cita o autor) ou marcador de lista.
# `[ \t]` e não `\s`: quebra de linha antes do travessão significa início de
# linha, e ali ele não se toca.
_TRAVESSAO = re.compile(r"(?<=\S)[ \t]*[—–][ \t]*")

# A troca acima pode encostar a vírgula nova em outra pontuação, porque o
# modelo escreve coisas como "interná-lo —, ou" (visto no banco de prova).
# Estas duas limpam a sobra: pontuação vizinha vence, e vírgula no fim da
# linha some.
_PONTUACAO_DOBRADA = re.compile(r",[ \t]*([,;:.!?…])")
_VIRGULA_NO_FIM = re.compile(r",[ \t]*$", re.MULTILINE)

# Título de nível 1 vira nível 2. Na tela do autor o h1 sai do tamanho de um
# título de página e come o turno inteiro.
_TITULO_H1 = re.compile(r"^# (?=\S)", re.MULTILINE)

# Bloco de código cercado: nada é tocado lá dentro. O Tutor não deveria
# produzir nenhum, mas se produzir, o conteúdo é literal e mexer corromperia.
_CERCA = re.compile(r"^```.*?^```", re.MULTILINE | re.DOTALL)


def _normalizar_trecho(texto: str) -> str:
    texto = _TITULO_H1.sub("## ", texto)
    texto = _TRAVESSAO.sub(", ", texto)
    texto = _PONTUACAO_DOBRADA.sub(r"\1", texto)
    texto = _VIRGULA_NO_FIM.sub("", texto)
    return texto


def normalizar(texto: str) -> str:
    """Aplica as correções determinísticas, preservando blocos de código."""
    if not texto:
        return texto
    saida, fim = [], 0
    for bloco in _CERCA.finditer(texto):
        saida.append(_normalizar_trecho(texto[fim:bloco.start()]))
        saida.append(bloco.group(0))
        fim = bloco.end()
    saida.append(_normalizar_trecho(texto[fim:]))
    return "".join(saida)


if __name__ == "__main__":
    casos = [
        # travessão espaçado vira vírgula
        ("A `QUEBRA` é forte — ela rompe sem volta.",
         "A `QUEBRA` é forte, ela rompe sem volta."),
        # par de travessões vira par de vírgulas
        ("As cláusulas — o que o leitor espera — vão pro `MURAL`.",
         "As cláusulas, o que o leitor espera, vão pro `MURAL`."),
        # título de nível 1 desce pra 2
        ("# O mapa\n\ntexto\n\n## Já está certo",
         "## O mapa\n\ntexto\n\n## Já está certo"),
        # travessão de início de linha (fala do autor) fica intacto
        ("O autor escreveu:\n— Você me prometeu.\n",
         "O autor escreveu:\n— Você me prometeu.\n"),
        # dentro de cerca de código nada muda
        ("antes — depois\n```\n# titulo — dentro\n```\nfim — fim",
         "antes, depois\n```\n# titulo — dentro\n```\nfim, fim"),
        # travessão colado em vírgula (caso real do banco de prova)
        ("a família pode interná-lo —, ou a vida da Graça",
         "a família pode interná-lo, ou a vida da Graça"),
        # travessão no fim da linha não deixa vírgula pendurada
        ("o truque era real —\nlinha nova", "o truque era real\nlinha nova"),
        # travessão colado nas duas palavras
        ("palavra—palavra", "palavra, palavra"),
        # texto já limpo não muda
        ("Nada a fazer aqui.", "Nada a fazer aqui."),
    ]
    for entrada, esperado in casos:
        obtido = normalizar(entrada)
        assert obtido == esperado, f"\n entrada:  {entrada!r}\n obtido:   {obtido!r}\n esperado: {esperado!r}"
    print(f"{len(casos)} casos ok")
