"""Contrato de dados do mapa do McKee Mini: schema, derivações e assinatura.

Python puro, zero LLM e zero rede, e é isso que dá o valor: tudo aqui é
testável sem gastar um turno de modelo. O módulo diz qual é a forma do estado,
o que se deriva dela (Fatia 2) e como se escreve nela (`escrever`, Fatia 3);
quem expõe isso ao modelo como tool é o `mini.py`.

**Princípio: guardar fato, derivar forma.** O canal `mapa` guarda só o que o
autor e o agente produzem (texto de slot, veredito de teste, leitura aprovada).
Estado de card, ligações e a frase da espinha são consequência, e consequência
não se guarda: vira função pura. É a mesma disciplina de `forma.py` e de
`sessoes.trilho_dos_canais`, aplicada ao domínio: **o agente não consegue
mentir que um card está firme**, porque "firme" não é um campo que ele escreve,
é o que sai da tabela de testes dele.

O que ficou de fora de propósito: as outras quatro tools do plano
(`registrar_teste`, `nascer_card`, `aprovar_leitura`, `registrar_pendencia`),
`para_render` (Fatia 7, cuja forma depende do que a instrução de desenho
pedir), e as derivações cujo dado ainda não existe: storyboard (§15), sabor
(§10) e `arco.stale` (§12).
Os cards satélites (Protagonista, Força Antagônica) aparecem aqui só como alvo
de ligação: o conteúdo deles é pendência aberta no §19 do método.

Referências de seção (§) apontam para o documento do método (`Mini.md`).
"""

import copy
import hashlib
import json
import re

VERSAO_SCHEMA = 1

# Alfabeto de tipos de card (§2 pede teto de 5 a 7 para que o autor aprenda a
# LER a forma). Só `lacuna` nasce com o mapa; os outros quatro nascem pelos
# três modos do §13 (por slot, por colheita, por medição) nas fatias seguintes.
# Os elos repetíveis do §8 são `lacuna` com id `lacuna-3.1`…`lacuna-3.4`, e não
# um tipo novo, justamente para não estourar o alfabeto.
TIPOS = ("espinha", "lacuna", "protagonista", "forca_antagonica", "arco")

VEREDITOS = ("pendente", "passa", "nao_passa")

