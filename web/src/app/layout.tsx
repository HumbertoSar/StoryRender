import type { Metadata } from "next";
import { Alegreya, Geist, Geist_Mono, JetBrains_Mono, Source_Sans_3 } from "next/font/google";
import "./globals.css";
import "./theme.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

// Trio tipográfico do brief (serif/sans/mono) — os tokens --sr-font-* de
// theme.css apontam pra estas variáveis.
const alegreya = Alegreya({
  variable: "--font-alegreya",
  subsets: ["latin"],
});

const sourceSans = Source_Sans_3({
  variable: "--font-source-sans",
  subsets: ["latin"],
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-jetbrains-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Story Render",
  description: "Laboratório de Generative UI para estrutura narrativa",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="pt-BR"
      className={`${geistSans.variable} ${geistMono.variable} ${alegreya.variable} ${sourceSans.variable} ${jetbrainsMono.variable}`}
    >
      <body>{children}</body>
    </html>
  );
}
