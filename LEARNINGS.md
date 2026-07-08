# LEARNINGS — Story Render

## Fatia: Setup do projeto (monorepo, stack, Postgres)

**O que foi construído:** monorepo com `frontend/` (React + Vite + TS) e `backend/` (Node + Express + TS), `docker-compose.yml` pra Postgres local, `/health` no backend que checa a conexão com o banco sem derrubar o servidor se ela falhar.

**Por quê:** stack estava em aberto no `CLAUDE.md`; decisão tomada com o usuário — canvas custom (CSS/SVG) em vez de tldraw (o layout do brief é restrito o bastante, e evita adaptar o modelo de dados pro formato de "shapes" do tldraw), Node+Postgres no backend (mesma linguagem do frontend, `jsonb` encaixa direto no modelo de dados da seção 6 do MVP doc), agente via Claude API integrado desde já (não mockado).

**O que ficou pra depois:**
- Nenhuma tabela criada ainda — schema do roteiro (seção 6 do MVP doc) entra na próxima fatia.
- Nenhuma tela real — só o boilerplate padrão do Vite.
- Integração com a Claude API ainda não existe (nenhum endpoint chama o agente).
- Deploy (Fly.io, cogitado no CLAUDE.md) não foi montado — só dev local.

**Gotcha:** o `vitest` por padrão também roda `.test.js` compilado dentro de `dist/`, duplicando a suíte — precisa excluir `dist/**` explicitamente no `vitest.config.ts` (e no `eslint.config.js`).

**Smoke test manual:** `npm run build` + `npm run test` + `npm run lint` passando em `backend/` e `frontend/`; backend rodando standalone responde `/health` com `{"status":"degraded","db":"unreachable"}` quando o Postgres não está no ar (comportamento esperado, não crasha). Docker não está disponível neste ambiente de sessão — `docker compose up -d` não foi testado aqui, só a config revisada manualmente; validar num ambiente com Docker antes de seguir pra fatia do schema.

## Fatia: Persistência do roteiro (tabela + POST/GET)

**O que foi construído:** migration `001_roteiros.sql` (tabela `roteiros`: `id uuid`, `data jsonb`, timestamps), runner de migration (`npm run migrate`), o esquema McKee vazio (seção 6 do MVP doc, todos os campos `status: vazio`) em `src/roteiro.ts`, e `POST /roteiros` (cria) + `GET /roteiros/:id` (lê, 404 se não existe, 400 se id não é uuid).

**Por quê:** é o requisito P0 "persistência do esquema (fechar e voltar sem perder nada)" da seção 1 do MVP doc — sem isso nenhuma fatia de UI tem onde guardar estado. Escopo deliberadamente mínimo: sem PATCH/edição de campo ainda (isso é a próxima fatia, quando a UI de cartões existir de verdade).

**O que ficou pra depois:**
- Edição de campos/cartões (PATCH), que é o que realmente torna o esquema "editável" — ainda não existe.
- Nenhuma UI consome esses endpoints ainda.
- Nenhuma autenticação/dono do roteiro — qualquer um com o id lê/cria. Aceitável pro MVP de um usuário só; revisitar se virar multi-usuário.

**Gotcha:** Docker segue indisponível nesta sessão sandboxed (sem daemon), mas havia PostgreSQL 16 instalado nativamente no container — usei `service postgresql start` + `CREATE USER/DATABASE storyrender` pra testar de ponta a ponta de verdade (migration real, POST/GET reais, não só revisão de código). Os testes de integração (`roteiros.test.ts`) usam `describe.skipIf(!process.env.DATABASE_URL)` pra não quebrar CI/dev sem Postgres disponível, mas rodam de verdade quando ele existe — confirmado localmente (4/4 passando com `DATABASE_URL` setado).

**Smoke test:** `npm run migrate` aplicou a tabela num Postgres real; `POST /roteiros` → 201 com o esquema vazio completo; `GET /roteiros/:id` → 200 com os mesmos dados; `GET` de id inexistente → 404; suíte de testes com banco real: 4/4 passando.

## Fatia: Fluxo de Onboarding (Fase A + B) — design importado do Claude Design

