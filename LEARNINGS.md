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

## Fix: poluição do banco de dev pela suíte de testes (achado registrado desde a fatia de eventos)

**O que foi construído:** `roteiros.test.ts` agora tem um `beforeAll` que grava `SELECT now()` do próprio Postgres (não `new Date()` do Node, pra não depender do relógio da máquina bater com o do servidor de banco) antes de qualquer teste rodar, e um `afterAll` que apaga `WHERE created_at >= inicioSuite` — só os roteiros criados durante aquela execução da suíte. `eventos` e `propostas` somem junto via `ON DELETE CASCADE` (já existia nas migrations 002/003).

**Por quê:** achado real registrado em pelo menos 3 fatias anteriores ("Mecanismo de eventos", "Tela Home") — rodar `npm run test` com `DATABASE_URL` apontado pro Postgres de dev (não existe banco de teste isolado neste projeto) gravava dezenas de roteiros órfãos de verdade a cada execução, exigindo limpeza manual com autorização do usuário toda vez. O usuário pediu o fix antes de testar a fatia anterior no navegador.

**Por que não um banco de teste separado:** seria a solução "correta" de livro-texto, mas exigiria outro serviço no `docker-compose.yml`, outra `DATABASE_URL` só pra CI/test, e coordenar isso nos scripts — mais superfície pra um MVP de um usuário só rodando local. O filtro por timestamp resolve o sintoma real (poluição) com uma mudança de 5 linhas num arquivo só, sem exigir infraestrutura nova.

**Descoberto ao validar o fix:** havia 27 roteiros órfãos acumulados de execuções anteriores desta sessão (antes do fix existir) ainda no banco, junto dos 3 roteiros reais do usuário (Fernando, Joana, Tonico). Apagados manualmente por id explícito (mantendo só os 3 reais) antes de confirmar o fix — não afetados pelo `afterAll` novo porque já existiam antes do `inicioSuite` de qualquer execução futura.

**Smoke test:** rodei a suíte completa duas vezes seguidas contra o Postgres real (`DATABASE_URL` de dev) — 46/46 passando nas duas, e `SELECT count(*) FROM roteiros` ficou em 3 (só os reais) depois de cada execução, confirmando que o `afterAll` limpa tudo que a própria suíte cria sem tocar em dado anterior. `npm run lint` limpo.

## Fix: 3 comportamentos do agente reportados numa nova sessão de teste real (Tonico)

Três achados do usuário na mesma rodada de teste, todos raiz em `prompt.ts` — nenhuma mudança de código, só regras novas (mesmo padrão de fatias anteriores de bug do agente).

**a) Comportamento inconsistente: às vezes propõe direto no cartão, às vezes pergunta "posso propor?" no chat e só propõe depois que o usuário confirma em texto.** A regra 7 já mandava propor no mesmo turno, mas nada proibia explicitamente a pergunta de permissão como alternativa — o modelo tratava as duas como comportamentos igualmente válidos. Adicionada regra 10: nunca perguntar permissão no chat antes de propor; o clique de aceitar/rejeitar no cartão já é o mecanismo de confirmação, perguntar antes disso é redundante e atrasa o usuário em um turno inteiro. Se não tiver certeza do valor, fazer pergunta de conteúdo, nunca pergunta de permissão.

**b) Ao perguntar algo vago ("e agora?"), o agente colava o JSON inteiro do esquema na resposta do chat antes de responder.** O `extrairPropostas` só corta o bloco `PROPOSTAS:` do final — qualquer outro JSON que o modelo decida colar no meio da resposta passa direto pro usuário (confirmado lendo `AgenteChat.tsx`: a resposta é renderizada sem nenhum filtro além desse). Adicionada regra 11: nunca colar o JSON do esquema (inteiro ou em trecho) na resposta — é contexto interno pra decidir o que responder, não conteúdo pra mostrar; responder sempre só em prosa.

**c) O agente disse que as complicações estavam vazias quando já havia duas preenchidas no board — e mesmo depois de avisado, só "leu" a segunda, não a primeira.** Confirmado que o dado no Postgres estava correto (sem `excluido`, ambos os nós com conteúdo) — não era corrupção de dado como nas fatias anteriores. Hipótese: o `historico` da conversa (mensagens anteriores) carrega mais peso pro modelo do que o JSON denso do esquema recebido de novo a cada turno, então uma afirmação própria antiga ("está vazio") tende a ser mantida por coerência conversacional mesmo com dado fresco contradizendo. Adicionada regra 12: antes de afirmar que um campo/nó está vazio ou preenchido — em especial complicações, por ser um array que cresce — reler o JSON do esquema desta mensagem específica, nunca confiar no que foi dito em turnos anteriores.

**Por quê separar isso da fatia anterior:** achado numa rodada de teste diferente (não a sessão do Tonico documentada antes), root cause diferente (comportamento conversacional do modelo, não erro de índice/path).

**Smoke test:** sem teste automatizado (comportamento de modelo real, mesmo padrão já registrado em fatias anteriores — não dá pra forçar deterministicamente). Testado ao vivo contra o OpenRouter (chave real) num roteiro de teste com 2 complicações preenchidas: (1) perguntei "quais complicações já estão preenchidas?" — respondeu corretamente citando as duas, com conteúdo certo de cada uma; (2) perguntei "e agora?" de forma vaga — resposta ficou em prosa curta (365 caracteres), sem nenhum JSON colado; (3) dei conteúdo suficiente pra Crise — propôs direto (`PROPOSTAS` preenchido na mesma resposta), sem perguntar permissão antes. Roteiro de teste apagado do banco de dev ao final. `npm run build`/lint/testes (46/46) continuam limpos — a mudança não toca em código, só no texto do prompt.

## Fatia: agente pode criar complicação sozinho (ação estrutural, não só proposta de conteúdo)

