import Link from "next/link";

import { listarSessoes, type Sessao } from "@/lib/sessoes";

import "./sessoes.css";

// Sempre no request: a lista muda a cada turno de conversa, e o id da sessão
// nova (abaixo) precisa ser sorteado de novo a cada visita.
export const dynamic = "force-dynamic";

function editadaHa(iso: string): string {
  const dias = Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000);
  if (dias <= 0) return "hoje";
  if (dias === 1) return "ontem";
  if (dias < 7) return `há ${dias} dias`;
  const semanas = Math.floor(dias / 7);
  return semanas === 1 ? "há 1 semana" : `há ${semanas} semanas`;
}

function CartaoDeSessao({ sessao }: { sessao: Sessao }) {
  return (
    <Link href={`/fio/${sessao.thread_id}`} className="sr-sessoes__card">
      <div className="sr-sessoes__card-titulo">
        {sessao.inicio || "Sessão sem primeira fala"}
      </div>
      <div className="sr-sessoes__card-meta">
        {sessao.turnos} {sessao.turnos === 1 ? "TURNO" : "TURNOS"} ·{" "}
        {editadaHa(sessao.atualizado_em).toUpperCase()} ·{" "}
        {sessao.thread_id.slice(0, 8)}
      </div>
    </Link>
  );
}

export default async function Sessoes() {
  const sessoes = await listarSessoes("fio");
  // O id da sessão nova é sorteado AQUI, no servidor, e não no clique: em dev
  // o Next é servido por http direto no IP — contexto inseguro, onde
  // `crypto.randomUUID()` do navegador não existe. Do lado do servidor sempre
  // existe, e o link já nasce apontando pra conversa em branco.
  const nova = crypto.randomUUID();

  return (
    <div className="sr-sessoes">
      <div className="sr-sessoes__conteudo">
        <Link href="/" className="sr-sessoes__voltar">
          ← métodos
        </Link>
        <div className="sr-sessoes__titulo">O Fio</div>
        <div className="sr-sessoes__subtitulo">
          tutor socrático · 9 degraus · fase de validação em texto
        </div>

        <div className="sr-sessoes__label">Suas sessões</div>
        <div className="sr-sessoes__lista">
          {/* Três estados diferentes, de propósito: banco fora do ar não pode
              se parecer com acervo vazio — um pede pra tentar de novo, o outro
              pede pra começar. */}
          {sessoes === null && (
            <div className="sr-sessoes__vazio sr-sessoes__vazio--erro">
              Não deu pra ler as sessões gravadas — o agente ou o banco está
              fora do ar. Uma sessão nova ainda funciona, mas só será listada
              aqui quando o banco voltar.
            </div>
          )}
          {sessoes?.length === 0 && (
            <div className="sr-sessoes__vazio">
              Nenhuma sessão ainda — comece uma abaixo.
            </div>
          )}
          {sessoes?.map((s) => (
            <CartaoDeSessao key={s.thread_id} sessao={s} />
          ))}

          <Link href={`/fio/${nova}`} className="sr-sessoes__nova">
            <div className="sr-sessoes__nova-icone">+</div>
            <div>
              <div className="sr-sessoes__nova-titulo">Nova sessão</div>
              <div className="sr-sessoes__nova-legenda">
                despeje a história do jeito que ela estiver
              </div>
            </div>
          </Link>
        </div>

        <div className="sr-sessoes__rodape">
          A conversa fica gravada no servidor: fechar a aba, trocar de aparelho
          ou voltar amanhã continua do mesmo ponto.
        </div>
      </div>
    </div>
  );
}
