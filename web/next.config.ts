import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Imagem Docker mínima (deploy na VPS): só runtime + arquivos necessários.
  output: "standalone",
};

export default nextConfig;
