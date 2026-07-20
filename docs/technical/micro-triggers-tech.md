# Бриф: "Микро-триггеры внимания" — техническая часть

См. также: [бизнес-часть](../business/micro-triggers-brief.md).

Разработчик: React/TS/Vue на фронте, Node.js + PostgreSQL (Sequelize) на бэке.
Иностранная карта есть — платёжных ограничений нет.

## Технический стек
- Шаблон: **React Router app** (актуальная замена Remix-шаблона в Shopify CLI),
  НЕ extension-only — нужен бэкенд для настроек и Billing API
- Admin UI: Polaris — простые тумблеры вкл/выкл на каждый триггер, live-превью
- Storefront: Theme App Extension (Liquid + JS), вся логика триггеров — чистый
  клиентский JS, максимально лёгкий бандл
- БД: Postgres (в шаблоне по умолчанию SQLite — заменить провайдера в Prisma
  schema.prisma). Схема: shop → какие триггеры включены, тексты, задержки, файл звука
- Учитывать при тестировании: блокировщики рекламы/приватности в браузере иногда
  режут audio/visibility API

## Реализация триггеров (MVP v1)
1. **Мигающая вкладка браузера** при уходе с вкладки, если в корзине есть товар
   (`visibilitychange` → смена `document.title` и favicon, возврат при фокусе)
2. **Минималистичный exit-intent попап** (отслеживание движения мыши к верхней
   границе окна)
3. **Звуковой сигнал** при добавлении в корзину / на checkout (Web Audio API)

## Настройка окружения (общая с age-verification проектом)
- Node.js LTS (^18.20 / ^20.10 / ^22)
- Partner-аккаунт на partners.shopify.com
- Store type: **Dev store** (не Client transfer — тот для передачи клиенту, там platform plan)
- `npm init @shopify/app@latest` → **Build a React Router app**, TypeScript
- `npm run dev` → связка с Partner-аккаунтом, тестовая установка
- БД для прод: Supabase/Railway (Postgres) вместо дефолтного SQLite

## Текущее состояние конфигурации (см. shopify.app.toml, package.json)
- Приложение переименовано `simple-app` → `micro-triggers`
- Access scopes: пусто (`scopes = ""`) — настройки хранятся в своей БД, не в
  Admin API; Billing API (`appSubscriptionCreate`) не требует доп. scopes;
  Theme App Extension рендерится на сторфронте отдельно от Admin API
- Demo-конфиг шаблона (write_products, метаобъект Example) удалён как нерелевантный

## Шаг 2 (Backend: OAuth + Postgres) — выполнено, 2026-07-20

**OAuth** — уже был полностью настроен шаблоном (`app/shopify.server.ts` +
`PrismaSessionStorage`), доработок не потребовалось.

**Postgres**
- Локальный Postgres 16 поднят через `docker-compose.yml` (порт **5433**, чтобы
  не конфликтовать с другими локальными инстансами на 5432).
- `.env` / `.env.example` с `DATABASE_URL`.
- `prisma/schema.prisma`: провайдер `sqlite` → `postgresql`.
- Старая SQLite-миграция шаблона (`20240530213853_create_session_table`,
  несовместимая с типами Postgres) удалена, создана новая
  `20260720190226_init`, применена к БД.

**Модель настроек триггеров** — три отдельные таблицы (по одной на тип
триггера, каждая со `shop @unique`, т.е. связь один-к-одному с магазином):
- `BlinkingTabTrigger` — enabled, message
- `ExitPopupTrigger` — enabled, message, discountCode
- `SoundTrigger` — enabled, soundFileUrl, playOnAddCart, playOnCheckout

**Очистка демо-кода шаблона**
- `app/routes/app._index.tsx` — вместо генератора тестовых товаров/метаобъектов
  теперь loader/action читают и переключают (`upsert`) состояние трёх триггеров
  через Prisma.
- Удалена демо-страница `app/routes/app.additional.tsx` и ссылка на неё в
  навигации (`app/routes/app.tsx`).

**Известная нерешённая проблема** (не блокирует `npm run dev`, но всплывает в
`npm run typecheck`): `s-app-nav` в `app/routes/app.tsx` отсутствует в типах
установленного `@shopify/polaris-types@1.0.7` — ошибка предсуществующая
(была в шаблоне до правок шага 2), стоит починить перед шагом 4 (Admin UI).
