# ChessLens — анализ шахматных партий

Веб-сервис для разбора шахматных партий словами, а не сухими цифрами: движок Stockfish 19 работает **прямо в браузере** (WebAssembly), без серверных запросов — анализ не ограничен квотами и работает мгновенно.

## Возможности

- **Interactive-доска** — ходы мышью, перетаскивание фигур, переворот доски (`F`), навигация стрелками `←`/`→`, `Home`/`End`.
- **Импорт партий** — PGN-текст, партии игрока с lichess.org и chess.com по нику, готовые примеры.
- **Классификация ходов** — от триллианта и блестящего до зевка, с уникальными словесными комментариями к каждому ходу.
- **График оценки** — кривая перевеса по всей партии с точками ошибок.
- **Точность игроков** — процент точности, потерянные центипawns, статистика по категориям ходов.
- **Острота позиции** — оценка критичности момента (насколько ошибка меняла исход).
- **Engine-панель** — лучший ход, оценка, глубина, варианты в реальном времени.

## Стек

- **Next.js 16** (App Router, standalone-выход) + React 19 + TypeScript
- **Tailwind CSS 4** + shadcn/ui
- **chess.js** — правила, генерация ходов; **react-chessboard** — доска
- **Stockfish 19** в WebAssembly (`public/engine/`) — работает в браузере
- **Prisma + SQLite** — база подключена, но анализу не требуется
- **Bun** — локальная разработка и сборка Docker-образа

## Локальный запуск

```bash
bun install
bun run dev      # http://localhost:3000
```

Продакшен-сборка:

```bash
bun run build
bun run start:standalone   # node .next/standalone/server.js
```

## Деплой

Сервис готов к деплою на три платформы — подробные пошаговые инструкции в [DEPLOY.md](DEPLOY.md):

| Платформа | Конфиг в репозитории | Кратко |
| --- | --- | --- |
| [Fly.io](https://fly.io) | `fly.toml` | `fly launch` + `fly deploy` |
| [Railway](https://railway.app) | `railway.json` | Подключить репозиторий — деплой сам |
| [Render](https://render.com) | `render.yaml` | New → Blueprint → Apply |

Для всех платформ действует healthcheck `GET /api/health`.

## Структура проекта

```
src/
  app/
    page.tsx                  # главная страница анализатора
    api/health/route.ts       # healthcheck для платформ деплоя
    api/import/lichess/       # прокси к API lichess.org
    api/import/chesscom/      # прокси к API chess.com
  components/chess/           # доска, список ходов, график, панели
  lib/chess/                  # разбор PGN, классификация ходов, дебюты
  lib/engine/                 # обёртка над Stockfish WASM (Web Worker)
  lib/store.ts                # zustand-хранилище анализа
public/engine/                # stockfish.js + stockfish.wasm
```