# O esqueleto da espinha (§5 a §11): fórmula, slots e a tabela de testes de cada
# card, um por linha `(id, peça, nome, sonda)`.
#
# Três decisões que valem ser lidas antes da tabela:
#
# 1. **A sonda mora no slot**, não no renderizador (§2: empty state = sonda como
#    placeholder). Assim o HTML gerado nunca precisa saber McKee: ele desenha o
#    que recebe. Custa bytes no checkpoint e compra um contrato autodescritivo,
#    que é exatamente o que um gerador de HTML livre precisa.
#
#    **`sonda` e `forma` são coisas diferentes, e confundi-las quebrou o método
#    numa sessão real.** A sonda é a pergunta curta que o AUTOR lê no card
#    vazio; a forma é como a resposta precisa entrar na fórmula, com exemplo
#    literal, e só o AGENTE lê (via `instrucao_mini`). Antes disso as sondas de
#    slot eram cópia das sondas de TESTE — pergunta de navalha ("como isso
#    fabrica a rotina?") no lugar de pergunta de preenchimento —, e o texto que
#    voltava não cabia na frase: "Ele tenta **recorre** à justiça", "pagando
#    **entregar** a credibilidade", "isso porque no **esbarrou** com a facção".
#    A espinha lida em voz alta É a régua do método, então texto que não cabe
#    na frase não é detalhe de redação: é o método falhando calado.
#    Só slot que aparece na fórmula tem forma.
# 2. **O nome em CAIXA ALTA na fórmula é o id do slot.** Nenhuma camada de
#    tradução, nada para o modelo inventar quando chamar a tool. Por isso as
#    fórmulas aqui perdem o acento de PREÇO_A e AÇÃO em relação ao §5: entre a
#    tipografia do documento e o identificador que a tool recebe, manda o
#    identificador.
# 3. **`peca` é o id de um slot, ou "frase"** quando o teste olha a frase
#    inteira ou a relação entre dois slots (o "por isso" do §7, as duas mãos do
#    §9). Todo teste de "frase inteira" é um teste de integração, e é dele que
#    sai o key frame do §15.
#
# Um slot mora no card onde NASCE: a fórmula do card 2 cita PROTAGONISTA, mas
# quem guarda o protagonista é a lacuna 1. Fato guardado uma vez só.
ESQUELETO: dict[str, dict] = {
    "lacuna-1": {
        "nome": "O Mundo como Era",
        "ordem": 1.0,
        # A fórmula do §5 é "isso porque no PASSADO ___", e transcrita assim ela
        # é impossível de satisfazer: o `no` exige substantivo masculino, mas a
        # peça que o §6 pede é um ACONTECIMENTO ("teste do apagador: causa, não
        # decoração"). Toda leitura em voz alta saía "isso porque no esbarrou
        # com a facção", e o `___` ainda vazava literal pro meio da frase. O
        # exemplo do próprio §5 mostra a leitura pretendida — "Isso porque no
        # passado o pai abandonou a família" —, em que `passado` é palavra da
        # fórmula e o slot é a oração. É essa que está aqui.
        "formula": "Todo dia o(a) PROTAGONISTA segue ROTINA, isso porque no passado PASSADO",
        "slots": {
            "protagonista": "Quem é? Nome e uma coisa que a gente vê nele.",
            "rotina": "O que a gente VÊ ele fazendo?",
            "passado": "O que aconteceu antes que fabricou essa rotina?",
        },
        "forma": {
            "protagonista": "nome e um traço visível: `Otávio, 12 anos, tênis sempre furado`",
            "rotina": "terminando em -ndo, porque a frase é `todo dia ele segue ___`: "
                      "`varrendo a oficina do pai antes da escola`",
            "passado": "uma frase inteira, porque ela entra depois de `isso porque no "
                       "passado`: `a mãe foi embora e ninguém em casa fala nela`",
        },
        "testes": [
            ("imagem-nao-categoria", "protagonista", "Imagem, não categoria",
             "Quem é? Me dá o nome e me mostra ele numa cena."),
            ("da-pra-desenhar", "rotina", "Dá pra desenhar",
             "O que a gente VÊ ele fazendo?"),
            ("aguenta-mais-um-ano", "rotina", "Aguenta mais um ano",
             "Se nada acontecer, essa vida continua igual por mais um ano?"),
            ("teste-do-apagador", "passado", "Teste do apagador",
             "Como exatamente esse acontecimento fabrica essa rotina?"),
            ("cena-de-abertura", "frase", "Cena de Abertura",
             "Qual é a imagem que abre essa história?"),
        ],
    },
    "lacuna-2": {
        "nome": "Até Que Um Dia",
        "ordem": 2.0,
        "formula": "Até que um dia EVENTO, e por isso PROTAGONISTA passou a querer DESEJO",
        "slots": {
            "evento": "O que aconteceu NAQUELE dia?",
            "desejo": "Se ele conseguir, qual é a foto? O que a gente vê?",
        },
        "forma": {
            "evento": "um acontecimento no passado, porque a frase é `até que um dia "
                      "___`: `apareceu um cachorro preso no muro do vizinho`",
            "desejo": "verbo no infinitivo, porque a frase é `passou a querer ___`: "
                      "`esconder o cachorro até o pai voltar de viagem`",
        },
        "testes": [
            ("datado-nao-estado", "evento", "Datado, não estado",
             "O que aconteceu NAQUELE dia?"),
            ("rompe-sem-volta", "evento", "Rompe sem volta",
             "No dia seguinte, dava pra fingir que nada aconteceu?"),
            ("foto-da-vitoria", "desejo", "A Foto da Vitória",
             "Se ele conseguir, qual é a foto? O que a gente vê?"),
            ("causalidade-nua", "frase", "Causalidade nua",
             "Antes desse dia, ele já queria exatamente isso?"),
            ("cena-prometida", "frase", "A Cena Prometida",
             "Que cena o leitor já sabe que vai ter que acontecer?"),
        ],
    },
    # Modelo dos elos repetíveis (§8): 2 a 4 voltas, cada uma um card com id
    # `lacuna-3.k`. O mapa nasce com o primeiro; os outros nascem quando a
    # corrente cresce. O slot `rosto` é a colheita do §13 acontecendo dentro do
    # elo: é dele que a Força Antagônica se alimenta, sem pergunta extra.
    "lacuna-3": {
        "nome": "Tenta, Mas",
        "ordem": 3.0,
        "formula": "Ele tenta TENTATIVA, mas PANCADA",
        "slots": {
            "tentativa": "O que ele tenta pra sair dessa?",
            "pancada": "O que dá errado?",
            "rosto": "Quem ou o que bateu? Me mostra em cena.",
        },
        # `rosto` não aparece na fórmula (é a colheita da Força Antagônica), e
        # por isso não tem forma: só slot que entra na frase precisa caber nela.
        "forma": {
            "tentativa": "verbo no infinitivo, porque a frase é `ele tenta ___`: "
                         "`esconder o cachorro no barracão`",
            "pancada": "uma frase inteira, porque ela entra depois de `mas`: "
                       "`o vizinho reconheceu o cachorro e foi cobrar em casa`",
        },
        "testes": [
            ("por-causa-disso", "tentativa", "Por causa disso",
             "Por que ele tenta ISSO agora? O que a última pancada empurrou pra cá?"),
            ("tem-rosto", "rosto", "Tem rosto",
             "Quem ou o que bateu? Me mostra em cena."),
            ("fecha-uma-porta", "pancada", "Fecha uma porta",
             "Depois dessa pancada, essa tentativa ainda existe como opção?"),
            ("teste-da-troca", "frase", "Teste da Troca",
             "Se eu trocar esse Mas com o anterior, a história quebra?"),
            ("teste-do-esgotamento", "frase", "Teste do Esgotamento",
             "Sobrou tentativa barata?"),
        ],
    },
    "lacuna-4": {
        "nome": "A Escolha",
        "ordem": 4.0,
        "formula": (
            "Até que só restou a escolha: ou ESCOLHA_A, pagando PRECO_A; "
            "ou ESCOLHA_B, pagando PRECO_B"
        ),
        "slots": {
            "escolha_a": "Qual é a primeira mão?",
            "preco_a": "O que ele perde se escolher esta?",
            "escolha_b": "E a outra mão, qual é?",
            "preco_b": "E o que ele perde se escolher essa?",
        },
        # Os preços são COISAS e não verbos: "pagando entregar a credibilidade"
        # foi exatamente como uma sessão real quebrou a leitura em voz alta.
        "forma": {
            "escolha_a": "verbo no infinitivo, porque a frase é `ou ___`: "
                         "`entregar o cachorro e ficar quieto`",
            "preco_a": "uma coisa que se perde, não um verbo, porque a frase é "
                       "`pagando ___`: `a única coisa que era só dele`",
            "escolha_b": "também no infinitivo: `fugir de casa com o cachorro`",
            "preco_b": "também uma coisa: `a oficina e o pai`",
        },
        "testes": [
            ("qual-e-a-certa", "frase", "Qual é a certa?",
             "Das duas, qual é a certa?"),
            ("da-pra-desenhar-a-perda", "frase", "Dá pra desenhar a perda",
             "Me mostra cada preço em cena, o que a gente VÊ ele perdendo?"),
            ("porta-c-trancada", "frase", "A porta C está trancada?",
             "Que saída esperta alguém no sofá sugeriria? Por que não funciona?"),
            ("desejo-na-mesa", "frase", "O desejo está na mesa",
             "Em qual das duas mãos está o que ele passou a querer?"),
            ("cena-da-escolha", "frase", "A Cena da Escolha",
             "Onde ele está quando escolhe? O que tem na frente dele?"),
        ],
    },
    "lacuna-5": {
        "nome": "E Então Ele",
        "ordem": 5.0,
        "formula": "E então ele ACAO",
        "slots": {
            "acao": "Qual das duas mãos ele escolhe? Me mostra acontecendo.",
        },
        "forma": {
            "acao": "verbo conjugado em `ele`, porque a frase é `e então ele ___`: "
                    "`abre o portão e sai com o cachorro no colo`",
        },
        "testes": [
            ("e-a-escolha-em-acao", "acao", "É a escolha em ação",
             "Essa ação é qual das duas mãos? Me mostra a opção escolhida acontecendo."),
            ("irreversivel", "acao", "Irreversível",
             "O que existe depois que não existia? Dá pra desfazer?"),
            ("acontece-na-tela", "acao", "Acontece na tela",
             "A gente VÊ o desejo ganhar ou perder? Em que cena, com quem presente?"),
            ("paga-a-cena-prometida", "frase", "Paga a Cena Prometida",
             "A história prometeu aquela cena. Essa ação paga?"),
            ("o-sabor", "frase", "O sabor",
             "Seu final tem esse gosto. É essa a história que você quer contar?"),
        ],
    },
    # §18.8 propõe o nome "O Mundo como Ficou" para fechar o par espelhado com o
    # card 1 (era ↔ ficou). Está aguardando veto do autor do método: se voltar a
    # ser "E Desde Então", muda esta string e nada mais.
    "lacuna-6": {
        "nome": "O Mundo como Ficou",
        "ordem": 6.0,
        "formula": "E desde então, todo dia ele NOVA_ROTINA",
        "slots": {
            "nova_rotina": "O que a gente VÊ ele fazendo agora, num dia comum?",
        },
        # "num dia comum" é literal de propósito: numa sessão real este slot foi
        # usado pra guardar o lance de uma cena única, e a frase passou a ler um
        # acontecimento dentro do quadro "todo dia".
        "forma": {
            "nova_rotina": "verbo conjugado em `ele` e um dia COMUM, não um "
                           "acontecimento único, porque a frase é `e desde então, "
                           "todo dia ele ___`: `varre a oficina de um homem que "
                           "não é o pai dele`",
        },
        "testes": [
            ("da-pra-desenhar", "nova_rotina", "Dá pra desenhar",
             "O que a gente VÊ ele fazendo agora, num dia comum?"),
            ("aguenta-mais-um-ano", "nova_rotina", "Aguenta mais um ano",
             "Se nada acontecer, essa vida nova continua?"),
            ("o-diff", "frase", "O Diff",
             "Começou assim e terminou assado. Esse é o arco?"),
            ("nada-vazando", "frase", "Nada vazando",
             "Essa frase abre pergunta nova? De propósito (gancho) ou escapou?"),
            ("cena-espelho", "frase", "A Cena-Espelho",
             "Me mostra ele na MESMA situação da abertura. O que acontece diferente?"),
        ],
    },
}

