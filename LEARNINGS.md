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

## Revisão de código + simplificação — fim da Fase C

Cadência periódica do `CLAUDE.md` (fim de fase), cobrindo `frontend/src/quadro/*`, `backend/src/agente/*` e `backend/src/routes/roteiros.ts`.

**Review de código — achados:**
- A regra 8 do rascunho de instrução (seção 7 do MVP doc — "se o usuário editar um cartão direto, na próxima interação verifique coerência com campos relacionados") não foi implementada no `prompt.ts`; a regra 9 do doc ("nunca bloqueie avanço") ocupou a posição 8, e a 8 original ficou de fora sem nota. Não é descuido de digitação: a arquitetura atual injeta o esquema completo a cada chamada sem guardar o estado anterior, então o agente não tem como saber o que mudou desde a última interação — implementar essa regra de verdade exige rastrear isso, o que é fatia própria, não um ajuste de revisão. Registrando aqui pra não ficar uma lacuna silenciosa.
- `pontos_contato` (Antagonista) existe no schema e no tipo (`tipos.ts`), mas não tem nenhum campo na UI (`AntagonistaCard.tsx`) — a regra 5 do agente ("antagonismo sistêmico precisa de avatar por ponto de contato") referencia um campo que o usuário não consegue preencher em lugar nenhum. É P1 (seção 3.2 do MVP doc), então aceitável não ter ainda, mas não estava documentado como pendente até agora.
- Caminhos de erro óbvios (404, 400, 502) estão tratados nas rotas; sem timeout/retry na chamada ao OpenRouter (já documentado como pendente na fatia anterior).

**Simplificação — achados:**
- `applyUpdates` (`backend/src/roteiro.ts`) e `aplicarAtualizacoes` (`frontend/src/quadro/imutavel.ts`) implementam o mesmo algoritmo de update imutável por path, mantido em dois lugares — com uma diferença sutil (o backend auto-vivifica paths intermediários ausentes, o frontend não). Inofensivo hoje porque o frontend sempre aplica updates sobre uma árvore que já veio completa do servidor. Não vale extrair um pacote compartilhado no monorepo só por causa dessa função de ~15 linhas nesse estágio — decisão de não mexer, não esquecimento.
- Nenhum arquivo da Fase C passa de 132 linhas; nenhuma abstração criada "pra usar depois" sem uso; nenhum campo de Fase D (Mundo/Gênero) ou P2 (Elenco) vazou pra dentro da fatia.

**Conclusão:** nenhuma mudança de código foi necessária nesta passada — os dois achados de review viram trabalho documentado pra decidir depois (não bugs a corrigir agora), e a duplicação de simplificação foi uma decisão consciente de não extrair ainda.

## Fatia: Sugestões estruturadas do agente (ghost text)

**O que foi construído:** o agente agora retorna, junto da resposta em texto, uma lista de propostas de campo. `backend/src/agente/propostas.ts` (`extrairPropostas`) faz o parse de um bloco `PROPOSTAS: [...]` que o `prompt.ts` instrui o modelo a colocar ao final da resposta (path + valor, no formato do próprio esquema JSON injetado no system prompt) — se o JSON vier malformado ou não bater com o schema (zod), cai de volta pro texto puro sem sugestão, silenciosamente (fail soft, não quebra o chat). A regra 7 do `prompt.ts` voltou a ser a regra real do MVP doc ("sugestões entram como pendentes até confirmação"), substituindo a restrição temporária da fatia anterior. No frontend, `EditableField` (`campos.tsx`) ganhou um prop opcional `sugestao` — texto fantasma + botões aceitar/rejeitar — e como é o componente compartilhado por todos os cartões e pela espinha, uma única mudança cobriu Protagonista/Antagonista/Ideia Controladora/Espinha de uma vez. `Quadro.tsx` guarda as propostas pendentes em estado local (por `path`), com aceitar chamando o `salvar` (PATCH) já existente e rejeitar só descartando.

**Por quê:** era o item mais adiado da arquitetura de agente (seção 7 do MVP doc) e o brief de prototipagem chama isso de "o padrão de interação mais importante do produto inteiro" — até aqui o agente só sugeria em prosa e pedia pro usuário colar manualmente.

**O que ficou pra depois:**
- Modo Diagnóstico continua sem existir.
- Só uma proposta pendente por campo (a mais recente substitui) — sem histórico de propostas rejeitadas.
- Sugestões só em campos de texto livre (`EditableField`); chips/status não recebem proposta.
- Regra 8 do agente (verificar coerência após edição direta do usuário) continua sem implementação — mesmo gap já registrado na revisão da Fase C.