**O que foi construído:** o usuário testou e percebeu que o agente pedia pra ele clicar em "+ complicação" antes de propor conteúdo — perguntei se era falta de autonomia ou engano, e era exatamente o comportamento documentado (regra da fatia do nó repetível mandava pedir isso). Perguntei se ele queria dar essa autonomia ao agente; escolheu que sim, já que criar o nó vazio não escreve conteúdo nenhum e é reversível pelo próprio menu de excluir.

Novo mecanismo simétrico ao das `PROPOSTAS`, mas pra ações estruturais em vez de conteúdo de campo: `backend/src/agente/acoes.ts` (`extrairAcoes`) faz parse de um bloco `ACOES: [...]` que o modelo pode colocar ANTES do bloco `PROPOSTAS` (mesmo truque de regex ancorado no fim da string, agora aplicado duas vezes em sequência — primeiro tira `PROPOSTAS` do fim, depois `ACOES` do novo fim). Só uma ação suportada por enquanto: `"criar_complicacao"`. Na rota `/mensagens`, cada ação processada chama `adicionarComplicacao` (a mesma função já usada pelo botão manual) sobre os dados em memória, guardando o índice real de cada nó criado; se alguma ação rodou, o roteiro é persistido no Postgres antes de processar as propostas.

Problema resolvido: o modelo não pode saber de antemão qual índice o nó novo vai ter (só o backend decide, no momento de criar). Solução: o modelo referencia o nó recém-criado com um placeholder de texto no path (`["espinha", "nova_0", "conteudo"]` — "a 0ª complicação que a ação ACOES desta resposta criou"), e `remapearNovasComplicacoes` troca esse placeholder pelo índice real depois que os nós já existem. Proposta com um placeholder que não corresponde a nenhuma ação de fato executada é descartada silenciosamente (mesma filosofia de fail-soft do `extrairPropostas`) — evita o mesmo tipo de path corrompido que já causou bug em fatias anteriores.

A resposta de `/mensagens` ganhou um campo opcional `roteiro` (o roteiro inteiro, só presente quando alguma ação rodou) — o frontend (`AgenteChat.tsx` → `onRoteiroAtualizado` → `Quadro.tsx`) usa isso pra atualizar o estado local sem precisar de around-trip extra. `prompt.ts`: removida a instrução antiga ("diga ao usuário pra clicar em + complicação"), substituída por uma seção "Ações estruturais" com o formato do bloco, e regras explícitas — só criar quando já há conteúdo de verdade pra propor (nunca especulativamente), no máximo uma criação por resposta, e criar o nó em si não conta como "escrever direto no esquema" (regra 7 continua valendo só pro conteúdo).

**Por quê:** pedido direto do usuário depois de identificar a limitação numa sessão de teste real — remove um passo manual (clicar no botão) que não protegia nada (o conteúdo continua pendente até aceitar, igual antes).

**O que ficou pra depois:** só uma ação suportada (criar complicação) — excluir/mover via agente não foi pedido e não foi construído. Múltiplas criações no mesmo turno são suportadas pelo mecanismo (`nova_0`, `nova_1`...) mas o prompt pede explicitamente no máximo uma por resposta, então não foi testado ao vivo com mais de uma.

**Smoke test:** 12 testes novos — `acoes.test.ts` (unitário: parse de `ACOES`, fail-soft com ação não suportada/JSON malformado, `remapearNovasComplicacoes` resolve placeholder único e múltiplos, descarta proposta com placeholder órfão) e 4 novos em `roteiros.test.ts` (sem `ACOES` não inclui `roteiro` na resposta; `criar_complicacao` sozinho cria o nó e persiste; `ACOES`+`PROPOSTAS` no mesmo turno remapeia `nova_0` pro índice real e persiste como pendente; placeholder órfão é descartado). Suíte completa do backend com banco real: 58/58 passando. Ponta a ponta contra o OpenRouter real: dei contexto suficiente pra uma segunda complicação numa conversa simulada — o agente criou o nó sozinho E propôs o conteúdo no mesmo turno, sem pedir pra eu clicar em nada; confirmei via API que o nó foi persistido vazio primeiro e a proposta ficou pendente (não aplicada); pela UI de verdade, o nó apareceu como cartão preenchido com o texto fantasma e botões aceitar/rejeitar (mesmo comportamento de um nó criado manualmente); aceitei e confirmei a persistência do conteúdo via API. Roteiro de teste apagado do banco de dev ao final. `npm run build`/lint limpos em frontend e backend.

## Fix: agente prometia uma posição pra complicação nova mas ela sempre nascia no fim

**O que foi descoberto:** o usuário testou a fatia anterior (agente cria complicação sozinho) e reportou que o agente concordava em colocar a complicação nova numa posição específica (ex: "3ª complicação") mas ela sempre aparecia no fim da lista de verdade — precisou reordenar manualmente. Causa raiz: `adicionarComplicacao` sempre atribuía `ordem = contagem + 1` (o maior valor possível), então não havia como a ação `criar_complicacao` controlar a posição de exibição — o agente prometia algo que o mecanismo não conseguia entregar.

**O que foi construído:** `adicionarComplicacao` (`roteiro.ts`) ganhou um segundo parâmetro opcional `posicao` (1-based, a posição de exibição desejada entre as complicações visíveis). Quando informado, calcula um `ordem` fracionário entre a complicação vizinha anterior e a seguinte (ex: inserir na posição 2 entre `ordem 1` e `ordem 2` vira `ordem 1.5`) — mesmo truque já usado pelo `chaveOrdenacao` do frontend, que ordena por valor numérico sem se importar se é inteiro. Isso encaixa o nó sem precisar renumerar ou mexer no `ordem` de mais ninguém. O índice real dele no array `espinha` continua sempre sendo o último (nunca insere no meio do array de verdade — mesmo motivo já documentado na fatia do nó repetível). O bloco `ACOES` evoluiu de array de strings pra array de objetos — `{"tipo": "criar_complicacao", "posicao": 3}` — pra caber esse parâmetro; `posicao` é opcional (omitido = comportamento de sempre, vai pro fim). `prompt.ts` agora instrui: se o agente concordou com uma posição específica em texto, é obrigatório incluir o `posicao` correto, nunca deixar de fora.

