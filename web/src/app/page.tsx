"use client";

import { CopilotKit } from "@copilotkit/react-core";
import { CopilotChat } from "@copilotkit/react-ui";
import "@copilotkit/react-ui/styles.css";

export default function Home() {
  return (
    <CopilotKit runtimeUrl="/api/copilotkit" agent="story_agent">
      <main style={{ height: "100vh", display: "flex", flexDirection: "column" }}>
        <CopilotChat
          labels={{
            title: "Story Render",
            initial: "Fase 0: chat mínimo ligado ao agente LangGraph via AG-UI.",
          }}
        />
      </main>
    </CopilotKit>
  );
}
