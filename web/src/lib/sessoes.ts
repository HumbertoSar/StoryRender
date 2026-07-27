/** Leitura do acervo de sessões — usada pelos Server Components do McKee Inspired.
 *
 * Roda só no servidor do Next (a tela de seleção e a página da conversa são
 * Server Components), então fala direto com o agente Python, sem passar por um
 * route handler: o proxy em /api só existe pra quem chama do navegador. */

const AGENTE = process.env.AGENT_SESSOES_URL ?? "http://127.0.0.1:8000/sessoes";

export type Sessao = {
  thread_id: string;
  trilho: "mckee-inspired" | "mckee" | "mckee-mini";
  turnos: number;
  /** ISO do último checkpoint. */
  atualizado_em: string;
  /** Primeira fala do autor, já normalizada e cortada pelo agente. */
  inicio: string;
};

/** Mensagem como o checkpointer a devolve, no formato do protocolo AG-UI. */
export type MensagemDaSessao = {
  id: string;
  role: "user" | "assistant" | "system" | "tool";
  content?: string;
};

/** O subconjunto que o chat do Tutor sabe mostrar: turno de texto, de um lado ou
 * do outro. É o que a fase de validação produz (o Tutor não tem tools). */
export type TurnoDeTexto =
  | { id: string; role: "user"; content: string }
  | { id: string; role: "assistant"; content: string };

/** `null` distingue "não deu pra perguntar" de "não tem sessão nenhuma" — a
 * tela precisa dizer coisas diferentes nos dois casos. */
export async function listarSessoes(trilho: string): Promise<Sessao[] | null> {
  try {
    const r = await fetch(`${AGENTE}?trilho=${encodeURIComponent(trilho)}`, {
      cache: "no-store",
    });
    if (!r.ok) return null;
    const dados = await r.json();
    return (dados.sessoes ?? []) as Sessao[];
  } catch {
    return null;
  }
}

export type HistoricoDaSessao = {
  mensagens: MensagemDaSessao[];
  /** Mensagem de erro quando o histórico não pôde ser lido — diferente de
   * sessão nova, que é histórico vazio sem erro. */
  erro: string | null;
};

export async function carregarSessao(id: string): Promise<HistoricoDaSessao> {
  try {
    const r = await fetch(`${AGENTE}/${encodeURIComponent(id)}`, {
      cache: "no-store",
    });
    // 404 é o caso normal de sessão nova: o id só ganha checkpoint quando o
    // primeiro turno roda. Conversa em branco, sem erro.
    if (r.status === 404) return { mensagens: [], erro: null };
    if (!r.ok) return { mensagens: [], erro: "histórico não carregado" };
    const dados = await r.json();
    return { mensagens: (dados.mensagens ?? []) as MensagemDaSessao[], erro: null };
  } catch {
    return { mensagens: [], erro: "agente fora do ar" };
  }
}

/** Só os turnos de texto, que é o que o chat do Tutor renderiza.
 *
 * Uma thread do McKee aberta aqui por engano (id colado na URL) aparece sem as
 * tool calls em vez de quebrar o chat — e isso não corrompe nada: ao mandar o
 * próximo turno o adaptador só ACRESCENTA ids que ainda não estão no
 * checkpoint, nunca reescreve o que já foi gravado. */
export function apenasTexto(mensagens: MensagemDaSessao[]): TurnoDeTexto[] {
  const turnos: TurnoDeTexto[] = [];
  for (const m of mensagens) {
    if (!m.content?.trim()) continue;
    if (m.role === "user") turnos.push({ id: m.id, role: "user", content: m.content });
    else if (m.role === "assistant")
      turnos.push({ id: m.id, role: "assistant", content: m.content });
  }
  return turnos;
}
