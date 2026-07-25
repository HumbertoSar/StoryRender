"use client";

// TEMPORÁRIO — banco de prova do CSS do chat do Fio. Renderiza o
// CopilotChatView com mensagens fixas (sem agente, sem custo de LLM) no
// formato que o Tutor produz de verdade: seções, mapa em três símbolos,
// pergunta central em negrito e um despejo longo do autor.
import { CopilotKit } from "@copilotkit/react-core";
import { CopilotChatView } from "@copilotkit/react-core/v2";
import "@copilotkit/react-core/v2/styles.css";

import "../fio.css";

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
    content: `Tem história aqui, e mais do que você acha. Antes de puxar qualquer fio, deixa eu te devolver o que você acabou de me dar — organizado.

## O mapa do que você já tem

● **Firme** — a imagem de chegada. "Ela entra na névoa" não é um palpite seu, é uma convicção: você disse *"eu sei"*. Guarda isso, é a sua bússola.

● **Firme** — a situação de partida. Faroleira, ilha, dez anos, uma filha. Tudo isso já tem peso e não precisa de defesa.

◐ **Rascunho** — a carta datada de amanhã. É um belo gatilho, mas por enquanto é só um efeito: você ainda não decidiu se a data é uma promessa, uma ameaça ou uma armadilha.

◐ **Rascunho** — o antagonista. Você oscila entre a névoa e a filha, e essa oscilação não é indecisão: é o sintoma de que o conflito verdadeiro está entre as duas coisas, não em uma delas.

○ **Buraco** — os dez anos. Essa é a pergunta que você mesmo levantou e é a mais cara de todas. Enquanto ela não tiver resposta, a Ana é uma personagem que espera, não uma que escolhe.

○ **Buraco** — o preço. Você sabe o que ela faz no fim; não sabe o que isso custa. Sem preço, entrar na névoa é um passeio.

---

## Onde eu quero apertar

Repara numa coisa que você disse quase de passagem: *"criou a filha sozinha"*.

Se a filha existe, os dez anos já têm uma resposta possível — e ela é bem mais dura do que "a Ana teve medo". Ela ficou porque **alguém dependia dela ficar**. A névoa não a segurou; a maternidade segurou.

Isso muda o desenho inteiro:

1. A filha deixa de ser candidata a vilã e vira a **força que cobra o preço**
2. A névoa deixa de ser antagonista e vira o **campo onde a escolha acontece**
3. Entrar na névoa deixa de ser coragem e vira **abandono** — e aí, sim, dói

### O que fica pendurado

- **A promessa do farol.** Você plantou uma faroleira; o leitor vai cobrar uma noite em que a luz falha.
- **A letra do Léo.** Se é mesmo a letra dele, alguém precisa ter escrito — e isso tem consequência.
- **A cena obrigatória.** Ana e a filha, frente a frente, sobre a saída. Sem ela o final não se paga.

E repara no que a data de amanhã faz nesse arranjo: ela tira da Ana o luxo de adiar. Dez anos de "um dia eu vou" viram uma noite.

> A pergunta deixa de ser "ela tem coragem?" e passa a ser "ela tem direito?".

---

**Se a filha for o preço e não o vilão, o que exatamente a Ana está disposta a perder — e ela sabe disso quando entra, ou descobre depois?**`,
  },
];

export default function Previa() {
  return (
    <CopilotKit
      runtimeUrl="/api/copilotkit"
      agent="tutor_agent"
      enableInspector={false}
    >
      <div className="sr-fio">
        <div className="sr-fio__topbar">
          <div className="sr-fio__titulo">O Fio</div>
          <div className="sr-fio__selo">prévia de estilo</div>
        </div>
        <div className="sr-fio__chat">
          <CopilotChatView
            messages={MENSAGENS}
            isRunning={false}
            messageView={{
              userMessage: { messageRenderer: "sr-fio__bolha" },
              assistantMessage: { onThumbsUp: () => {}, onThumbsDown: () => {} },
            }}
            input={{ disclaimer: "sr-fio__aviso" }}
          />
        </div>
      </div>
    </CopilotKit>
  );
}
