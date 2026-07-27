# McKee Mini — terceiro trilho, direto no open-ended

## Contexto

O trilho **McKee Inspired** (9 degraus, tutor socrático) provou o ciclo de validação de prompt, mas o método continuou difícil de manter nos trilhos e caro de testar. O `Mini.md` é a resposta: um método mais curto que sacrifica conceitos para chegar a uma **estrutura final** — e cuja pedra fundamental (§1) é explicitamente visual: *"o McKee Mini termina quando a história do usuário está RENDERIZADA"*. Se uma informação não aparece no mapa, ela é candidata a sair do método.

Isso muda o alvo do laboratório. O produto do Mini **é** a superfície gerada, então o trilho novo nasce direto na **Fase 3 (open-ended)**: o agente compõe o mapa em HTML/SVG dentro de um iframe sandboxed, sem design system pré-fixado. Isso contraria a regra de ordem do `CLAUDE.md:83` ("não implementar um nível antes do anterior estar de pé") — a exceção é deliberada e precisa ficar registrada: é um trilho novo com um método novo, não a continuação do McKee, e a Fase 2.1 (declarative/A2UI) já está de pé no `/mckee` para servir de comparação.

### Decisões já tomadas
| Questão | Decisão |
|---|---|
| Fonte de verdade | **Estado compartilhado + tools.** O HTML é uma *função* do estado, não a verdade. |
| Onde o mapa pinta | **Quadro fixo** ao lado do chat. |
| Trilho McKee Inspired | **Congela**, como o McKee. Fica em produção como baseline. Nada é apagado. |
| Interatividade do mapa | **Só leitura na v1.** `sandboxFunctions` vira fatia posterior. |

---

## Parte I — Verificação técnica (lida no `node_modules`, não presumida)

O caminho open-ended existe pronto no CopilotKit 1.63.1, simétrico ao `a2ui: {}` da Fase 2.1.

1. **`new CopilotRuntime({ openGenerativeUI: {} })`** instala o `OpenGenerativeUIMiddleware`. Ele varre o stream AG-UI procurando o tool call **`generateSandboxedUi`** e transcodifica os argumentos *enquanto streamam* (parser incremental `clarinet`) em `ACTIVITY_SNAPSHOT`/`ACTIVITY_DELTA` de `activityType: "open-generative-ui"`. HTML sai em pedaços → **pintura progressiva de graça**. Ordem dos parâmetros é obrigatória: `initialHeight`+`placeholderMessages` → `css` → `html` → `jsFunctions` → `jsExpressions`.

2. **⚠️ `openGenerativeUIEnabled` é um booleano GLOBAL do runtime.** Em `handlers/get-runtime-info.mjs:48` o `/info` devolve `openGenerativeUIEnabled: !!runtime.openGenerativeUI` — enquanto o A2UI, logo acima, exporta `agents`. O `<CopilotKit>` lê esse booleano e registra a frontend tool `generateSandboxedUi` para **qualquer** página apontada naquele `runtimeUrl`. Como `agent/main.py:143` binda cegamente `state["tools"]`, ligar no runtime compartilhado daria ao `story_agent` congelado uma capacidade nova sem ninguém pedir. O filtro `openGenerativeUI: { agents: [...] }` corrige o middleware (`agent-utils.mjs:60-63`) mas **não** o flag do cliente.
   → **Route handler separado: `/api/copilotkit-mini`.** Isolamento total por ~12 linhas.

3. **`designSkill` é um no-op no nosso desenho — e isso é bom.** Ele entra como agent context e `ag_ui_langgraph/agent.py:895-905` o escreve em `state["ag-ui"]["context"]`. Como `MapaState` não vai declarar a chave `"ag-ui"` (que nem é identificador Python válido), o LangGraph descarta. Consequência: **a gramática visual mora em `metodos/mckee_mini.md`**, lida do disco a cada turno — que é justamente o ciclo de validação que queremos. E o default shadcn embutido (fundo branco, zinc, system-ui — frontalmente contrário a papel/vinho) fica inofensivo de graça.

4. **O renderer é um componente autônomo.** `OpenGenerativeUIActivityRenderer` é exportado de `@copilotkit/react-core/v2` e recebe **uma única prop**: `content`. Sua única dependência de contexto é `useSandboxFunctions()`, cujo contexto tem default `[]`. Ele renderiza fora do chat — e até fora do `<CopilotKit>`. **O limite medido na Fase 2.1 com A2UI ("a superfície só vive no chat") não vale para o open-ended.** A fatia do quadro é barata, e essa é uma conclusão publicável do laboratório.

5. **A activity é endereçável.** `ActivityMessageSchema` (`@ag-ui/core`) = `{id, role:"activity", activityType, content}` e faz parte da união `Message` — basta varrer `agent.messages` de trás pra frente.

6. **O mapa sobrevive ao reload sem gastar LLM.** A activity não vai pro checkpointer, mas a **tool call vai**, e `GenerateSandboxedUiArgsSchema` é superconjunto de `OpenGenerativeUIContentSchema`: `{initialHeight, css, cssComplete:true, html:[args.html], htmlComplete:true, …, generating:false}`. Reidratação exata, client-side, de graça — desde que o filtro de histórico pare de descartar tool calls.

7. **Suprimir a cópia no chat é ponto de extensão suportado.** `findRenderer` resolve `matches.find(c => c.agentId === agentId) ?? matches.find(c => c.agentId === undefined) ?? wildcard`, e `allActivityRenderers = [...nossos, ...embutidos]`. Um renderer nosso escopado por `agentId` vence o embutido e não toca o `/mckee`.

---

## Parte II — O contrato de dados do mapa (fecha a pendência §19 do `Mini.md`)

