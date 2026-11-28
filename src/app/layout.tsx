import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/sonner";
import { ThemeProvider } from "next-themes";

const inter = Inter({
  variable: "--font-geist-sans",
  subsets: ["latin", "cyrillic"],
});

const baseUrl = process.env.NEXT_PUBLIC_BASE_URL ?? 'https://chesslens-ru.fly.dev';

export const metadata: Metadata = {
  metadataBase: new URL(baseUrl),
  title: "ChessLens — анализ шахматных партий",
  description:
    "Разбор шахматных партий словами: Stockfish 19 в браузере, классификация ходов от бриллианта до зевка, график оценки, точность игроков и острота позиций. Импорт PGN, партий с lichess и chess.com. Светлая, тёмная, синяя, изумрудная и сепия-темы.",
  keywords: ["шахматы", "анализ партии", "Stockfish", "PGN", "lichess", "chess.com", "разбор ходов", "темы оформления"],
  alternates: { canonical: '/' },
  openGraph: {
    title: "ChessLens — анализ шахматных партий",
    description: "Движок в браузере, значки ходов, график оценки, точность игроков, пять тем оформления.",
    type: "website",
    url: '/',
    siteName: "ChessLens",
    locale: "ru_RU",
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: dark)", color: "#0b0d11" },
    { media: "(prefers-color-scheme: light)", color: "#fafafa" },
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ru" suppressHydrationWarning>
      <body className={`${inter.variable} antialiased bg-background text-foreground`}>
        <ThemeProvider
          attribute="class"
          defaultTheme="dark"
          enableSystem
          themes={["light", "dark", "blue", "green", "sepia"]}
          disableTransitionOnChange
        >
          {children}
          <Toaster position="bottom-right" richColors />
        </ThemeProvider>
      </body>
    </html>
  );
}