**Gotchas (dois bugs pré-existentes descobertos ao tentar rodar de ponta a ponta neste ambiente Windows, não relacionados ao ghost text em si, mas que bloqueavam testar isso — ou qualquer coisa — localmente):**
1. `backend/src/db/migrate.ts` comparava `import.meta.url === \`file://${process.argv[1]}\`` pra decidir se rodava como script — no Windows isso nunca bate (barras invertidas, sem URL-encoding), então `npm run migrate` saía com exit 0 sem aplicar nada e sem nenhum erro. Trocado por `pathToFileURL(process.argv[1]).href`, que funciona nos dois SOs.
2. O backend nunca carregou `backend/.env` em lugar nenhum — nem `dotenv`, nem `--env-file`. Só não tinha quebrado ainda porque o `DATABASE_URL` tem um fallback default que por coincidência bate com as credenciais do `docker-compose.yml`. `OPENROUTER_API_KEY` não tem fallback, então o agente falhava sempre que rodado via `npm run dev`/`start`/`migrate` normal (só funcionava se a env var fosse exportada manualmente antes). Corrigido usando o flag nativo do Node 20.6+/tsx `--env-file-if-exists=.env` nos três scripts (`dev`, `migrate`, `start`) — tolera a ausência do arquivo (útil em CI/produção com env vars reais). Achado: com `tsx watch`, a flag precisa vir *depois* de `watch` (`tsx watch --env-file-if-exists=.env src/index.ts`), não antes — colocá-la antes faz o parser de CLI do tsx interpretar "watch" como nome de arquivo de entrada.

**Smoke test:** Docker Desktop e Postgres real subidos nesta sessão (não estavam rodando por padrão no ambiente). `npm run migrate` aplicou a tabela; suíte completa do backend com `DATABASE_URL` real: 20/20 passando (incluindo os testes novos de `extrairPropostas` e do bloco `PROPOSTAS` na rota `/mensagens`). Ponta a ponta manual via Playwright contra o agente real (OpenRouter, chave real): pedi uma proposta de Want → ghost text apareceu no campo certo → aceitar gravou o valor e persistiu no Postgres (`psql` confirmou) → pedi uma proposta de Need → rejeitar descartou sem tocar no campo (confirmado vazio no banco). `npm run build`/lint limpos em frontend e backend.

## Fatia: Mecanismo de eventos (auto avaliação de sessão)

**O que foi construído:** tabela `eventos` (migration `002_eventos.sql`: `roteiro_id` FK, `tipo` texto livre, `detalhes` jsonb, `criado_em`), `POST /roteiros/:id/eventos` (registra, 404 se o roteiro não existe — a FK faz o banco recusar o insert, capturado e traduzido) e `GET /roteiros/:id/eventos` (lista em ordem cronológica). No frontend, `registrarEvento(roteiroId, tipo, detalhes)` em `api.ts` é fire-and-forget (não bloqueia UI, só loga no console se falhar) e foi plugado em cinco pontos: transições de tela no onboarding (`onboarding_passo_N`, inclusive quando retoma um roteiro existente) e no Quadro (`quadro`), mensagens trocadas com o agente (ambas as direções, texto completo), toda ação de sugestão (`recebida`/`aceita`/`rejeitada`, com o `path` do campo), toda edição direta de campo (`campo_editado`, só o `path`, sem duplicar o valor que já está no próprio roteiro), e os erros que hoje só iam pro `console.error` (PATCH falho, chat falho).

**Por quê:** o usuário pediu explicitamente um mecanismo pra eu poder reconstruir "como foi a sessão" e "o que ele via na tela" quando pedir uma auto avaliação depois — hoje não existe visibilidade nenhuma do que acontece no navegador depois que uma tarefa é entregue. Optou pelo nível de fidelidade intermediário (eventos de tela + ações-chave), não logs de servidor puros (não mostrariam a tela) nem gravação de vídeo (over-engineering pro estágio do MVP).

**O que ficou pra depois:**
- Nenhuma UI de visualização dos eventos — a consulta é via `GET /roteiros/:id/eventos` direto (SQL/API), não um dashboard. Quando eu for me auto avaliar, consulto essa rota.
- Sem retenção/expiração — eventos acumulam pra sempre na tabela. Aceitável pro volume de um MVP local; revisitar se virar produto real.
- Nenhuma correlação automática "sucesso vs. falha" nos dados — fica pro meu julgamento na hora da auto avaliação, não é um campo calculado.

**Gotcha:** a mesma duplicação de efeito do React StrictMode (dev) já documentada na fatia de persistência do onboarding se repete aqui — o evento `tela: quadro` é registrado duas vezes ao entrar no Quadro (efeito duplicado pelo StrictMode). Inofensivo (é só uma linha de log a mais, não afeta dado nenhum), e StrictMode não roda em produção — não corrigido, só anotado pra eu não estranhar quando for ler a trilha depois.

