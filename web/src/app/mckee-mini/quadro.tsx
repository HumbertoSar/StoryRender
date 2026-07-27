"use client";

import {
  OpenGenerativeUIActivityRenderer,
  OpenGenerativeUIActivityType,
  OpenGenerativeUIContentSchema,
  useAgent,
  UseAgentUpdate,
  type ReactActivityMessageRenderer,
} from "@copilotkit/react-core/v2";

export const AGENTE = "mckee_mini";

/** O desenho sai do chat e vai pro quadro.
 *
 * A superfície gerada chega como ACTIVITY message, e o renderer embutido do
 * CopilotKit a pinta dentro do fluxo do chat. Trocar o lugar é ponto de
 * extensão suportado, não gambiarra: `findRenderer` resolve na ordem
 * `agentId igual ao ativo` → `agentId ausente` → curinga, e a lista final é
 * `[...os nossos, ...os embutidos]`. Um renderer nosso com `agentId` casado
 * vence o embutido (que não tem agentId) e não encosta no /mckee, que usa
 * outro runtime e outro agente.
 *
 * Fora do componente porque a lista precisa ser estável: o provider avisa no
 * console se a identidade do array mudar entre renders. */
export const RENDERERS: ReactActivityMessageRenderer<unknown>[] = [
  {
    activityType: OpenGenerativeUIActivityType,
    agentId: AGENTE,
    content: OpenGenerativeUIContentSchema,
    // Devolve a pílula, não o desenho: o desenho é pintado pelo <Quadro/>, e
    // renderizar nos dois lugares montaria dois iframes com o mesmo conteúdo.
    render: () => <div className="sr-mini__pilula">mapa desenhado no quadro →</div>,
  } as ReactActivityMessageRenderer<unknown>,
];

/** O quadro: pinta a última superfície gerada, ao lado da conversa.
 *
 * `OpenGenerativeUIActivityRenderer` é exportado pelo pacote, recebe UMA prop
 * (`content`) e sua única dependência de contexto tem default vazio — então
 * renderiza fora do chat sem adaptação. O limite medido na Fase 2.1 com A2UI
 * ("a superfície só vive no chat") não vale para o open-ended. */
export function Quadro() {
  // Aqui a inscrição é necessária: o quadro precisa re-renderizar a cada delta
  // pra pintura progressiva acontecer.
  const { agent } = useAgent({
    agentId: AGENTE,
    updates: [UseAgentUpdate.OnMessagesChanged],
  });

  const ultima = [...agent.messages]
    .reverse()
    .find(
      (m) =>
        m.role === "activity" &&
        (m as { activityType?: string }).activityType === OpenGenerativeUIActivityType,
    );

  if (!ultima) {
    return (
      <div className="sr-mini__quadro sr-mini__quadro--vazio">
        <div className="sr-mini__vazio-titulo">o quadro está em branco</div>
        <div className="sr-mini__vazio-texto">
          Conte a história ao lado e peça para ver. O desenho aparece aqui.
        </div>
      </div>
    );
  }

  // O schema é o mesmo que o renderer embutido usaria; validar aqui evita que
  // um payload malformado derrube a árvore inteira em vez de só o quadro.
  const conteudo = OpenGenerativeUIContentSchema.safeParse(
    (ultima as { content?: unknown }).content,
  );
  if (!conteudo.success) {
    return (
      <div className="sr-mini__quadro sr-mini__quadro--vazio">
        <div className="sr-mini__vazio-titulo">o desenho não pôde ser lido</div>
      </div>
    );
  }

  // A implementação só lê `content` (é o que permite pintar fora do chat), mas
  // o tipo pede as quatro props. Passar todas custa nada e evita um cast que
  // mentiria caso o componente passe a usá-las.
  return (
    <div className="sr-mini__quadro">
      <OpenGenerativeUIActivityRenderer
        activityType={OpenGenerativeUIActivityType}
        content={conteudo.data}
        message={ultima}
        agent={agent}
      />
    </div>
  );
}
