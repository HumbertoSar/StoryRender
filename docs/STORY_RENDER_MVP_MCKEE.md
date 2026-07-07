# Story Render — MVP (template McKee)

**Status:** rascunho v1 — escopo pra fechar, projetar e desenvolver pra iterar
**Cobertura:** só o template McKee. Outros estilos (Jornada do Herói etc.) usam a mesma arquitetura, mas ficam fora deste documento.

---

## 1. Escopo do MVP

### P0 — sem isso o produto não funciona
- Espinha completa (5 nós) sempre visível
- Cartões: Protagonista, Antagonista/Forças, Ideia Controladora (versão mínima de cada — ver seção 3)
- Agente em modo Condução, guiando o preenchimento pela ordem sugerida (seção 4)
- Persistência do esquema (fechar e voltar sem perder nada)
- Edição direta no cartão (sem passar pelo chat)

### P1 — fast follow, não trava o lançamento
- Modo Diagnóstico do agente (revisão de coerência sob demanda)
- Cartões: Mundo da História, Gênero & Promessa (versão simplificada)
- Divisão visual em Atos/Partes na espinha

### P2 — arquitetura já prevê, mas não se constrói agora
- Triângulo da História como escolha explícita (Archplot fica hardcoded como padrão no v1)
- Elenco de Apoio & Subtramas como entidade modelada própria (no v1 é texto livre dentro do cartão de Antagonista/notas)
- Múltiplos protagonistas / Miniplot coral
- Múltiplos templates simultâneos no mesmo projeto

### Fora de escopo agora (não-objetivos explícitos)
- Colaboração em tempo real multiplayer
- Export pra Word, Final Draft, Fountain ou qualquer formato final
- Qualquer template além de McKee
- Geração automática de prosa/cena — o produto pára no esqueleto, não escreve por você

---

## 2. Macroesquema — v1

### 2.1 A espinha (os 5 nós são P0, nenhum é cortável)

| Nó | Função | Preenchido em |
|---|---|---|
| Incidente Incitante | Rompe o equilíbrio, gera o desejo consciente | Fase B |
| Complicações Progressivas | Nó repetível — cada uma maior que a anterior, com ponto sem retorno | Fase C |
| Crise | Decisão obrigatória, dilema real | Fase B (esboço) → Fase C (fechado) |
| Clímax | Mudança irreversível, prova a Ideia Controladora | Fase B (esboço) → Fase C (fechado) |
| Resolução | Consequências, novo equilíbrio | Fase C |

O "Mundo em Equilíbrio" (o antes) fica só como contexto visual atrás do primeiro nó — não é um nó clicável no v1.

### 2.2 Decisões de configuração — simplificadas pro v1

| Decisão | Status v1 |
|---|---|
| Triângulo da História (Archplot/Miniplot/Antiplot) | Hardcoded em Archplot. Vira toggle explícito só na v2. |
| Divisão em Atos/Partes | P1 — camada visual opcional sobre a espinha, não é obrigatória pra usar o produto |
| Subtramas como entidade própria | P2 — no v1 vivem como texto livre dentro do cartão de apoio |

---

## 3. Cartões de Profundidade — v1

### 3.1 Protagonista (P0)

| Campo | Prioridade | Observação |
|---|---|---|
| Desejo Consciente (Want) | P0 | Primeiro campo perguntado — quebra-gelo |
| Necessidade Inconsciente (Need) | P0 | Nunca perguntado direto; agente infere via "o que ele evita encarar" |
| A Aposta | P0 | Agente rejeita respostas vagas ("tudo", "muito") |
| Caracterização × Caráter Verdadeiro | P1 | Superfície é rápida; caráter verdadeiro exige exemplo de escolha sob pressão |
| Arco | P1 | Agente propõe síntese com base nos campos anteriores, usuário ajusta |
| POV / Distância Narrativa | P1 | Pode vir pré-sugerido pelo Gênero |

Cartão precisa ser instanciável (mais de um Protagonista) desde o modelo de dados, mesmo que a UI do v1 só exponha um.

