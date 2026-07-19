"""Schema e mutações do roteiro McKee — porte de backend/src/roteiro.ts (legado)."""


def calcular_ordem_para_posicao(visiveis: list[dict], posicao: int | None, maior_ordem: float) -> float:
    """Encaixa uma complicação na posição de exibição `posicao` (1-based) com
    `ordem` fracionária — insere entre as vizinhas sem renumerar ninguém.
    Omitida ou além do fim, vai pro final."""
    if posicao is None or posicao > len(visiveis):
        return maior_ordem + 1
    alvo = max(1, posicao)
    anterior = visiveis[alvo - 2] if alvo >= 2 else None
    seguinte = visiveis[alvo - 1] if alvo - 1 < len(visiveis) else None
    ordem_anterior = (anterior or {}).get("ordem", 0) or 0
    ordem_seguinte = seguinte.get("ordem", ordem_anterior + 2) if seguinte else ordem_anterior + 2
    return (ordem_anterior + ordem_seguinte) / 2


def adicionar_complicacao(data: dict, conteudo: str, posicao: int | None = None) -> dict:
    """Como no legado, o nó novo vai sempre pro FIM do array `espinha` (o
    índice real nunca muda); a posição de exibição é só o campo `ordem`.
    Diferença deliberada do laboratório: recebe `conteudo` direto (no legado
    a ação criava vazio e o conteúdo vinha por proposta)."""
    todas = [no for no in data["espinha"] if no["tipo"] == "complicacao"]
    proximo_id = len(todas) + 1
    visiveis = sorted(
        (no for no in todas if not no.get("excluido")),
        key=lambda no: no.get("ordem", 0) or 0,
    )
    maior_ordem = max((no.get("ordem", 0) or 0 for no in todas), default=0)
    ordem = calcular_ordem_para_posicao(visiveis, posicao, maior_ordem)
    novo = {
        "id": f"complicacao_{proximo_id}",
        "tipo": "complicacao",
        "ordem": ordem,
        "conteudo": conteudo,
        "status": "rascunho",
        "conecta_assets": ["antagonista", "protagonista"],
    }
    # Cópia rasa basta: só o array espinha muda (append); os nós existentes
    # e os assets não são mutados — não precisa de deepcopy do roteiro todo.
    return {**data, "espinha": [*data["espinha"], novo]}


# Espelho da config de cartões do frontend (web/src/lib/cartoes.ts) — os
# campos de texto que o agente enxerga e pode propor via propor_campo.
CAMPOS_CARTOES: dict[str, list[str]] = {
    "protagonistas": ["want", "need", "aposta"],
    "antagonista": ["fonte_oposicao", "logica_interna", "avatar", "poder_relativo"],
    "ideia_controladora": ["valor", "causa", "contraideia"],
    "mundo": ["epoca", "local", "regras_custo"],
    "genero": ["promessa"],
}


def _asset(data: dict, asset: str) -> dict:
    # Defensivo: o roteiro pode vir do estado enviado pelo CLIENTE a cada
    # turno — uma forma malformada não pode derrubar o run inteiro.
    alvo = (data.get("assets") or {}).get(asset)
    if asset == "protagonistas":
        alvo = alvo[0] if alvo else None
    return alvo if isinstance(alvo, dict) else {}


def resumo_assets(data: dict) -> str:
    linhas = []
    for asset, campos in CAMPOS_CARTOES.items():
        alvo = _asset(data, asset)
        linhas.append(f"[{asset}] (status: {alvo.get('status', '?')})")
        linhas.extend(f"- {c}: {alvo.get(c) or '(vazio)'}" for c in campos)
    return "\n".join(linhas)


def resumo_espinha(data: dict) -> str:
    """Resumo compacto da espinha em ordem de exibição, com as posições
    1-based das complicações — é o que o modelo usa pra escolher `posicao`."""
    def chave(no: dict) -> float:
        if no["tipo"] == "complicacao":
            return 1 + (no.get("ordem", 0) or 0) / 1000
        return {"incidente_incitante": 0, "crise": 2, "climax": 3, "resolucao": 4}.get(no["id"], 99)

    visiveis = sorted(
        (no for no in data.get("espinha") or [] if not no.get("excluido")),
        key=chave,
    )
    linhas = []
    pos_complicacao = 0
    for no in visiveis:
        if no["tipo"] == "complicacao":
            pos_complicacao += 1
            rotulo = f"Complicação (posição {pos_complicacao}, id {no['id']})"
        else:
            rotulo = no["id"]
        conteudo = no.get("conteudo") or "(vazio)"
        linhas.append(f"- {rotulo}: {conteudo}")
    return "\n".join(linhas)


def espinha_vazia() -> list[dict]:
    return [
        {"id": "incidente_incitante", "tipo": "no_fixo", "conteudo": "", "status": "vazio", "conecta_assets": ["protagonista", "mundo"]},
        {"id": "complicacao_1", "tipo": "complicacao", "ordem": 1, "conteudo": "", "status": "vazio", "conecta_assets": ["antagonista", "protagonista"]},
        {"id": "crise", "tipo": "no_fixo", "conteudo": "", "status": "vazio", "conecta_assets": ["protagonista"]},
        {"id": "climax", "tipo": "no_fixo", "conteudo": "", "status": "vazio", "conecta_assets": ["protagonista", "ideia_controladora"]},
        {"id": "resolucao", "tipo": "no_fixo", "conteudo": "", "status": "vazio", "conecta_assets": []},
    ]


def roteiro_mckee_vazio() -> dict:
    return {
        "template": "mckee",
        "titulo": "",
        "fase_atual": "A",
        "espinha": espinha_vazia(),
        "assets": {
            "protagonistas": [
                {
                    "id": "prot_1",
                    "want": "",
                    "need": "",
                    "aposta": "",
                    "caracterizacao": "",
                    "carater_verdadeiro": "",
                    "arco": "",
                    "pov": "",
                    "status": "vazio",
                }
            ],
            "antagonista": {
                "niveis": [],
                "fonte_oposicao": "",
                "logica_interna": "",
                "avatar": "",
                "poder_relativo": "",
                "pontos_contato": [],
                "status": "vazio",
            },
            "ideia_controladora": {"valor": "", "causa": "", "contraideia": "", "status": "vazio"},
            "mundo": {"epoca": "", "local": "", "regras_custo": "", "status": "vazio"},
            "genero": {"generos": [], "promessa": "", "status": "vazio"},
            "elenco_notas": {"texto_livre": ""},
        },
    }