# Os cards com que o mapa nasce: os seis da espinha, com o primeiro elo da
# corrente já aberto. `lacuna-3` é modelo, não card: nunca entra por id próprio.
NASCEM_COM_O_MAPA = (
    ("lacuna-1", "lacuna-1", 1.0),
    ("lacuna-2", "lacuna-2", 2.0),
    ("lacuna-3", "lacuna-3.1", 3.1),
    ("lacuna-4", "lacuna-4", 4.0),
    ("lacuna-5", "lacuna-5", 5.0),
    ("lacuna-6", "lacuna-6", 6.0),
)


def instanciar(modelo_id: str, card_id: str, ordem: float, hipotese: bool = False) -> dict:
    """Cria um card a partir do modelo do `ESQUELETO`.

    `versao` começa em 0 e sobe a cada escrita: é ela que torna a edição
    retroativa (§3) e a re-medição do Arco (§12) determinísticas, sem
    especulação. `base_em` guarda de quais cards este foi derivado.
    """
    modelo = ESQUELETO[modelo_id]
    return {
        "id": card_id,
        # De qual modelo do ESQUELETO este card saiu. Guardado em vez de
        # deduzido do id (`lacuna-3.1` → `lacuna-3`): a convenção de id já é
        # carregada demais, e é isto que deixa `forma_do_slot` buscar a forma
        # ATUAL do método num card nascido semanas atrás.
        "modelo": modelo_id,
        "tipo": "lacuna",
        "nome": modelo["nome"],
        "ordem": ordem,
        "hipotese": hipotese,
        "versao": 0,
        "base_em": [],
        "formula": modelo["formula"],
        "slots": {
            slot: {"texto": "", "sonda": sonda}
            for slot, sonda in modelo["slots"].items()
        },
        "testes": [
            {"id": tid, "peca": peca, "nome": nome, "sonda": sonda,
             "veredito": "pendente", "nota": "", "imagem": None}
            for tid, peca, nome, sonda in modelo["testes"]
        ],
    }


def forma_do_slot(card: dict, slot: str) -> str:
    """Como o texto deste slot precisa entrar na fórmula, ou "" se ele não
    aparece nela.

    Derivado do ESQUELETO e NÃO guardado no card, ao contrário da sonda: a
    forma é o que o agente lê, e ajustar uma forma no método precisa alcançar
    as sessões já abertas. A sonda é o que o AUTOR vê no card vazio, e essa
    congela no nascimento junto do resto do card.
    """
    modelo = ESQUELETO.get(card.get("modelo") or "", {})
    return (modelo.get("forma") or {}).get(slot, "")


def mapa_vazio() -> dict:
    """O mapa do primeiro turno: a espinha inteira, com todos os buracos à
    mostra. É de propósito que ele já nasça com os seis cards vazios, e não
    vá crescendo: o §4.3 quer que o autor VEJA o estado da própria história no
    primeiro minuto, sonda por sonda, e ouça que buraco no fim é normal."""
    return {
        "versao_schema": VERSAO_SCHEMA,
        # Assinatura do último desenho entregue. Vazia = nada foi desenhado
        # ainda. Quem compara e quem grava é o nó do grafo (Fatia 7).
        "assinatura_renderizada": "",
        "cards": [instanciar(modelo, card_id, ordem)
                  for modelo, card_id, ordem in NASCEM_COM_O_MAPA],
        "pendencias": [],
        "leituras": [],
    }


# ---------------------------------------------------------------------------
# Derivações: daqui pra baixo, nada é guardado.
# ---------------------------------------------------------------------------


