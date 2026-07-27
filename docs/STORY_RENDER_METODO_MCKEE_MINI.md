# McKee Mini — Método v2
_Co-criado passo a passo com Humberto (sessões de 2026-07-26 em diante). v2: revisão de coerência, fluxo e oportunidades — mudanças listadas no §18 para veto. Espinha completa e validada contra roteiros consagrados._

---

## 1. Pedra fundamental — o que o usuário leva

**O McKee Mini termina quando a história do usuário está renderizada: um mapa visual da estrutura, sobre uma fundação sólida (McKee), que dá pra entender de relance, editar e conectar as partes.**

Duas facas de corte derivadas:
- **Se uma informação não aparece no mapa, ela é candidata a sair do Mini.** O produto final é uma imagem manipulável, não texto nem ficha.
- **A régua única de qualidade: "dá pra desenhar?"** Toda peça de todo card responde a ela. "Ele fica triste" não se desenha; "ele guarda o prato intocado na geladeira pela terceira noite" se desenha. É a mesma régua para rotina, pancada, preço, ação e final — o usuário aprende UMA pergunta e ela serve pra história inteira.

## 2. O mapa — canvas radial

- **Card-coração no centro** (a espinha, §5); cards principais orbitando com **ligações visíveis** (§14); sub-cards; **periferia** para imagens, docs e tabelas.
- Navegação por **pan, zoom, clique e escrita**.
- **Alfabeto pequeno** (teto 5–7 tipos), cada tipo com identidade visual própria — o usuário aprende a *ler a forma* e reconhece o padrão em qualquer roteiro. Atual: espinha, Protagonista, Força Antagônica, Arco.
- **Estados de card (3, visuais):** **fantasma** (hipótese plantada pelo agente — translúcido) · **rascunho** (dado existe, navalhas não rodaram) · **firme** (passou nos testes). O mapa mostra de relance o que está sólido e o que ainda é palpite.
- **Empty state = sonda.** Card vazio exibe sua pergunta-sonda como placeholder ("O que a gente VÊ ele fazendo?") — o mapa ensina o que falta sem manual.
- A hierarquia visual (centro → órbita → sub-cards → periferia) já É a hierarquia de importância do método.

## 3. O agente

Componente de diálogo com UI reconhecível de IA generativa. É de onde os cards **se renderizam ao vivo** conforme a conversa produz dado.

Comportamentos permanentes:
- **Colheita em qualquer ordem** — o braindump pode conter o antagonista, o clímax, o passado. Nada se perde por chegar "cedo".
- **Bifurcações com 2–3 opções e efeitos**, nunca com a escolha do agente — cada candidata mostra o que amarra no material; o usuário decide, combina ou traz uma melhor.
- **Edição retroativa** — mudou algo com dependentes, o agente avisa quais cards dependem da versão antiga e oferece re-testar. Nunca reescreve sozinho.
- **Uma pergunta central por turno** — decisões pequenas podem vir agrupadas, mas a quente é uma só.
- **Flexão natural** — as fórmulas dizem "ele" por economia; o agente flexiona pelo protagonista real (ela/ele).

## 4. O fluxo de uma sessão

1. **Braindump** — "Me conte o que você já tem sobre a história que você quer estruturar. Pode vir bagunçado."
2. **Explicação opcional** — pular ou ver a espinha. Se ver: o agente mostra a espinha **preenchida com uma história famosa** (ex. Procurando Nemo) — exemplo pronto ensina em 10 segundos o que parágrafos não ensinam — e explica o que fará: preencher lacunas, testar critérios, provocar construtivamente, desenvolver os cards.
3. **Primeira renderização** — o agente distribui o braindump pelos cards: o que tem material vira **rascunho**, o que não tem fica vazio com a sonda à mostra. O usuário *vê* o estado da própria história no primeiro minuto — e ouve que buraco no fim é normal.
4. **Lapidação** — a espinha sugere a ordem (1→6), o usuário pode pular; a colheita garante que nada chegue "na hora errada". Cada card: sondas → navalhas rodadas na frente do usuário → firme.
5. **Leituras emergentes** — no meio do caminho, quando o material amadurece: valor em jogo, força unificadora (2–3 candidatas), anel do passado, sabor (widget). Leitura aprovada vira dado/card/ligação.
6. **Formatura** — com a espinha firme: o agente **lê a fórmula inteira em voz alta**, do "Todo dia" ao "desde então" — o momento em que o usuário escuta que tem uma história. O Arco se mede, o pôster se monta, as pendências viram lista nomeada de próximos passos.

