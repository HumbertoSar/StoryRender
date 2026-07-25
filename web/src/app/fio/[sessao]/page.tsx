import { apenasTexto, carregarSessao } from "@/lib/sessoes";

import { Conversa } from "../conversa";

// Sempre no request: o histórico vem do checkpointer e muda a cada turno —
// uma versão em cache reabriria a sessão no estado de ontem.
export const dynamic = "force-dynamic";

/** Uma conversa do Fio, endereçada pelo id da thread.
 *
 * O id na URL é o que a persistência tem de mais importante: com ele, sair do
 * dispositivo (ou recarregar, ou abrir no celular) volta pra mesma conversa.
 * Id sem checkpoint ainda não é erro — é exatamente uma sessão nova. */
export default async function PaginaDaSessao({
  params,
}: {
  params: Promise<{ sessao: string }>;
}) {
  const { sessao } = await params;
  const { mensagens, erro } = await carregarSessao(sessao);

  return (
    <Conversa
      sessao={sessao}
      historico={apenasTexto(mensagens)}
      erroDoHistorico={erro}
    />
  );
}