**Smoke test:** sessão real via Playwright (onboarding → pular pro modo livre → editar campo direto → pedir e aceitar sugestão do agente) seguida de `GET /roteiros/:id/eventos` — a trilha reconstruiu exatamente a sequência: `onboarding_passo_0` → `onboarding_passo_1` → `quadro` (x2, gotcha acima) → `campo_editado` (fonte_oposicao) → `mensagem_agente` (usuário) → `mensagem_agente` (agente) → `sugestao: recebida` → `sugestao: aceita` → `campo_editado` (want). Testes automatizados novos (roteiro sem eventos, evento sem `detalhes`, 404 pra roteiro inexistente, 400 sem `tipo`, ordem cronológica) — suíte completa do backend com banco real: 25/25 passando. `npm run build`/lint limpos em frontend e backend. Caminho de rejeitar e de erro exibido não foram forçados manualmente nesta sessão (mesma estrutura de código do caminho de aceitar/sucesso, já testado).

**Gotcha de processo (não desta fatia, descoberto usando a Home):** rodar a suíte de testes do backend com `DATABASE_URL` apontando pro Postgres real de dev (em vez de um banco de teste isolado) deixa dezenas de roteiros órfãos no banco — cada `it()` que faz `POST /roteiros` grava de verdade. Ficou invisível até a tela Home existir e listar tudo; antes disso não tinha como "ver" a poluição. Não corrigido ainda (precisa de um banco de teste separado ou um cleanup no `afterEach`) — registrado aqui como um achado real de simplificação pra próxima cadência de revisão.

## Fatia: Tela Home (lista de roteiros + criar novo)

**O que foi construído:** `GET /roteiros` (backend) lista todos os roteiros — só os campos resumidos (`id`, `titulo`, `template`, `fase_atual`, `updated_at`), mais recente primeiro, sem o `data` inteiro. `frontend/src/home/Home.tsx` replica a seção `1g` do protótipo (`docs/design/Story_Render_Proto_tipo.dc.html`): cartão por roteiro existente + cartão tracejado "+ Novo roteiro". `App.tsx` agora mostra Home na `/` em vez de criar um roteiro automaticamente; clicar num cartão ou em "Novo roteiro" faz uma navegação de página cheia (`window.location.href`) pra `/r/:id` — não tentei fazer isso via SPA state, porque criar o roteiro dentro da Home e depois passar ele pro `OnboardingFlow` duplicaria a lógica de criação que já existe lá dentro; deixar o `App.tsx` recarregar e buscar por id de novo é mais simples e reaproveita o caminho que já existia.

**Por quê:** era o pedido explícito do usuário depois de descobrir que as duas telas (Home e escolha de método) já existiam desenhadas no protótipo, só não tinham sido construídas ainda. Dividido em 2 fatias — Home primeiro, Método depois — porque as duas juntas seriam maiores que o tamanho que o `CLAUDE.md` pede.

**Decisão consciente de escopo:** o protótipo mostra um indicador "X/7" (bolinhas de progresso) em cada cartão de roteiro, mas não existe fórmula definida em nenhum documento pra esse número. Em vez de inventar uma métrica, pulei o indicador nesta fatia — cada cartão mostra só título, método, fase e "editado há X". Avisado ao usuário antes de construir.

**Efeito colateral encontrado e corrigido na hora:** como agora *todo* fluxo de onboarding passa a receber `roteiroExistente` (mesmo um roteiro recém-criado, nunca tocado), a mensagem "Bem-vindo de volta — retomando de onde você parou" ia aparecer até pra quem tinha acabado de clicar em "Novo roteiro". Corrigido em `estadoDoRoteiro()`/`OnboardingFlow.tsx`: essa mensagem só entra quando `passo > 0` (progresso real), e o evento de tela registra `retomado` só nesse caso também.

**O que ficou pra depois (achado, não corrigido — é o escopo da próxima fatia):** o efeito de auto-criação de roteiro dentro do próprio `OnboardingFlow.tsx` (quando `roteiroExistente` não é passado) virou código morto — hoje `App.tsx` nunca mais renderiza `OnboardingFlow` sem um roteiro já carregado, porque a Home sempre redireciona pra `/r/:id` antes. Não removi agora pra não expandir o escopo desta fatia; faz mais sentido limpar isso na fatia da tela de Método, que vai mexer exatamente nesse ponto de entrada (Home → Método → Onboarding).

**Smoke test:** Playwright contra os dados reais do banco (incluindo a sessão real do usuário, "Fernando...") — Home carregou a lista, cliquei no cartão do Fernando e retomou o Quadro exatamente com os dados da sessão real (need, caracterização, lógica interna, avatar todos corretos); cliquei em "+ Novo roteiro", criou um roteiro novo e foi pro onboarding mostrando a primeira pergunta normal (sem "bem-vindo de volta"). Teste automatizado novo cobrindo a listagem (campos resumidos, sem vazar `data`, ordenação) — suíte do backend com banco real: 26/26 passando. `npm run build`/lint limpos em frontend e backend.