**Achado relacionado durante o smoke test (não pedido, corrigido por já ter o precedente):** nesse mesmo teste ao vivo, o agente propôs um valor pra `conecta_assets` (lista de assets conectados) — campo sem nenhuma UI pra mostrar sugestão pendente, mesma classe de bug já corrigida antes pro campo `status` (proposta ficaria presa pra sempre, invisível). Adicionado à `CAMPOS_PROIBIDOS` em `propostas.ts`, junto com a menção explícita no prompt.

**Smoke test:** `acoes.test.ts` atualizado pro novo formato de objeto + campo `posicao` opcional/validação (rejeita `posicao <= 0`). `roteiros.test.ts`: 2 testes novos de posicionamento (insere entre duas complicações existentes sem alterar o `ordem` de nenhuma delas; insere na posição 1, antes de todas). `propostas.test.ts`: teste novo pro filtro de `conecta_assets`. Suíte completa do backend com banco real: 63/63 passando. Ponta a ponta contra o OpenRouter real, reproduzindo o cenário exato reportado: pedi uma complicação nova "na posição 2" entre duas existentes — o agente incluiu `"posicao": 2` corretamente, o nó nasceu com `ordem` fracionário entre as duas vizinhas, e a proposta de `conecta_assets` que ele tentou fazer não vazou mais pro usuário (só `conteudo` passou). Confirmado visualmente na UI: numeração das 3 complicações ficou 1/2/3 na ordem certa, com a nova no meio como cartão preenchido com sugestão pendente. Roteiros de teste apagados do banco de dev ao final. `npm run build`/lint limpos em frontend e backend.

## Fix: reordenar complicações existentes não funcionava — e um bug de vazamento de JSON no chat descoberto no caminho

**O que foi reportado:** o usuário testou pedir uma reordenação das complicações existentes duas vezes; na segunda, o agente disse "Feito" mas nada mudou, e a resposta trazia texto técnico bruto no chat (`ACOES: [{"tipo": "reordenar_complicacao", ...}]` aparecendo literalmente pro usuário).

**Causa raiz 1 — capacidade que não existia:** só `criar_complicacao` era uma ação suportada; `reordenar_complicacao` (que o modelo tentou usar, com um formato razoável que ele mesmo inventou — `id_complicacao` + `nova_posicao`) não tinha schema nem handler nenhum. Implementado de verdade: `reordenarComplicacao` em `roteiro.ts` reposiciona um nó existente (achado por `id`, nunca por índice) calculando um `ordem` fracionário entre as vizinhas na posição alvo — reaproveitando o mesmo cálculo (`calcularOrdemParaPosicao`, extraído como função compartilhada) já usado por `adicionarComplicacao` na fatia anterior. `acoes.ts` ganhou o schema (`z.union` entre as duas formas de ação) e a rota `/mensagens` processa cada ação num loop com try/catch individual — uma ação com `id_complicacao` inexistente (ex: nó já excluído) é ignorada sem derrubar as outras ações da mesma resposta.

**Causa raiz 2 — bug real de vazamento, não comportamento de modelo:** `extrairAcoes`/`extrairPropostas` faziam `z.array(schema).parse(...)` na lista inteira de uma vez — se UM item não validasse (like `"reordenar_complicacao"` antes de existir suporte), o `.parse()` joga a lista inteira fora, caindo no `catch`. O bug: o `catch` devolvia `respostaBruta.trim()` — o texto ORIGINAL, incluindo o bloco JSON bruto que devia ter sido cortado — em vez do texto já sem o bloco. Corrigido calculando `texto = respostaBruta.slice(0, match.index).trim()` ANTES do try/catch (sempre corta o bloco, dá certo ou errado o parse) e trocando o parse de lista inteira por parse item-a-item com `safeParse` (uma ação/proposta inválida no meio não derruba as válidas da mesma resposta). Esse era um bug preexistente em `extrairPropostas` também (não só no `extrairAcoes` novo) — só nunca tinha sido notado porque o modelo raramente manda uma proposta malformada; ações estruturais novas, sendo mais fáceis do modelo "inventar" incorretamente, expuseram o gap.

**De quebra:** ajustada uma inconsistência de tom — numa resposta ao vivo, o agente executou a reordenação via `ACOES` mas ainda perguntou "faço a troca?" depois, como se não tivesse feito. `prompt.ts` agora deixa explícito que uma ação `ACOES` é aplicada imediatamente ao ser incluída (não é uma pergunta) — ou o agente já tem certeza e afirma o que fez, ou não inclui a ação ainda e só pergunta.

**Smoke test:** `acoes.test.ts`/`propostas.test.ts`: testes de vazamento reescritos pra verificar que o texto NUNCA inclui o bloco bruto (nem com JSON malformado, nem com ação/proposta não suportada), e novos testes confirmando que um item inválido no meio da lista não derruba os outros válidos. `roteiros.test.ts`: 3 testes novos (`reordenar_complicacao` move um nó de verdade sem afetar os outros; `id_complicacao` inexistente é ignorado sem quebrar a resposta; ação inventada pelo modelo nunca aparece como texto bruto na resposta). Suíte completa do backend com banco real: 68/68 passando. Ponta a ponta contra o OpenRouter real, reproduzindo o cenário do usuário (4 complicações preenchidas, pedido de reordenação em duas rodadas de conversa) — reordenou corretamente e sem vazar JSON; testado de novo depois do ajuste de tom e a resposta ficou afirmativa ("Invertido.") em vez de perguntar depois de já ter feito. Roteiros de teste apagados do banco de dev ao final. `npm run build`/lint limpos em frontend e backend.

## Revisão de código + simplificação — fim da Fase C

Cadência periódica do `CLAUDE.md` (fim de fase). Fase C acumulou bastante coisa desde a última passada (espinha repetível, excluir/reordenar manual e via agente, autonomia estrutural do agente, 3 rodadas de bugfix) — cobrindo `frontend/src/quadro/*`, `backend/src/agente/*`, `backend/src/roteiro.ts` e `backend/src/routes/roteiros.ts`.

