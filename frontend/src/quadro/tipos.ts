export const STATUS_OPCOES = ["vazio", "rascunho", "testado", "validado"] as const;
export type Status = (typeof STATUS_OPCOES)[number];

export interface Protagonista {
  id: string;
  want: string;
  need: string;
  aposta: string;
  caracterizacao: string;
  carater_verdadeiro: string;
  arco: string;
  pov: string;
  status: string;
}

export interface Antagonista {
  niveis: string[];
  fonte_oposicao: string;
  logica_interna: string;
  avatar: string;
  poder_relativo: string;
  pontos_contato: string[];
  status: string;
}

export interface IdeiaControladora {
  valor: string;
  causa: string;
  contraideia: string;
  status: string;
}

export interface EspinhaNo {
  id: string;
  tipo: string;
  conteudo: string;
  status: string;
  conecta_assets: string[];
  ordem?: number;
}

export interface RoteiroData {
  template: string;
  titulo: string;
  fase_atual: string;
  espinha: EspinhaNo[];
  assets: {
    protagonistas: Protagonista[];
    antagonista: Antagonista;
    ideia_controladora: IdeiaControladora;
    mundo: { epoca: string; local: string; regras_custo: string; status: string };
    genero: { generos: string[]; promessa: string; status: string };
    elenco_notas: { texto_livre: string };
  };
}
