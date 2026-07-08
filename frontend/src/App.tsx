import { useEffect, useState } from "react";
import { OnboardingFlow } from "./onboarding/OnboardingFlow";
import { buscarRoteiro, type RoteiroResponse } from "./api";

const ID_NA_URL = window.location.pathname.match(/^\/r\/([0-9a-f-]{36})$/)?.[1] ?? null;

function App() {
  const [modo, setModo] = useState<"onboarding" | "faseC" | "modoLivre">("onboarding");
  const [roteiro, setRoteiro] = useState<RoteiroResponse | null>(null);
  const [carregando, setCarregando] = useState(!!ID_NA_URL);
  const [erro, setErro] = useState(false);

  useEffect(() => {
    if (!ID_NA_URL) return;
    buscarRoteiro(ID_NA_URL)
      .then((r) => setRoteiro(r))
      .catch(() => setErro(true))
      .finally(() => setCarregando(false));
  }, []);

  if (carregando) {
    return (
      <div className="sr-tela-cheia">Carregando roteiro…</div>
    );
  }

  if (erro) {
    return (
      <div className="sr-tela-cheia">
        Não encontrei esse roteiro.{" "}
        <a href="/" style={{ color: "#F0E9D8" }}>
          Começar um novo
        </a>
        .
      </div>
    );
  }

  if (modo === "onboarding") {
    return (
      <OnboardingFlow
        onFaseC={() => setModo("faseC")}
        onModoLivre={() => setModo("modoLivre")}
        roteiroExistente={roteiro ?? undefined}
      />
    );
  }

  return (
    <div className="sr-tela-cheia">
      {modo === "faseC" ? "Fase C (aprofundamento) — ainda não construída." : "Modo livre (edição direta no quadro) — ainda não construído."}
    </div>
  );
}

export default App;
