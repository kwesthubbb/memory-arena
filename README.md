# Арена памяти

Приложение реализует многопользовательскую игру на память: участники запоминают последовательность сигналов, по очереди повторяют её и выбывают при ошибке. Побеждает игрок, который остаётся последним.

## Возможности

- регистрация и вход пользователей;
- профиль пользователя с обновлением имени, почты, пароля и аватарки;
- создание комнат на `2-6` участников;
- подключение ботов в комнату;
- запуск матча ведущим комнаты;
- автоматическая смена фаз игры и раундов;
- синхронизация состояния комнаты в реальном времени через `SSE`;
- история завершённых матчей;
- unit-тесты на `Vitest`;
- e2e-тесты на `Playwright`.

## Стек технологий

- `Next.js 16`
- `React 19`
- `TypeScript`
- `tRPC`
- `Drizzle ORM`
- `Better Auth`
- `PostgreSQL`
- `Vitest`
- `Playwright`
- `Canvas Confetti` (конфетти при выигрыше)

## Структура проекта

- `src/app` — страницы приложения и route handlers.
- `src/components` — клиентские UI-компоненты.
- `src/server/game` — игровая логика, фазы матча и синхронизация.
- `src/server/trpc` — tRPC-роутеры и инициализация сервера.
- `src/db` — схемы и подключение к базе данных.
- `src/lib` — общие утилиты и клиентские вспомогательные функции.
- `tests/e2e` — end-to-end тесты.

## Требования

- `Node.js 20+`
- `npm 10+`
- `PostgreSQL 16+`

## Переменные окружения

Создайте файл `.env.local` и укажите в нём:

```env
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/memory_arena
BETTER_AUTH_SECRET=replace-with-a-long-random-secret
BETTER_AUTH_URL=http://localhost:3000
```

## Запуск проекта

1. Установите зависимости:

```bash
npm install
```

2. Создайте `.env.local` на основе примера:

```bash
cp .env.example .env.local
```

Для Windows PowerShell можно использовать:

```powershell
Copy-Item .env.example .env.local
```

3. Поднимите базу данных.

В проекте есть готовый `docker-compose.yml`:

```bash
docker compose up -d postgres
```

Контейнер поднимает PostgreSQL на порту `5432`.

> **Примечание:** Docker используется только для PostgreSQL. Библиотека `Canvas Confetti` (для конфетти при выигрыше) работает на клиенте и не требует никаких изменений в Docker конфигурации.

4. Сгенерируйте схему аутентификации и миграции:

```bash
npm run auth:generate
npm run db:generate
npm run db:migrate
```

5. Запустите приложение:

```bash
npm run dev
```

После запуска приложение будет доступно по адресу `http://localhost:3000`.

## Проверка проекта

Проверка линтера:

```bash
npm run lint
```

Unit-тесты:

```bash
npm run test:unit
```

E2E-тесты:

```bash
npm run test:e2e
```

Если `Playwright` запускается впервые, предварительно установите браузер:

```bash
npx playwright install
```

Продакшен-сборка:

```bash
npm run build
```

Полная проверка:

```bash
npm test
```