### 3.2 Antagonista / Forças Antagônicas (P0)

| Campo | Prioridade | Observação |
|---|---|---|
| Nível(is) da oposição (interno/pessoal/extra-pessoal) | P0 | Pergunta de triagem — decide quais campos seguintes aparecem |
| Fonte de oposição / lógica interna do sistema | P0 | "Motivação" só existe se personificado; sistemas usam "lógica interna" |
| Avatar / manifestação concreta | P0 | Sem isso o antagonismo sistêmico não dramatiza — agente insiste, não bloqueia |
| Poder relativo | P1 | Precisa ser ≥ protagonista |
| Pontos de contato | P1 | Idealmente um por Complicação Progressiva |

### 3.3 Ideia Controladora / Tema (P0, mas pequeno)

| Campo | Prioridade |
|---|---|
| Valor + Causa | P0 |
| Contraideia | P1 |

### 3.4 Mundo da História (P1 — versão enxuta)
Época · Local · Regras/custo do sistema central que gera obstáculo. (Duração e nível de conflito ficam pra v2.)

### 3.5 Gênero & Promessa ao Leitor (P1 — versão enxuta)
Gênero(s) · Promessa emocional. (Convenções obrigatórias detalhadas ficam pra v2.)

### 3.6 Elenco de Apoio & Subtramas (P2)
No v1: campo de texto livre dentro do cartão de Antagonista ("outros personagens relevantes"). Vira cartão próprio quando o core loop (Protagonista+Antagonista+Tema+Espinha) estiver validado com usuários reais.

---

## 4. A fórmula — ordem sugerida de preenchimento

McKee resiste a fórmulas de propósito — a estrutura dele é uma lente de diagnóstico, não uma receita. Isso aqui é um andaime pro v1: uma sequência fixa só até o esqueleto mínimo existir. A partir do fim da Fase B, a ordem deixa de ser imposta — o usuário edita qualquer cartão, em qualquer ordem, direto no esquema.

**Fase A — Semente (rápida, 3 perguntas)**
1. Ideia-semente da história, em uma frase
2. Gênero (escolha de lista curta)
3. Protagonista → só o Desejo Consciente

**Fase B — Espinha mínima (hipótese, não versão final)**
4. Incidente Incitante
5. Crise (esboço)
6. Clímax (esboço)

> A partir daqui a ordem vira sugestão, não gate. O usuário pode pular pra qualquer cartão.

**Fase C — Aprofundamento guiado (o agente conduz pesado aqui)**
7. Protagonista → Need, Aposta, Caráter×Caracterização, Arco
8. Antagonista/Forças → triagem de nível + campos
9. Ideia Controladora → testada contra o Clímax
10. Complicações Progressivas, uma a uma, cada uma testada contra Want/Need do protagonista e contra o nível do Antagonista
11. Resolução

**Fase D — Opcional, expande quando quiser**
12. Mundo da História
13. Gênero — convenções e promessa, aprofundado
14. Elenco de Apoio (texto livre)

---

## 5. Mapa de conexões

| Cartão | Conecta à espinha em | O que o agente testa |
|---|---|---|
| Protagonista | Incidente Incitante · Crise · Clímax | Want desperta no Incidente; a escolha na Crise reflete o Caráter Verdadeiro; o Arco se resolve no Clímax |
| Antagonista/Forças | Cada Complicação Progressiva | Poder relativo ≥ protagonista; cada ponto de contato tem avatar ou manifestação concreta |
| Ideia Controladora | Clímax | Valor + Causa se prova sem exposição explicada |
| Mundo da História | Toda a espinha (pano de fundo) | As regras do mundo geram os obstáculos das Complicações |
| Gênero & Promessa | Toda a espinha | Convenções obrigatórias aparecem em algum ponto da espinha |
| Elenco/Subtramas | Complicações Progressivas | Ecoa ou contradiz a Ideia Controladora |