### Princípio: guardar fato, derivar forma

O canal `mapa` guarda só o que o autor e o agente produzem. Tudo que é **consequência** — estado de card, ligações, a frase da espinha, o storyboard, o quadrante do sabor — é função pura. Mesma disciplina de `trilho_dos_canais` e de `forma.py`: **o que é determinístico sai do prompt e vira código.**

```jsonc
{
  "versao_schema": 1,
  "assinatura_renderizada": "",
  "cards": [ … ],
  "pendencias": [ {"id":"…","texto":"ainda não sei o passado","card_id":"lacuna-1"} ],
  "leituras":  [ {"id":"anel","estado":"oferecida|aprovada|recusada","nota":""} ]
}
```

```jsonc
// um card
{
  "id": "lacuna-1", "tipo": "lacuna", "nome": "O Mundo como Era", "ordem": 1,
  "hipotese": false, "versao": 0, "base_em": [],
  "formula": "Todo dia o(a) PROTAGONISTA segue ROTINA, isso porque no PASSADO ___",
  "slots": {
    "protagonista": {"texto":"", "sonda":"Quem é? Me dá o nome e me mostra ele numa cena."},
    "rotina":       {"texto":"", "sonda":"O que a gente VÊ ele fazendo?"},
    "passado":      {"texto":"", "sonda":"Como exatamente esse acontecimento fabrica essa rotina?"}
  },
  "testes": [
    {"id":"imagem-nao-categoria","peca":"protagonista","nome":"Imagem, não categoria",
     "sonda":"…","veredito":"pendente|passa|nao_passa","nota":"","imagem":null}
  ]
}
```

Três decisões que carregam peso:

- **A sonda mora no slot, não no renderizador.** §2 pede empty state = sonda como placeholder. Guardando a sonda junto do slot, o HTML gerado nunca precisa saber McKee — desenha o que recebe. Custa bytes no checkpoint; compra um contrato autodescritivo, que é exatamente o que um gerador de HTML livre precisa.
- **`versao` por card.** É o que torna a edição retroativa (§3) e a re-medição do Arco (§12) determinísticas: o Arco guarda `base_em: ["lacuna-1","lacuna-6"]` mais as versões que mediu; se divergirem, `arco.stale` é derivado e o agente é instruído a oferecer re-medição. Zero especulação.
- **`imagem` só no teste de integração.** É o §15 de graça: o storyboard é `[t.imagem for c in cards for t in c.testes if t.imagem]` na ordem da espinha. Nenhuma pergunta extra, nenhum campo novo.

Alfabeto de tipos: **5** (`espinha`, `lacuna`, `protagonista`, `forca_antagonica`, `arco`) — dentro do teto 5–7 do §2. Os elos do §8 são `lacuna` com id `lacuna-3.1`…`lacuna-3.4`, não um tipo novo.

### Derivado (nunca guardado)

| Derivação | Regra |
|---|---|
| `estado_do_card` | `hipotese` → **fantasma** · nenhum slot com texto → **vazio** · todo teste aplicável `passa` → **firme** · resto → **rascunho** |
| frase da espinha | concatenação das 6 fórmulas com slots substituídos — a "leitura em voz alta" do §4.6 |
| `ligacoes` | tabela §14 (abaixo) |
| storyboard | testes de integração com `imagem` preenchida |
| sabor (§10) | quadrante 2×2 `foto_realizada` × `preco_pago`, aceso por derivação, nunca rotulado |
| `arco.stale` | versões de `lacuna-1`/`lacuna-6` ≠ as que o Arco mediu |

**O agente não consegue mentir que um card está firme.** É a aplicação mais direta da doutrina do projeto ao domínio.

### As 8 ligações do §14 como condição derivada

| id | de → para | condição |
|---|---|---|
| `sequencia` | `lacuna-N` → `lacuna-N+1` | sempre |
| `batismo` | `lacuna-1` → `protagonista` | `slots.protagonista.texto` não vazio |
| `motor` | `lacuna-2` → `lacuna-3.1` | existe o 1º elo |
| `corrente` | `lacuna-3.k` → `lacuna-3.k+1` | existe o elo k+1 |
| `fantasma` | `lacuna-2` → `lacuna-5` | teste `cena-prometida` de `lacuna-2` = `passa` |
| `rosto` | `lacuna-3.k` → `forca_antagonica` | card existe e o elo tem slot `rosto` |
| `anel` | `lacuna-4` → `lacuna-1` | leitura `anel` = `aprovada` |
| `costura` | `lacuna-6` → `arco` → `lacuna-1` | card `arco` existe |

§14 diz literalmente *"pro renderizador não precisar inventar nenhuma"* — então `ligacoes(mapa)` roda em Python e vai **pronta** no JSON entregue ao prompt de desenho. O modelo desenha arestas, não as deduz.

### Efeito em `sessoes.trilho_dos_canais`

```
"mckee-mini"      se "mapa"    in canais
"mckee"           se "roteiro" in canais
"mckee-inspired"  caso contrário
```

**Armadilha obrigatória:** o canal precisa existir desde o checkpoint nº 1. Se o primeiro turno não chamar tool, o estado sai só com `messages` e a sessão é classificada como `mckee-inspired`, aparecendo na lista errada, calada. Solução idêntica à de `main.py:151-154`: o nó `conversar` grava `mapa` no update quando `state.get("mapa")` é vazio.

**Bug adjacente:** `agent/exportar_sessao.py:100-103` faz lookup em dict literal de duas chaves. Acrescentar `mckee-mini` em `trilho_dos_canais` sem tocar ali = `KeyError` em toda sessão do Mini.

---

## Parte III — O grafo do `mckee_mini`

