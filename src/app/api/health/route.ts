import { NextResponse } from "next/server";

// Healthcheck-эндпоинт для платформ деплоя (Fly.io, Railway, Render).
// Отдаёт статус процесса и аптайм — платформа считает сервис живым по 200-ответу.
export async function GET() {
  return NextResponse.json({
    status: "ok",
    service: "chesslens",
    uptime: Math.round(process.uptime()),
    timestamp: new Date().toISOString(),
  });
}