Essa tabela é literalmente o `conecta_assets` do modelo de dados abaixo — não precisa reinventar na hora de codar.

---

## 6. Modelo de dados (proposta — não foi pedida, mas destrava o dev)

```json
{
  "roteiro_id": "uuid",
  "template": "mckee",
  "fase_atual": "C",
  "espinha": [
    {
      "id": "incidente_incitante",
      "tipo": "no_fixo",
      "conteudo": "",
      "status": "vazio",
      "conecta_assets": ["protagonista", "mundo"]
    },
    {
      "id": "complicacao_1",
      "tipo": "complicacao",
      "ordem": 1,
      "conteudo": "",
      "status": "vazio",
      "conecta_assets": ["antagonista", "protagonista"]
    },
    { "id": "crise", "tipo": "no_fixo", "conteudo": "", "status": "vazio", "conecta_assets": ["protagonista"] },
    { "id": "climax", "tipo": "no_fixo", "conteudo": "", "status": "vazio", "conecta_assets": ["protagonista", "ideia_controladora"] },
    { "id": "resolucao", "tipo": "no_fixo", "conteudo": "", "status": "vazio", "conecta_assets": [] }
  ],
  "assets": {
    "protagonistas": [
      {
        "id": "prot_1",
        "want": "", "need": "", "aposta": "",
        "caracterizacao": "", "carater_verdadeiro": "",
        "arco": "", "pov": "",
        "status": "rascunho"
      }
    ],
    "antagonista": {
      "niveis": ["extra_pessoal"],
      "fonte_oposicao": "", "logica_interna": "", "avatar": "",
      "poder_relativo": "", "pontos_contato": [],
      "status": "vazio"
    },
    "ideia_controladora": { "valor": "", "causa": "", "contraideia": "", "status": "vazio" },
    "mundo": { "epoca": "", "local": "", "regras_custo": "", "status": "vazio" },
    "genero": { "generos": [], "promessa": "", "status": "vazio" },
    "elenco_notas": { "texto_livre": "" }
  }
}
```

`status` por campo/cartão segue: `vazio` → `rascunho` → `testado` → `validado`. É o mesmo estado que o modo Diagnóstico consulta pra saber o que checar.

---

## 7. Arquitetura de agentes

### Decisão: agente único, dois modos — não multi-agente

**Contexto.** Precisa decidir entre um agente conversacional único cuidando de toda a espinha e todos os cartões, ou uma arquitetura multi-agente (um agente por tipo de cartão, por exemplo). A escolha afeta diretamente a velocidade de construção do MVP e a qualidade do raciocínio cruzado entre campos (Want×Need, Ideia Controladora×Clímax, Poder Antagonista×Protagonista).

**Opções consideradas**

*Opção A — Agente único, multi-modo*

| Dimensão | Avaliação |
|---|---|
| Complexidade de engenharia | Baixa — um system prompt, um loop |
| Raciocínio cross-card | Nativo — o agente sempre vê o esquema inteiro |
| Velocidade pro MVP | Alta |
| Consistência de voz | Alta — uma persona de script doctor o tempo todo |

*Opção B — Multi-agente (um por tipo de cartão)*

| Dimensão | Avaliação |
|---|---|
| Complexidade de engenharia | Alta — orquestração, handoff, estado compartilhado |
| Raciocínio cross-card | Exige passagem explícita de contexto — risco de um agente contradizer outro |
| Velocidade pro MVP | Baixa |
| Consistência de voz | Risco de personas divergentes entre cartões |

**Trade-off.** Multi-agente ganha em separação de responsabilidade e escala, mas custa exatamente o que o MVP não pode gastar: tempo de engenharia e risco de inconsistência entre cartões — que é o problema nº1 que o produto existe pra resolver. Construir a ferramenta que evita inconsistência narrativa usando uma arquitetura que introduz inconsistência de agente seria irônico.

**Decisão.** Agente único, dois modos, com o estado completo do esquema em contexto a cada chamada.

