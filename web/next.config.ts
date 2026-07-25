import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Imagem Docker mínima (deploy na VPS): só runtime + arquivos necessários.
  output: "standalone",

  // O `next dev` bloqueia requisição a asset de dev vinda de origem diferente
  // daquela em que subiu (localhost). Como o dev roda atrás do Caddy num
  // subdomínio, sem isto o HMR e o `/_next/*` são recusados e a página carrega
  // quebrada. Só vale em desenvolvimento — o build de produção ignora.
  allowedDevOrigins: ["dev.storyrender.mvpsardenberg.cloud"],

  // O método "O Fio" virou McKee Inspired e a rota mudou junto. As sessões
  // gravadas são endereçadas por URL (é o que faz voltar pra elas de outro
  // aparelho), então todo link /fio/<thread_id> que já existe continua
  // valendo. 307 e não 301: enquanto o laboratório se mexe, redirect que o
  // navegador guarda pra sempre atrapalha mais do que ajuda.
  async redirects() {
    return [
      { source: "/fio", destination: "/mckee-inspired", permanent: false },
      {
        source: "/fio/:caminho*",
        destination: "/mckee-inspired/:caminho*",
        permanent: false,
      },
    ];
  },
};

export default nextConfig;
