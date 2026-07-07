# Story Render — Brief de Prototipagem: Jornada de Onboarding

**Do que se trata:** o caminho entre "usuário escolhe McKee" e "primeira espinha plotada" — Fase A + Fase B do `STORY_RENDER_MVP_MCKEE.md` (seção 4). Isso testa SEQUÊNCIA e RITMO, não forma — a gramática visual já foi validada em `STORY_RENDER_BRIEF_PROTOTIPO.md` e continua valendo (cor, tipografia, layout do cartão). Este protótipo é sobre estado e transição.

**Pergunta que este protótipo responde:** o caminho do vazio até a primeira espinha plotada parece rápido e satisfatório, ou cansativo?

---

## 1. Escopo exato

Do clique em "McKee" até o fim da Fase B: 6 respostas do usuário, resultando em uma espinha com 3 nós preenchidos (2 em rascunho) e um cartão com 1 campo. Fase C (aprofundamento) fica de fora — isso é onboarding, não a jornada inteira.

---

## 2. A decisão de interação que este protótipo precisa resolver

**A — Revelação ao vivo** *(recomendo prototipar esta primeiro)*
Canvas visível desde a primeira pergunta, os 5 nós da espinha em contorno vazio desde o início — mostra o formato antes de preencher. Cada resposta anima o campo/nó correspondente de vazio pra preenchido, em tempo real, enquanto o chat continua ao lado. O usuário vê o quadro se construir.
Por quê: é o próprio argumento do produto — "ver como as coisas se conectam" só convence se a conexão aparecer sendo construída, não entregue pronta no fim.

**B — Wizard linear, revelação no fim**
6 perguntas em sequência, sem canvas visível (chat focado, tela cheia) — espinha e cartão aparecem completos de uma vez ao final.
Por quê considerar: menos estado pra sincronizar, prototipagem mais rápida. Mas perde o "aha" progressivo.

Comece por A. B só vale prototipar depois, como comparação, se sobrar tempo — não os dois em paralelo.

---

## 3. Sequência e copy roteirizada (versão A — revelação ao vivo)

| # | Fase | Pergunta do agente | O que muda no canvas |
|---|---|---|---|
| 1 | A | "Em uma frase: do que se trata essa história?" | Vira o título do quadro, no topo |
| 2 | A | Gênero — escolha rápida de lista, não pergunta aberta | Uma etiqueta de gênero ancora num canto do canvas |
| 3 | A | "Se você perguntasse pro seu protagonista 'o que você quer?', o que ele diria, sem rodeios?" | Cartão de Protagonista materializa pela 1ª vez — só Want preenchido, resto dos campos visíveis mas vazios dentro do próprio cartão |
| 4 | B | "E o que acontece pra virar a vida dele de cabeça pra baixo — o Incidente Incitante?" | Nó "Incidente Incitante" na espinha vira preenchido |
| 5 | B | "Ainda em esboço, sem compromisso: no fim dessa história, que escolha impossível ele vai enfrentar?" | Nó "Crise" aparece com status `rascunho` — visualmente distinto de preenchido/testado |
| 6 | B | "E o que muda pra sempre depois dessa escolha — o Clímax, mesmo que só uma hipótese?" | Nó "Clímax" aparece, também `rascunho` |

**Diferença de comportamento do agente nesta fase (importante, quebra do padrão da Fase C):** nas perguntas 5 e 6, um "não sei ainda" é uma resposta válida — o agente não pressiona por concretude aqui como pressiona no aprofundamento do Protagonista/Antagonista. Resposta vaga vira `rascunho` com um marcador tipo "a definir", sem fricção. A pressão por precisão começa só na Fase C.

---

## 4. O momento de transição — fim da Fase B

Depois da pergunta 6, o canvas mostra: Incidente Incitante preenchido, Complicações Progressivas ainda vazio (não fez parte da Fase A/B), Crise e Clímax em rascunho, Resolução vazio. Cartão de Protagonista com só Want preenchido.

Vale um beat deliberado aqui — não celebração pesada, só uma marcação clara de que o modo mudou:
> "Isso já é o esqueleto. A partir daqui você manda: edita qualquer cartão direto no quadro, ou continua comigo."

Esse é o ponto exato em que a ordem imposta vira sugestão (MVP doc, seção 4). Vale prototipar esse texto aparecendo com um respiro visual — o chat recua um pouco, o canvas ganha o foco por um instante.

---

## 5. Estados de borda que vale esboçar (não precisa resolver de vez)

- **Usuário tenta editar um nó/cartão direto no canvas no meio da sequência guiada**, antes do agente ter perguntado sobre ele. Minha inclinação: não travar o canvas — mas também não deixar óbvio demais, tipo um link discreto "pular pro modo livre" em vez de cada cartão parecendo clicável de cara. Isso mantém o on-ramp rápido pra quem quer ser guiado, sem prender quem já sabe o que quer.
- **Resposta vazia/pulada** numa das 6 perguntas — o nó fica em `vazio` e a jornada segue, ou trava esperando algo?

Não precisa desenhar a solução final pra esses dois — só não deixar a prototipagem cega pra eles.

---

## 6. Prompt inicial sugerido (copiar pro Claude Design)

```
Já validei a gramática visual do Story Render (cores, tipografia, layout
de cartão — anexo/referência). Agora preciso prototipar a JORNADA: a
sequência de telas/estados entre o usuário escolher o método McKee e ter
a primeira espinha plotada.

São 6 perguntas do agente, uma de cada vez, no painel lateral. A cada
resposta, algo específico aparece no canvas (ver tabela abaixo) — quero
testar a revelação ao vivo: o canvas visível o tempo todo, com os 5 nós
da espinha em contorno vazio desde o início, cada um virando preenchido
conforme a pergunta correspondente é respondida.

[colar a tabela da seção 3 deste brief]

No fim da 6ª pergunta, preciso de um estado de transição: o canvas com a
espinha parcial (2 nós preenchidos, 2 em rascunho, 1 vazio) e o cartão de
Protagonista com 1 campo — e uma mensagem do agente marcando que o modo
mudou de guiado pra livre.

Quero ver a sequência completa como uma progressão de estados/telas, pra
sentir se o ritmo das 6 perguntas está rápido ou cansativo antes de levar
isso pro Claude Code.
```

---

## 7. O que volta pro MVP se algo não funcionar

Se o ritmo das 6 perguntas parecer lento ou repetitivo no protótipo, o ajuste provavelmente é na seção 4 do `STORY_RENDER_MVP_MCKEE.md` (a fórmula) — não na arquitetura de agente nem no modelo de dados, que não mudam por causa de ritmo de UI.