```python
class MapaState(MessagesState):
    mapa: dict
    tools: list   # sem esta linha o generateSandboxedUi some em silêncio
```

Nós: `conversar` + `tools` (`ToolNode`). A renderização **não é um nó** — é uma tool de frontend que encerra o run.

**Cinco tools de backend**, todas devolvendo `Command(update={"mapa": …, "messages":[ToolMessage(…)]})`:

| Tool | Assinatura | Papel |
|---|---|---|
| `escrever_no_mapa` | `preenchimentos: list[{card_id, slot, texto, hipotese?}]` | única primitiva de escrita de conteúdo |
| `registrar_teste` | `card_id, teste_id, veredito, nota, imagem \| None` | resultado de navalha; promove a `firme` por derivação; `imagem` é o key frame do §15 |
| `nascer_card` | `tipo, nome, base_em, hipotese` | os três modos do §13 e os elos novos da corrente |
| `aprovar_leitura` | `leitura_id, estado, nota` | §16.8: leitura ≠ teste; é o que cria a ligação `anel` |
| `registrar_pendencia` | `texto, card_id` | guarda-corpo do §16.6: "ainda não sei" vira pendência, nunca bloqueio |

`escrever_no_mapa` aceita **lista** de propósito: a primeira renderização (§4.3) distribui o braindump por ~10 slots de uma vez, e com `parallel_tool_calls=False` uma tool por slot custaria 10 idas e voltas. A disciplina de "um slot por turno" fora da distribuição inicial fica no prompt, não na assinatura.

**`generateSandboxedUi`** chega em `state["tools"]` como dict JSON-schema, é bindada junto das de backend, e o roteador copiado de `main.py:158-166` manda pra `END` quando a chamada não é de backend. Com `followUp: true`, o run de continuação acontece sozinho.

**`parallel_tool_calls=False`** mantido. Consequência de projeto, não acidente: **escrever no mapa e desenhá-lo são sempre turnos diferentes**, o que torna o gatilho de render explícito e observável.

**Normalização:** `forma.normalizar()` só em `resposta.content`, como em `tutor.py:66-74`. Os args de tool vivem em `.tool_calls` e não passam por lá — o que impede o travessão dentro do HTML gerado de virar vírgula e corromper o desenho. **Precisa de comentário no código**: é silencioso e destrutivo se alguém "melhorar" a normalização depois.

### Quando o mapa é re-renderizado

**Gatilho: mudança de FORMA, não de texto — decidido em Python.** `mini_mapa.assinatura(mapa)` devolve um hash de `{ids de card} × {estado de cada card} × {ids de ligação}`. O nó compara com `mapa["assinatura_renderizada"]` e injeta no fim do system prompt uma de duas linhas literais: `DESENHE AGORA…` + o JSON de `para_render(mapa)`, ou `NÃO desenhe neste turno.`

Dispara em: primeira renderização (§4.3), promoção a `firme`, nascimento de card, ligação nova, formatura. **8 a 12 renders por sessão** de 21–40 interações, não 40.

Em código e não no prompt porque o projeto já mediu que regra em prosa escorrega — e porque assim é testável sem LLM: sequência de mutações → sequência esperada de render/não-render, num autoteste de tabela.

**⚠️ Loop do `followUp`:** no run de continuação a assinatura ainda está diferente (nada gravou que o desenho aconteceu) → o modelo desenha de novo, para sempre. Guarda: `conversar` detecta que as últimas mensagens são a chamada `generateSandboxedUi` + seu `ToolMessage` e grava `assinatura_renderizada` no próprio update. Determinístico, num lugar só, torna o loop impossível. É um bug que queimaria uma sessão inteira.

---

## Parte IV — Skills: faz sentido? Sim, como segunda camada, e depois do baseline

**Resposta curta: sim, e é a ideia mais alinhada com o que o projeto já mediu — mas é uma otimização, e otimização sem baseline é fé.**

### Por que faz sentido aqui, e não é só moda

O `Mini.md` já tem **duas camadas de conteúdo naturalmente separadas**, e ninguém as separou de propósito:

- **Camada operacional** — a fórmula com slots, os testes, as sondas, os nomes de campo. Necessária em todo turno em que aquele card está em foco.
- **Camada de evidência** — "Validado: Nemo, Up, Breaking Bad, Chefão, Matrix, Legalmente Loira, 0 quebras"; "exemplo ruim reprova 4/5"; a distinção Foto ≠ Promessa com Casablanca e Breaking Bad; a descoberta lateral de que "a pancada pode vir depois de uma vitória"; os guarda-corpos; as adaptações (protagonista morto, §11).

A segunda camada é **raramente necessária, ocasionalmente decisiva, e sempre cara de carregar**. É a definição de uma skill.

E ataca de frente a falha mais medida do projeto: **acrescentar regra tem custo por diluição** — a v3 cresceu 27% e o travessão, resolvido na v2, voltou. `instrucao.py` já é uma versão primitiva disso, só que **empurrada** (o montador decide). Uma skill é a versão **puxada** (o agente pede).

Mas o argumento mais forte é outro: **o que o agente consulta vira dado.** É o primeiro instrumento que mostra *quais partes do método são de fato estruturais*. Isso serve diretamente à faca do §1 — *"se uma informação não aparece no mapa, ela é candidata a sair do Mini"*. Uma skill nunca consultada em 10 sessões é candidata a sair do método. O laboratório ganha um eixo de medição que hoje não tem.

### Desenho concreto

```
agent/metodos/mini/
  card-1-mundo-como-era.md      … card-6-mundo-como-ficou.md
  exemplos-consagrados.md        # Nemo, Up, Breaking Bad, Chefão, Matrix, Casablanca
  exemplos-ruins.md              # o que os testes precisam reprovar (§16.5)
  guarda-corpos.md               # "ainda não sei" → pendência; genérico → uma provocação
  foto-vs-promessa.md            # §7, a distinção que o modelo confunde
  adaptacoes.md                  # protagonista morto, comédia, etc.
```

