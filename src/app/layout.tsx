import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/sonner";

const inter = Inter({
  variable: "--font-geist-sans",
  subsets: ["latin", "cyrillic"],
});

export const metadata: Metadata = {
  title: "ChessLens — анализ шахматных партий",
  description:
    "Разбор шахматных партий словами: Stockfish 19 в браузере, классификация ходов от триллианта до зевка, график оценки, точность игроков и острота позиций. Импорт PGN, партий с lichess и chess.com.",
  keywords: ["шахматы", "анализ партии", "Stockfish", "PGN", "lichess", "chess.com", "разбор ходов"],
  openGraph: {
    title: "ChessLens — анализ шахматных партий",
    description: "Движок в браузере, значки ходов, график оценки, точность игроков.",
    type: "website",
  },
};

export const viewport: Viewport = {
  themeColor: "#0b0d11",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ru" className="dark" suppressHydrationWarning>
      <body className={`${inter.variable} antialiased bg-[#0b0d11] text-zinc-200`}>
        {children}
        <Toaster position="bottom-right" richColors />
      </body>
    </html>
  );
}
