import { useState } from "react";
import { OnboardingFlow } from "./onboarding/OnboardingFlow";

function App() {
  const [modo, setModo] = useState<"onboarding" | "faseC" | "modoLivre">("onboarding");

  if (modo === "onboarding") {
    return <OnboardingFlow onFaseC={() => setModo("faseC")} onModoLivre={() => setModo("modoLivre")} />;
  }

  return (
    <div style={{ padding: 40, fontFamily: "system-ui, sans-serif", color: "#F0E9D8", background: "#4A4038", minHeight: "100vh" }}>
      {modo === "faseC" ? "Fase C (aprofundamento) — ainda não construída." : "Modo livre (edição direta no quadro) — ainda não construído."}
    </div>
  );
}

export default App;