**Gotcha de processo (achado usando a própria Home):** rodar a suíte de testes do backend com `DATABASE_URL` do Postgres real de dev (em vez de banco isolado) grava dezenas de roteiros órfãos de verdade — 36 acumulados ao longo da sessão. Limpo manualmente com autorização explícita do usuário (`DELETE FROM roteiros WHERE id != '<o real>'`) depois de cada fatia que rodou a suíte com banco real. Ainda não corrigido na raiz (precisa de banco de teste isolado ou cleanup em `afterEach`) — mesmo achado já registrado na fatia anterior, reforçado aqui.

## Fatia: Tela de escolha de método

**O que foi construído:** nova rota `/novo` no frontend (sem id) mostrando `MetodoScreen` — replica a seção `1h` do protótipo: três cards (McKee "disponível", Jornada do Herói e Save the Cat "em breve", com os ícones SVG do próprio `.dc.html` reproduzidos fielmente), botão "Continuar com McKee →". Só ao clicar nesse botão o roteiro é criado de verdade (`POST /roteiros`) e a página navega pra `/r/:id` — antes disso não existe roteiro nenhum no banco. `Home.tsx`: "+ Novo roteiro" agora só navega pra `/novo` (não cria mais nada direto).

Aproveitando que essa fatia mexe exatamente no ponto de entrada Home→Onboarding, limpei o código morto que a fatia anterior tinha deixado registrado como pendência: `OnboardingFlow.tsx` não tem mais o efeito de auto-criação de roteiro (só existia pro caso de `roteiroExistente` não vir preenchido, que não acontece mais desde que a Home existe). `roteiroExistente` virou prop obrigatória, `ESTADO_INICIAL` (o estado local que só fazia sentido pra esse caso) foi removido porque `estadoDoRoteiro()` já produz exatamente o mesmo resultado pra um roteiro recém-criado, e `roteiroIdRef` virou uma constante simples (não precisa mais ser ref, porque nunca é reatribuído depois da montagem).

**Por quê:** segunda metade do pedido original do usuário (Home + Método), separada em fatia própria pelo mesmo motivo da primeira — manter o tamanho que o `CLAUDE.md` pede.

**O que ficou pra depois:** qualquer método além de McKee continua só decorativo (P1/P2, fora do MVP); nenhuma forma de voltar da tela de Método pra Home (não está no protótipo, não perguntei, não inventei).

**Smoke test:** Playwright — Home → "+ Novo roteiro" foi pra `/novo` sem criar nada no banco ainda; tela mostrou os 3 métodos com os ícones certos; cliquei "Continuar com McKee" → criou o roteiro, navegou pra `/r/:id`, onboarding começou limpo (primeira pergunta, sem "bem-vindo de volta"). Confirmei via SQL que só 1 roteiro foi criado (a remoção do código morto de auto-criação eliminava um risco real de duplicação nesse ponto). `npm run build`/lint limpos em frontend; backend não mudou nesta fatia (build/lint conferidos mesmo assim, sem regressão).

## Bugs reportados pelo usuário na 1ª sessão de teste real da Fase C

Achados usando a trilha de eventos (mecanismo da fatia anterior) pra reconstruir a sessão real do usuário ("Joana e as cartas de Tarô", ~50 min de conversa) antes de qualquer correção — provou o valor do mecanismo de auto avaliação na prática.

**a) Sugestão duplicada quando o valor proposto já é igual ao que está salvo.** `EditableField` mostrava o texto fantasma mesmo quando `sugestao.valor === value` — acontecia quando o agente repropunha um campo que o usuário já tinha aceitado antes (confirmado na trilha: `need` foi proposto e aceito duas vezes). Corrigido com uma condição a mais em `campos.tsx` (`sugestao.valor !== value`) — não mexe em nada do lado do agente, só evita mostrar uma sugestão redundante.

**b) Texto da espinha cortado em vez de crescer.** `EditableField` usava `<textarea rows={2}>` sem auto-resize — conteúdo longo (comum na espinha e nos cartões de profundidade) ficava truncado dentro de uma caixa de 2 linhas, exigindo scroll interno minúsculo em vez do cartão crescer. Corrigido com um hook `useAutoAltura` (ajusta `style.height` pro `scrollHeight` a cada mudança de valor) + `resize:none; overflow:hidden` no CSS. Cobre todos os cartões e a espinha de uma vez, por ser o mesmo componente compartilhado.

**c) Badge "validado" sem fundo.** `.sr-status-select { background: none; }` e `.sr-badge--validado { background: var(--sr-brass); }` tinham a mesma especificidade CSS (ambos seletores de classe única) — a regra declarada depois no arquivo (`sr-status-select`) sempre vencia, cancelando o fundo dourado do "validado" (o único status que define `background` de verdade; os outros três usam só borda, por isso não quebravam visualmente). Corrigido dando a cada modificador de badge (`vazio`, `rascunho`/`esboço`, `testado`) seu próprio `background: none` explícito, e removendo o `background` genérico de `.sr-status-select` — cada estado agora é dono da própria declaração, sem depender de ordem no arquivo.