Uma tool de backend, sem mutação de estado:

```python
@tool
def consultar_metodo(assunto: Literal["card-1", …, "exemplos-consagrados", …]) -> str:
    """Aprofunda um ponto do método. Use quando o autor travar, quando um
    veredito for contestado, ou quando um precedente ajudar a decidir."""
```

Quatro decisões de desenho, cada uma comprando uma garantia:

1. **Vocabulário fechado (`Literal`), não string livre.** String livre convida assunto alucinado e falha silenciosa. Com enum, um assunto inválido é erro de tool, visível.
2. **Índice de uma linha por skill fica na instrução base** — mesma forma do índice de degraus de `instrucao.py`. O agente precisa saber que a porta existe para bater nela.
3. **Dica determinística de quando consultar.** Quando o código detecta a situação (veredito `nao_passa` duas vezes na mesma peça; o autor diz "não sei" duas vezes; uma leitura recusada), o `ToolMessage` já diz *"considere consultar `guarda-corpos`"*. Mesmo padrão do gatilho de render: **o código decide quando, o modelo decide se**. É a resposta ao "regra em prosa escorrega", um nível acima.
4. **O texto consultado entra no contexto e fica** — sujeito à mesma poda da Fatia 11.

### O que pode dar errado, dito antes

- Cada consulta é um round-trip extra de LLM (latência + tokens). **Se o agente consultar toda hora, é estritamente pior que empurrar.**
- O modelo pode não consultar quando deveria. Mitigado pela dica determinística; não eliminado.
- Skills viram lugar confortável para despejar conteúdo que deveria ter sido cortado — o oposto do espírito do Mini.

### Hipótese pré-registrada (na disciplina que a v4 estabeleceu)

> **Hipótese.** Tirar a camada de evidência do prompt base e oferecê-la por consulta reduz o prompt por turno sem perder profundidade.
>
> **Falseada se** (a) a média de consultas passar de 1 por turno; ou (b) o auditor mostrar queda em sondas usadas literalmente / vereditos com evidência; ou (c) o total por sessão (prompt + consultas) ficar maior que o baseline.
>
> **Método.** Baseline medido na MESMA rodada, ≥3 conversas, agregação por regra. Commit da mudança separado do commit do resultado.

**Quando:** depois do trilho base funcionar (área da Fatia 8). Não antes — não dá para medir uma redução sem ter o número de onde ela partiu, e deixar um número não medido justificar um design foi exatamente o erro da v4.

---

## Parte V — O que falta na arquitetura para performance e confiabilidade

Sete lacunas reais. As três primeiras viram fatia; o resto vira linha dentro de outra fatia.

| # | Lacuna | Por que importa | Resposta |
|---|---|---|---|
| 1 | **Zero guarda de erro no caminho de produção.** `tutor.py` não tem `max_tokens`, não checa `finish_reason`, não tem retry. Essa proteção existe **só no banco de prova**. E o `LEARNINGS.md:587` registra resposta vazia ocasional do OpenRouter. | No Mini é pior: um `generateSandboxedUi` truncado = HTML inválido = **iframe em branco, sem erro nenhum**. Falha silenciosa é o pior modo de falha deste projeto. | `max_tokens` explícito, `finish_reason == "length"` vira erro visível, retry único em resposta vazia, e validação do HTML gerado (tags balanceadas, variáveis CSS presentes, piso de tamanho) com fallback "nada foi desenhado". **Fatia própria.** |
| 2 | **Contexto quadrático.** A tool call com o HTML inteiro fica em `messages` para sempre e é reenviada como *entrada* em todo turno seguinte. 8 renders × ~5k tokens ≈ 40k de HTML morto, pagos repetidamente. | É o risco mais caro e o menos visível — aparece como conta, não como bug. | Poda antes do `ainvoke`: substituir o argumento `html` de todas as chamadas menos a última por `<!-- render anterior, podado -->`, **copiando** as mensagens (são referências compartilhadas com o checkpoint). **Fatia própria.** |
| 3 | **Sem observabilidade.** Existe `feedback.py` (👍/👎) e exportação de sessão, mas nada registra latência, tokens, tools chamadas ou número de renders por turno. O legado tinha uma tabela `eventos` para exatamente isso (`LEARNINGS.md:143`) e **ela se perdeu no pivô.** | Este plano diz "medir e escrever o número" umas oito vezes. Sem instrumento, isso vira cronômetro na mão e estimativa — que é a raiz documentada do erro da v4. | `agent/telemetria.py`: uma linha por turno (thread, turno, ms, tokens in/out, tools chamadas, render sim/não), fire-and-forget como o legado. **Fatia própria — é a adição de maior alavancagem para o propósito declarado do laboratório.** |
| 4 | **`/health` não prova nada.** Devolve ok com chave errada, arquivo de método faltando ou Postgres em fallback silencioso. | Um `/health` que reportasse `{checkpointer, metodos_legiveis, modelo}` teria pego o bug do Dockerfile no primeiro deploy. | Entra na Fatia 0, junto do conserto. |
| 5 | **Estado sem versionamento.** Sessões vivem em checkpoints para sempre; mudar o formato do mapa no meio do laboratório quebra sessão antiga em silêncio. | Vai acontecer — o contrato é novo e vai mudar. | `versao_schema` no mapa (já no contrato) + guarda na leitura: schema antigo abre em modo leitura em vez de estourar. |
| 6 | **Um modelo para tudo.** As duas trilhas compartilham a mesma instância de propósito (não introduzir modelo como variável). Mas conduzir socraticamente e compor HTML são tarefas muito diferentes. | Trocar já seria introduzir variável antes de ter baseline. | Não trocar agora — só tornar configurável: `OPENROUTER_MODEL_MINI` com fallback pro global. Uma linha, e o experimento fica a uma env var de distância. |
| 7 | **`last-write-wins` no canal inteiro** (risco registrado na Fase 1.4, `LEARNINGS.md:552`). | Não morde na v1 porque o quadro é só leitura. Morde no minuto em que `sandboxFunctions` puder escrever. | Registrar; endereçar na fatia da interatividade. |

