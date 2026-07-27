# CLAUDE.md — Story Render

## O que é
**Laboratório de Generative UI** construído sobre o Story Render: escritores preenchem um esquema visual de estrutura narrativa (método McKee) com um agente — e o projeto existe pra testar, na prática, os três níveis de Generative UI da taxonomia CopilotKit (2026), em fases:

- **Fase 0 (feita)** — fundação: chat streamando via AG-UI
- **Fase 1 — nível controlled**: roteiro como estado compartilhado agente↔quadro, tools reais, propostas como human-in-the-loop nativo, cartões pré-construídos invocados no chat
- **Fase 2 — nível declarative**: agente compõe o layout do quadro via A2UI/Open-JSON-UI dentro do design system do brief
- **Fase 3 — nível open-ended**: agente gera visualizações HTML/SVG completas (MCP Apps, iframe sandboxed)

O produto de verdade é o `LEARNINGS.md`: registrar onde cada nível acerta e quebra.

### Três trilhos (desde jul/2026)
O teste real do McKee mostrou que **completar o método era difícil** — o agente preenchia fichas em vez de puxar a história pra cima. Daí nasceram outros dois métodos, e os três convivem; a home `/` é a tela de escolha:

- **`/mckee` — trilho McKee (congelado).** Fases 0 a 2.1 feitas, em produção. Não evoluir sem decisão explícita; serve de baseline pra comparar os níveis de GenUI.
- **`/mckee-mini` — trilho McKee Mini (ativo desde 27/07/2026).** Método próprio (`docs/STORY_RENDER_METODO_MCKEE_MINI.md`): uma espinha de 6 lacunas que, lida em voz alta, é uma história inteira, e a régua única "dá pra desenhar?". Salta **direto pro nível open-ended**: o agente compõe o mapa em HTML/CSS e o CopilotKit pinta num iframe sandboxed, no quadro ao lado do chat. O plano de fatias e o critério de comparação declarative × open-ended vivem em `docs/plan.md`.
  **Regra de nome:** trilho `mckee-mini`, agente `mckee_mini` (`mini.py`, endpoint `/agent-mini`), contrato do mapa em `mini_mapa.py`, método em `metodos/mckee_mini.md`.
- **`/mckee-inspired` — trilho McKee Inspired (pausado em 27/07/2026, ex-"O Fio").** Método McKee reformulado como uma escada de 9 degraus conduzida por um tutor socrático. Recomeça do nível 0 da escada: **só texto**, até a instrução estar validada em conversa real. Depois sobe pra (a) canvas/whiteboard com os cartões e (b) open-ended, onde o agente compõe os cartões a partir do contexto e das preferências do autor, sem design system pré-fixado. Rotas: `/mckee-inspired` é a **tela de seleção de sessão** (lida do checkpointer), `/mckee-inspired/<thread_id>` é a conversa — o id na URL é o que faz voltar pra ela de outro aparelho —, e `/mckee-inspired/previa` é o banco de prova de estilo. As rotas `/fio*` antigas redirecionam (307), pra não invalidar link de sessão gravada.
  **Regra de nome:** o que é MÉTODO virou McKee Inspired (rota, `metodos/mckee_inspired.md`, textos); o que é PERSONA continua Tutor (`tutor.py`, agente `tutor_agent`, endpoint `/agent-tutor`, classes `sr-tutor__*`). O trilho congelado continua sendo `mckee`; o novo é `mckee-inspired`.
  **Status:** parou na v3 da instrução (a v4 foi testada e revertida, resultado negativo no `LEARNINGS.md`). Não evoluir sem decisão explícita.

O domínio (campos dos cartões, ordem, modos Condução/Diagnóstico do agente) e a gramática visual continuam decididos nos docs, fonte de verdade antes de qualquer fatia:

- `docs/STORY_RENDER_MVP_MCKEE.md` — campos de cada cartão, modelo de dados, arquitetura do agente e rascunho de instrução
- `docs/STORY_RENDER_METODO_MCKEE_MINI.md` — o método do trilho ativo: espinha, cards, testes, sondas e ligações. As pendências do §19 são decisão do Humberto, não do agente
- `docs/plan.md` — o plano de fatias do McKee Mini (contrato de dados, ordem das fatias, riscos, critério de comparação)
- `docs/STORY_RENDER_BRIEF_PROTOTIPO.md` — gramática visual (cor, tipografia, layout de cartão)
- `docs/STORY_RENDER_BRIEF_JORNADA_ONBOARDING.md` — onboarding (fora de escopo do laboratório por ora)

Se uma fatia exigir uma decisão que nem os docs nem o plano cobrem: **parar e perguntar**, não inventar escopo.