def estado_do_card(card: dict) -> str:
    """Um dos quatro estados visuais do §2, derivado do conteúdo do card.

    A ordem das perguntas é o contrato: hipótese vence tudo (um card fantasma
    plantado pelo agente não é rascunho, mesmo com texto dentro), depois vazio,
    depois firme.

    **Card sem nenhum teste nunca fica firme.** Sem essa linha, "todos os
    testes passaram" seria verdade vazia num card sem tabela de testes, e o
    mapa mostraria como sólido o que ninguém checou. É o modo de falha que mais
    importa aqui, então ele é impossível por construção e não por instrução.
    """
    if card.get("hipotese"):
        return "fantasma"
    slots = card.get("slots") or {}
    if not any((slot.get("texto") or "").strip() for slot in slots.values()):
        return "vazio"
    testes = card.get("testes") or []
    if testes and all(teste.get("veredito") == "passa" for teste in testes):
        return "firme"
    return "rascunho"


def _texto(card: dict | None, slot: str) -> str:
    return ((card or {}).get("slots", {}).get(slot, {}).get("texto") or "").strip()


def _veredito(card: dict | None, teste_id: str) -> str:
    for teste in (card or {}).get("testes") or []:
        if teste.get("id") == teste_id:
            return teste.get("veredito") or "pendente"
    return "pendente"


def _estado_da_leitura(mapa: dict, leitura_id: str) -> str:
    for leitura in mapa.get("leituras") or []:
        if leitura.get("id") == leitura_id:
            return leitura.get("estado") or "oferecida"
    return ""


def ligacoes(mapa: dict) -> list[dict]:
    """As oito ligações do §14, derivadas do estado do mapa.

    O §14 existe justamente "pro renderizador não precisar inventar nenhuma":
    esta lista vai pronta no JSON entregue ao prompt de desenho, e o modelo
    desenha arestas em vez de deduzi-las. O id é estável e ASCII porque vira
    `data-ligacao-id` no HTML, que é como a fidelidade ao estado vira contável.

    Duas regras que a tabela do §14 não diz e alguém teria que decidir:

    - **Um par de cards, uma aresta.** `motor` e `corrente` cobrem pares que a
      `sequencia` também cobriria; quem chega antes fica, senão o mapa
      desenharia duas setas em cima da outra.
    - **Ligação para card que não existe não desenha.** O `batismo` nasce
      quando o slot do nome é preenchido (§14), mas o card Protagonista é
      criado por uma tool, e entre uma coisa e outra a aresta ficaria solta.
    """
    cards = {card["id"]: card for card in mapa.get("cards") or []}
    arestas: list[dict] = []

    def liga(tipo: str, de: str, para: str) -> None:
        arestas.append({"id": f"{tipo}__{de}__{para}", "tipo": tipo, "de": de, "para": para})

    lacunas = sorted(
        (card for card in cards.values() if card.get("tipo") == "lacuna"),
        key=lambda card: card.get("ordem", 0),
    )
    elos = [card for card in lacunas if card["id"].startswith("lacuna-3.")]

    if elos:
        liga("motor", "lacuna-2", elos[0]["id"])
    for anterior, seguinte in zip(elos, elos[1:]):
        liga("corrente", anterior["id"], seguinte["id"])
    if _texto(cards.get("lacuna-1"), "protagonista"):
        liga("batismo", "lacuna-1", "protagonista")
    if _veredito(cards.get("lacuna-2"), "cena-prometida") == "passa":
        liga("fantasma", "lacuna-2", "lacuna-5")
    for elo in elos:
        if _texto(elo, "rosto"):
            liga("rosto", elo["id"], "forca_antagonica")
    if _estado_da_leitura(mapa, "anel") == "aprovada":
        liga("anel", "lacuna-4", "lacuna-1")
    if "arco" in cards:
        liga("costura", "lacuna-6", "arco")
        liga("costura", "arco", "lacuna-1")

    # Por último, para enxergar os pares que as ligações de significado já
    # cobriram (ver "um par de cards, uma aresta", acima).
    ja_ligados = {(aresta["de"], aresta["para"]) for aresta in arestas}
    for anterior, seguinte in zip(lacunas, lacunas[1:]):
        if (anterior["id"], seguinte["id"]) not in ja_ligados:
            liga("sequencia", anterior["id"], seguinte["id"])

    return sorted(
        (a for a in arestas if a["de"] in cards and a["para"] in cards),
        key=lambda aresta: aresta["id"],
    )


def frase_da_espinha(mapa: dict) -> str:
    """A espinha lida em voz alta (§4.6): as fórmulas em ordem, com os slots
    trocados pelo texto do autor.

    Slot vazio fica com o nome em CAIXA ALTA na frase, de propósito: o buraco
    é para ser visto. E como o nome do slot é o mesmo em todas as fórmulas
    (`PROTAGONISTA` na 1 e na 2), o texto vem de onde o fato foi guardado, não
    de uma cópia por card.
    """
    cards = [card for card in mapa.get("cards") or [] if card.get("tipo") == "lacuna"]
    cards.sort(key=lambda card: card.get("ordem", 0))

    do_mapa: dict[str, str] = {}
    for card in cards:
        for slot, dado in (card.get("slots") or {}).items():
            texto = (dado.get("texto") or "").strip()
            if texto and slot not in do_mapa:
                do_mapa[slot] = texto

    trechos = []
    for card in cards:
        proprios = {
            slot: (dado.get("texto") or "").strip()
            for slot, dado in (card.get("slots") or {}).items()
            if (dado.get("texto") or "").strip()
        }
        # O slot do próprio card vence o do mapa. Os elos da corrente (§8)
        # repetem `tentativa` e `pancada`, e sem esta linha o segundo elo sai
        # lido com o texto do primeiro: a mesma tentativa duas vezes, e a
        # escalada some da leitura em voz alta.
        frase = card.get("formula", "")
        for slot, texto in {**do_mapa, **proprios}.items():
            # `\b` e não `str.replace`: sem a fronteira de palavra, o slot
            # `rotina` come o miolo de `NOVA_ROTINA` na fórmula do card 6 e a
            # espinha sai lida como "E desde então, todo dia ele NOVA_passa o
            # dia no computador". Como `_` é caractere de palavra, a fronteira
            # sozinha resolve os dois casos. A troca vai por função pra que
            # contrabarra no texto do autor não vire grupo de captura.
            frase = re.sub(rf"\b{re.escape(slot.upper())}\b", lambda _: texto, frase)
        trechos.append(frase.strip())
    # Ponto entre as lacunas, e não espaço: a espinha existe pra ser LIDA EM VOZ
    # ALTA (§4.6, o momento em que o autor escuta que tem uma história), e sem
    # pontuação as seis fórmulas saem como um parágrafo sem fôlego. Só entre
    # trechos — dentro da fórmula a pontuação é do método.
    return ". ".join(t for t in trechos if t)