Duas coisas que **deliberadamente não** entram: multi-agente (o MVP doc §7 já argumentou contra, e a razão continua válida) e subagente de render como o A2UI faz (o open-ended streama da chamada principal — o round-trip extra é justamente o que estamos evitando).

---

## Parte VI — A instrução `metodos/mckee_mini.md`

### `instrucao.py` serve? Metade.

Genéricos e reaproveitáveis por import: `_corpo()` (corta o cabeçalho editorial até o `---`; o `Mini.md` já tem um na linha 4) e `_secoes()` (split por `^## ` mascarando cercas). Específicos do Tutor e inúteis aqui: `TERMOS_DO_DEGRAU`, `_degraus()`, `_blocos_do_fluxo()`, `ARQUIVO` como constante de módulo.

**Módulo novo `agent/instrucao_mini.py`**, importando os dois helpers genéricos. Não generalizar `instrucao.py` — generalizar acopla o trilho em validação ao trilho novo, e o modelo de foco é genuinamente diferente:

> **O Tutor adivinha o foco lendo os termos entre crases do último turno. O Mini SABE o foco: está no `mapa`.** `montar(mapa)` manda inteiro o card em foco (o de maior `versao` que não está `firme`), mais os vizinhos por `ordem`, e uma linha de índice nos demais.

Isso é uma hipótese mensurável e vale pré-registrar: **a instrução do Mini pode ser menor por turno que a do Tutor porque o estado carrega o que o prompt carregava.**

### Estrutura de seções

```
# McKee Mini — instrução do agente
_cabeçalho editorial (não vai pro modelo)_
---
(abertura sem título: quem você é; a régua "dá pra desenhar?"; a pedra fundamental do §1)
## Como você escreve (forma, não conteúdo)
## Regras de ouro (nunca quebre)
## O fluxo da sessão
## O mapa e o desenho
## Card 1 · O Mundo como Era   …   ## Card 6 · O Mundo como Ficou
## Cards satélites
## Leituras emergentes
## Consultas de aprofundamento     ← índice das skills (Parte IV)
## Glossário do McKee Mini
```

### As fórmulas viram templates literais — e o truque

Template literal é obedecido (11/11 no bloco de teste); regra em prosa escorrega. As fórmulas entram verbatim, em bloco cercado, com slots em CAIXA ALTA:

```
Todo dia o(a) PROTAGONISTA segue ROTINA, isso porque no PASSADO ___
```

**O truque:** `PROTAGONISTA` na fórmula é exatamente `slot="protagonista"` na tool. Nenhuma camada de tradução, nada para o modelo inventar. Idem nas tabelas Peça|Teste|Sonda: a coluna `Teste` carrega o `teste_id` literal que `registrar_teste` espera.

O veredito reusa **byte a byte** o formato que a auditoria já provou (`auditar_sessao.py:134` já casa `^> \*\*TESTE ·`), então a auditoria de forma do Mini nasce funcionando:

```
> **TESTE · <nome do teste>**
>
> <a sonda, em linguagem de história>
>
> **Passa**: <por quê, apontando o critério que passou>
```

### "O mapa e o desenho" — o segundo template literal

Concreto onde a prosa falharia:
- **Paleta como valores:** `--papel:#F0E9D8; --tinta:#211E1A; --vinho:#7A2E2E; --latao:#9C7A3C; --neutro:#C9BFA8`, com a nota de que latão sobre papel dá ~3:1 e é **só selo, nunca texto corrido**.
- **Tipografia:** Alegreya / Source Sans 3 / JetBrains Mono — e o aviso de que **as variáveis do `next/font` não atravessam o iframe**: as famílias vêm por `<link>` de CDN no `<head>` do HTML gerado, ou degradam.
- **Os 3 estados como CSS literal:** fantasma `opacity:.55; border-style:dashed`; rascunho borda neutra sólida; firme borda vinho + selo latão. Literal para que o mesmo mapa não pareça outro entre renders.
- **Layout radial como esqueleto literal:** um `<svg>` de fundo com as ligações, cards absolutos por cima.
- **Atributos obrigatórios:** todo card emite `data-card-id`, toda ligação `data-ligacao-id`. É o que torna fidelidade ao estado **contável** em vez de opinião.
- **A ordem dos parâmetros repetida** — a pintura progressiva depende dela.

---

## Parte VII — O eixo de validação

**a) `agent/auditar_mapa.py` — o eixo NOVO (estrutural).** Entrada: um `mapa` (dict). Saída no contrato de `auditar()`: relatório + `list[str]` + exit code.

| Regra | O que pega |
|---|---|
| Cobertura | dos 6 cards, quantos saíram do braindump fixo com ≥1 slot preenchido |
| Fidelidade de chave | todo `card_id`/`slot`/`teste_id` existe no `ESQUELETO`. Tolerância zero — chave inventada é corrupção silenciosa |
| Ligações | `ligacoes(mapa)` == conjunto esperado |
| Estado honesto | nenhum card `firme` com teste aplicável sem veredito — o modo de falha que mais importa |
| Fantasma | `cena-prometida` passou no card 2 ⇒ card 5 com `hipotese:true` (§7) |
| Teto de testes | ≤5 por card (§16.2) |
| Não-especulação | `forca_antagonica` só com ≥2 rostos colhidos; `arco` só com 1 e 6 preenchidos (§13 — pega o vilão de papelão) |
| Orçamento | turnos até espinha firme (§4). Reportado, não reprovado |

