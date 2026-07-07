# CLAUDE.md — Story Render

## O que é
Produto onde escritores escolhem um método de estrutura narrativa (MVP: só McKee) e recebem um esquema visual — espinha macro + cartões de profundidade — com um agente ajudando a preencher via chat ou edição direta.

Fase atual: MVP, ainda sem código. Este arquivo governa **processo** (como construir). Não duplica **conteúdo/UX** — isso já está decidido nestes três documentos, que são fonte de verdade e devem ser lidos antes de qualquer fatia:

- `STORY_RENDER_MVP_MCKEE.md` — escopo P0/P1/P2, campos de cada cartão, ordem de preenchimento, mapa de conexões, modelo de dados, arquitetura de agentes (agente único, modos Condução/Diagnóstico) e o rascunho de instrução do agente
- `STORY_RENDER_BRIEF_PROTOTIPO.md` — gramática visual já validada (cor, tipografia, layout de cartão)
- `STORY_RENDER_BRIEF_JORNADA_ONBOARDING.md` — fluxo de onboarding já validado (Fase A/B, revelação ao vivo)

Se uma fatia exigir uma decisão que nenhum desses três cobre: **parar e perguntar**, não inventar escopo.

## Stack
Ainda não confirmado — decidir na primeira fatia (setup) e preencher esta seção com os comandos reais. Ponto de partida provável, dado o padrão dos seus outros projetos: frontend React (o tldraw cogitado como motor de canvas é biblioteca React), backend Python ou Node, Docker, deploy em Fly.io.

```
Build:  [preencher]
Test:   [preencher]
Lint:   [preencher]
```

## Regra central: fatias pequenas
Uma fatia é **um** componente, **um** endpoint, **um** campo de cartão — nunca "o esquema inteiro" ou "o cartão inteiro". O MVP já é complexo o suficiente pra não sobreviver a fatias grandes.

Antes de codar qualquer fatia: escrever 2-3 frases dizendo o que entra nela e o que fica de fora. Isso vem antes do código, não depois.

## Loop obrigatório, por fatia
1. **Escopo** — 2-3 frases, escritas antes de codar
2. **Implementar** — só o que o escopo diz
3. **Testar** — nenhuma fatia é "pronta" sem prova de que funciona. Unitário quando fizer sentido; smoke test manual documentado quando não. "Compilou" não é "testado"
4. **Documentar** — comentário onde a lógica não for óbvia + entrada no `LEARNINGS.md` (o que foi construído, por quê, o que ficou pra depois)
5. **Commit pequeno** — 1 fatia, 1 commit, mensagem que descreve o quê e o porquê

## Cadência periódica — não a cada fatia, ao fim de cada Fase (A/B/C/D) ou cartão completo

**a) Review de código**
- A fatia faz exatamente o que o escopo dizia — nem mais, nem menos?
- As regras do bloco de instrução do agente (`STORY_RENDER_MVP_MCKEE.md`, seção 7) estão implementadas de fato, ou só documentadas?
- Os caminhos de erro óbvios têm tratamento?

**b) Simplificação**
- Lógica duplicada entre cartões que devia virar uma função/componente único?
- Alguma abstração criada "pra usar depois" que ninguém usa ainda? Remover.
- Algo de P1/P2 (MVP doc, seção 1) entrou de penetra numa fatia que devia ser só P0? Tirar.
- Arquivo ou função grande demais pra entender de uma vez? Quebrar.

Registrar o resultado das duas — mesmo "nada a simplificar" — como entrada no `LEARNINGS.md`.

## Memória
- Este arquivo é lido no início de cada sessão: mantém estável, muda pouco, nunca vira plano de execução (isso é papel do MVP doc).
- `LEARNINGS.md` é o log deliberado — decisões e gotchas que você quer poder reler depois. Atualiza a cada fatia.
- A partir do Claude Code v2.1.59, existe memória automática (liga por padrão) — Claude guarda sozinho o que aprende no caminho. Não substitui o `LEARNINGS.md`, complementa: automática é o que o agente achou relevante lembrar, `LEARNINGS.md` é o que você decidiu que precisa ficar visível.

## Não fazer
- Não implementar Fase C ou D antes da Fase B estar de pé (ordem em `STORY_RENDER_MVP_MCKEE.md`, seção 4)
- Não construir nada marcado P2 sem perguntar antes
- Não marcar fatia como pronta só porque compilou ou rodou uma vez sem erro