**Review de código — achados:**
- Regra 8 do rascunho de instrução (seção 7 do MVP doc — "se o usuário editar um cartão direto, verifique coerência com campos relacionados na próxima interação") continua só documentada, não implementada — mesmo gap registrado desde a primeira revisão de fim de fase da Fase C. Ainda exige rastrear o que mudou entre interações (a arquitetura atual reenvia o esquema inteiro sem histórico de diffs), o que é fatia própria.
- Modo Diagnóstico (seção 7 do MVP doc) continua totalmente ausente — só existe o modo Condução. Seria o próximo candidato natural de fatia de agente, mas não é P0 pra fechar a Fase C (a fórmula da seção 4 não exige Diagnóstico pra completar A-C).
- `pontos_contato` do Antagonista (P1, seção 3.2 do MVP doc) segue sem campo na UI — aceitável, é P1.
- Caminhos de erro: toda rota que muta dado tem 400/404 tratado; ações do agente (`ACOES`) são fail-soft por item (uma ação inválida não derruba as outras nem quebra a resposta) — comportamento testado.

**Simplificação — achados e ações:**
- `backend/src/routes/roteiros.ts` tinha o mesmo bloco de parse-de-param+400 repetido em 9 rotas, parse-de-body+400 repetido em 5, e a query `UPDATE roteiros SET data = ... RETURNING ...` copiada 6 vezes. Extraídos 4 helpers (`parseParamsOu400`, `parseBodyOu400`, `buscarDataOu404`, `salvarRoteiro`) e todas as rotas migradas pra usá-los — mesmo comportamento (68/68 testes passando sem alterar nenhuma asserção), só sem a repetição. Achado no caminho: um narrowing do TypeScript pra `unknown` depois de um `if (x === undefined) return` produz `{} | null` (peculiaridade conhecida do compilador), quebrando a atribuição de retorno `unknown` de `adicionarComplicacao`/`reordenarComplicacao` — corrigido com uma anotação de tipo explícita (`let dados: unknown = data`), sem relação com lógica de negócio.
- `frontend/src/quadro/Quadro.tsx`: os três handlers de ação de espinha (`adicionarNovaComplicacao`, `excluirComplicacaoDaEspinha`, `moverComplicacaoNaEspinha`) repetiam o mesmo par `.then(atualiza estado + registra evento).catch(registra erro + loga)`. Extraído `aplicarAcaoDeEspinha(promessa, aoSucesso, contextoErro)` — cada handler mantém sua lógica de sucesso específica (inclusive o filtro extra de propostas no excluir) inline, só o `.catch` genérico foi compartilhado.
- `ProtagonistaCardCompleto`/`AntagonistaCard`/`IdeiaControladoraCard`: estruturalmente parecidos (header + `StatusSelect` + lista de `EditableField`), mas decidido NÃO genericizar — cada um tem um conjunto de campos genuinamente diferente (um usa `ChipsField`, outro tem uma nota extra), e a lista de campos já é short e direta. Abstrair pra um "CardGenérico(campos: [...])" trocaria legibilidade direta por indireção sem ganho real nesse tamanho.
- Nenhuma abstração criada "pra usar depois" sem uso encontrada; nenhum campo de Fase D (Mundo/Gênero aprofundado/Elenco) vazou pra dentro de nenhuma fatia da Fase C.

**Conclusão:** duas simplificações de duplicação de código aplicadas (backend e frontend), ambas verificadas sem regressão (68/68 testes de backend + smoke test manual no navegador criando/movendo/excluindo complicação depois do refactor). Os dois gaps de arquitetura de agente (regra 8, Modo Diagnóstico) ficam registrados como pendência conhecida, não bloqueiam o início da Fase D.

**Smoke test:** `npm run build`/lint limpos em frontend e backend; suíte completa do backend com banco real 68/68 passando depois do refactor de `roteiros.ts`; fluxo manual no navegador (criar → mover → excluir complicação) repetido depois do refactor de `Quadro.tsx`, comportamento idêntico ao de antes da simplificação. Roteiro de teste apagado do banco de dev ao final.

## Fatia: Cartão de Mundo da História (Fase D, 1/3)

**O que foi construído:** `frontend/src/quadro/MundoCard.tsx` — Época e Local lado a lado (`.sr-card__linha`, CSS novo no `shared.css`, reutilizável por outros cartões que precisem de 2 campos na mesma linha), Regras/custo abaixo, `StatusSelect`, e a nota de rodapé estática do protótipo ("↳ pano de fundo de toda a espinha", sem link funcional — diferente da Ideia Controladora, que aponta pro Clímax, o mapa de conexões da seção 5 do MVP doc diz que Mundo conecta "toda a espinha", não um nó específico). Layout replicado fielmente do `docs/design/Story_Render_Proto_tipo.dc.html`. `Mundo` virou interface nomeada em `tipos.ts` (era um tipo inline em `RoteiroData`), mesmo padrão de `Protagonista`/`Antagonista`/`IdeiaControladora`. Wired no `Quadro.tsx` igual aos outros cartões — nenhuma mudança de backend precisou (o schema `assets.mundo` já existia desde o setup inicial, e o mecanismo de propostas do agente já é genérico por path, funciona pra qualquer campo novo sem tocar em código).

**Por quê:** primeiro item da fórmula da Fase D (seção 4 do MVP doc) — Fase C fechada e revisada na fatia anterior.

**O que ficou pra depois:** as duas fatias seguintes da Fase D (Gênero & Promessa, Elenco de Apoio); nenhuma regra nova do agente pra testar coerência Mundo↔Complicações (seção 5 do MVP doc: "as regras do mundo geram os obstáculos das complicações") — a Fase D é "opcional, expande quando quiser" no MVP doc, não "o agente conduz pesado aqui" como a Fase C, então não adicionei regra de teste cruzado nesta fatia só-de-UI; fica pra quando (se) o produto quiser reforçar isso de verdade.