**b) `agent/provar_mini.py` — o banco de prova.** Difere de `provar_instrucao.py` em três pontos, e cada um é a razão de não ser uma flag no antigo:

1. **Roda o GRAFO, não o modelo cru** — as tools precisam executar para existir um `mapa`. Compila com `MemorySaver` e conduz N turnos por `ainvoke`.
2. **Simula a tool de frontend.** `generateSandboxedUi` nunca executa em Python: o arnês injeta o schema dela no `tools` inicial, registra os args quando o modelo chama (tamanho do HTML, variáveis CSS obrigatórias, contagem de `data-card-id`) e anexa um `ToolMessage("UI generated")` sintético, replicando o run de continuação do CopilotKit. É isso que torna o Mini provável sem navegador.
3. **Agrega em DOIS eixos** — forma (`auditar_sessao`) e estrutura (`auditar_mapa`). Mesma disciplina: "em quantas CONVERSAS a regra caiu", nunca soma. ≥3 rodadas.

Fixtures: `BRAINDUMP_PADRAO` (material para os cards 1 e 2 e uma pista do 4 — exercita o "buraco visível" do §4.3), 2–3 seguimentos fixos, e uma **fixture negativa** com os exemplos ruins do §6–§11 ("desistir ou continuar lutando", "viveu feliz e aprendeu o valor da amizade") que os testes **precisam** reprovar. §16.5 faz disso requisito do método; automatizar é como continua verdade.

`MAX_TOKENS` sobe de 8000 para ~16000 (um render sozinho gasta 4–6k) e **truncamento continua RuntimeError** — aqui importa mais, porque HTML cortado é HTML inválido e leria como "o modelo gera markup quebrado".

**c) A rota `previa` — e ela vem ANTES do render de verdade.** `<OpenGenerativeUIActivityRenderer content={CONTEUDO_FIXO} />` à esquerda, o JSON do mapa à direita. Sem token nenhum.

**Inversão de ordem recomendada:** escrever o HTML da prévia **à mão primeiro** e só depois escrever a instrução de render descrevendo-o. O template literal que o modelo vai obedecer passa a ser derivado de um desenho que já se sabe que funciona — a doutrina do projeto (template > prosa) aplicada à construção do próprio prompt. E é onde a armadilha das fontes aparece de graça.

---

## Parte VIII — Wiring

**Python**

| Arquivo | Mudança |
|---|---|
| `agent/mini.py` | novo — grafo, 5 tools, nó `conversar` |
| `agent/mini_mapa.py` | novo — `ESQUELETO`, `mapa_vazio`, mutações, `ligacoes`, `estado_do_card`, `assinatura`, `para_render`, autoteste |
| `agent/instrucao_mini.py` | novo — `montar(mapa)` |
| `agent/metodos/mckee_mini.md` | novo |
| `agent/telemetria.py` | novo — uma linha por turno (Parte V, item 3) |
| `agent/main.py` | 4 linhas: import, `LangGraphAgent(name="mckee_mini")`, entrada em `AGENTES`, `add_langgraph_fastapi_endpoint(app, agente_mini, "/agent-mini")`; mais o `/health` que diagnostica |
| `agent/sessoes.py` | `trilho_dos_canais`: `mapa` primeiro |
| `agent/exportar_sessao.py` | terceira chave no dict da linha 100 — senão `KeyError` |
| `agent/Dockerfile` | `COPY metodos/ ./metodos/` — **bug vivo em produção hoje** |

**O bug do Dockerfile.** `COPY *.py ./` na linha 9 não leva `metodos/`, e o compose não monta volume. `instrucao._corpo()` faz `read_text()` a cada turno → `FileNotFoundError` em **todo turno do Tutor no container**. Verificar antes de tudo com `docker compose exec agent ls /app`. Fatia própria, primeira, separada do Mini — é conserto do trilho existente e não pode se misturar.

**Web**

| Arquivo | Mudança |
|---|---|
| `web/src/app/api/copilotkit-mini/route.ts` | novo — runtime próprio com `openGenerativeUI: {}` (Parte I, item 2) |
| `web/src/app/mckee-mini/page.tsx` | novo — lista de sessões, `crypto.randomUUID()` **no servidor** |
| `web/src/app/mckee-mini/[sessao]/page.tsx` | novo — Server Component `force-dynamic` |
| `web/src/app/mckee-mini/conversa.tsx` | novo — padrão `SessaoDoChat` **copiado**, não extraído |
| `web/src/app/mckee-mini/quadro.tsx` | novo — o painel do mapa |
| `web/src/app/mckee-mini/mini.css` | novo — `.sr-mini__*`, tokens redeclarados em seletor descendente, **nada fora de `@layer`** |
| `web/src/app/mckee-mini/previa/page.tsx` | novo |
| `web/src/app/page.tsx` | terceiro cartão (ícone SVG radial: órbita, contrastando com a espinha pontilhada e a escada) |
| `web/src/lib/sessoes.ts` | `Sessao.trilho` ganha `"mckee-mini"`; filtro novo que **preserva tool calls** |
| `deploy/docker-compose.yml` | `AGENT_MINI_URL: http://agent:8000/agent-mini` |

**Copiar `conversa.tsx`, não extrair.** Os três fatos duramente conquistados (pai do chat, `explicit:false`, reidratação só em chat vazio) estão certos, mas fatorar agora acopla um trilho congelado a um em movimento. Registrar no `LEARNINGS.md` que a extração é dívida consciente.