**Orçamento de interações (meta original: 20–40):** braindump+explicação 1–2 · card 1: 2–3 · card 2: 3–5 · corrente (2–4 elos): 4–12 · Escolha: 3–5 · card 5: 2–4 · card 6: 2–3 · leituras: 3–5 · formatura: 1. **Total: ~21 a 40.** Dentro da meta por construção.

## 5. A espinha — o card-coração

Fórmula de completar: lida em voz alta, é uma história inteira. Cada lacuna abre um card com o nome da própria lacuna — com um par de exceções espelhadas: a 1 chama-se **"O Mundo como Era"** e a 6, **"O Mundo como Ficou"** *(proposta v2)*. Chassi: Story Spine da Pixar + diferenciais McKee soldados (desejo explícito, dilema com preços, escalada).

| # | Card | Fórmula |
|---|---|---|
| 1 | **O Mundo como Era** | "Todo dia o(a) PROTAGONISTA segue ROTINA, isso porque no PASSADO ___" |
| 2 | **Até Que Um Dia** | "Até que um dia EVENTO, e por isso PROTAGONISTA passou a querer DESEJO" |
| 3 | **Tenta, Mas** (repetível, 2–4) | "Ele tenta TENTATIVA, mas PANCADA" |
| 4 | **A Escolha** | "Até que só restou a escolha: ou ESCOLHA_A, pagando PREÇO_A; ou ESCOLHA_B, pagando PREÇO_B" |
| 5 | **E Então Ele** | "E então ele AÇÃO" |
| 6 | **O Mundo como Ficou** | "E desde então, todo dia ele NOVA_ROTINA" |

Decisões estruturais: quebra+desejo **fundidos** na lacuna 2 (par indissociável; "e por isso" carrega a causalidade na gramática) · preços **dentro da frase** na lacuna 4 (dilema completo legível na espinha) · lacuna 6 = fórmula da 1 com **"isso porque" implícito = a própria história** (a espinha morde o próprio começo) · **liberdade de adaptação** de redação sempre — esqueleto, não camisa de força (ex.: "Todo dia Fernando passa o dia no computador ignorando os pedidos da mãe pra procurar emprego. Isso porque no passado o pai abandonou a família e a mãe ficou permissiva.").

## 6. Card 1 · O Mundo como Era

PROTAGONISTA vira card por slot; ROTINA e PASSADO são texto interno (PASSADO = candidato a card na versão completa).

| Peça | Teste | Sonda |
|---|---|---|
| Protagonista | Imagem, não categoria | "Quem é? Me dá o nome e me mostra ele numa cena." |
| Rotina | Dá pra desenhar | "O que a gente VÊ ele fazendo?" |
| Rotina | Aguenta mais um ano (estável ≠ confortável) | "Se nada acontecer, essa vida continua igual por mais um ano?" |
| Passado | Teste do apagador (causa, não decoração) | "Como exatamente esse acontecimento fabrica essa rotina?" |
| Frase inteira | **Cena de Abertura** | "Qual é a imagem que abre essa história?" |

Guarda-corpos: "ainda não sei o passado" → pendência (evita trauma-de-formulário); genérico → "teve um dia em que isso quase quebrou?". Validado: Nemo, Up, Breaking Bad, Chefão, Matrix, Legalmente Loira — 0 quebras; exemplo ruim reprova 4/5.

## 7. Card 2 · Até Que Um Dia

Refinamento (descoberto no Matrix): "passou a querer" = o desejo **nasce OU ganha alvo concreto** no evento.

| Peça | Teste | Sonda |
|---|---|---|
| Evento | Datado, não estado | "O que aconteceu NAQUELE dia?" |
| Evento | Rompe sem volta | "No dia seguinte, dava pra fingir que nada aconteceu?" |
| Desejo | **A Foto da Vitória** | "Se ele conseguir, qual é a foto? O que a gente vê?" |
| O "por isso" | Causalidade nua | "Antes desse dia, ele já queria exatamente isso?" |
| Frase inteira | **A Cena Prometida** | "Que cena o leitor já sabe que vai ter que acontecer?" |

**Foto ≠ Promessa:** a Foto mora na cabeça do protagonista e pode nunca acontecer (Casablanca: Ilsa ficando); a Promessa mora na cabeça do leitor e é obrigada a acontecer (Rick decide no aeroporto). Em Breaking Bad divergem por completo — nesse vão o drama vive. **Cena Prometida aprovada → card-fantasma na posição da lacuna 5** com a hipótese de clímax. Simetria: card 1 amarra a abertura, card 2 amarra o final — direção visível com duas lacunas. Validado: 6 roteiros; exemplo ruim reprova 4/5.