**Smoke test:** `npm run build`/lint limpos em frontend. Ponta a ponta via Playwright contra o agente real: criei um roteiro de teste, editei Época direto no cartão (persistiu, sobreviveu a reload), pedi ao agente uma descrição do mundo — ele propôs Local e Regras/custo sem precisar de nenhuma mudança de prompt (confirma que o mecanismo de `PROPOSTAS` já é genérico o bastante pra cobrir campos novos automaticamente), aceitei as duas sugestões pela UI e confirmei a persistência via API. Roteiro de teste apagado do banco de dev ao final.

## Fatia: Cartão de Gênero & Promessa (Fase D, 2/3)

**O que foi construído:** `frontend/src/quadro/GeneroCard.tsx` — `ChipsField` (multi-seleção) com os mesmos 6 gêneros já usados no onboarding (`GENEROS` de `onboarding/script.ts`), reaproveitando o componente já usado pro Antagonista, e `EditableField` pra Promessa emocional. Decisão de escopo: duplicar a lista de 6 strings em vez de criar um módulo compartilhado entre `onboarding/` e `quadro/` — mesmo padrão já usado pra `NIVEIS_OPCOES` do Antagonista (constante pequena, local ao componente que a usa). `Genero` virou interface nomeada em `tipos.ts`, igual `Mundo` na fatia anterior. Nenhuma mudança de backend — `generos` (campo de lista) já estava na lista de campos proibidos de proposta (`CAMPOS_PROIBIDOS` em `propostas.ts`) desde uma fatia anterior, então o agente já não tenta propor valor pra ele, só pra `promessa` (texto livre).

**Por quê:** segundo item da fórmula da Fase D.

**O que ficou pra depois:** só a fatia 3/3 da Fase D (Elenco de Apoio, campo de texto livre dentro do cartão de Antagonista — não é cartão próprio, é P2 como entidade modelada).

**Smoke test:** `npm run build`/lint limpos em frontend. Ponta a ponta via Playwright contra o agente real: criei roteiro de teste, cliquei no chip "Mistério" (persistiu), pedi ao agente a promessa emocional de uma história de mistério — ele propôs só `promessa`, confirmando que `generos` continua protegido mesmo com o campo novo na UI; aceitei a sugestão pela UI e confirmei a persistência via API. Roteiro de teste apagado do banco de dev ao final.

## Fatia: Elenco de Apoio (Fase D, 3/3) — fecha a fórmula da Fase D

**O que foi construído:** campo "Outros personagens relevantes" (texto livre) adicionado ao `AntagonistaCard` existente — não um cartão novo. Decisão direto da seção 3.6 do MVP doc: Elenco de Apoio & Subtramas como entidade modelada própria é **P2** ("arquitetura já prevê, mas não se constrói agora"), mas o próprio doc já resolve isso explicitamente pro v1 — "campo de texto livre dentro do cartão de Antagonista ('outros personagens relevantes'). Vira cartão próprio quando o core loop... estiver validado com usuários reais." `AntagonistaCard` ganhou 3 props novas (`elencoNotas`, `onSalvarElenco`, `sugestaoElenco`) em vez de reusar `onSalvar`/`sugestaoPara` do antagonista, porque `elenco_notas` é um asset irmão (`assets.elenco_notas.texto_livre`), não um campo do antagonista — path diferente, então precisa de um canal próprio no componente.

**Por quê:** terceiro e último item da fórmula da Fase D (seção 4 do MVP doc) — com essa fatia, os 14 itens da fórmula completa (Fase A→D) têm todos UI própria.

**O que ficou pra depois:** nada específico desta fatia. Zero mudança de backend de novo — `elenco_notas.texto_livre` não estava em `CAMPOS_PROIBIDOS`, então já era proponível pelo agente sem ajuste algum (confirmado por leitura de código, não forcei uma proposta ao vivo especificamente pra esse campo porque o teste natural da conversa divergiu pra outra coisa — ver smoke test).

**Smoke test:** `npm run build`/lint limpos em frontend. Ponta a ponta via Playwright: criei roteiro de teste, editei "Outros personagens relevantes" direto no cartão (persistiu). Testei o agente com uma mensagem listando personagens secundários com conflitos concretos — ele decidiu (corretamente, é uma decisão de conteúdo válida) que aquilo era material pra 3 complicações novas, não pro campo de elenco, e usou a autonomia estrutural (`ACOES criar_complicacao`) pra criar os 3 nós e propor conteúdo pra cada um — validação incidental de que a fatia de autonomia do agente continua funcionando bem numa conversa natural. Roteiro de teste apagado do banco de dev ao final.

**Marco:** com essa fatia, a fórmula completa da seção 4 do MVP doc (14 itens, Fase A→D) está com UI funcional de ponta a ponta.

## Revisão de código + simplificação — fim da Fase D

Cadência periódica do `CLAUDE.md` (fim de fase). Fase D foi só frontend (as 3 fatias reaproveitaram schema e mecanismo de propostas já existentes, zero mudança de backend) — cobrindo `frontend/src/quadro/*`.

**Review de código — achados:**
- As 3 fatias fizeram exatamente o que o escopo dizia: cada cartão replica o layout do protótipo, sem campo extra nem faltando nenhum dos listados na seção 3.4/3.5/3.6 do MVP doc.
- Elenco de Apoio implementado como campo simples dentro do Antagonista, não como cartão próprio — consistente com a classificação P2 (seção 1) e a exceção explícita de v1 documentada na seção 3.6. Nenhum vazamento de escopo P2.
- Nenhum caminho de erro novo introduzido — os 3 cartões reusam `salvar`/`sugestaoDoPath` já testados nas fatias anteriores, sem lógica nova de tratamento de erro pra revisar.
- Gaps de arquitetura de agente (regra 8, Modo Diagnóstico) continuam os mesmos da revisão da Fase C — Fase D não mexeu nisso, nem precisava.