def assinatura(mapa: dict) -> str:
    """Impressão digital da FORMA do mapa: quais cards existem, em que estado,
    e quais ligações há entre eles.

    É o gatilho de render (Parte III do plano), e mudar texto dentro de um slot
    que já tinha texto NÃO muda a assinatura: o desenho mostra forma, não
    conteúdo, e redesenhar a cada palavra digitada custaria uma chamada de
    modelo por turno. O que dispara é card que nasce, card que muda de estado e
    ligação que aparece: 8 a 12 renders numa sessão de 21 a 40 interações.

    Fica em Python, e não no prompt, porque regra determinística em prosa
    escorrega (é o aprendizado que a `forma.py` já custou) e porque assim a
    sequência "mutação → redesenha ou não" é testável sem gastar LLM.

    `hashlib` e não o `hash()` embutido: o built-in é aleatorizado por processo
    (PYTHONHASHSEED), então a assinatura gravada num turno não bateria com a
    calculada depois de um restart do agente, e toda sessão reaberta
    redesenharia o mapa de graça.
    """
    forma = {
        "cards": sorted(
            [card["id"], estado_do_card(card)] for card in mapa.get("cards") or []
        ),
        "ligacoes": sorted(ligacao["id"] for ligacao in ligacoes(mapa)),
    }
    bruto = json.dumps(forma, ensure_ascii=False, sort_keys=True)
    return hashlib.sha1(bruto.encode("utf-8")).hexdigest()[:12]


# ---------------------------------------------------------------------------
# Mutação: a única primitiva de escrita de conteúdo.
# ---------------------------------------------------------------------------


def escrever(mapa: dict, preenchimentos: list[dict]) -> tuple[dict, dict]:
    """Escreve texto nos slots dos cards. Devolve `(mapa novo, relatório)`.

    **Chave inventada é recusada, não escrita.** Um `card_id` ou `slot` que não
    existe volta como recusa no relatório, com a lista do que existe naquele
    card, e o modelo tem a chance de corrigir no turno seguinte. Escrever a
    chave errada seria corrupção silenciosa: o dado entraria no checkpoint,
    nenhuma derivação o enxergaria e o mapa mostraria um buraco que o autor
    jura ter preenchido.

    **Lista, e não um preenchimento por chamada**, porque a primeira
    renderização (§4.3) distribui o braindump por vários slots de uma vez, e
    com `parallel_tool_calls=False` uma tool por slot custaria uma ida e volta
    ao modelo para cada um. A disciplina de "um slot por turno" fora dessa
    distribuição inicial é assunto da instrução, não da assinatura.

    **Cópia antes de escrever:** o dict que chega vem do checkpoint e suas
    partes são referências compartilhadas; mutar no lugar corromperia o
    histórico do LangGraph em vez de criar uma versão nova.
    """
    novo = copy.deepcopy(mapa)
    cards = {card["id"]: card for card in novo.get("cards") or []}
    aplicados: list[str] = []
    recusados: list[str] = []

    for pedido in preenchimentos or []:
        card_id = str(pedido.get("card_id") or "").strip()
        slot = str(pedido.get("slot") or "").strip()
        card = cards.get(card_id)
        if card is None:
            recusados.append(
                f"{card_id or '(sem card_id)'}: não existe esse card. "
                f"Existem: {', '.join(sorted(cards)) or 'nenhum'}"
            )
            continue
        if slot not in (card.get("slots") or {}):
            recusados.append(
                f"{card_id}.{slot or '(sem slot)'}: esse slot não existe. "
                f"O card {card_id} tem: {', '.join(card.get('slots') or {}) or 'nenhum'}"
            )
            continue
        card["slots"][slot]["texto"] = str(pedido.get("texto") or "").strip()
        # `versao` sobe a cada escrita: é o que torna a edição retroativa (§3) e
        # a re-medição do Arco (§12) determinísticas, sem precisar comparar
        # texto com texto.
        card["versao"] = card.get("versao", 0) + 1
        if pedido.get("hipotese") is not None:
            # Hipótese plantada pelo agente deixa o card fantasma (§2), e o
            # autor confirmando (hipotese=False) o traz de volta pra rascunho.
            card["hipotese"] = bool(pedido["hipotese"])
        aplicados.append(f"{card_id}.{slot}")

    # Nada aplicado significa nada a gravar: devolver o mapa original evita um
    # STATE_SNAPSHOT idêntico ao anterior viajando pro front à toa.
    return (novo if aplicados else mapa), {"aplicados": aplicados, "recusados": recusados}


