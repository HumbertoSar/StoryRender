"""Schema do roteiro McKee — porte de backend/src/roteiro.ts (legado).

Só a forma vazia por enquanto; as mutações (applyUpdates, complicações)
entram nas fatias de tools da Fase 1.
"""


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
