# CLAUDE.md — Story Render

## O que é
**Laboratório de Generative UI** construído sobre o Story Render: escritores preenchem um esquema visual de estrutura narrativa (método McKee) com um agente — e o projeto existe pra testar, na prática, os três níveis de Generative UI da taxonomia CopilotKit (2026), em fases:

- **Fase 0 (feita)** — fundação: chat streamando via AG-UI
- **Fase 1 — nível controlled**: roteiro como estado compartilhado agente↔quadro, tools reais, propostas como human-in-the-loop nativo, cartões pré-construídos invocados no chat
- **Fase 2 — nível declarative**: agente compõe o layout do quadro via A2UI/Open-JSON-UI dentro do design system do brief
- **Fase 3 — nível open-ended**: agente gera visualizações HTML/SVG completas (MCP Apps, iframe sandboxed)

O produto de verdade é o `LEARNINGS.md`: registrar onde cada nível acerta e quebra. Plano completo em `.claude/plans/synthetic-juggling-hamster.md`.

O domínio (campos dos cartões, ordem, modos Condução/Diagnóstico do agente) e a gramática visual continuam decididos nos docs, fonte de verdade antes de qualquer fatia:

- `docs/STORY_RENDER_MVP_MCKEE.md` — campos de cada cartão, modelo de dados, arquitetura do agente e rascunho de instrução
- `docs/STORY_RENDER_BRIEF_PROTOTIPO.md` — gramática visual (cor, tipografia, layout de cartão)
- `docs/STORY_RENDER_BRIEF_JORNADA_ONBOARDING.md` — onboarding (fora de escopo do laboratório por ora)

Se uma fatia exigir uma decisão que nem os docs nem o plano cobrem: **parar e perguntar**, não inventar escopo.

## Stack
- `web/` — Next.js + TypeScript + CopilotKit (`@copilotkit/react-core`, `react-ui`, `runtime`). Route handler `/api/copilotkit` faz ponte AG-UI pro agente Python (`LangGraphHttpAgent`, `ExperimentalEmptyAdapter` — todo LLM roda no agente).
- `agent/` — Python 3.12 via **uv**, LangGraph servido por FastAPI com `ag-ui-langgraph` (rota `/agent`). O grafo PRECISA de checkpointer (o adaptador AG-UI consulta estado a cada run). LLM via OpenRouter (`OPENROUTER_API_KEY`/`OPENROUTER_MODEL` em `agent/.env`) — troca de modelo por env var.
- `frontend/` e `backend/` — **legado** (MVP pré-pivô, React+Vite / Express). Referência de domínio pra portar (`backend/src/roteiro.ts`, `backend/src/agente/prompt.ts`, cartões e CSS de `frontend/src/quadro/`); não evoluir. Arquivar após paridade da Fase 1.
- Postgres (Docker Compose) — entra na fatia de persistência da Fase 1.

```
# Agente (em agent/)
Dev:    uv run uvicorn main:app --port 8000
Health: curl localhost:8000/health

# Web (em web/)
Dev:    npm run dev         # next, porta 3000
Build:  npm run build
Lint:   npm run lint
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

## Cadência periódica — não a cada fatia, ao fim de cada Fase (0–3) ou cartão completo

**a) Review de código**
- A fatia faz exatamente o que o escopo dizia — nem mais, nem menos?
- As regras do bloco de instrução do agente (`docs/STORY_RENDER_MVP_MCKEE.md`, seção 7) estão implementadas de fato, ou só documentadas?
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
- Não implementar um nível de GenUI antes do anterior estar de pé (ordem: Fase 1 → 2 → 3; o plano diz o que entra em cada uma)
- Não evoluir `frontend/`/`backend/` legados — só portar deles
- Não construir onboarding nem deploy sem perguntar antes
- Não marcar fatia como pronta só porque compilou ou rodou uma vez sem erro
