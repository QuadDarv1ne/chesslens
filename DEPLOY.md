# Деплой ChessLens

Проект деплоится одним Docker-образом на любую из трёх платформ: **Fly.io**, **Railway** или **Render**. Все три конфигурации уже лежат в репозитории:

| Платформа | Конфиг | Что делает |
| --- | --- | --- |
| Fly.io | `fly.toml` | Приложение, healthcheck, авто-suspend машин |
| Railway | `railway.json` | Dockerfile-builder, healthcheck, перезапуск при сбое |
| Render | `render.yaml` | Blueprint: web-сервис, healthcheck, автодеплой |

Общий для всех — [`Dockerfile`](Dockerfile): сборка на bun (по `bun.lock`), рантайм — Node 22 + standalone-сервер Next.js. Движок Stockfish работает **в браузере пользователя** (WASM), поэтому серверу достаточно самой слабой машины.

---

## Подготовка (для всех платформ)

1. Загрузите код в репозиторий на GitHub:

   ```bash
   git remote add origin git@github.com:ВАШ_ЛОГИН/chesslens.git
   git push -u origin main
   ```

2. Ничего больше настраивать не нужно: переменные окружения имеют разумные значения по умолчанию (см. [таблицу](#переменные-окружения) ниже), база данных проекту не требуется — анализ выполняется на клиенте.

---

## 1. Fly.io

### Установка CLI

```bash
# macOS / Linux
curl -L https://fly.io/install.sh | sh
# или: brew install flyctl
```

### Деплой

```bash
fly auth login

# Создать приложение из конфига fly.toml (имя и регион можно изменить)
fly launch --no-deploy

# Собрать и задеплоить
fly deploy
```

После `fly launch` платформа предложит имя приложения — замените `chesslens` на уникальное в `fly.toml`, если имя занято. Сайт будет доступен на `https://<имя>.fly.dev`.

### Полезные команды

```bash
fly status          # состояние приложения
fly logs            # логи
fly certs add example.com   # свой домен
fly scale memory 1024       # больше памяти, если нужно
```

### Постоянное хранилище (опционально)

По умолчанию файлы машины не сохраняются между деплоями. Если позже появится серверная БД (SQLite), создайте том и раскомментируйте секцию `[mounts]` в `fly.toml`:

```bash
fly volumes create chesslens_data --size 1 --region ams
```

---

## 2. Railway

Самый быстрый вариант — всё через веб-интерфейс:

1. Откройте [railway.app](https://railway.app) и войдите через GitHub.
2. **New Project → Deploy from GitHub repo** → выберите репозиторий.
3. Railway сам найдёт `Dockerfile` и `railway.json` (builder: Dockerfile, healthcheck `/api/health`) и запустит сборку.
4. Когда деплой соберётся: сервис → **Settings → Networking → Generate Domain** — получите публичный URL вида `https://<имя>.up.railway.app`.

### Постоянное хранилище (опционально)

Сервис → **Volumes → New Volume**, mount path: `/data`.

### CLI-вариант

```bash
npm i -g @railway/cli
railway login
railway init
railway up      # деплой текущего каталога
railway open    # дашборд
```

---

## 3. Render

Деплой через Blueprint (`render.yaml`):

1. Откройте [render.com](https://render.com) и войдите через GitHub.
2. **New → Blueprint** → выберите репозиторий → Render прочитает `render.yaml`.
3. Нажмите **Apply** — сервис создастся и соберётся автоматически.
4. URL будет вида `https://chesslens-xxxx.onrender.com`.

### Особенности бесплатного плана

- После **15 минут без трафика** сервис засыпает; первый запрос "будит" его (пауза 30–60 секунд). Это нормально для демо.
- Каталог `/data` на free-плане временный. Если подключите серверную БД — перейдите на Starter и добавьте диск (в `render.yaml` есть закомментированный блок `disk` с mount path `/data`).

### Постоянное хранилище (план Starter+)

Dashboard → сервис → **Disks → Add Disk**, mount path: `/data`, 1 GB.

---

## Переменные окружения

Все переменные заданы в образе и конфигах — менять ничего не обязательно:

| Переменная | По умолчанию | Назначение |
| --- | --- | --- |
| `PORT` | `3000` | Порт HTTP-сервера (платформы подставляют свой) |
| `HOSTNAME` | `0.0.0.0` | Слушать на всех интерфейсах (обязательно для контейнеров) |
| `NODE_ENV` | `production` | Режим Next.js |
| `DATABASE_URL` | `file:/data/chesslens.db` | SQLite. Анализ партий работает без БД |

---

## Healthcheck

Все три платформы проверяют живость сервиса одним эндпоинтом:

```bash
curl https://<ваш-домен>/api/health
# {"status":"ok","service":"chesslens","uptime":42,"timestamp":"..."}
```

---

## Обновление приложения

- **Railway** и **Render**: автодеплой уже включён — просто `git push`, платформа пересоберёт и выкатит новую версию.
- **Fly.io**: либо `fly deploy` локально, либо настройте [GitHub Actions](https://fly.io/docs/launch/continuous-deployment-with-github-actions/) (пример ниже).

```yaml
# .github/workflows/deploy.yml
name: Deploy to Fly.io
on:
  push:
    branches: [main]
jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: superfly/flyctl-actions/setup-flyctl@master
      - run: fly deploy --remote-only
        env:
          FLY_API_TOKEN: ${{ secrets.FLY_API_TOKEN }}
```

Токен создаётся командой `fly tokens create deploy <имя-приложения>` и добавляется в Secrets репозитория.