**O que foi construído:** o usuário trouxe 4 arquivos `.dc.html` exportados do Claude Design (`Story_Render_Onboarding`, `Story_Render_Wireframes`, `Story_Render_Proto_tipo`, `Canvas` vazio) — o `DesignSync` MCP e o `WebFetch` não conseguiram acessar o projeto direto (exigem login que não existe nesta sessão remota), então o usuário anexou os arquivos manualmente. Implementei o onboarding (`frontend/src/onboarding/`): `EspinhaRail` (5 nós com estados vazio/rascunho/esboço/testado/validado), `ProtagonistaCard` (want + campos vazios + chips de conexão), `ChatPanel` (mensagens, chips de gênero, chip "ainda não sei", composer, link "pular pro modo livre", beat de transição com 2 botões) e `OnboardingFlow` orquestrando as 6 perguntas roteirizadas da Fase A/B exatamente como no `.dc.html`.

**Por quê:** o próprio brief de onboarding (`docs/STORY_RENDER_BRIEF_JORNADA_ONBOARDING.md`) é explícito — isso testa SEQUÊNCIA e RITMO, não lógica de agente real. Por isso o "agente" aqui é scripted (perguntas fixas + reconhecimento de texto), não chama a Claude API ainda. Paleta/tipografia replicadas fielmente (`theme.css`): `#4A4038` quadro, `#F0E9D8` papel, `#7A2E2E` accent vinho, `#9C7A3C` latão, Alegreya/Source Sans 3/JetBrains Mono.

**O que ficou pra depois:**
- Persistência real: a Fase A/B ainda roda só em estado local do React — não chama `POST /roteiros` nem qualquer PATCH (não existe endpoint de edição de campo ainda). Fica pra próxima fatia.
- Fase C (aprofundamento) e "modo livre" (editar direto no quadro): só placeholders de texto, sem tela real.
- Nós "Complicações progressivas" e "Resolução" ficam sempre vazios no onboarding — correto, é o que o brief pede (só entram na Fase C/D).
- Agente real via Claude API (decisão tomada antes desta fatia) ainda não foi ligado a nenhuma tela.

**Gotcha:** o painel de chat crescia além da viewport e a página inteira rolava em vez do painel — `.sr-onboarding` tinha só `min-height:100vh` em vez de `height:100vh` + `overflow:hidden`, então o flex nunca ficava contido e o scroll interno do chat (`overflow-y:auto`) não tinha efeito. Trocar pra `height:100vh` no container raiz resolveu; sem isso o beat de transição final (com os 2 botões) ficava invisível fora da tela.

**Smoke test:** rodei o fluxo de ponta a ponta com Playwright (headless Chromium já pré-instalado no ambiente) — as 6 perguntas, incluindo o chip de gênero e o "ainda não sei" virando "a definir", terminando no beat de transição com os 2 botões funcionando (clique em "Continuar com o agente" leva ao placeholder de Fase C). Screenshots conferidos visualmente, batem com o `.dc.html` original. `npm run build` e `npx oxlint` limpos.

## Fatia: Persistência real do onboarding (PATCH + wiring)

**O que foi construído:** `PATCH /roteiros/:id` no backend — aceita `{ updates: [{ path, value }] }` e aplica edições por path num clone imutável do `data` (`applyUpdates` em `roteiro.ts`), sem precisar de um endpoint por campo. Adicionei `titulo` ao esquema McKee vazio (campo que faltava — a Fase A usa a semente como "título provisório do quadro", mas a seção 6 do MVP doc não previa esse campo). CORS liberado pro `FRONTEND_ORIGIN` (dev: `localhost:5173`), já que backend e frontend rodam em portas diferentes. No frontend, `api.ts` (fetch simples pro backend) e `OnboardingFlow` agora cria o roteiro de verdade no mount (`POST /roteiros`) e persiste cada resposta via `PATCH` (fire-and-forget — o estado local do React continua sendo a fonte de verdade pra UI imediata).

**Por quê:** era o item que tinha ficado pendente da fatia anterior — sem isso o onboarding "esquece" tudo ao recarregar, violando o P0 "persistência do esquema" do MVP doc.

**O que ficou pra depois:**
- Nenhuma tela ainda lê o roteiro de volta (GET) pra retomar uma sessão — se o usuário recarrega no meio do onboarding, perde o estado local (mesmo com os dados salvos no banco). Isso é a próxima fatia óbvia: carregar por `id` na URL.
- Falha de rede no PATCH só loga no console — não há retry nem aviso visual pro usuário. Aceitável pro MVP local de um usuário só; revisitar se virar multi-dispositivo.
- Fase C, "modo livre" e agente real (Claude API) continuam sem tela.