**O filtro novo em `lib/sessoes.ts`.** `apenasTexto()` derruba tool calls — no Mini isso derrubaria o mapa. Armadilha: a mensagem assistant com tool call e seu `ToolMessage` têm que vir **juntas ou nenhuma**; tool call órfã no histórico reidratado manda ao modelo uma chamada pendente e a API recusa.

**Deploy.** O compose em uso é cópia manual em `/opt/storyrender/docker-compose.yml`; `git pull` não leva env var nova. Sem `AGENT_MINI_URL` o web cai no default `127.0.0.1:8000` — que dentro do container é ele mesmo — e o Mini quebra na primeira mensagem. **Item de checklist da fatia, não comentário no arquivo.**

### O quadro (fora do chat)

```tsx
const { agent } = useAgent({ agentId: "mckee_mini", updates: [UseAgentUpdate.OnMessagesChanged] });
const ultima = [...agent.messages].reverse().find(
  (m) => m.role === "activity" && m.activityType === OpenGenerativeUIActivityType);
return ultima
  ? <OpenGenerativeUIActivityRenderer content={OpenGenerativeUIContentSchema.parse(ultima.content)} />
  : <EstadoVazio />;
```

Streama sozinho (o middleware emite `ACTIVITY_DELTA` continuamente; o throttle interno cuida da pintura progressiva). Para suprimir a cópia no chat, uma entrada em `renderActivityMessages` para `open-generative-ui` que devolve `null` — declarada **fora do componente**, porque a lista precisa ser estável (`useStableArrayProp` avisa; mesma lição dos slots do chat).

---

## Parte IX — Ordem das fatias

Cada uma: escopo em 2–3 frases antes de codar, implementação, prova, entrada no `LEARNINGS.md`, um commit. Branch por fatia a partir da main (`git pull` antes).

**0 — `metodos/` na imagem + `/health` que diagnostica.** `COPY metodos/ ./metodos/`; `/health` passa a reportar checkpointer, arquivos de método legíveis e modelo. *Prova:* `docker compose exec agent ls /app` antes e depois; um turno real do Tutor no container respondendo em vez de 500.

**1 — Trilho de ponta a ponta com um desenho fixo** *(a menor fatia que prova o caminho inteiro)*. Agente `mckee_mini`, grafo de um nó, **sem canal `mapa`**, instrução de 15 linhas: "quando o autor pedir um desenho, chame `generateSandboxedUi` e desenhe um retângulo de papel com o título da história". Route handler próprio, env var, rota web, cartão na home. *Fora:* mapa, tools, quadro, prévia — nada de McKee. *Prova:* uma conversa real pinta o retângulo no chat. **Registrar os números:** latência até primeiro pixel, latência total, tokens de saída, e se as fontes atravessaram o iframe (não vão). Confirmar por log que `generateSandboxedUi` chegou em `state["tools"]` e que o estado **não** tem `ag-ui`.

**2 — `mini_mapa.py`: o contrato.** Python puro, zero LLM. *Prova:* `uv run python mini_mapa.py` — autoteste de tabela: as 8 ligações, os 4 estados, uma sequência de mutações → sequência esperada de assinaturas.

**3 — Uma tool de escrita.** `escrever_no_mapa`, canal `mapa`, `ToolNode`, gravação no primeiro turno, `trilho_dos_canais`, `Sessao.trilho`, dict do exportador. *Prova:* conversa real escreve um slot; `/sessoes?trilho=mckee-mini` lista, `?trilho=mckee-inspired` **não** lista; `exportar_sessao.py` não estoura.

**4 — A prévia, com o desenho escrito à mão.** HTML/CSS do mapa radial escrito por humano, congelado, renderizado pelo `OpenGenerativeUIActivityRenderer`. Vira a referência que a instrução vai descrever. *Prova:* os 3 estados se distinguem de relance, as ligações desenham, as fontes carregam de CDN dentro do iframe, e nada do `mini.css` vaza fora de `@layer`.

**5 — Telemetria por turno.** `agent/telemetria.py`, fire-and-forget. *Prova:* uma sessão de 5 turnos gera 5 linhas com ms e tokens; o agente continua respondendo se a gravação falhar. **Vem antes das fatias que prometem números.**

**6 — A instrução: espinha + card 1.** `metodos/mckee_mini.md` com §1, forma, regras de ouro, fluxo e **só a tabela do card 1**; `instrucao_mini.montar(mapa)`. *Prova:* `provar_mini.py` mínimo (3 conversas) + auditor de forma. Registrar tamanho do prompt do 1º turno × seguintes.

**7 — O desenho de verdade + o gatilho.** Seção "O mapa e o desenho" com o CSS literal **derivado da prévia**, `assinatura` comparada no prompt, e a gravação de `assinatura_renderizada` no run de continuação. *Prova:* sessão real onde o mapa pinta após o braindump e **não** repinta num turno só de texto. Números: latência, tokens do render, e diff de CSS entre dois renders do mesmo estado.

**8 — Guardas de confiabilidade.** `max_tokens`, `finish_reason` como erro, retry em resposta vazia, validação do HTML gerado com fallback "nada foi desenhado". *Prova:* forçar cada um dos três modos de falha e ver a mensagem certa em vez de silêncio.

**9 — `registrar_teste` e os estados de card.** *Prova:* teste registrado muda o estado no mapa e dispara exatamente um render.

**10 — `auditar_mapa.py` + `provar_mini.py` completo.** *Prova:* 3 conversas agregadas nos dois eixos; a fixture negativa reprova nos testes previstos pelo §6–§11.