if __name__ == "__main__":
    # Autoteste de tabela, no formato de `forma.py`: roda em milissegundos, sem
    # rede e sem chave de API. Os quatro blocos são os eixos do contrato: os
    # 4 estados, as 8 ligações, o gatilho de render e a escrita.

    def _card(mapa: dict, card_id: str) -> dict:
        return next(card for card in mapa["cards"] if card["id"] == card_id)

    # Escrever é a única mutação que já existe no módulo. As outras três moram
    # aqui porque a forma delas se decide com as tools que ainda não existem
    # (`registrar_teste`, `nascer_card`, `aprovar_leitura`); por ora só
    # precisam produzir estados de mapa para as derivações olharem.
    def _escrever(mapa: dict, card_id: str, slot: str, texto: str) -> dict:
        novo, relato = escrever(mapa, [{"card_id": card_id, "slot": slot, "texto": texto}])
        assert not relato["recusados"], relato
        return novo

    def _registrar(mapa: dict, card_id: str, teste_id: str, veredito: str) -> dict:
        novo = copy.deepcopy(mapa)
        for teste in _card(novo, card_id)["testes"]:
            if teste["id"] == teste_id:
                teste["veredito"] = veredito
        return novo

    def _nascer(mapa: dict, card: dict) -> dict:
        novo = copy.deepcopy(mapa)
        novo["cards"].append(card)
        return novo

    def _aprovar(mapa: dict, leitura_id: str) -> dict:
        novo = copy.deepcopy(mapa)
        novo["leituras"].append({"id": leitura_id, "estado": "aprovada", "nota": ""})
        return novo

    def _satelite(card_id: str, tipo: str, nome: str, ordem: float) -> dict:
        return {"id": card_id, "tipo": tipo, "nome": nome, "ordem": ordem,
                "hipotese": False, "versao": 0, "base_em": [],
                "formula": "", "slots": {}, "testes": []}

    casos = 0

    # ---- 1. Os quatro estados (§2) -----------------------------------------
    vazio = mapa_vazio()
    com_texto = _escrever(vazio, "lacuna-1", "rotina", "passa o dia no computador")
    todos_passam = com_texto
    for tid, *_ in ESQUELETO["lacuna-1"]["testes"]:
        todos_passam = _registrar(todos_passam, "lacuna-1", tid, "passa")
    quase = _registrar(todos_passam, "lacuna-1", "cena-de-abertura", "pendente")
    fantasma = copy.deepcopy(com_texto)
    _card(fantasma, "lacuna-1")["hipotese"] = True
    sem_testes = _satelite("protagonista", "protagonista", "Fernando", 1.5)
    sem_testes["slots"] = {"nome": {"texto": "Fernando", "sonda": ""}}

    estados = [
        ("card recém-nascido, nenhum slot com texto", _card(vazio, "lacuna-1"), "vazio"),
        ("um slot preenchido, testes pendentes", _card(com_texto, "lacuna-1"), "rascunho"),
        ("todos os testes passaram", _card(todos_passam, "lacuna-1"), "firme"),
        ("um teste voltou a pendente", _card(quase, "lacuna-1"), "rascunho"),
        ("hipótese do agente vence até o texto", _card(fantasma, "lacuna-1"), "fantasma"),
        # A trava do "firme por vacuidade": sem tabela de testes não há como
        # ficar firme, nem com todos os slots cheios.
        ("card sem nenhum teste fica em rascunho", sem_testes, "rascunho"),
        ("espaço em branco não conta como texto",
         _card(_escrever(vazio, "lacuna-1", "rotina", "   "), "lacuna-1"), "vazio"),
    ]
    for descricao, card, esperado in estados:
        obtido = estado_do_card(card)
        assert obtido == esperado, f"\n {descricao}\n obtido:   {obtido}\n esperado: {esperado}"
        casos += 1

    # ---- 2. As oito ligações (§14) -----------------------------------------
    # Um mapa que cresce, e o conjunto EXATO de ligações depois de cada passo.
    # Exato, e não "contém", porque aresta a mais é seta desenhada a toa.
    espinha = mapa_vazio()
    sequencia_base = {
        "sequencia__lacuna-1__lacuna-2",
        "motor__lacuna-2__lacuna-3.1",
        "sequencia__lacuna-3.1__lacuna-4",
        "sequencia__lacuna-4__lacuna-5",
        "sequencia__lacuna-5__lacuna-6",
    }

    com_protagonista_escrito = _escrever(espinha, "lacuna-1", "protagonista", "Fernando")
    com_card_protagonista = _nascer(
        com_protagonista_escrito,
        _satelite("protagonista", "protagonista", "Fernando", 1.5),
    )
    com_promessa = _registrar(com_card_protagonista, "lacuna-2", "cena-prometida", "passa")
    com_segundo_elo = _nascer(com_promessa, instanciar("lacuna-3", "lacuna-3.2", 3.2))
    com_rosto = _escrever(com_segundo_elo, "lacuna-3.2", "rosto", "a mãe, na porta da cozinha")
    com_forca = _nascer(
        com_rosto, _satelite("forca_antagonica", "forca_antagonica", "A casa que acolhe", 7.0)
    )
    com_anel = _aprovar(com_forca, "anel")
    com_arco = _nascer(com_anel, _satelite("arco", "arco", "O Arco", 8.0))

    ligacoes_esperadas = [
        ("espinha recém-nascida: sequência, e o motor no lugar do par 2 → 3.1",
         espinha, sequencia_base),
        ("nome escrito, mas o card Protagonista ainda não existe: nada de batismo",
         com_protagonista_escrito, sequencia_base),
        ("card Protagonista criado: batismo",
         com_card_protagonista, sequencia_base | {"batismo__lacuna-1__protagonista"}),
        ("Cena Prometida aprovada: o fantasma aponta pro card 5 (§7)",
         com_promessa, sequencia_base | {"batismo__lacuna-1__protagonista",
                                         "fantasma__lacuna-2__lacuna-5"}),
        ("segundo elo: corrente entre os elos, e a sequência passa a sair do último",
         com_segundo_elo, {"sequencia__lacuna-1__lacuna-2",
                           "motor__lacuna-2__lacuna-3.1",
                           "corrente__lacuna-3.1__lacuna-3.2",
                           "sequencia__lacuna-3.2__lacuna-4",
                           "sequencia__lacuna-4__lacuna-5",
                           "sequencia__lacuna-5__lacuna-6",
                           "batismo__lacuna-1__protagonista",
                           "fantasma__lacuna-2__lacuna-5"}),
        ("rosto colhido, mas sem card de Força Antagônica: nada desenha",
         com_rosto, {"sequencia__lacuna-1__lacuna-2",
                     "motor__lacuna-2__lacuna-3.1",
                     "corrente__lacuna-3.1__lacuna-3.2",
                     "sequencia__lacuna-3.2__lacuna-4",
                     "sequencia__lacuna-4__lacuna-5",
                     "sequencia__lacuna-5__lacuna-6",
                     "batismo__lacuna-1__protagonista",
                     "fantasma__lacuna-2__lacuna-5"}),
        ("Força Antagônica unificada: o rosto do elo 2 liga nela",
         com_forca, {"sequencia__lacuna-1__lacuna-2",
                     "motor__lacuna-2__lacuna-3.1",
                     "corrente__lacuna-3.1__lacuna-3.2",
                     "sequencia__lacuna-3.2__lacuna-4",
                     "sequencia__lacuna-4__lacuna-5",
                     "sequencia__lacuna-5__lacuna-6",
                     "batismo__lacuna-1__protagonista",
                     "fantasma__lacuna-2__lacuna-5",
                     "rosto__lacuna-3.2__forca_antagonica"}),
        ("leitura do anel aprovada: A Escolha morde o começo (§9)",
         com_anel, {"sequencia__lacuna-1__lacuna-2",
                    "motor__lacuna-2__lacuna-3.1",
                    "corrente__lacuna-3.1__lacuna-3.2",
                    "sequencia__lacuna-3.2__lacuna-4",
                    "sequencia__lacuna-4__lacuna-5",
                    "sequencia__lacuna-5__lacuna-6",
                    "batismo__lacuna-1__protagonista",
                    "fantasma__lacuna-2__lacuna-5",
                    "rosto__lacuna-3.2__forca_antagonica",
                    "anel__lacuna-4__lacuna-1"}),
        ("card Arco medido: a costura fecha o anel em dois saltos (§12)",
         com_arco, {"sequencia__lacuna-1__lacuna-2",
                    "motor__lacuna-2__lacuna-3.1",
                    "corrente__lacuna-3.1__lacuna-3.2",
                    "sequencia__lacuna-3.2__lacuna-4",
                    "sequencia__lacuna-4__lacuna-5",
                    "sequencia__lacuna-5__lacuna-6",
                    "batismo__lacuna-1__protagonista",
                    "fantasma__lacuna-2__lacuna-5",
                    "rosto__lacuna-3.2__forca_antagonica",
                    "anel__lacuna-4__lacuna-1",
                    "costura__lacuna-6__arco",
                    "costura__arco__lacuna-1"}),
    ]
    for descricao, mapa, esperado in ligacoes_esperadas:
        obtido = {ligacao["id"] for ligacao in ligacoes(mapa)}
        assert obtido == esperado, (
            f"\n {descricao}\n sobrou:  {sorted(obtido - esperado)}"
            f"\n faltou:  {sorted(esperado - obtido)}"
        )
        casos += 1

    # Os oito tipos do §14 apareceram ao longo da sequência acima. Se um tipo
    # novo entrar na tabela sem teste, esta linha reprova.
    tipos_vistos = {
        ligacao["tipo"]
        for _, mapa, _ in ligacoes_esperadas
        for ligacao in ligacoes(mapa)
    }
    assert tipos_vistos == {"sequencia", "batismo", "motor", "corrente",
                            "fantasma", "rosto", "anel", "costura"}, tipos_vistos
    casos += 1

    # ---- 3. O gatilho de render: mutação → redesenha ou não ------------------
    # Cada linha é (descrição, mapa depois da mutação, deve redesenhar?), sempre
    # comparada com a linha anterior. É o contrato que impede tanto o mapa
    # congelado quanto a chamada de modelo a cada palavra digitada.
    partida = mapa_vazio()
    p1 = _escrever(partida, "lacuna-1", "rotina", "passa o dia no computador")
    p2 = _escrever(p1, "lacuna-1", "rotina", "passa o dia no computador, de fone")
    p3 = _escrever(p2, "lacuna-1", "passado", "o pai foi embora")
    p4 = p3
    for tid, *_ in ESQUELETO["lacuna-1"]["testes"]:
        p4 = _registrar(p4, "lacuna-1", tid, "passa")
    p5 = _nascer(p4, _satelite("protagonista", "protagonista", "Fernando", 1.5))
    p6 = _escrever(p5, "lacuna-1", "protagonista", "Fernando")
    p7 = _registrar(p6, "lacuna-2", "cena-prometida", "nao_passa")
    p8 = _registrar(p7, "lacuna-2", "cena-prometida", "passa")

    gatilhos = [
        ("primeiro texto num card vazio: vazio → rascunho", partida, p1, True),
        ("reescrita do mesmo slot: forma igual, não redesenha", p1, p2, False),
        ("outro slot do mesmo card, já em rascunho: não redesenha", p2, p3, False),
        ("todos os testes passaram: rascunho → firme", p3, p4, True),
        ("card novo no mapa", p4, p5, True),
        ("slot do nome preenchido: nasce a ligação de batismo", p5, p6, True),
        ("teste reprovado não muda estado nem ligação", p6, p7, False),
        ("Cena Prometida aprovada: nasce o fantasma", p7, p8, True),
    ]
    for descricao, antes, depois, deve_redesenhar in gatilhos:
        mudou = assinatura(antes) != assinatura(depois)
        assert mudou == deve_redesenhar, (
            f"\n {descricao}\n redesenhou: {mudou}\n esperado:   {deve_redesenhar}"
        )
        casos += 1

    # Assinatura é estável entre processos (ver a docstring: `hash()` embutido
    # não seria), e não depende da ordem dos cards na lista.
    embaralhado = copy.deepcopy(p8)
    embaralhado["cards"].reverse()
    assert assinatura(p8) == assinatura(embaralhado)
    # Valor gravado noutro processo: é o que prova que a assinatura não
    # depende do PYTHONHASHSEED. Se um dia a espinha mudar de forma (card a
    # mais, ligação nova), esta linha reprova de propósito, e o número novo
    # entra aqui junto da decisão que o mudou.
    assert assinatura(mapa_vazio()) == "c015ee550db5", assinatura(mapa_vazio())
    casos += 2

    # ---- 4. A espinha lida em voz alta (§4.6) -------------------------------
    frase = frase_da_espinha(p6)
    assert "Todo dia o(a) Fernando segue passa o dia no computador, de fone" in frase, frase
    assert "isso porque no PASSADO" not in frase, frase
    # O buraco continua visível: ninguém preencheu o card 5.
    assert "E então ele ACAO" in frase, frase
    # E o slot que mora na lacuna 1 chega na fórmula da lacuna 2 sem cópia.
    assert "e por isso Fernando passou a querer DESEJO" in frase, frase
    # `ROTINA` preenchida não pode comer o miolo de `NOVA_ROTINA` no card 6.
    # Achado numa conversa real, não aqui: o autoteste original só olhava as
    # duas primeiras lacunas.
    assert "todo dia ele NOVA_ROTINA" in frase, frase

    # Cada elo da corrente lê a PRÓPRIA tentativa. Achado ao gerar o mapa da
    # prévia: com dois elos, o segundo saía com o texto do primeiro, e a
    # escalada do §8 sumia da leitura em voz alta.
    corrente = _nascer(p6, instanciar("lacuna-3", "lacuna-3.2", 3.2))
    corrente = _escrever(corrente, "lacuna-3.1", "tentativa", "vender o computador")
    corrente = _escrever(corrente, "lacuna-3.2", "tentativa", "pedir o dinheiro ao tio")
    frase_da_corrente = frase_da_espinha(corrente)
    assert "Ele tenta vender o computador" in frase_da_corrente, frase_da_corrente
    assert "Ele tenta pedir o dinheiro ao tio" in frase_da_corrente, frase_da_corrente
    casos += 6

    # ---- 4b. A forma: todo slot da fórmula sabe como caber nela ------------
    # Trava estrutural: slot novo numa fórmula sem forma correspondente passa a
    # ser erro AQUI, e não seis semanas depois numa leitura em voz alta torta.
    for mid, modelo in ESQUELETO.items():
        na_formula = {s for s in modelo["slots"] if s.upper() in modelo["formula"]}
        formas = set(modelo.get("forma") or {})
        assert na_formula == formas, f"{mid}: fórmula pede {na_formula}, forma tem {formas}"
        # Forma sem slot correspondente seria forma órfã, que nunca chega ao
        # modelo e envelhece sem ninguém notar.
        assert formas <= set(modelo["slots"]), mid
        # Toda forma carrega um exemplo literal: é o que o modelo copia. Regra
        # em prosa escorrega; exemplo entre crases é obedecido.
        for slot, texto in (modelo.get("forma") or {}).items():
            assert "`" in texto, f"{mid}.{slot}: forma sem exemplo literal"

    # A forma é derivada, não guardada: um card nascido ANTES da mudança no
    # método já lê a forma nova. É o oposto da sonda, que congela no nascimento.
    card_velho = instanciar("lacuna-3", "lacuna-3.9", 3.9)
    assert "sonda" in card_velho["slots"]["tentativa"]
    assert "forma" not in card_velho["slots"]["tentativa"]
    assert "infinitivo" in forma_do_slot(card_velho, "tentativa")
    assert forma_do_slot(card_velho, "rosto") == "", "rosto não entra na fórmula"
    assert forma_do_slot({"modelo": "inexistente"}, "x") == ""
    casos += 4

    # A leitura em voz alta com texto na forma pedida: é o caso que a sessão
    # real reprovou ("Ele tenta recorre à justiça", "pagando entregar a
    # credibilidade") e que agora tem que sair inteiro.
    voz = mapa_vazio()
    for card_id, slot, texto in [
        ("lacuna-1", "protagonista", "Marta"),
        ("lacuna-1", "rotina", "abrindo uma banca que ninguém procura"),
        ("lacuna-1", "passado", "o filho sumiu e ela nunca mudou de endereço"),
        ("lacuna-3.1", "tentativa", "rastrear o carimbo do correio"),
        ("lacuna-4", "escolha_a", "fechar a banca e ir atrás"),
        ("lacuna-4", "preco_a", "a única renda que ela tem"),
        ("lacuna-6", "nova_rotina", "carrega a carta fechada no bolso do avental"),
    ]:
        voz = _escrever(voz, card_id, slot, texto)
    lida = frase_da_espinha(voz)
    assert "Marta segue abrindo uma banca" in lida, lida
    assert "no passado o filho sumiu" in lida, lida
    assert "Ele tenta rastrear o carimbo" in lida, lida
    assert "pagando a única renda que ela tem" in lida, lida
    assert "todo dia ele carrega a carta fechada" in lida, lida
    casos += 5

    # ---- 5. A escrita: o que entra, o que é recusado -----------------------
    base = mapa_vazio()

    # O caso que a lista existe para atender: o braindump caindo em vários
    # slots de cards diferentes numa chamada só (§4.3).
    lote, relato = escrever(base, [
        {"card_id": "lacuna-1", "slot": "protagonista", "texto": "Fernando"},
        {"card_id": "lacuna-1", "slot": "rotina", "texto": "passa o dia no computador"},
        {"card_id": "lacuna-2", "slot": "evento", "texto": "a mãe adoece"},
    ])
    assert relato == {"aplicados": ["lacuna-1.protagonista", "lacuna-1.rotina",
                                    "lacuna-2.evento"], "recusados": []}, relato
    assert _card(lote, "lacuna-1")["versao"] == 2, _card(lote, "lacuna-1")["versao"]
    assert estado_do_card(_card(lote, "lacuna-2")) == "rascunho"

    # Chave inventada não entra, e a recusa diz o que existe. Uma recusa no
    # meio do lote não impede as outras escritas: o modelo corrige só a que
    # errou, em vez de repetir o lote inteiro.
    parcial, relato = escrever(base, [
        {"card_id": "lacuna-9", "slot": "seja-o-que-for", "texto": "x"},
        {"card_id": "lacuna-1", "slot": "protagonista", "texto": "Fernando"},
        {"card_id": "lacuna-1", "slot": "want", "texto": "inventado do McKee antigo"},
    ])
    assert relato["aplicados"] == ["lacuna-1.protagonista"], relato
    assert len(relato["recusados"]) == 2, relato
    assert "lacuna-1" in relato["recusados"][0], relato["recusados"][0]
    assert "protagonista, rotina, passado" in relato["recusados"][1], relato["recusados"][1]

    # Lote 100% recusado devolve o mapa original, e a identidade importa: é o
    # que o `mini.py` usa pra decidir não gravar canal nenhum.
    igual, relato = escrever(base, [{"card_id": "nao-existe", "slot": "x", "texto": "y"}])
    assert igual is base and relato["aplicados"] == []

    # Hipótese do agente deixa o card fantasma; o autor confirmando o traz de
    # volta pra rascunho.
    plantado, _ = escrever(base, [
        {"card_id": "lacuna-5", "slot": "acao", "texto": "ele abre o armário sozinho",
         "hipotese": True},
    ])
    assert estado_do_card(_card(plantado, "lacuna-5")) == "fantasma"
    confirmado, _ = escrever(plantado, [
        {"card_id": "lacuna-5", "slot": "acao", "texto": "ele abre o armário sozinho",
         "hipotese": False},
    ])
    assert estado_do_card(_card(confirmado, "lacuna-5")) == "rascunho"

    # O mapa que entrou não foi tocado (referências vindas do checkpoint).
    assert estado_do_card(_card(base, "lacuna-1")) == "vazio"
    assert _card(base, "lacuna-1")["versao"] == 0
    casos += 6

    print(f"{casos} casos ok")