**Gotcha:** o React StrictMode (dev) dobra o efeito de criação do roteiro (`POST /roteiros` disparado 2x), deixando uma linha órfã no banco a cada carregamento em dev — comportamento só de desenvolvimento (StrictMode não roda em produção), mas corrigi com um cleanup (`cancelado` flag) garantindo que o `ref` sempre aponte pro roteiro correto mesmo com o double-invoke.

**Smoke test:** subi backend real (Postgres) + frontend juntos, rodei o onboarding completo via Playwright capturando as requisições de rede (confirmei `POST` seguido de 5 `PATCH`), e consultei o Postgres direto via `psql` — todos os campos batendo: título, gêneros, want, incidente, crise (`a definir`), clímax, e `fase_atual` virando `"B"`. `npm run build`/`oxlint` (frontend) e `tsc`/`vitest` (7/7)/`eslint` (backend) limpos.

## Fatia: Retomar roteiro por id (recarregar não perde o progresso)

**O que foi construído:** `GET /roteiros/:id` (já existia) agora é usado de verdade pelo frontend. Ao criar um roteiro, `OnboardingFlow` atualiza a URL pra `/r/<id>` via `history.replaceState` (sem navegação de página). `App.tsx` lê `/r/:id` da URL no mount; se presente, busca o roteiro via `GET` em vez de criar um novo, e `estadoDoRoteiro()` deriva o passo do onboarding (0 a 6) a partir de quais campos já estão preenchidos no `data` — sem precisar guardar o passo explicitamente no banco.

**Por quê:** era o buraco mais óbvio da fatia anterior — sem isso, um F5 no meio do onboarding perdia a UI mesmo com os dados salvos no Postgres, quebrando o P0 "persistência do esquema (fechar e voltar sem perder nada)".

**O que ficou pra depois:**
- O histórico de chat não é reconstruído fielmente — ao retomar, mostra só "Bem-vindo de volta" + a pergunta atual, não a conversa inteira. Aceitável: o objetivo é não perder o *esquema*, não replays de conversa.
- Sem router de verdade (react-router) — parsing manual de `/r/:id` via regex no `App.tsx`. Suficiente pra 1 rota; se aparecer uma segunda rota real (Fase C, por exemplo), vale revisitar.
- Erro de "roteiro não encontrado" (id inválido/apagado) mostra uma tela mínima com link pra recomeçar — sem redirecionamento automático.

**Smoke test:** subi backend+frontend reais, respondi 3 das 6 perguntas via Playwright, conferi que a URL virou `/r/<uuid>`, dei `page.reload()` de verdade (recarregamento completo, não SPA navigation) e confirmei visualmente (screenshot) que o quadro retomou exatamente no estado esperado — título, gênero e cartão de Protagonista intactos, chat abrindo na pergunta 4 com "Bem-vindo de volta".

## Fatia: Quadro livre da Fase C (cartões + espinha editáveis)

**O que foi construído:** `frontend/src/quadro/` — `Quadro.tsx` (orquestrador), 3 cartões completos (`ProtagonistaCardCompleto`, `AntagonistaCard`, `IdeiaControladoraCard`) e `EspinhaColuna` (espinha inteira editável, não só leitura como no onboarding). Campos reutilizáveis em `campos.tsx`: `EditableField` (textarea que salva no blur só se mudou), `StatusSelect` (dropdown vazio/rascunho/testado/validado), `ChipsField` (multi-seleção, usado nos níveis da oposição do Antagonista). Extraí os estilos compartilhados entre onboarding e quadro pra `shared.css` (cartão, campo, badge, chip, espinha, topbar) pra não duplicar CSS entre as duas telas.

Wiring: os botões "Continuar com o agente — Fase C" e "Editar direto no quadro" do beat de transição do onboarding agora levam ao quadro de verdade (antes eram placeholders de texto). Ambos convergem pro mesmo `Quadro` por enquanto — não há diferença de comportamento entre "Fase C" e "modo livre" ainda, porque nenhum dos dois tem agente real. Ao entrar no quadro, `fase_atual` é promovido de `"B"` pra `"C"` via PATCH. Se o usuário recarrega a página com `fase_atual` já em C/D, `App.tsx` pula o onboarding e vai direto pro quadro.

**Por quê:** era o escopo combinado com o usuário pra essa fatia — validar a UI de edição direta (P0 "Edição direta no cartão, sem passar pelo chat") antes de meter agente real (Condução via Claude API) por cima, que é conceitualmente mais arriscado e merece fatia própria.

