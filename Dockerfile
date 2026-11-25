# ChessLens — production-образ.
# Один Dockerfile для всех платформ деплоя: Fly.io, Railway, Render.
# Сборка: bun (точно по bun.lock), рантайм: Node 22 + standalone-сервер Next.js.

# ---------- Этап 1: зависимости ----------
FROM oven/bun:1 AS deps
WORKDIR /app

# Схема Prisma нужна до установки зависимостей — postinstall запускает prisma generate
COPY prisma/schema.prisma ./prisma/
COPY package.json bun.lock ./

RUN bun install --frozen-lockfile

# ---------- Этап 2: сборка ----------
FROM oven/bun:1 AS builder
WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY . .

ENV NEXT_TELEMETRY_DISABLED=1
ENV DATABASE_URL="file:/tmp/build-placeholder.db"
ENV NODE_ENV=production

RUN bun run db:generate && bun run build

# ---------- Этап 3: рантайм ----------
FROM node:22-slim AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME=0.0.0.0
# По умолчанию SQLite живёт в /data — на Fly/Railway/Render туда можно
# смонтировать постоянный том. Движок анализа работает и без БД.
ENV DATABASE_URL="file:/data/chesslens.db"

RUN apt-get update \
    && apt-get install -y --no-install-recommends ca-certificates \
    && rm -rf /var/lib/apt/lists/* \
    && mkdir -p /data /app/.next/cache \
    && chown -R node:node /data /app

# Standalone-сервер Next.js. Скрипт build уже скопировал внутрь
# .next/static и public (включая stockfish.wasm).
COPY --from=builder --chown=node:node /app/.next/standalone ./

# Страховка для Prisma: движок и сгенерированный клиент должны лежать
# в node_modules рядом с server.js.
COPY --from=builder --chown=node:node /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder --chown=node:node /app/node_modules/@prisma ./node_modules/@prisma

USER node
EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:'+(process.env.PORT||3000)+'/api/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

CMD ["node", "server.js"]
