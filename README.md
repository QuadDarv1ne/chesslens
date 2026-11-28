# ChessLens — анализ шахматных партий

Веб-сервис для разбора шахматных партий словами, а не сухими цифрами: движок Stockfish 19 работает **прямо в браузере** (WebAssembly), без серверных запросов — анализ не ограничен квотами и работает мгновенно.

## Возможности

- **Interactive-доска** — ходы мышью, перетаскивание фигур, переворот доски (`F`), навигация стрелками `←`/`→`, `Home`/`End`.
- **Темы оформления** — светлая, тёмная, синяя ночь, изумрудная, сепия + "системная" (следует за настройками ОС). Цвета доски, графика и значков ходов адаптируются под каждую тему; выбор сохраняется в браузере.
- **Импорт партий** — PGN-текст, партии игрока с lichess.org и chess.com по нику, готовые примеры.
- **Классификация ходов** — от триллианта и блестящего до зевка, с уникальными словесными комментариями к каждому ходу.
- **График оценки** — кривая перевеса по всей партии с точками ошибок.
- **Точность игроков** — процент точности, потерянные центипawns, статистика по категориям ходов.
- **Острота позиции** — оценка критичности момента (насколько ошибка меняла исход).
- **Engine-панель** — лучший ход, оценка, глубина, варианты в реальном времени.
- **Аккаунты** — регистрация и вход по email/паролю, сессии в БД, личный кабинет.
- **Подписка Pro** — тарифы на месяц/квартал/год, оплата через ЮKassa, Т-Банк, СБП или mock-режим, история платежей.

## Стек

- **Next.js 16** (App Router, standalone-выход) + React 19 + TypeScript
- **Tailwind CSS 4** + shadcn/ui
- **chess.js** — правила, генерация ходов; **react-chessboard** — доска
- **Stockfish 19** в WebAssembly (`public/engine/`) — работает в браузере
- **Prisma + SQLite** — аккаунты, сессии, подписки и платежи
- **bcryptjs** — хеширование паролей
- **Bun** — локальная разработка и сборка Docker-образа

## Аккаунты и оплата

Регистрация и вход работают из коробки: сессия хранится в HTTP-only cookie, пользователь — в SQLite.

Тарифы и платежи настраиваются переменными окружения (см. `.env.example`):

| Переменная | Назначение |
| --- | --- |
| `PAYMENT_PROVIDER` | Провайдер по умолчанию: `yookassa`, `tbank`, `sbp` или `mock` |
| `YOOKASSA_SHOP_ID`, `YOOKASSA_API_KEY` | ЮKassa (магазин и API-ключ) |
| `TBANK_TOKEN`, `TBANK_MERCHANT_INN` | Т-Банк / СБП |
| `NEXT_PUBLIC_BASE_URL` | Базовый URL для редиректа после оплаты |

В режиме разработки (`NODE_ENV !== 'production'`) по умолчанию используется **mock**-провайдер — оплата имитируется, подписка активируется без реальных списаний. Вебхуки провайдеров принимает `POST /api/payments/webhook`.

## Локальный запуск

```bash
bun install
bun run db:push   # применить схему Prisma к SQLite
bun run dev       # http://localhost:3000
```

Продакшен-сборка:

```bash
bun run build
bun run start              # node scripts/start.js (NODE_ENV=production)
# или напрямую:
node .next/standalone/server.js
```

Проверка данных (дебютный словарь и примеры партий) и линтер:

```bash
bun run validate:chess
bun run lint
bun run test               # тесты классификации ходов
```

> `build` использует `node scripts/copy-standalone.js` — работает на Windows/macOS/Linux без `cp`.

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
    (auth)/                   # маршруты авторизации
      login/page.tsx          # вход
      register/page.tsx       # регистрация
    (main)/                   # защищённые маршруты
      dashboard/page.tsx      # личный кабинет
      pricing/page.tsx        # тарифы и оплата
    api/
      auth/                   # register, login, logout, me
      payments/
        create/route.ts       # создание платежа
        orders/route.ts       # история платежей
        subscription/route.ts # статус подписки
        webhook/route.ts      # webhook от провайдеров
      health/route.ts         # healthcheck для платформ деплоя
      import/lichess/         # прокси к API lichess.org
      import/chesscom/        # прокси к API chess.com
  components/
    auth/user-menu.tsx        # меню пользователя в шапке
    chess/                    # доска, список ходов, график, панели
    ui/                       # shadcn/ui компоненты
  lib/
    auth/session.ts           # сессии (cookie + БД)
    auth/password.ts          # хеширование паролей
    payments/                 # тарифы, провайдеры (ЮKassa, Т-Банк, СБП, mock)
    chess/                    # разбор PGN, классификация ходов, дебюты
    engine/                   # обёртка над Stockfish WASM (Web Worker)
    store.ts                  # zustand-хранилище анализа
public/engine/                # stockfish.js + stockfish.wasm
```
