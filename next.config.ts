import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  // sharp — необязательная нативная зависимость Next.js для next/image.
  // Проект не использует next/image, а копирование нативного бинарника
  // в standalone-сборку падает на Windows. Исключаем его из трейсинга.
  outputFileTracingExcludes: {
    "*": ["node_modules/next/node_modules/sharp/**", "node_modules/sharp/**"],
  },
  /* config options here */
  reactStrictMode: false,
  poweredByHeader: false,
  async headers() {
    return [
      {
        // Базовые заголовки безопасности для всех маршрутов.
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "SAMEORIGIN" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
        ],
      },
      {
        // Движок Stockfish — неизменяемые бинарники: кэшируем надолго.
        source: "/engine/:path*",
        headers: [
          { key: "Cache-Control", value: "public, max-age=31536000, immutable" },
        ],
      },
    ];
  },
};

export default nextConfig;
