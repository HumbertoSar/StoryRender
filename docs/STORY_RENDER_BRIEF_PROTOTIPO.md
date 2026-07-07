# Story Render — Brief de Prototipagem (Claude Design)

**Objetivo:** validar a gramática visual — espinha sempre visível + cartões de profundidade pendurados nela + painel do agente. Não é sobre lógica de agente real (isso é Claude Code, depois) nem sobre polimento pixel-perfect. É sobre testar se a metáfora do quadro de investigação comunica sem virar kitsch, e se a hierarquia visual segura a atenção.

Escopo de conteúdo/regras: `STORY_RENDER_MVP_MCKEE.md` (campos, prioridades, mapa de conexões). Este brief cuida só da forma.

---

## 1. Telas — prioridade

**P0 (o protótipo precisa ter):**
1. Tela principal do esquema — espinha no topo/lateral, cartões pendurados, painel do agente ancorado (não modal)
2. Cartão de Protagonista aberto, com uma sugestão pendente do agente visível (o "ghost text" antes da confirmação — é o padrão de interação mais importante do produto inteiro)

**P1 (só se sobrar fôlego na sessão):**
3. Tela de seleção de estilo de roteiro — o picker (McKee / Jornada do Herói / outros), mesmo que só McKee funcione de verdade

**Pular por agora:**
- Modo Diagnóstico (lista de inconsistências) — é P1 no escopo do produto, não precisa de forma visual ainda

---

## 2. Direção visual — ponto de partida, não veredito

Evitar os três padrões que todo design gerado por IA cai hoje: creme + serifada de alto contraste + terracota; quase-preto + neon único; broadsheet com hairlines. Nenhum dos três nasce do assunto — nascem do piloto automático.

**Paleta**
| Nome | Hex | Uso |
|---|---|---|
| Quadro | `#4A4038` | fundo do canvas — evoca cortiça/feltro, não papel |
| Papel | `#F0E9D8` | fundo dos cartões — manuscrito, mais encorpado que o creme padrão |
| Tinta | `#211E1A` | texto principal — quase-preto, nunca preto puro |
| Linha | `#7A2E2E` | accent único — as conexões cartão↔espinha e ações-chave. Nada mais usa essa cor |
| Latão | `#9C7A3C` | accent secundário, só em badges de status (rascunho/testado/validado) |
| Neutro | `#C9BFA8` | bordas, divisores |

**Tipografia**
- Títulos dos nós/cartões: serifada com caráter editorial-envelhecido (não a alto-contraste genérica) — pensa em página de manuscrito revisado, não em revista de luxo
- Corpo/UI: sans humanista discreta, não compete com a serifada
- Labels de campo, status, timestamps: monoespaçada contida — reforça sensação de ficha de arquivo sem virar tema de terminal

**Layout**
Espinha fixa (topo ou lateral esquerda — testar os dois), cartões abaixo/ao redor com leve rotação individual (2 cartões nunca com o mesmo ângulo), painel do agente ancorado à direita como mesa de trabalho permanente, não popup.

**Elemento-assinatura**
As linhas de conexão entre cartão e espinha: um traço fino, pontilhado ou levemente costurado — não um barbante 3D literal (isso vira piada visual). É o único lugar pra gastar ousadia; tudo ao redor fica disciplinado.

*(Isso é uma hipótese forte, não uma decisão fechada — vale pedir pro Claude Design criticar essa direção antes de construir em cima dela, seguindo o processo de "propor → criticar → construir" antes de fixar.)*

---

## 3. Conteúdo de exemplo (pra não prototipar em cima de Lorem Ipsum)

- **Ideia-semente:** Um faroleiro encontra uma garrafa com a letra do próprio irmão, desaparecido há dez anos — e a carta está datada de amanhã.
- **Gênero:** Mistério / ficção especulativa
- **Protagonista — Want:** encontrar o irmão, Léo
- **Incidente Incitante:** a carta com data futura chega
- **Crise (esboço):** entrar na névoa que engoliu Léo, ou proteger a filha que só tem a ela
- **Clímax (esboço):** ela entra na névoa
- **Ideia Controladora (esboço):** a verdade só liberta quem aceita perder algo por ela

Pode trocar por conteúdo do seu próprio romance a qualquer momento — isso aqui é só pra ter algo real pra desenhar em cima.

---

## 4. Prompt inicial sugerido (copiar pro Claude Design)

```
Estou prototipando o Story Render: um produto onde escritores escolhem um
método de estrutura narrativa (começando por McKee) e recebem um esquema
visual — uma "espinha" macro sempre visível (Incidente Incitante →
Complicações Progressivas → Crise → Clímax → Resolução) com cartões de
profundidade pendurados nela (Protagonista, Antagonista/Forças, Ideia
Controladora). Um agente conversa no painel lateral, propondo conteúdo
pros campos — sugestões ficam pendentes até eu confirmar.

Público: escritores que quebram estrutura ANTES de escrever prosa —
precisam de algo que pareça um quadro de investigação de caso: ver como
tudo se conecta, não um formulário.

Preciso de duas telas:
1. Tela principal — espinha + cartões + painel do agente ancorado
2. Cartão de Protagonista aberto, mostrando uma sugestão pendente do
   agente (texto ainda não confirmado, visualmente distinto do
   conteúdo já validado)

Direção visual de partida (critique antes de construir em cima):
fundo do canvas em tom de cortiça/feltro escuro, cartões em papel
manuscrito mais encorpado que o creme padrão, um único accent em
vinho/oxblood pras linhas de conexão, tipografia serifada
editorial-envelhecida nos títulos, sans discreta no corpo, mono nos
labels de status.

Conteúdo de exemplo: [colar a seção 3 deste brief]

Isso é exploração de forma, não produto final — pode e deve propor
alternativas à direção visual acima se enxergar algo melhor pro assunto.
```

---

## 5. Depois do protótipo

O que volta pro `STORY_RENDER_MVP_MCKEE.md` sem precisar redecidir aqui: quais campos existem, prioridade P0/P1/P2, ordem de preenchimento, arquitetura do agente. Este brief resolve só a forma — quando estiver satisfeito com a sensação visual, o próximo documento (pro Claude Code) parte da tela validada aqui mais o modelo de dados que já existe.