**Gotcha do processo de investigação:** pra reproduzir o bug (c) eu mudei o status de um nó real da sessão do usuário (`incidente_incitante`) pra "validado" direto via PATCH — e revertido pra "rascunho" (valor original) assim que terminei de confirmar o bug. Lição: ao reproduzir um bug usando dados reais de sessão do usuário (não um roteiro de teste meu), reverter a mutação depois é obrigatório, não opcional.

**O que ficou pra depois:** o achado original desta sessão de análise — a Complicação 1 nunca foi escrita no board apesar de 3 minutos de conversa sobre ela, porque (1) o agente às vezes reconhece uma resposta em prosa sem propor o campo no mesmo turno, e (2) sugestões pendentes vivem só no estado do React (`Quadro.tsx`), então um reload as apaga silenciosamente sem aceitar nem rejeitar — ainda não foi corrigido. É maior que os três bugs acima (mexe em como sugestões persistem, não só em CSS/comparação) e merece sua própria decisão de escopo antes de codar.

**Smoke test:** Playwright contra a sessão real do usuário — validado o layout antes/depois das mudanças (b) e (c) visualmente (screenshot comparando texto cortado → texto completo; badge em branco sem fundo → badge dourado legível). `npm run build`/lint limpos. O fix (a) foi verificado por revisão de código (comparação de igualdade simples, sem efeito colateral), não re-reproduzido ao vivo — depender de o modelo repetir uma proposta idêntica sob demanda não é prático de forçar.

## Fatia: Persistência das propostas do agente (fecha o achado da Complicação 1)

**O que foi construído:** nova tabela `propostas` (migration `003_propostas.sql`), espelhando o padrão já validado da tabela `eventos`: `roteiro_id` FK, `path`/`valor` jsonb, `status` (`pendente`/`aceita`/`rejeitada`/`substituida`), timestamps. `POST /roteiros/:id/mensagens` agora grava cada proposta extraída como `pendente` antes de devolver (e marca qualquer `pendente` anterior pro mesmo `path` como `substituida`, pra nunca acumular duas pendências pro mesmo campo). Duas rotas novas: `GET /roteiros/:id/propostas` (lista as pendentes, é o que o Quadro chama ao montar) e `POST /roteiros/:id/propostas/:propostaId/resolver` (`{acao: "aceitar"|"rejeitar"}` — aceitar aplica o valor no `data` do roteiro e marca a proposta resolvida, tudo num só request).

No frontend, `Quadro.tsx` busca as propostas pendentes do servidor ao montar (em vez de começar sempre vazio), e aceitar/rejeitar chamam o endpoint de resolver (fire-and-forget, mesmo padrão otimista que `salvar()` já usava) em vez de só mexer em estado local. De quebra, reforcei a regra 7 do `prompt.ts`: instrução explícita pra o agente propor no mesmo turno em que reconhece a resposta, não "reconhecer agora, propor depois".

**Por quê:** fecha o achado da sessão de análise anterior — a Complicação 1 nunca chegou ao board porque a sugestão só existia na memória do navegador e um reload a apagava sem aceitar nem rejeitar. Essa era a causa raiz real, maior que os três bugs de CSS/comparação corrigidos antes.

**O que ficou pra depois:** nenhum indicador visual de "N sugestões pendentes" pra quando elas aparecem fora da área visível (mencionado como complementar, não crítico, na proposta de abordagem) — ajudaria a descoberta, mas o problema de perda de dado (o que realmente causou o bug da Complicação 1) já está fechado sem ele. Histórico de propostas `substituida`/`rejeitada` fica gravado no banco mas não tem UI nenhuma pra consultar — só dá pra ver via SQL/API, igual aos `eventos`.

**Smoke test:** ponta a ponta contra o agente real — pedi uma proposta de Want via `curl` (fora do navegador), confirmei que ficou `pendente` na tabela, abri a página pela primeira vez nesse navegador e a sugestão já apareceu (prova que não depende do estado local ter "visto" a proposta antes — sobrevive a qualquer carregamento novo, não só a um reload). Aceitei pela UI → `want` persistiu no roteiro E a proposta sumiu da lista de pendentes. Pedi uma segunda proposta (Need) e rejeitei via API → campo continuou vazio, proposta marcada `rejeitada`. Suíte de testes do backend com banco real: 32/32 passando (6 testes novos cobrindo listar pendentes, aceitar aplica+resolve, rejeitar não aplica, substituição por path duplicado, 404 em proposta inexistente/já resolvida, 400 com ação inválida). `npm run build`/lint limpos em frontend e backend.

## Fatia: Nó da espinha com sugestão pendente ficava com fundo pontilhado

