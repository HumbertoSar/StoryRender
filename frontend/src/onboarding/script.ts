export type NodeId = "incidente_incitante" | "crise" | "climax";

export type StepInputType = "texto" | "genero" | "texto-opcional";

export interface OnboardingStep {
  fase: "A" | "B";
  pergunta: string;
  tipo: StepInputType;
  ack: string;
  node?: NodeId | "protagonista_want";
}

export const GENEROS = ["Mistério", "Ficção especulativa", "Drama", "Thriller", "Fantasia", "Romance"];

export const ONBOARDING_STEPS: OnboardingStep[] = [
  {
    fase: "A",
    pergunta: "Vamos começar pela semente. Em uma frase: do que se trata essa história?",
    tipo: "texto",
    ack: "Boa semente — já virou o título provisório do quadro, ali no topo.",
  },
  {
    fase: "A",
    pergunta: "Agora me diz o gênero. Pode marcar mais de um:",
    tipo: "genero",
    ack: "Anotado no quadro.",
  },
  {
    fase: "A",
    pergunta:
      'Agora a pergunta que abre tudo: se você perguntasse pro seu protagonista "o que você quer?", o que ele diria — sem rodeios?',
    tipo: "texto",
    ack: "Direto — gostei. O cartão dele acabou de entrar no quadro, só com esse campo. Os outros ficam pra depois.",
    node: "protagonista_want",
  },
  {
    fase: "B",
    pergunta: "Agora a espinha: o que acontece pra virar a vida dele de cabeça pra baixo — o Incidente Incitante?",
    tipo: "texto",
    ack: "Primeiro nó no quadro — e já conectado ao Want dele.",
    node: "incidente_incitante",
  },
  {
    fase: "B",
    pergunta:
      "Ainda em esboço, sem compromisso: no fim dessa história, que escolha impossível ele vai enfrentar?",
    tipo: "texto-opcional",
    ack: 'Entrou como esboço — dá pra ver no quadro que ainda é hipótese.',
    node: "crise",
  },
  {
    fase: "B",
    pergunta: "Última: o que muda pra sempre depois dessa escolha — o Clímax, mesmo que só uma hipótese?",
    tipo: "texto-opcional",
    ack: "Isso já é o esqueleto.",
    node: "climax",
  },
];

export const NAO_SEI = "ainda não sei";
export const A_DEFINIR = "a definir";
