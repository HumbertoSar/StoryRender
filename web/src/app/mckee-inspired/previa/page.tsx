"use client";

// Banco de prova do chat do McKee Inspired: renderiza o CopilotChatView com mensagens
// fixas — sem agente, sem custo de LLM — no formato que o Tutor produz de
// verdade (seções, mapa em três símbolos, pergunta central em negrito, despejo
// longo do autor). Serve pra iterar em CSS e nas ações de mensagem sem gastar
// turno de conversa, e é onde as duas coisas foram medidas.
import { CopilotKit } from "@copilotkit/react-core";
import {
  CopilotChatAssistantMessage,
  CopilotChatConfigurationProvider,
  CopilotChatView,
} from "@copilotkit/react-core/v2";
import "@copilotkit/react-core/v2/styles.css";

import "../tutor.css";
import { ProvedorDeFeedback, TurnoDoTutor, useFeedback } from "../feedback";

// Mesmo aviso da topbar da conversa: sem ele aqui, o caminho de falha do 👍/👎
// não teria como ser exercitado neste banco de prova.
function AvisoDeFeedback() {
  const { erro } = useFeedback();
  return erro ? <div className="sr-tutor__aviso-feedback">{erro}</div> : null;
}

// Thread fixa: o TurnoDoTutor lê o id daqui (na página de verdade quem o
// resolve é o <CopilotChat>), e assim o 👍/👎 grava e recarrega igualzinho.
const THREAD = "previa-de-estilo";

const MENSAGENS = [
  {
    id: "u1",
    role: "user" as const,
    content:
      "Tenho uma faroleira, a Ana. O irmão dela, o Léo, sumiu numa noite de névoa há dez anos e nunca acharam corpo. Ela ficou na ilha, assumiu o farol, criou a filha sozinha. Um dia chega uma garrafa com uma carta com a letra do Léo — e a carta está datada de amanhã. Eu sei que quero que ela entre na névoa no final. O que eu não sei é por que ela demorou dez anos, nem o que ela perde escolhendo isso. Também não sei quem é o antagonista: às vezes penso que é a própria névoa, às vezes penso que é a filha dela.",
  },
  {
    id: "a1",
    role: "assistant" as const,
    content: `Tem história aqui, e mais do que você imagina que tem. Antes de puxar qualquer ponta, deixa eu te devolver o que você acabou de me dar, organizado.

## O mapa do que você já tem

● **Firme**: a imagem de chegada. "Ela entra na névoa" não é palpite seu, é convicção. Você escreveu *"eu sei"*. Guarda isso, é a sua bússola.

● **Firme**: o \`TODO DIA\` (a rotina que existia antes de a história começar). Faroleira, ilha, dez anos, uma filha. Tudo isso já tem peso e não precisa de defesa.

◐ **Rascunho**: a carta datada de amanhã, candidata a \`QUEBRA\` (o evento que rompe a rotina e acende o desejo). Por enquanto ela é um efeito bonito, porque você ainda não decidiu se a data é promessa, ameaça ou armadilha.

○ **Buraco**: os dez anos. É a pergunta que você mesmo levantou e a mais cara de todas. Enquanto ela não tiver resposta, a Ana é uma personagem que espera, não uma que escolhe.

○ **Buraco**: a \`APOSTA\` (o que ela põe na mesa pra ir atrás do que quer). Você sabe o que ela faz no fim, mas não sabe o que aquilo custa. Sem preço, entrar na névoa é um passeio.

---

## Onde eu quero provocar

Repara numa coisa que você disse quase de passagem: *"criou a filha sozinha"*.

Se a filha existe, os dez anos já têm uma resposta possível, e ela é bem mais dura que "a Ana teve medo". Ela ficou porque **alguém dependia dela ficar**. A névoa não a segurou; a maternidade segurou.

Isso reorganiza três coisas de uma vez:

1. A filha deixa de ser candidata a vilã e vira a força que cobra o preço
2. A névoa deixa de ser \`FORÇA ANTAGÔNICA\` (tudo que se opõe ao desejo, de dentro, de perto ou do sistema) e vira o campo onde a escolha acontece
3. Entrar na névoa deixa de ser coragem e vira abandono, e aí sim dói

Vamos testar a candidata a \`QUEBRA\` antes de seguir:

> **TESTE · rompe sem volta**
>
> Dá pra fingir que nada aconteceu e a vida seguir igual?
>
> **Passa**: depois de ler a letra do irmão numa carta datada de amanhã, qualquer noite normal no farol vira encenação.

> **TESTE · acende o desejo**
>
> O que ela quer depois disso é diferente do que ela queria antes?
>
> **Não passa**: pelo que você me contou, ela já queria o irmão de volta ontem, hoje e há dez anos. A carta apressa, mas não acende. É isso que precisa de conserto, e o conserto provavelmente está no que a carta EXIGE dela, não no que ela revela.

### O que fica pendurado no \`MURAL\` (a lista viva de promessas feitas ao leitor)

- **A promessa do farol.** Você plantou uma faroleira, então o leitor vai cobrar uma noite em que a luz falha.
- **A letra do Léo.** Se é mesmo a letra dele, alguém precisa ter escrito, e isso tem consequência. É uma \`PROMESSA PLANTADA\` (elemento plantado que precisa disparar antes do fim).
- **A \`CENA OBRIGATÓRIA\` (a promessa que a história não pode deixar de pagar).** Ana e a filha, frente a frente, sobre a saída. Sem ela o final não se paga.

*A pergunta deixa de ser "ela tem coragem?" e passa a ser "ela tem direito?".*

---

**Se a filha for o preço e não o vilão, o que exatamente a Ana está disposta a perder, e ela sabe disso quando entra, ou descobre depois?**`,
  },
];

export default function Previa() {
  return (
    <CopilotKit
      runtimeUrl="/api/copilotkit"
      agent="tutor_agent"
      enableInspector={false}
    >
      <ProvedorDeFeedback>
        {/* Os rótulos vêm daqui, e não do <CopilotChatView>: o view lê a
            configuração do contexto (quem aceita `labels` por prop é o
            <CopilotChat>). Sem isto a prévia mostra o placeholder e o aviso
            em inglês, e deixa de servir como prévia do chat de verdade. */}
        <CopilotChatConfigurationProvider
          agentId="tutor_agent"
          threadId={THREAD}
          labels={{
            chatInputPlaceholder: "Despeje a história…",
            chatDisclaimerText:
              "O material é seu: o tutor testa, provoca e propõe. Quem decide é você.",
          }}
        >
          <div className="sr-tutor">
            <div className="sr-tutor__topbar">
              <div className="sr-tutor__titulo">McKee Inspired</div>
              <div className="sr-tutor__selo">prévia de estilo</div>
              <AvisoDeFeedback />
            </div>
            <div className="sr-tutor__chat">
              <CopilotChatView
                messages={MENSAGENS}
                isRunning={false}
                messageView={{
                  userMessage: { messageRenderer: "sr-tutor__bolha" },
                  assistantMessage:
                    TurnoDoTutor as typeof CopilotChatAssistantMessage,
                }}
                input={{ disclaimer: "sr-tutor__aviso" }}
              />
            </div>
          </div>
        </CopilotChatConfigurationProvider>
      </ProvedorDeFeedback>
    </CopilotKit>
  );
}
