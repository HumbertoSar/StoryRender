import { useEffect, useState } from "react";
import { Home } from "./home/Home";
import { MetodoScreen } from "./home/MetodoScreen";
import { OnboardingFlow } from "./onboarding/OnboardingFlow";
import { Quadro } from "./quadro/Quadro";
import { atualizarRoteiro, buscarRoteiro, type RoteiroResponse } from "./api";

const ID_NA_URL = window.location.pathname.match(/^\/r\/([0-9a-f-]{36})$/)?.[1] ?? null;
const NOVO_NA_URL = window.location.pathname === "/novo";

function App() {
  const [modo, setModo] = useState<"onboarding" | "quadro">("onboarding");
  const [roteiro, setRoteiro] = useState<RoteiroResponse | null>(null);
  const [carregando, setCarregando] = useState(!!ID_NA_URL);
  const [erro, setErro] = useState(false);

  useEffect(() => {
    if (!ID_NA_URL) return;
    buscarRoteiro(ID_NA_URL)
      .then((r) => {
        setRoteiro(r);
        const fase = r.data.fase_atual as string;
        if (fase === "C" || fase === "D") setModo("quadro");
      })
      .catch(() => setErro(true))
      .finally(() => setCarregando(false));
  }, []);

  function irParaQuadro(roteiroId: string) {
    buscarRoteiro(roteiroId)
      .then(async (r) => {
        if (r.data.fase_atual === "B") {
          r = await atualizarRoteiro(roteiroId, [{ path: ["fase_atual"], value: "C" }]);
        }
        setRoteiro(r);
        setModo("quadro");
      })
      .catch((err) => console.error("Falha ao carregar roteiro:", err));
  }

  if (NOVO_NA_URL) {
    return <MetodoScreen />;
  }

  if (!ID_NA_URL) {
    return <Home />;
  }

  if (carregando) {
    return <div className="sr-tela-cheia">Carregando roteiro…</div>;
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

  if (!roteiro) {
    return null;
  }

  if (modo === "quadro") {
    return <Quadro roteiro={roteiro} />;
  }

  return <OnboardingFlow onFaseC={irParaQuadro} onModoLivre={irParaQuadro} roteiroExistente={roteiro} />;
}

export default App;