## Stack
- `web/` — Next.js + TypeScript + CopilotKit (`@copilotkit/react-core`, `react-ui`, `runtime`). Route handler `/api/copilotkit` faz ponte AG-UI pro agente Python (`LangGraphHttpAgent`, `ExperimentalEmptyAdapter` — todo LLM roda no agente).
- `agent/` — Python 3.12 via **uv**, LangGraph servido por FastAPI com `ag-ui-langgraph`. **Três agentes no mesmo servidor**: `story_agent` em `/agent` (McKee, com tools e estado compartilhado, em `main.py`), `tutor_agent` em `/agent-tutor` (McKee Inspired, grafo de um nó, sem tools, em `tutor.py`) e `mckee_mini` em `/agent-mini` (McKee Mini, open-ended, em `mini.py`). O grafo PRECISA de checkpointer (o adaptador AG-UI consulta estado a cada run). LLM via OpenRouter (`OPENROUTER_API_KEY`/`OPENROUTER_MODEL` em `agent/.env`) — troca de modelo por env var.
- `agent/metodos/*.md` — as instruções dos agentes (`mckee_inspired.md`, `mckee_mini.md`), **lidas do disco a cada turno**: editar o arquivo e mandar a próxima mensagem já testa a versão nova, sem restart. É o ciclo de validação do prompt; um cabeçalho editorial fechado por linha `---` fica fora do system prompt. O `Dockerfile` copia `metodos/` explicitamente — sem essa linha o container sobe e quebra em TODO turno, calado.
- `agent/mini_mapa.py` — o contrato do mapa do Mini: schema + derivações puras (estado do card, as 8 ligações, assinatura). **Guardar fato, derivar forma:** o canal `mapa` só guarda o que autor e agente produzem; o resto é função pura, testável sem LLM (`uv run python mini_mapa.py`).
- **`openGenerativeUI` é flag GLOBAL do runtime CopilotKit**, sem quebra por agente. Por isso o Mini tem route handler próprio (`web/src/app/api/copilotkit-mini/route.ts`): ligá-lo no compartilhado daria a tool de desenhar também ao `story_agent` congelado, que binda cegamente o que chega em `state["tools"]`.
- **A instrução ensina pelo próprio estilo.** O modelo imita o texto que o instrui: proibir travessão num prompt cheio de travessão não funciona. A v2 é escrita sem nenhum no corpo, e a seção "Como você escreve" carrega as regras de forma (termo do método entre crases e em caixa alta, explicação entre parênteses na primeira aparição, teste em bloco `>` com formato fixo, vícios proibidos). O CSS transforma a crase em termo colorido/sublinhado (`tutor.css`), então a marcação é decisão de CSS, não de prompt; e o bloco `>` é EXCLUSIVO de teste, senão o sinal se dilui.
- **CSS do chat: nunca solte uma regra sem camada.** O CSS do chat v2 do CopilotKit vive inteiro em `@layer`, e regra SEM camada vence qualquer `@layer` por mais específica que a outra seja. Um `* { margin: 0; padding: 0 }` solto no `globals.css` matou por meses todo o espaçamento interno do chat (coluna sem centralizar, parágrafos colados, campo sem padding). O reset agora mora em `@layer base`; ao estilizar o chat, prefira redeclarar o token (`--muted`, `--primary`, `--border`) a sobrescrever a utilitária. `/mckee-inspired/previa` renderiza o chat com um turno fixo pra medir isso sem gastar turno de LLM.
- **Thread do chat: quem manda é a configuração, não a prop.** O `<CopilotKit>` já monta um `CopilotChatConfigurationProvider` com uma thread SORTEADA, e ela vence qualquer `threadId` passado por prop numa config aninhada — a tela mostra a sessão certa e a conversa é gravada na thread errada, calada. Pra apontar o chat pra uma thread existente use `useCopilotChatConfiguration()?.setActiveThreadId(id, { explicit: false })`; o `explicit: false` preserva a tela de abertura e evita o `connect` (que neste modo SSE só repete o que está na memória do processo do Next, não o que está no Postgres). Quem reidrata o histórico do banco é `web/src/app/mckee-inspired/conversa.tsx`, com os ids do checkpointer — id nosso duplicaria a conversa no merge do adaptador.
- `agent/sessoes.py` — leitura do acervo (`GET /sessoes`, `GET /sessoes/{id}`), compartilhada com o `exportar_sessao.py` (`uv run python exportar_sessao.py [thread_id]`, Markdown em `agent/sessoes/`).
- `frontend/` e `backend/` — **legado** (MVP pré-pivô, React+Vite / Express). Referência de domínio pra portar (`backend/src/roteiro.ts`, `backend/src/agente/prompt.ts`, cartões e CSS de `frontend/src/quadro/`); não evoluir. Arquivar após paridade da Fase 1.
- Postgres (Docker Compose) — entra na fatia de persistência da Fase 1.

```
# Agente (em agent/)
Dev:    uv run uvicorn main:app --port 8000
Health: curl localhost:8000/health     # reporta checkpointer, métodos legíveis e modelo
Testes: uv run python mini_mapa.py     # contrato do mapa (sem LLM)
        uv run python forma.py         # normalizador de forma
        uv run python instrucao.py     # montagem do prompt do Tutor

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
- Não implementar um nível de GenUI antes do anterior estar de pé (ordem: Fase 1 → 2 → 3; o plano diz o que entra em cada uma). **Exceção deliberada e registrada:** o trilho McKee Mini começa direto no open-ended, porque as fases 1 e 2 já estão de pé e congeladas no `/mckee`, que é o baseline da comparação. A exceção vale só para ele, e o motivo está no `docs/plan.md`
- Não evoluir `/mckee` nem `/mckee-inspired` sem decisão explícita — os dois são baseline; toda fatia que toca `main.py` ou `sessoes.py` testa `/agent-tutor` também
- Não evoluir `frontend/`/`backend/` legados — só portar deles
- Não construir onboarding nem deploy sem perguntar antes
- Não marcar fatia como pronta só porque compilou ou rodou uma vez sem erro