**Simplificação — achados e ações:**
- Com 5 cartões no Quadro, o padrão de wiring em `Quadro.tsx` (`onSalvar`/`sugestaoPara` construindo o mesmo path `["assets", chave, campo]`) virou duplicação de verdade — 4 dos 5 cartões (Antagonista, Ideia Controladora, Mundo, Gênero) repetiam o mesmo par de closures trocando só a chave do asset. Extraído `assetHandlers(chave)` (retorna `{ onSalvar, sugestaoPara }` via closure sobre `salvar`/`sugestaoDoPath`), usado via spread nos 4 cartões — cortou ~15 linhas de repetição textual idêntica. Protagonista ficou de fora do helper porque indexa um array (`protagonistas[0]`), path genuinamente diferente (e o MVP doc já prevê múltiplos protagonistas no futuro).
- Reconsiderei a decisão da revisão da Fase C de não genericizar a estrutura JSX dos cartões (header + `StatusSelect` + campos) — com 5 cartões agora, ainda decido não fazer isso: os campos continuam genuinamente diferentes entre cartões (chips em dois deles, nota de rodapé em dois outros, layout de duas colunas só no Mundo), e o ganho de uma abstração de template seria pequeno frente à perda de legibilidade direta. Only a camada de *wiring* (dados→handlers) tinha duplicação real; a camada de *apresentação* (JSX) não tem.
- Nenhuma abstração "pra usar depois" sem uso encontrada.

**Conclusão:** uma simplificação aplicada (`assetHandlers` em `Quadro.tsx`), verificada sem regressão via build/lint limpos e teste manual de edição em campo depois do refactor (persistiu certo). Os dois gaps de agente conhecidos seguem registrados, sem ação — não são bloqueio pra nada que vem a seguir.

**Smoke test:** `npm run build`/lint limpos em frontend; suíte completa do backend 68/68 (não deveria ter mudado, e não mudou — Fase D não tocou backend). Fluxo manual no navegador (recarreguei o Quadro com os 5 cartões, editei um campo do Mundo depois do refactor de `assetHandlers`) confirmou persistência idêntica ao comportamento anterior. Roteiro de teste apagado do banco de dev ao final.

## Fatia: Modo Diagnóstico do agente

**Decisão de escopo tomada com o usuário antes de codar:** a forma visual do Modo Diagnóstico é o único ponto que os 3 docs-fonte deixam explicitamente em aberto (`STORY_RENDER_BRIEF_PROTOTIPO.md`: "Modo Diagnóstico... não precisa de forma visual ainda"). O protótipo tem só duas pistas — um botão "Revisar" na topbar e um toggle "Condução | Diagnóstico" no cabeçalho do painel do agente, sem mockup do conteúdo da aba Diagnóstico. Perguntei ao usuário sobre o gatilho (só botão manual vs. também automático ao mudar rascunho→testado, este último sem nenhuma referência visual) — escolheu só o botão manual, seguindo a única pista que existe.

**O que foi construído:**
- Backend: `backend/src/agente/diagnostico.ts` (`extrairDiagnostico`) — mesmo padrão de `acoes.ts`/`propostas.ts` (corta o bloco `DIAGNOSTICO: [...]` do texto sempre, parse item-a-item com `safeParse`). `prompt.ts` ganhou `PERSONA_E_REGRAS_DIAGNOSTICO`/`montarSystemPromptDiagnostico` — um system prompt totalmente separado do de Condução (não conversa, roda 10 testes de coerência derivados da seção 5 do MVP doc — mapa de conexões — e das regras não-negociáveis, devolve só a lista estruturada `{campo, problema, severidade}`). Rota nova `POST /:id/diagnostico` (sem histórico, uma mensagem fixa pedindo revisão) — não persiste em tabela própria (é um relatório efêmero, recalculado a cada clique, diferente de `propostas` que precisa ficar pendente entre sessões); o evento fica registrado via o mecanismo de `eventos` já existente, chamado do frontend.
- Frontend: `AgentePanel.tsx` (novo) — wrapper que troca `AgenteChat` por `DiagnosticoPainel` conforme a aba ativa, mas mantém o `AgenteChat` sempre montado (só com `display:none` quando não visível) pra não perder o histórico de chat ao alternar de aba — achado de design antes de implementar: renderização condicional (`{aba === "x" && <Componente/>}`) desmontaria o chat e resetaria a conversa. `DiagnosticoPainel.tsx` (novo) — lista os itens com cor por severidade (aviso=latão, crítico=vinho, mesma paleta já usada nos badges de status). Botão "Revisar" na topbar (`Quadro.tsx`), estilo replicado do protótipo (preenchido, accent vinho) — dispara a revisão e já troca a aba pra Diagnóstico.

**Achado ao testar ao vivo (não hipotético):** mesmo com a regra do prompt "nunca sinalize campo vazio como problema", o modelo continuou fazendo isso em ~metade das rodadas (ex: "Ideia Controladora — Valor e Causa completamente vazios" como item crítico). Reforcei o texto da regra (deu uma melhora mas não eliminou) e, seguindo o mesmo padrão de defesa em camadas já usado pra `CAMPOS_PROIBIDOS` em `propostas.ts`, adicionei um filtro por regex em `extrairDiagnostico` que descarta qualquer item cujo `problema` mencione "vazio", "não preenchido", "falta preencher" etc. — testado ao vivo depois do filtro: 3 rodadas seguidas só com itens de conteúdo real (Want×Need em tensão genérica, Aposta vaga), zero ruído de campo vazio.

**O que ficou pra depois:** gatilho automático (rascunho→testado) — não pedido nesta fatia, sem referência visual; regra 8 do agente (coerência após edição manual) e `pontos_contato` do Antagonista continuam pendentes, sem relação com esta fatia.