**O que foi construído:** achado testando a sessão real do usuário ("Tonico") — `EspinhaColuna.tsx` decidia o estilo do nó (`sr-node--preenchido` vs `sr-node--vazio`) só olhando `no.conteudo` salvo, ignorando se havia uma sugestão pendente pra aquele nó. Resultado: quando o agente propunha texto pra um nó da espinha ainda vazio (como a Complicação 1), o texto fantasma aparecia dentro de um card ainda pontilhado/sem fundo — lendo como se a sugestão estivesse "solta", não pertencendo a um cartão de verdade. Corrigido: o nó agora fica `preenchido` (fundo de papel) se `no.conteudo` **ou** a sugestão pendente existir.

Achado relacionado na mesma sessão: o agente tinha proposto um valor pro campo `status` do mesmo nó (`espinha[1].status = "rascunho"`) — um campo tipo lista, que a regra do prompt já dizia pra não propor ("níveis da oposição, gêneros... só campos de texto livre"), mas a regra não mencionava `status` explicitamente e o modelo não generalizou sozinho. Como a UI não tem (e não deveria ter) um jeito de mostrar ghost text pra um `<select>`, essa proposta ficava pendente pra sempre, invisível, sem chance de ser resolvida. Duas camadas de correção: (1) `prompt.ts` agora proíbe `status` explicitamente; (2) `extrairPropostas` (backend) filtra qualquer proposta cujo último passo do `path` seja `status`, `niveis` ou `generos` — defesa mesmo se o modelo ignorar a instrução de novo.

**Gotcha:** o primeiro filtro que escrevi em `propostas.ts` tinha a lógica invertida (`typeof ultimo === "string" && !CAMPOS_PROIBIDOS.has(ultimo)` — rejeitava qualquer proposta cujo último passo do path fosse um **número**, não só as proibidas). O teste já existente ("aceita mais de uma proposta no mesmo bloco", que usa `path: ["b", 2]`) pegou o bug na hora — exatamente o motivo de manter os testes antigos rodando a cada mudança, não só os novos.

**Smoke test:** Playwright contra a sessão real do "Tonico" — confirmei visualmente que o nó da Complicação 1 (antes pontilhado) virou cartão normal com a sugestão pendente dentro. Rejeitei a proposta órfã de `status` via API (não tinha como ela ser resolvida pela UI mesmo). Suíte do backend com banco real: 34/34 passando (2 testes novos pro filtro de campos proibidos, incluindo o caso que pegou o bug de lógica invertida). `npm run build`/lint limpos em frontend e backend.

## Fatia: mais 3 bugs da sessão real do "Tonico" — overflow de card, sugestão quase-duplicada, proposta na espinha errada

**a) Sugestão quase-duplicada (não pega pelo fix anterior).** O fix da fatia anterior comparava `sugestao.valor !== value` (igualdade exata) — funciona pra reproposta idêntica, mas o agente às vezes reformula a mesma ideia com palavras diferentes (ex: "que ele prometa" → "que Tonico prometa") ao resumir várias decisões de uma vez. Isso não dá pra pegar por comparação de string. Corrigido só no prompt: regra nova pra nunca repropor um campo que já tem valor aceito, a menos que o usuário peça revisão explícita daquele campo.

**b) Propostas de "Complicação 2" e "Complicação 3" foram gravadas em Crise e Clímax.** Achado mais sério da sessão: o usuário pediu pra falar de mais complicações depois da primeira, o agente concordou e discutiu "Complicação 2" e "Complicação 3" — mas na hora de montar o bloco PROPOSTAS, usou os índices 2 e 3 da espinha pensando que eram complicações adicionais. Só que a espinha tem exatamente 5 nós fixos (0=incidente, 1=complicação, 2=crise, 3=clímax, 4=resolução) — o produto só suporta UM nó de complicação estruturado (gap já documentado, é a fatia do "nó repetível"). O usuário aceitou a proposta pro índice 2 achando que era a segunda complicação e ela sobrescreveu o campo Crise de verdade. Corrigido só no prompt (não dá pra validar isso no backend sem reconstruir a intenção da conversa): a espinha agora vem descrita explicitamente por índice no prompt, com aviso direto pra nunca tratar 2/3/4 como complicações extras.

**Dado real ainda corrompido, não mexi sem confirmar com o usuário:** o campo Crise do roteiro do "Tonico" hoje contém o que era pra ser "Complicação 2" (não uma crise de verdade), e ainda existe uma proposta pendente pro índice 3 (Clímax) que, se aceita do jeito que está, vai sobrescrever o Clímax com o que era pra ser "Complicação 3". Avisado ao usuário, não corrigido nem revertido por conta própria — é conteúdo criativo real dele.