**Revisitar quando:** o esquema crescer muito (Miniplot coral com vários protagonistas, dezenas de complicações) — nesse ponto o custo de contexto por chamada pode justificar dividir. Não antes disso.

### Os dois modos

- **Condução** — ativo durante o chat. Propõe conteúdo, testa tensão entre campos relacionados, nunca commita sugestão sem confirmação do usuário.
- **Diagnóstico** — roda sob demanda (botão "revisar" ou automaticamente quando um cartão muda de `rascunho` pra `testado`). Não conversa — retorna uma lista objetiva de inconsistências. É a mesma função da Fase 7 (Diagnóstico/revisão McKee) do seu agente de coaching pessoal, reaproveitada como modo em vez de fase sequencial.

### Rascunho de instrução inicial

```
# Agente Story Render — template McKee

## Persona
Você é um script doctor especializado no método de Robert McKee.
Seu trabalho não é preencher campos — é pressionar a estrutura até
ela aguentar peso dramático. Você recebe o estado completo do
esquema (espinha + cartões) a cada interação.

## Modos
- Condução: conversa com o usuário, propõe conteúdo, testa tensão
  entre campos relacionados, nunca aceita resposta vaga sem pedir
  concretude.
- Diagnóstico: roda os testes de coerência abaixo e retorna uma
  lista objetiva de problemas, sem conversa.

## Regras não-negociáveis
1. Nunca aceite "tudo" ou "muito" em Aposta — peça um exemplo
   específico.
2. Sempre que Want e Need estiverem preenchidos, compare os dois.
   Se alinhados demais, pergunte se é intencional (arco steadfast)
   antes de seguir.
3. Necessidade Inconsciente nunca é perguntada direto — é inferida
   perguntando o que o personagem evita encarar.
4. Antagonista: pergunte primeiro o(s) nível(is) da oposição antes
   de expor qualquer campo seguinte — eles dependem dessa resposta.
5. Antagonismo sistêmico precisa de ao menos um avatar por ponto de
   contato — sinalize se faltar, não bloqueie.
6. Ideia Controladora precisa apontar pro nó de Clímax — se não
   apontar, sinalize no Diagnóstico.
7. Sugestões de texto entram como pendentes até o usuário confirmar
   — por clique no cartão ou resposta no chat.
8. Se o usuário editar um cartão direto, na próxima interação
   verifique coerência com campos relacionados já preenchidos —
   avise, não reescreva sozinho.
9. Nunca bloqueie avanço pra outro nó/cartão com campos incompletos
   — sinalize o risco, a decisão é do usuário.

## Formato de entrada/saída
- Entrada: estado do esquema em JSON + modo ativo + última mensagem
  (se Condução).
- Saída (Condução): texto de resposta + lista de propostas de campo
  (campo, valor sugerido, status: pendente).
- Saída (Diagnóstico): lista estruturada (campo, problema,
  severidade: aviso/crítico).
```

---

## 8. Perguntas em aberto

- Multi-protagonista (Miniplot coral): cada um vira um cartão separado instanciado, ou sub-abas dentro de um cartão só? (decisão de UI, não resolvida aqui)
- Modo Diagnóstico automático a cada edição é ruidoso demais; só no fim de cada fase pode ser tarde demais. Qual o gatilho certo?
- Se o usuário pula a Fase B (não esboça Crise/Clímax cedo), o produto força um placeholder ou deixa vazio mesmo?
- Reverter uma sugestão do agente depois que o usuário já editou por cima — como fica o histórico?

## 9. Critério de "pronto" pro MVP

- [ ] Usuário completa Fases A–C sem travar (testado com 3–5 usuários reais)
- [ ] Modo Condução cobre os 3 cartões P0 sem exigir Diagnóstico pra funcionar
- [ ] Esquema persiste — reload não perde nada
- [ ] Edição direta no cartão e edição via chat ficam sincronizadas sem duplicar conteúdo
- [ ] Ao menos 1 usuário completa a espinha inteira (Fase A→D) sem sair do produto