**11 — O mapa no quadro (vivo).** Painel ao lado do chat lendo a última activity; supressão da cópia no chat. *Prova:* pinta no quadro, some do chat, streama durante a geração.

**12 — Reidratação do mapa ao reabrir.** Filtro que preserva tool calls com seus resultados + reconstrução do `content` a partir dos args. *Prova:* F5 reabre com o mapa desenhado, zero chamada ao modelo.

**13 — Poda do HTML antigo do contexto.** *Prova:* tokens de entrada antes/depois numa sessão de 8 renders; o mapa continua reidratando (prova de que o checkpoint ficou intacto).

**14 — Skills de aprofundamento.** `agent/metodos/mini/`, `consultar_metodo`, índice na instrução, dica determinística. *Prova:* a hipótese pré-registrada da Parte IV, com baseline medido na mesma rodada.

**Depois, uma fatia cada:** cards 2 a 6 (5 fatias idênticas: seção no `.md` + testes no `ESQUELETO` + linha no conjunto esperado da auditoria) · `nascer_card` e os satélites · `aprovar_leitura`, anel, arco e pôster · a `sandboxFunction` `abrir_card` · a medição comparativa open-ended × declarative.

---

## Parte X — Riscos e o critério de comparação

| Risco | Resposta |
|---|---|
| **Latência** | Desconhecida. Medir na Fatia 1 e escrever o número — ele decide o gatilho, não o contrário. |
| **Contexto quadrático** | Fatia 13. Aparece como conta, não como bug. |
| **Inconsistência entre renders.** O modelo redesenha do zero; nada garante que o card 3 fique no mesmo lugar. | Escada: (a) CSS e esqueleto **literais** na instrução; (b) realimentar o CSS anterior com "reutilize verbatim, mude só o HTML"; (c) se falhar, tirar o CSS do modelo — folha fixa que ele emite byte a byte. **Métrica:** renderizar o mesmo mapa 2× e diffar o CSS; reportar % idêntico. |
| **HTML inválido = iframe em branco, sem erro** | Fatia 8. Falha silenciosa é o pior modo de falha deste projeto. |
| **O modelo ignora ou abusa da instrução de desenhar** | Medido comparando transições de `assinatura()` com chamadas reais. Plano B já desenhado: nó `renderizar` separado com `tool_choice` forçado. Como plano B, não como primeira tentativa. |
| **Limite do iframe** | Sem same-origin: nada de `next/font`, localStorage ou fetch pra nossa API. Pan e zoom vivem *dentro* do iframe (JS puro, tudo bem); só o que atravessa precisa de ponte. |
| **Regressão nos trilhos congelados** | Route handler separado, renderer escopado por `agentId`, endpoint próprio, `trilho_dos_canais` com caso novo. Toda fatia que toca `main.py` ou `sessoes.py` testa o `/agent-tutor` também. |

### O critério de comparação — decidido ANTES do primeiro render

Mesma história, mesmo braindump, medido na superfície A2UI do `/mckee` congelado e no Mini:

| Eixo | Como se mede |
|---|---|
| Latência | até o primeiro pixel e até completar (s) |
| Custo | tokens de saída por render; tokens de contexto acumulados na sessão |
| Estabilidade | dois renders do mesmo estado: % de CSS idêntico, % de posições idênticas |
| Fidelidade | `data-card-id`/`data-ligacao-id` no HTML ÷ cards e ligações no `mapa` — **contável**, não opinião |
| Expressividade | o que o catálogo declarative literalmente não expressa: radial, ligações SVG, estado fantasma, tipografia por card |

**O resultado honesto provável: o open-ended ganha em expressividade e perde em estabilidade e custo.** Se for isso, a resposta não é abandonar — é o híbrido (estado determinístico + declarative no card + open-ended no tecido conjuntivo). **Registrar essa expectativa agora**, para que a medição não seja rodada para defender uma decisão já tomada.

---

## Verificação de ponta a ponta

```bash
# Agente (em agent/)
uv run python mini_mapa.py         # derivações — sem LLM, sem rede
uv run python forma.py             # não-regressão do normalizador
uv run python instrucao.py         # não-regressão do montador do Tutor
uv run uvicorn main:app --port 8000
curl localhost:8000/health         # deve reportar checkpointer, métodos, modelo
uv run python provar_instrucao.py 3    # trilho antigo, não-regressão
uv run python provar_mini.py 3         # forma + estrutura

# Web (em web/)
npm run lint && npm run build && npm run dev
```

Manual, documentado no `LEARNINGS.md` a cada fatia:
1. `/` mostra o cartão do McKee Mini → leva a `/mckee-mini`
2. Nova sessão → braindump → o mapa pinta **no quadro**, não no chat
3. F5 traz o histórico e o mapa, sem chamar o modelo
4. A sessão aparece na lista com trilho `mckee-mini`
5. `/mckee` e `/mckee-inspired` continuam idênticos
6. `/mckee-mini/previa` renderiza o mapa fixo sem tocar no modelo

## Pendências que são suas

O `Mini.md` está **não versionado** e tem decisões em aberto que mudam a instrução da Fatia 6:
- §18: changelog v2 aguarda seu veto (inclusive o nome "O Mundo como Ficou" para a lacuna 6)
- §19: conteúdo dos cards Protagonista e Força Antagônica; "valor em jogo" visível ou metadado

Sugestão: versionar o `Mini.md` junto da Fatia 2, movendo para `docs/STORY_RENDER_METODO_MCKEE_MINI.md` no padrão dos outros — a raiz hoje só tem `CLAUDE.md` e `LEARNINGS.md`. O `CLAUDE.md` também precisa registrar que o trilho ativo virou o Mini, que o McKee Inspired congelou, e a exceção deliberada à regra de ordem das fases.