**c) Texto grande na espinha saía do card e quebrava o layout — achado mais interessante do que parecia.** Investigando com `getBoundingClientRect`, medi que `.sr-field` (textarea + texto fantasma) tinha até 280px de conteúdo, mas o `.sr-node` pai (o card) só crescia até 227px — o filho ficava maior que o próprio pai mesmo com `overflow:visible` em tudo e nenhuma altura fixa em nenhuma regra CSS visível. Causa: `.sr-node` é filho de `.sr-rail` (flex-column), e sem `flex-shrink:0`, o comportamento padrão do flexbox (`flex-shrink:1`) deixava o card ser espremido abaixo do tamanho do próprio conteúdo em vez de crescer pra acomodá-lo — mesmo sem nenhum teto de altura explícito forçando isso. Corrigido com `flex-shrink: 0` em `.sr-node`. O usuário sugeriu que talvez a solução fosse migrar pra um canvas de verdade — não fiz essa chamada sozinho; o bug real era esse gotcha de flexbox, resolvido sem precisar de mudança de arquitetura.

**Por quê isso tudo junto:** os três apareceram na mesma rodada de teste real do usuário, e (a) e (b) têm a mesma raiz (o agente não olhando o esquema com cuidado suficiente antes de montar o bloco de propostas) — fez sentido tratar como uma fatia só de correções pontuais, sem inventar a fatia maior (nó repetível de complicação) que nenhum dos dois resolve de verdade.

**Smoke test:** medido com `getBoundingClientRect`/`getComputedStyle` via Playwright antes e depois do fix (c) — `.sr-node` do "Complicação 1" foi de 227px (menor que o filho) pra 334px (maior, com folga) depois do `flex-shrink:0`; mesma verificação em Crise e Clímax. `npm run build`/lint limpos em frontend e backend; suíte do backend com banco real 34/34 passando (sem teste novo — os fixes (a)/(b) são só prompt, não têm como testar automaticamente o comportamento do modelo real).

## Fatia: nó repetível de Complicação Progressiva

**O que foi construído:** o usuário pediu explicitamente pra resolver a corrupção de dado da fatia anterior transformando o conteúdo perdido numa complicação de verdade — isso exigia a feature que já estava documentada como pendência há várias fatias ("padrão de nó repetível... é fatia própria"). Implementado:

- `backend/src/roteiro.ts`: `adicionarComplicacao(data)` — adiciona um nó `tipo: "complicacao"` no **fim** do array `espinha` (nunca no meio), com `ordem` incremental (`complicacoes.length + 1`). Anexar no fim em vez de inserir na posição "lógica" (depois da última complicação, antes da crise) foi decisão deliberada: inserir no meio desloca os índices de todo mundo depois, e qualquer proposta pendente referenciando um path por índice (`["espinha", 2, "conteudo"]`) ficaria apontando pro nó errado — exatamente a classe de bug que essa fatia inteira existe pra evitar.
- Rota `POST /roteiros/:id/espinha/complicacoes` (sem body, cria e devolve o roteiro atualizado).
- `frontend/src/quadro/EspinhaColuna.tsx`: como a ordem de exibição não é mais igual à ordem do array, a coluna agora ordena por uma chave (`incidente=0, complicações por ordem entre 1-2, crise=2, clímax=3, resolução=4`) mas mantém o índice real do array (`indiceReal`) pras callbacks de salvar/sugestão — sugestões e PATCHes continuam funcionando por path de índice real, sem depender da posição visual. Botão "+ complicação" aparece depois da última complicação exibida.
- `prompt.ts`: a explicação de "5 índices fixos" da fatia anterior ficou desatualizada (agora o array pode ter mais de 5 elementos, e complicações novas não têm índice previsível). Reescrita: o agente deve sempre achar o índice certo pelo campo `id`/`tipo` de cada nó, nunca por contagem própria; só pode propor conteúdo pra complicações que **já existem** no esquema — se a conversa render uma complicação a mais, ele deve pedir pro usuário clicar em "+ complicação" antes de propor.

**Por quê:** pedido direto do usuário, e fecha de vez a classe de bug (b) da fatia anterior — agora existe um lugar de verdade pra "complicação 2" morar, em vez do agente ter que inventar um índice que colide com Crise/Clímax.

**Gotcha real, não relacionado à feature:** ao corrigir manualmente o roteiro do Tonico via `curl -d` com acento inline (`"esboço"`), o bash/terminal desse ambiente corrompeu a codificação e gravou `"esbo�o"` no banco — confirmado com `psql` direto, não era só exibição de terminal. Corrigido reenviando o PATCH via um script Node com `fetch` (que lida com UTF-8 corretamente). Lição pra próximas correções manuais de dados reais: nunca passar acento/caractere não-ASCII inline num comando `curl -d` neste ambiente — usar Node (`fetch`) ou um arquivo de payload.

**O que ficou pra depois:** excluir ou reordenar complicações (mencionado no design original, "+ complicação... excluir/reordenar") — só "adicionar" foi construído, por ser o que resolvia o problema imediato. Nenhuma UI pra remover uma complicação adicionada por engano (se acontecer, precisa de correção manual, igual eu fiz aqui).