**Smoke test:** 9 testes novos — `diagnostico.test.ts` (parse do bloco, array vazio, múltiplos itens, item com severidade inválida descartado sem derrubar os outros, item sem campo/problema descartado, JSON malformado, prosa antes do bloco ignorada, filtro de "campo vazio" descarta só os itens ofensivos) e 4 em `roteiros.test.ts` (retorna itens do bloco + confirma system prompt correto enviado; array vazio quando sem problema; 404 pra roteiro inexistente; 502 se OpenRouter falhar). Suíte completa do backend com banco real: 81/81 passando. Ponta a ponta contra o OpenRouter real: cliquei "Revisar" na topbar, aba trocou pra Diagnóstico automaticamente, itens renderizaram com cor por severidade (crítico=vinho confirmado visualmente); mandei uma mensagem no chat, troquei pra Diagnóstico e voltei pra Condução — histórico da conversa intacto (confirma que o `AgenteChat` não desmonta ao trocar de aba). Roteiros de teste apagados do banco de dev ao final. `npm run build`/lint limpos em frontend e backend.

## Revisão de código + simplificação — Modo Diagnóstico

Cadência periódica do `CLAUDE.md`. Fatia grande (arquitetura de agente nova), cobrindo `backend/src/agente/*` e `frontend/src/quadro/{Quadro,AgentePanel,AgenteChat,DiagnosticoPainel}.tsx`.

**Review de código — achados:**
- A fatia fez exatamente o escopo combinado: só gatilho manual, sem gatilho automático (não pedido, sem referência visual).
- Dos dois modos previstos desde o início do projeto (seção 7 do MVP doc, "agente único, dois modos"), os dois agora existem de verdade — Condução e Diagnóstico. O gap de arquitetura de agente que resta é só a regra 8 (verificar coerência após edição manual do usuário), ainda documentada como pendência, sem mudança nesta fatia.
- Caminhos de erro: 404 (roteiro inexistente) e 502 (OpenRouter fora do ar) tratados e testados na rota nova, mesmo padrão das outras rotas de agente.

**Simplificação — achados e ações:**
- `propostas.ts`, `acoes.ts` e `diagnostico.ts` chegaram a ter a mesma lógica de extração duplicada 3 vezes: regex de marcador, corte do texto antes do try/catch, parse item-a-item com `safeParse`. Essa duplicação já tinha causado um bug real antes (o fix de "sempre cortar o marcador do texto, mesmo com JSON inválido" precisou ser aplicado separadamente em `propostas.ts` e `acoes.ts`, numa fatia anterior) — com uma terceira ocorrência confirmando o padrão, extraí `blocoMarcado.ts` (`extrairBlocoMarcado<T>`, genérico por schema Zod) e os 3 módulos viraram wrappers finos por cima dele. Verificado sem regressão: os 81 testes existentes (que já cobrem os casos de borda de cada um dos 3 formatos) continuam passando inalterados, sem precisar reescrever nenhuma asserção.
- `Quadro.tsx` está em 221 linhas — cresceu mas continua organizado em seções claras por responsabilidade (estado, handlers de propostas, handlers de ações da espinha, `revisar`). `revisar()` não se encaixa no helper `aplicarAcaoDeEspinha` (formato genuinamente diferente: mexe em 3 pedaços de estado, não só dado+evento) — decisão de não forçar. Vale revisitar com um hook próprio (`usePropostas`/`useDiagnostico`) se o arquivo continuar crescendo, mas dividir agora seria extrair estrutura sem necessidade real ainda.
- Nenhuma abstração "pra usar depois" sem uso encontrada.

**Conclusão:** uma simplificação real aplicada (`blocoMarcado.ts`), motivada por um padrão de bug já visto na prática, não especulativo. `Quadro.tsx` sinalizado como "observar", sem ação — dividir agora seria prematuro.

**Smoke test:** `npm run build`/lint limpos em frontend e backend; suíte completa do backend com banco real 81/81 passando depois do refactor de extração compartilhada — nenhum teste precisou mudar, confirmando que o comportamento externo de `extrairPropostas`/`extrairAcoes`/`extrairDiagnostico` ficou idêntico.

## Marco: MVP declarado pronto (2026-07-09)

O usuário revisou a checklist da seção 9 do `STORY_RENDER_MVP_MCKEE.md` ("Critério de pronto pro MVP") junto comigo e decidiu fechar o MVP nesse ponto.

**Estado de cada critério da seção 9 no momento da decisão:**
- ✅ Modo Condução cobre os 3 cartões P0 sem exigir Diagnóstico pra funcionar.
- ✅ Esquema persiste — reload não perde nada.
- ✅ Edição direta e edição via chat ficam sincronizadas sem duplicar conteúdo.
- ⚠️ Ao menos 1 usuário completa a espinha inteira (Fase A→D) — quase lá: o roteiro do Tonico tem Mundo da História inteiro preenchido e os 3 roteiros reais (Fernando, Joana, Tonico) têm gênero selecionado, mas nenhum tem Promessa emocional nem "Outros personagens relevantes" preenchidos ainda (cartões de Fase D só existem desde a sessão anterior).
- ❓ Testado com 3–5 usuários reais nas Fases A–C — 3 usuários reais (Fernando, Joana, Tonico) passaram pelo produto e geraram bugs reais que viraram fix; bate o mínimo do critério, mas é uma validação de experiência que só o usuário podia confirmar, não algo que eu construo.

**P1 (seção 1) que ficou de fora, deliberadamente, na decisão de fechar:**
- Divisão visual em Atos/Partes na espinha.
- Pontos de contato do Antagonista (campo existe no schema, sem UI).
- Regra 8 do agente (verificar coerência após edição manual do usuário).
- Gatilho automático do Modo Diagnóstico (rascunho→testado) — só o botão manual "Revisar" existe.

**P0 está 100% fechado.** P2 e os não-objetivos explícitos (seção 1) continuam corretamente de fora, nunca construídos.