## 8. Card 3 · Tenta, Mas (repetível)

Cada volta é um card. O slot TENTATIVA evita o defeito nº 1 de iniciante (protagonista passivo levando desgraças). **Corrente:** a 1ª tentativa nasce do DESEJO; cada seguinte, da pancada anterior. **2–4 elos**; a parada real é o Esgotamento.

Testes internos: **Por causa disso** ("Por que ele tenta ISSO agora? O que a última pancada empurrou pra cá?") · **Tem rosto** ("Quem ou o que bateu? Me mostra em cena.") · **Fecha uma porta** ("Depois dessa pancada, essa tentativa ainda existe como opção?").

Testes de relação: **Teste da Troca** ("Se eu trocar esse Mas com o anterior, a história quebra?" — se não quebra, não há escalada) · **Teste do Esgotamento** ("Sobrou tentativa barata?" — quando não sobra, a Escolha chegou).

Renders: a corrente **cresce** elo a elo (escalada visível; Mas trocável aparece do mesmo tamanho do vizinho); o card da Escolha fica **apagado até o Esgotamento reprovar** — a Escolha é conquistada pela história, não é a próxima tarefa. Colheita: cada rosto de pancada alimenta a Força Antagônica. Validado 5/5; descoberta lateral: a pancada pode vir depois de uma vitória ("consegue, mas..."). Exemplo ruim ("tenta de novo, não consegue de novo") reprova nos 4 aplicáveis.

## 9. Card 4 · A Escolha

Dilema real (dois bens irreconciliáveis ou dois males) com **preços conhecidos antes da escolha** — por isso os 4 slots na frase.

| Peça | Teste | Sonda |
|---|---|---|
| Opções | **Qual é a certa?** (navalha-mãe) | "Das duas, qual é a certa?" — aprova se dói ("nenhuma", "as duas"). Fácil → engordar o lado fraco: "o que ele perde se escolher A? e B?" |
| Preços | Dá pra desenhar a perda | "Me mostra cada preço em cena — o que a gente VÊ ele perdendo?" |
| Opções | **A porta C está trancada?** | "Que saída esperta alguém no sofá sugeriria? Por que não funciona?" |
| Ligação c/ card 2 | **O desejo está na mesa** | "Em qual das duas mãos está o que ele passou a querer?" (fora → outra história, ou desejo mudou → edição retroativa) |
| Frase inteira | **A Cena da Escolha** | "Onde ele está quando escolhe? O que tem na frente dele?" |

**Leitura do anel:** uma das mãos quase sempre segura o PASSADO da lacuna 1 (Coral no preço do Marlin; os móveis da Ellie; o "jurei não ser" do Michael). Aprovada → ligação **A Escolha → O Mundo como Era** — a espinha começa a fechar o anel. Validado 6/6; exemplo ruim ("desistir ou continuar lutando") reprova 5/5 — o mais massacrado, bom sinal: é onde iniciante mais se engana.

## 10. Card 5 · E Então Ele

A fórmula mais leve com as relações mais pesadas. **Crise decide, clímax age** — se a Escolha está firme, o clímax quase se escreve sozinho (iniciante sofre com finais porque tenta a 5 sem ter construído a 4).

| Peça | Teste | Sonda |
|---|---|---|
| Ação | **É a escolha em ação** | "Essa ação é qual das duas mãos? Me mostra a opção escolhida acontecendo." |
| Ação | Irreversível | "O que existe depois que não existia? Dá pra desfazer?" (reversível = elo de Tenta, Mas disfarçado) |
| Ação | Acontece na tela (sincronia) | "A gente VÊ o desejo ganhar ou perder? Em que cena, com quem presente?" |
| Ligação c/ card 2 | **Paga a Cena Prometida** | "A história prometeu [fantasma] — essa ação paga?" Paga → **o fantasma se dissolve no card real**. Não paga → mudar a ação OU aceitar promessa evoluída e re-testar a 2. |
| Integração | **O sabor** (widget) | Derivação + checagem de intenção: "seu final é [sabor] — é essa a história que você quer contar?" |

**Widget do sabor:** 2×2 **Foto da Vitória realizada? × Preço pago** — feliz · agridoce (Casablanca) · vitória vazia (Michael na cadeira do pai) · tragédia. Quadrante **aceso por derivação, nunca rotulado à mão**; os outros três visíveis e apagados. **Clicar num apagado pergunta ao agente o que teria que mudar na história** — escolha consciente mudando a história, não a etiqueta. Validado 6/6; exemplo ruim ("venceu e tudo deu certo") reprova em todos — o final de todo primeiro rascunho, recusado por construção.