**Aplicado no roteiro do Tonico (dado real do usuário, com autorização explícita):** Crise revertida pra "a definir"/esboço (descartando o conteúdo de "Complicação 2" que tinha corrompido o campo); complicação_2 criada de verdade com o conteúdo da proposta que estava pendente pro Clímax; as duas propostas pendentes obsoletas (a quase-duplicata em Complicação 1 e a original que apontava pro Clímax) rejeitadas. Testado pela UI de verdade: cliquei em "+ complicação", uma Complicação 3 vazia apareceu na posição certa (depois da 2, antes da Crise) — removida em seguida por ser só teste do botão, não trabalho real do usuário.

**Smoke test:** teste automatizado novo cobrindo o endpoint (adiciona no fim sem mexer nos nós existentes, ordem incrementa corretamente com mais de uma complicação, 404 pra roteiro inexistente) — suíte do backend com banco real: 37/37 passando. Ponta a ponta via Playwright contra o roteiro real do Tonico: espinha corrigida renderizou na ordem certa, botão "+ complicação" funcionou e posicionou o nó novo corretamente. `npm run build`/lint limpos em frontend e backend.

## Fatia: excluir e reordenar complicações

**O que foi construído:** achei a especificação exata no `docs/design/Story_Render_Onboarding.dc.html` (seção "Comportamento do nó repetível", opção 2c) — menu `⋯` só em nós de complicação, com "mover pra cima"/"mover pra baixo" (só ativos com 2+ complicações visíveis) e "excluir complicação" (destrutivo); nós fixos não têm essa opção.

Decisão de design tomada com o usuário antes de codar (ponto não coberto pelos 3 docs-fonte): **exclusão é soft-delete**, nunca remove do array `espinha` nem reindexa nada — só marca `excluido: true` no nó. Motivo: paths (inclusive de sugestões pendentes do agente) referenciam **índice real do array**, e `complicacao_1` fica *antes* de Crise/Clímax/Resolução nesse array (layout herdado do `espinhaVazia()`) — remover de verdade deslocaria o índice desses 3 nós fixos, não só de outras complicações, reabrindo exatamente a classe de bug que a fatia anterior (nó repetível) tinha fechado. A numeração exibida ("Complicação N") passou a ser calculada pela **posição** entre os nós visíveis a cada render (`EspinhaColuna.tsx`), não pelo campo `ordem` armazenado — depois de uma exclusão, `ordem` pode ter buracos (ex: 1, 3), mas a label sempre reconta 1..N certo.

"Mover" não mexe no array nem em nenhum path — só troca o campo `ordem` entre a complicação e a vizinha visível mais próxima (`moverComplicacao` em `roteiro.ts`), então nenhuma sugestão pendente é afetada por um reorder. "Excluir" (`excluirComplicacao`) valida que o índice é mesmo uma complicação, marca `excluido: true`, e a rota (`POST /:id/espinha/complicacoes/:indice/excluir`) também rejeita (`status='rejeitada'`) qualquer proposta pendente cujo path aponte pro `conteudo` daquele índice — sem isso, uma sugestão pendente pro nó excluído ficaria invisível pra sempre (mesma classe de bug já corrigida antes pro campo `status`). `prompt.ts` ganhou uma regra nova avisando o agente pra tratar índices com `excluido: true` como inexistentes.

**Por quê:** pedido direto do usuário, mirando a especificação já desenhada (mas nunca implementada) no `.dc.html` do onboarding.

**O que ficou pra depois:** "adicionar abaixo" (inserir uma complicação nova numa posição específica, não só no fim) — o menu do design mostra essa opção, mas ela reabriria o mesmo risco de deslocar índice de nós fixos se implementada como inserção real no array; "+ complicação" (sempre no fim) continua sendo a única forma de adicionar. Excluir uma complicação que nunca foi tocada (sempre vazia) não tem tratamento especial — soft-delete se aplica igual, mesmo sem conteúdo.

**Smoke test:** suíte do backend com banco real, 46/46 passando (9 testes novos: soft-delete não remove do array nem mexe nos outros índices, proposta pendente pro nó excluído vira `rejeitada`, 400 se o índice não é complicação, mover troca `ordem` com a vizinha, mover pula complicações excluídas ao achar a vizinha, 400 sem vizinha na direção pedida, 400 com direção inválida, 404 pra roteiro inexistente nos dois endpoints). Ponta a ponta via Playwright: criei um roteiro de teste com 3 complicações, abri o menu, movi a Complicação 2 pra cima (conteúdo trocou de posição corretamente, `ordem` no banco confirmado), confirmei "mover pra cima" desabilitado na primeira complicação, excluí uma complicação do meio (sumiu do quadro, numeração das restantes reajustou pra 1/2), recarreguei a página inteira e o estado persistiu igual. Roteiro de teste apagado do banco de dev ao final. `npm run build`/lint limpos em frontend e backend.