**O que isso significa daqui pra frente:** o `CLAUDE.md` continua valendo como processo (fatias pequenas, loop de scope→implementar→testar→documentar→commit), mas o projeto deixa de ser "MVP em construção" e vira "produto com MVP fechado, com uma lista conhecida de P1 pendentes e possíveis próximos passos" (retomar os P1 acima, abrir um novo template além de McKee, ou validação com mais usuários reais — nenhuma dessas direções foi decidida ainda).

---

# PIVÔ: Laboratório de Generative UI (CopilotKit) — jul/2026

Decisão do usuário: transformar o Story Render em projeto de aprendizado de Generative UI, testando os 3 níveis da taxonomia CopilotKit (controlled/AG-UI → declarative/A2UI → open-ended/MCP Apps). App novo (`web/` + `agent/`) reaproveitando o núcleo (schema jsonb, mutações de `backend/src/roteiro.ts`, prompts McKee, gramática visual); `frontend/`/`backend/` viram legado de referência até a paridade do nível 1. Agente em LangGraph Python. Plano completo em `.claude/plans/synthetic-juggling-hamster.md`.

## Fatia 0.1: agent/ — grafo mínimo servido via AG-UI

**O que foi construído:** `agent/` (uv, Python 3.12): LangGraph de um nó (`conversar`) chamando OpenRouter via `ChatOpenAI(base_url=openrouter)`, exposto por FastAPI com `add_langgraph_fastapi_endpoint` do pacote `ag-ui-langgraph` (rota `/agent`), mais `/health`.

**Por quê:** fundação da Fase 0 — provar o caminho AG-UI antes de qualquer domínio. O pacote `ag-ui-langgraph` traduz o stream do LangGraph em eventos AG-UI automaticamente (evita codificar `TextMessageContentEvent` etc. na mão, como fazem os tutoriais mais antigos).

**Achados:**
- `ag_ui_langgraph` já exporta suporte nativo a **A2UI** (`a2ui_tool`, `get_a2ui_tools`, `A2UIGuidelines`, `StateStreamingMiddleware`) — a Fase 2 (nível declarativo) tem caminho pavimentado no próprio pacote.
- O CLI oficial `npx copilotkit create` agora exige login em workspace CopilotKit (Ops/Clerk) + licença — evitado de propósito; scaffold manual com pacotes open-source.
- `ChatOpenAI` recusa `api_key=""` na construção (não só na chamada) — placeholder `"sem-chave"` permite boot sem credencial (testes/CI); a chamada real dá 401 claro.
- Python do sistema é 3.9; `uv` (via brew) gerencia o 3.12 do projeto.

**O que ficou pra depois:** frontend (fatia 0.2), chave real no `.env` (não existe neste dispositivo), system prompt/domínio, persistência.

**Smoke test manual:** `uv run uvicorn main:app --port 8000` → `/health` responde `{"ok":true}`, `/openapi.json` lista rotas `/agent` e `/agent/health`. Fluxo com LLM real só na fatia 0.3 (precisa da chave).

## Fatia 0.2: web/ — Next.js + CopilotKit ligado ao agente via AG-UI

**O que foi construído:** `web/` (create-next-app, TS, app router): route handler `/api/copilotkit` com `CopilotRuntime` + `LangGraphHttpAgent` apontando pro Python (`AGENT_URL`, default `127.0.0.1:8000/agent`) e `ExperimentalEmptyAdapter` (todo LLM roda no agente); página única com `<CopilotKit agent="story_agent">` + `<CopilotChat>`.

**Por quê:** segunda metade da fundação Fase 0 — a ponte AG-UI browser→runtime→Python, sem nenhum domínio ainda.

**Gotchas/achados:**
- **O grafo LangGraph PRECISA de checkpointer** — o adaptador `LangGraphAgent` (ag-ui-langgraph) chama `aget_state` a cada run e explode com `ValueError: No checkpointer set` (e o cliente vê só um 200 de stream vazio, erro nenhum). `MemorySaver` resolve na Fase 0; Postgres checkpointer é fatia da Fase 1.
- O runtime 1.63 **não fala mais GraphQL** — protocolo novo por método JSON (`{"method":"info"}`) + SSE. O `info` expõe os agentes registrados e as flags `a2uiEnabled`/`openGenerativeUIEnabled` (caminho oficial pras Fases 2 e 3).
- `CopilotChat` não aceita `style` (só `className`/labels) nessa versão.

**O que ficou pra depois:** fatia 0.3 (smoke test E2E com chave real do OpenRouter — não existe `.env` neste dispositivo), CLAUDE.md refletindo o pivô.

**Smoke test manual (sem chave):** POST AG-UI direto no Python flui `RUN_STARTED → STEP_STARTED(conversar) → on_chat_model_start` e morre no 401 do OpenRouter (exatamente onde deveria); `curl -X POST localhost:3000/api/copilotkit -d '{"method":"info"}'` responde com `story_agent` registrado, `mode: sse`. `npm run build` limpo.

## Fatia 0.3: smoke test E2E com chave real — Fase 0 fechada

**O que foi feito:** nenhum código novo — só o teste que faltava, com `agent/.env` criado pelo usuário. (1) POST AG-UI direto no Python: resposta real do `anthropic/claude-sonnet-4.5` streamada token a token (`TEXT_MESSAGE_START/CONTENT` com deltas). (2) No browser (`localhost:3000`): mensagem no CopilotChat → resposta correta renderizada, atravessando browser → runtime Next → AG-UI → LangGraph → OpenRouter.

**Achado:** o stream AG-UI repassa eventos `RAW` do LangGraph inteiros (cada delta vem embrulhado no evento `on_chat_model_stream` completo, com metadata) — verboso; se virar problema de payload, investigar como suprimir os RAW no adaptador.

**Cosmético pendente (não bloqueia):** o `CopilotChat` não ocupa a altura toda da tela — sobra um vão abaixo. Ajustar via `className`/CSS quando a UI do quadro entrar na Fase 1.

**Fase 0 completa.** Próxima fatia: CLAUDE.md refletindo o pivô; depois, Fase 1 (estado compartilhado do roteiro + cartão de Protagonista).