## 11. Card 6 · O Mundo como Ficou

Fórmula da lacuna 1 com o "isso porque" implícito = a própria história. **Rima pedagógica:** as navalhas do card 1 voltam para fechar a última.

| Peça | Teste | Sonda |
|---|---|---|
| Nova rotina | Dá pra desenhar | "O que a gente VÊ ele fazendo agora, num dia comum?" |
| Nova rotina | Aguenta mais um ano | "Se nada acontecer, essa vida nova continua?" (instável = um Mas disfarçado de final) |
| Frase × card 1 | **O Diff** (medição, não pergunta) | Agente mostra 1 × 6: "começou X, terminou Y — esse é o arco." Diff zero → "intencional (resistente) ou esquecimento?" |
| Frase | Nada vazando | "Essa frase abre pergunta nova? De propósito (gancho) ou escapou?" |
| Integração | **A Cena-Espelho** | "Me mostra ele na MESMA situação da abertura — o que acontece diferente?" (Nemo: a cena da escola, invertida) |

Adaptação prevista: protagonista morto → o "desde então" passa pro mundo que ficou. Validado 5/5; exemplo ruim ("viveu feliz e aprendeu o valor da amizade") reprova em tudo — moral pregada: se a lição cabe numa frase dita, corta-se a frase.

## 12. Card Arco — por medição

O Diff vira card. **Conteúdo mínimo:** a frase do diff + referências aos cards 1 e 6 (se eles mudarem, o Arco **re-mede** — edição retroativa de graça). **Lugar:** a costura do anel (ligação 6 → 1) — o anel termina num card, não num fio vazio. **Render:** as duas cenas-espelho lado a lado + a frase do diff = **o pôster da história**, capa compartilhável do roteiro renderizado. **Ponte estratégica:** na versão completa, cresce pra Ideia Controladora ("saiu de X pra Y... por quê?").

## 13. Nascimento de cards — três modos, nenhum por formulário

- **Por slot** — Protagonista: a lacuna 1 pede o nome, card criado na hora.
- **Por colheita** — Força Antagônica: rostos coletados desde o turno 1 (braindump, PASSADO, EVENTO, pancadas); com 2–3, o agente oferece **2–3 candidatas a força unificadora** mostrando o que cada uma amarra; aprovada, vira card. Campos: **Força + Rostos** (cada um linkado à origem). "Rosto" venceu "Avatar" (jargão) e "Face" (anatômico) — a sonda "quem ou o que bateu?" já pagou o vocabulário. Rosto solto é legítimo (subtrama/segunda força — versão completa), nunca encaixe forçado. Nunca por slot: "quem é o vilão?" fabrica vilão de papelão (a força raramente é uma pessoa: Nemo = "o oceano perigoso" — o medo do próprio Marlin confirmado pelo mundo).
- **Por medição** — Arco: dois cards comparados, zero perguntas novas.

Os três emergem do material — assinatura do produto. Conteúdo dos satélites: colher das lacunas, não especular (a 2 já produziu o desejo e a Foto da Vitória do Protagonista; a corrente produz os Rostos).

## 14. O mapa de ligações

Todas as ligações do Mini, pro renderizador não precisar inventar nenhuma:

| Ligação | De → Para | Nasce quando |
|---|---|---|
| Sequência | cada card da espinha → o seguinte | com a espinha |
| Batismo | O Mundo como Era → Protagonista | o slot do nome é preenchido |
| Motor | DESEJO (card 2) → 1º Tenta, Mas | o 1º elo abre |
| Corrente | pancada de um elo → tentativa do seguinte | cada elo novo |
| Fantasma | Cena Prometida (card 2) → posição do card 5 | teste de integração do card 2 passa |
| Rosto | cada pancada → Força Antagônica | unificação aprovada |
| Anel | A Escolha → O Mundo como Era | leitura do anel aprovada |
| Costura | card 6 → card 1, através do card Arco | o Diff é medido |

## 15. O storyboard de graça

Oportunidade estrutural: **os testes de integração já produzem os key frames da história** — sem nenhuma pergunta extra, a sessão completa entrega uma sequência de imagens desenháveis:

1. **Cena de Abertura** (card 1) · 2. **Foto da Vitória** (card 2 — a imagem-alvo, que pode nunca acontecer) · 3. **Rosto de cada pancada em cena** (um por elo da corrente) · 4. **Cena da Escolha** (card 4) · 5. **A ação na tela** (card 5) · 6. **Cena-Espelho** (card 6) · 7. **O pôster** (Arco: abertura + espelho + diff).

De 8 a 11 imagens = o roteiro como storyboard. Pro estudo de Generative UI, este é o pipeline de renderização pronto: cada teste que passa emite um prompt visual.

## 16. O padrão de construção de card (template)

1. Fórmula com slots; conjunções carregam causalidade ("isso porque", "e por isso", "por causa disso", "pagando"). 2. Teto de 5 testes: navalha por peça + integração (ou relação entre irmãos). 3. Sonda em linguagem de história; o agente nunca diz "critério 3"; elogio aponta o critério que passou. 4. O teste de integração gera imagem. 5. Validação dupla: roteiros consagrados diversos (onde resistir, evoluir a fórmula — nunca force-fit) + exemplo ruim que os testes precisam reprovar. 6. Guarda-corpos: "ainda não sei" → pendência, nunca bloqueio; genérico → uma provocação e segue. 7. Vocabulário que se ensina sozinho: nomes de campo nascem nas sondas. 8. Leituras ≠ testes: leitura é oferecida e derrubável; aprovada, vira dado/ligação/widget/card.

## 17. Decisões e sacrifícios conscientes

- Começamos pelo fim (o que o usuário leva); do centro pra fora (espinha antes dos satélites).
- Rachadura ("o que ele evita encarar") sacrificada pela simplicidade → **conta paga** na lacuna 4 pela leitura do anel.
- Aposta → paga parcialmente pelos PREÇOS da lacuna 4.
- Valor em jogo: leitura oferecida; pendente visível × metadado.
- Herdado do MVP: archplot, protagonista único.
- **O Mini gera histórias mais simples — e está certo assim.** Trançados de linhas paralelas, contratos de gênero, calendários e artefatos têm endereço na versão completa; o Mini entrega o esqueleto que aguenta peso e dá pra onde crescer.

## 18. Changelog v2 (para veto do Humberto)

1. **Removido o teste de compressão do Fernando** — validar o Mini contra roteiro construído em modelo mais complexo não é critério justo nem necessário. Validação oficial: roteiros consagrados + exemplos ruins que reprovam.
2. **Novo §4 (fluxo de uma sessão)** — a jornada inteira em 6 passos, incluindo a **primeira renderização** (braindump distribuído nos cards, buracos visíveis com sonda à mostra) e a **formatura** (leitura em voz alta + pôster + pendências).
3. **Orçamento de interações contado: ~21–40** — a meta original (20–40) agora está verificada por construção, card a card.
4. **Estados de card: fantasma · rascunho · firme** — modelo mínimo de 3 estados visuais.
5. **Empty state = sonda como placeholder** — o card vazio ensina o que falta.
6. **§14 mapa de ligações** — as 8 ligações consolidadas numa tabela (insumo direto pro renderizador).
7. **§15 storyboard de graça** — nomeada a oportunidade: os testes de integração já produzem 8–11 key frames sem pergunta extra.
8. ~~**Proposta de nome:** card 6 = "O Mundo como Ficou"~~ — **aprovado em 2026-07-27.** Fecha o par espelhado com "O Mundo como Era" (era ↔ ficou), reforçando a rima estrutural que os testes já fazem.
9. **Onboarding: exemplo pronto** — na explicação opcional, mostrar a espinha preenchida de uma história famosa (Nemo) em vez de só descrever.
10. **Régua única promovida ao §1** — "dá pra desenhar?" como A pergunta de qualidade do produto inteiro.
11. **Flexão de gênero** registrada como comportamento do agente.

## 19. Pendências

- [ ] Veto/aprovação do restante do changelog v2 (§18)
- [x] **Nome do card 6 (§18.8): "O Mundo como Ficou"** — aprovado em 2026-07-27
- [ ] **Cards satélites (Protagonista e Força Antagônica): adiados por decisão de 2026-07-27.** Ainda não foram concebidos; ficam para uma rodada futura do método. Enquanto isso existem no contrato de dados só como alvo de ligação (batismo e rosto), sem conteúdo
- [ ] Valor em jogo: visível ou metadado?
- [ ] Testar a espinha completa contra mais comédias
- [x] **Contrato de dados dos cards pro renderizador (Generative UI)** — fechado em `docs/plan.md` (Parte II) e implementado em `agent/mini_mapa.py`