**O que ficou pra depois:**
- Nenhum agente real ainda — painel lateral é um placeholder estático avisando que Condução/Diagnóstico chegam depois.
- Complicações Progressivas continuam fixas em 1 (`complicacao_1`) — o padrão de nó repetível (slot "+ complicação", excluir/reordenar) documentado no `docs/design/Story_Render_Onboarding.dc.html` (seção "Comportamento do nó repetível") não foi implementado; é uma fatia própria.
- Mundo da História e Gênero & Promessa (Fase D) continuam de fora, corretamente — `CLAUDE.md` proíbe construir Fase D antes de D estar na ordem certa.
- Sem validação de conteúdo (ex: "Aposta" vaga como "tudo"/"muito") — isso é regra do agente (seção 7 do MVP doc), não existe sem agente real.

**Smoke test:** onboarding completo → "Editar direto no quadro" → quadro real com os 3 cartões e a espinha (5 nós + complicação 1) todos com os dados da Fase A/B carregados corretamente. Editei Need do Protagonista e Valor da Ideia Controladora direto no cartão (sem chat) e confirmei via `psql` que persistiu no Postgres, incluindo `fase_atual` virando `"C"`. `npm run build`/`oxlint` limpos (nenhum warning).

## Fatia: Agente Condução via OpenRouter (só conversa, sem sugestões estruturadas)

**O que foi construído:** `backend/src/agente/openrouter.ts` (cliente HTTP fino pro `openrouter.ai/api/v1/chat/completions`, sem SDK) e `backend/src/agente/prompt.ts` (persona + regras não-negociáveis, copiadas do rascunho de instrução da seção 7 do MVP doc, com uma regra 7 nova/temporária: "você ainda não pode escrever direto nos campos"). Endpoint `POST /roteiros/:id/mensagens` injeta o esquema completo (`data` inteiro) como system prompt a cada chamada — mesmo princípio da decisão "agente único, dois modos" da seção 7 (nunca perde contexto cruzado entre cartões). Modelo default `anthropic/claude-sonnet-4.5` (mesmo modelo seria usado no Diagnóstico também, quando existir, pra não reintroduzir o problema de inconsistência de voz que o doc explicitamente quer evitar). No frontend, `AgenteChat` substitui o placeholder do Quadro por um chat de verdade.

**Por quê:** era o item que faltava pra fechar a arquitetura de agente decidida ainda no início do projeto (seção 7 do MVP doc) — sem isso, "Condução" era só um nome numa caixa de texto estática.

**O que ficou pra depois:**
- Sugestões estruturadas de campo (o "ghost text" pendente até confirmação — P0 do brief de prototipagem, "o padrão de interação mais importante do produto inteiro") não existem ainda. Por enquanto o agente só conversa em texto; se quiser propor um valor, escreve em prosa e pede pro usuário colar no cartão manualmente. Isso é uma fatia própria, exige um formato de saída estruturado (JSON com propostas) e UI de aceitar/rejeitar no cartão.
- Modo Diagnóstico (revisão sob demanda, lista de inconsistências) não existe — é outra fatia, provavelmente reaproveitando o mesmo `chamarAgente` com um prompt/formato de saída diferente.
- Sem retry ou rate-limit tratado nas chamadas ao OpenRouter — erro vira 502 e aparece na UI, sem novas tentativas automáticas.
- Testado só com fetch mockado (unit/integração) — não validei uma chamada real ao OpenRouter nesta sessão porque não há uma `OPENROUTER_API_KEY` real disponível aqui; precisa validar num ambiente com a chave antes de considerar "pronto de verdade".

**Gotcha:** rodei um teste manual de ponta a ponta e o backend continuou respondendo 404 pra `/mensagens` mesmo depois do código estar certo — o processo do `tsx` tinha sido iniciado (sem `--watch`) antes da rota existir, e eu reaproveitei o processo antigo em vez de reiniciar. `tsx src/index.ts` sem watch não recarrega o arquivo sozinho; matar e resubir o processo resolveu. Lição: depois de editar rotas, sempre reiniciar o processo de dev manual (ou usar `npm run dev`, que já roda com `tsx watch`).

**Smoke test:** testes automatizados (fetch mockado) cobrindo: injeção correta do esquema no system prompt, resposta feliz, 404 pra roteiro inexistente, 400 sem mensagem, 502 se o OpenRouter falha — 14/14 passando. Ponta a ponta manual (Playwright, sem `OPENROUTER_API_KEY` configurada): mensagem do usuário aparece no chat, erro 502 é exibido de forma legível sem quebrar a UI.
