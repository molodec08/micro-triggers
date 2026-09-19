# Push-уведомления браузера (roadmap v2, Приоритет 3, часть 2)

## Контекст

Второй и последний пункт Приоритета 3 из
`docs/business/micro-triggers-roadmap-v2.md` (первый — аналитика по
триггерам — уже реализован, см. `docs/technical/micro-triggers-tech.md`,
шаг 10). Цель та же — оправдать цену $9/мес набором фич, эта конкретная
фича отмечена в доке как технически более сложная.

**Согласованный с пользователем сценарий** (через AskUserQuestion):
- Подписка — через exit-popup, тем же паттерном, что email capture.
- Отправка — **серверная отложенная**, через отдельный cron-endpoint +
  внешний планировщик (не in-process setInterval — переживает рестарт
  контейнера на Railway, тот же класс решения, что ручное создание
  billing-плана в Partner Dashboard: настройка вне кода).
- MVP-триггер отправки — **только брошенная корзина** (посетитель
  подписался, в корзине есть товар, N минут без активности → push). Второй,
  более широкий набор триггеров (back-in-stock, произвольная рассылка) —
  **не реализуется сейчас**, фиксируется в доке как план развития.

## Архитектурное решение

### Почему не in-process таймер
Продакшн — один контейнер `react-router-serve` на Railway, без отдельного
worker-процесса (см. `package.json` — только `start`/`docker-start`).
`setInterval` внутри процесса умер бы при каждом деплое/рестарте контейнера
и не гарантирует доставку. Внешний планировщик (Railway Cron Job или любой
внешний HTTP-cron, дергающий защищённый endpoint) — то же самое
архитектурное решение, что уже принято для billing-плана: конфигурация вне
кода, ручной шаг при деплое, зафиксированный в доке.

### Как отслеживаем "брошенную корзину" без нового Shopify-scope
Нет прямого server-side webhook с точным содержимым конкретной анонимной
корзины у app без `read_orders`/checkout scopes. Решение — тот же паттерн,
что уже используется во всём проекте (`TriggerEvent`, `CapturedLead`):
**storefront сам репортит состояние** через App Proxy. Каждая push-подписка
хранит `lastCartItemCount`/`lastSeenAt`, которые обновляет клиентский код
при каждом фетче `/cart.js` (переиспользуем уже существующий `fetchCart()`
из `shared.ts` — просто добавляем один вызов report после него в
`push.ts`). Cron-задача читает подписки, где: корзина непуста, `lastSeenAt`
старше порога, push ещё не отправлялся для этого "эпизода" брошенной
корзины (флаг `abandonedNotifiedAt`, сбрасывается при новом
`lastSeenAt`-обновлении с непустой корзиной после периода пустой/после
успешной покупки — см. модель ниже).

### Почему не нужен Service Worker как отдельный build-таргет
Web Push API требует, чтобы `showNotification` вызывался из
`ServiceWorkerRegistration`, а `pushManager.subscribe` — из зарегистрированного
SW. Это отдельный JS-файл, регистрируемый с `/sw.js` (Shopify App Proxy не
подходит — SW должен обслуживаться с того же origin, что и страница, то
есть с самого домена магазина, не `/apps/...`). Решение: SW-файл
раздаётся как статический ассет темы (тот же принцип, что
`extensions/micro-triggers-storefront/assets/*.js` — уже раздаются с
`cdn.shopify.com/extensions/...`, тоже origin магазина с точки зрения
Service Worker **scope**, если зарегистрирован с правильным `scope`).
**Уточнение из живой практики Shopify**: `register()` для SW, отдаваемого с
CDN extension-пути, ограничен `scope` этого пути (не может контролировать
весь сайт) — это нормально и достаточно: push-уведомления не требуют
контроля над fetch всего сайта, только за регистрацию push-подписки и
показ уведомлений, что работает в рамках любого valid scope.

## 1. Зависимости

`npm install web-push --workspace=<root>` (обычная зависимость `app/`, не
storefront-workspace) — стандартная, широко используемая (Node.js) библиотека
для VAPID + отправки Web Push сообщений (шифрование payload по aes128gcm,
формирование VAPID JWT). Экономит необходимость руками реализовывать
Web Push Protocol (RFC 8291/8292).

`@types/web-push` в devDependencies, если у пакета нет собственных типов
(проверить при установке).

## 2. VAPID-ключи

Сгенерировать локально (`npx web-push generate-vapid-keys` или
`webPush.generateVAPIDKeys()` в одноразовом скрипте) — пара публичный/
приватный ключ, не привязанная к конкретному shop, общая на всё
приложение (стандартная модель VAPID: один "издатель"). Добавить в
`.env`/`.env.example`:
```
VAPID_PUBLIC_KEY=...
VAPID_PRIVATE_KEY=...
VAPID_SUBJECT=mailto:mopemah2014@gmail.com
```
Публичный ключ должен быть доступен и storefront-коду (для
`pushManager.subscribe({ applicationServerKey })`) — раздаём его через уже
существующий `/apps/micro-triggers/settings` JSON (новое поле
`pushNotifications.vapidPublicKey`), не как отдельный секрет (VAPID
public key не секретен по определению).

Тот же ручной шаг, что и с billing-планом/Railway env vars в tech-брифе:
реальные значения `VAPID_PRIVATE_KEY` на проде создаются и прописываются
в Railway Variables вручную, не в этом заходе (нет доступа к Railway).

## 3. Модель данных

```prisma
// roadmap v2, приоритет 3, часть 2: push-подписки браузера и
// отслеживание состояния корзины для триггера "брошенная корзина"
model PushSubscriptionTrigger {
  id        String   @id @default(cuid())
  shop      String   @unique
  enabled   Boolean  @default(false)
  message   String   @default("You left something in your cart!")
  delayMinutes Int   @default(30)
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}

// Одна запись на подписку браузера (endpoint уникален per browser+origin).
model PushSubscription {
  id                String    @id @default(cuid())
  shop              String
  endpoint          String    @unique
  p256dh            String
  auth              String
  cartItemCount     Int       @default(0)
  lastSeenAt        DateTime  @default(now())
  abandonedNotifiedAt DateTime?
  createdAt         DateTime  @default(now())

  @@index([shop])
  @@index([lastSeenAt])
}
```

`PushSubscriptionTrigger` — настройки (тот же паттерн один-к-одному на
shop, что у остальных 8 trigger-моделей): enabled, текст сообщения, порог
неактивности в минутах. `PushSubscription` — сами подписки браузеров,
`endpoint` (уникальный URL push-сервиса браузера) как естественный ключ
дедупликации.

Не добавляем `shop`+`endpoint` unique-паре — `endpoint` уже глобально
уникален по конструкции Web Push API (включает случайный токен), составной
ключ избыточен.

## 4. Backend

### 4.1 `app/routes/proxy.push-subscribe.tsx` (новый)
Публичный App Proxy endpoint, паттерн 1:1 с `proxy.lead.tsx`. Принимает
`{ endpoint, keys: { p256dh, auth } }` (стандартная форма
`PushSubscription.toJSON()`), делает `upsert` по `endpoint`.

### 4.2 `app/routes/proxy.push-heartbeat.tsx` (новый)
Публичный App Proxy endpoint. Принимает `{ endpoint, cartItemCount }`,
обновляет `lastSeenAt`/`cartItemCount` для существующей подписки; если
`cartItemCount` стал 0 (корзина опустела — покупка или очистка), сбрасывает
`abandonedNotifiedAt` в `null` (новый эпизод брошенной корзины в будущем
должен снова получить push). Молча игнорирует неизвестный `endpoint`
(отписка браузером могла случиться без нашего ведома).

### 4.3 `app/routes/internal.cron.send-abandoned-cart-push.tsx` (новый)
Не под App Proxy (не относится к конкретному shop-запросу с Shopify
подписью) — обычный React Router route, `action` (POST), защищён
секретом:
```ts
const CRON_SECRET = process.env.CRON_SECRET;
// header: Authorization: Bearer <CRON_SECRET>
```
Логика:
1. Для каждого shop с `PushSubscriptionTrigger.enabled = true`:
   - Найти `PushSubscription`, где `cartItemCount > 0`,
     `lastSeenAt <= now - delayMinutes`, `abandonedNotifiedAt IS NULL`.
   - Для каждой — `webPush.sendNotification(subscription, payload)` с
     VAPID-ключами из env.
   - При успехе — проставить `abandonedNotifiedAt = now()`.
   - При ошибке с кодом 404/410 (`WebPushError`, `statusCode` в этом
     диапазоне означает "подписка больше не существует" по спецификации
     push-сервисов) — удалить `PushSubscription` (protocol-level сигнал
     отписки браузером).
2. Вернуть JSON-сводку (`{ sent, expired, shops }`) для видимости в логах
   планировщика.

`CRON_SECRET` — новая env-переменная, добавляется в `.env.example` (пустая/
плейсхолдер) с комментарием, что реальное значение генерируется и
прописывается вручную в Railway (тот же паттерн, что `VAPID_PRIVATE_KEY`).

### 4.4 `app/routes/proxy.settings.tsx`
Добавить `pushNotifications: { enabled, vapidPublicKey }` в отдаваемый
JSON (паттерн — как `styling`), читая `PushSubscriptionTrigger` +
`process.env.VAPID_PUBLIC_KEY`.

### 4.5 Admin UI: секция в `app._index.tsx`
Не отдельная страница (в отличие от `app.styling.tsx`/`app.analytics.tsx`)
— по объёму это одна простая форма (тумблер + текст + число минут), тот же
уровень, что остальные 8 секций на этой странице, не оправдывает
отдельный роут. Добавляется как девятая секция, тем же
`fetcher.submit`-паттерном upsert, что и остальные. Поле "delayMinutes"
через `s-number-field` (тот же паттерн, что `intervalMs`/`sensitivityPx`).

## 5. Storefront

### 5.1 `extensions/micro-triggers-storefront/assets/sw.js` (новый, НЕ через Vite)
Простой vanilla JS service worker (~15 строк) — не проходит через
код-сплиттинг сборщик core.ts, так как SW — отдельный runtime-контекст
браузера (не модуль, импортируемый другими триггерами), со своим глобальным
`self`. Кладётся напрямую в `assets/` рядом со скомпилированными Vite
файлами (Vite build настроен с `emptyOutDir: true` — нужно **исключить**
`sw.js` из очистки, либо просто копировать его в outDir каждым билдом через
`publicDir`/отдельный `vite.config.ts`-`copy` шаг, чтобы он не терялся при
следующей сборке — см. секцию "Открытый вопрос" ниже, где зафиксирую это
явно в плане реализации, а не гадаю сейчас).
```js
self.addEventListener("push", (event) => {
  const data = event.data ? event.data.json() : {};
  event.waitUntil(
    self.registration.showNotification(data.title || "Micro-triggers", {
      body: data.body || "",
      icon: data.icon,
    }),
  );
});
self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  event.waitUntil(clients.openWindow(data.url || "/cart"));
});
```

### 5.2 `app/storefront-src/src/triggers/push.ts` (новый trigger-модуль)
Такой же контракт `init(settings, ctx)`, что остальные 6 триггеров.
Логика:
1. Guard: `"serviceWorker" in navigator && "PushManager" in window` —
   иначе no-op (Safari/старые браузеры без поддержки — тихая деградация,
   тот же принцип, что остальные триггеры).
2. Не запрашивать permission немедленно на `init()` (агрессивный
   browser-permission-prompt на первой же загрузке страницы — плохой UX и
   типичная причина, почему пользователи блокируют permission навсегда).
   Вместо этого — кнопка/CTA внутри exit-popup (см. 5.3), запрос
   `Notification.requestPermission()` — только по явному клику
   пользователя (браузеры это в любом случае требуют user gesture).
3. После granted: `navigator.serviceWorker.register(swUrl, { scope })` →
   `registration.pushManager.subscribe({ userVisibleOnly: true,
   applicationServerKey: urlBase64ToUint8Array(vapidPublicKey) })` →
   POST на `proxy.push-subscribe.tsx`.
4. Heartbeat: переиспользовать существующий `fetchCart()` из `shared.ts` —
   добавить вызов `reportCartState()` (новая маленькая функция в
   `shared.ts`, POST на `proxy.push-heartbeat.tsx` с
   `{ endpoint, cartItemCount }`) в тех же точках, где остальные триггеры
   уже дёргают `fetchCart()` (после add-to-cart submit, на `init()`) —
   не создаём отдельный поллинг-таймер, используем существующие события.

### 5.3 `exit-popup.ts` — CTA для подписки
Дополнительный блок в попапе (рядом с email capture, тем же визуальным
паттерном — кнопка), показывается только если
`settings.pushNotifications?.enabled` и permission ещё не
`granted`/`denied` (`Notification.permission === "default"`). Клик →
вызывает `subscribeToPush()` из `push.ts`. Если push-триггер выключен в
настройках — кнопка не рендерится вовсе (как остальные опциональные блоки
попапа).

### 5.4 `core.ts`
- `getPushSubscribeUrl()`/`getPushHeartbeatUrl()` — тот же паттерн, что
  `getEventUrl()`.
- Добавить `"pushNotifications"` в диспетчер `loadTrigger` (`import("./triggers/push")`).
- Прокинуть `pushSubscribeUrl`/`pushHeartbeatUrl`/`vapidPublicKey` в `ctx`
  (`TriggerContext` расширяется соответствующими полями в `types.ts`).
- exit-popup уже получает `settings.emailCapture` отдельным полем в
  диспетчере (`{ ...settings.exitPopup, emailCapture: settings.emailCapture }`)
  — по аналогии добавить `pushNotifications: settings.pushNotifications`.

## 6. shopify.app.toml — НЕ меняется
Push Web API не требует новых Shopify Admin scopes (это браузерный API,
не Shopify API) — как и `write_app_proxy`/App Proxy подход, использованный
для `CapturedLead`/`TriggerEvent`, тут scope-изменений не будет.

## 7. Файлы к изменению — сводка

- `package.json` — `web-push` в dependencies.
- `.env.example` — `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT`, `CRON_SECRET` (плейсхолдеры).
- `prisma/schema.prisma` — `PushSubscriptionTrigger`, `PushSubscription`.
- `prisma/migrations/<timestamp>_push_notifications/` — сгенерировать через `prisma migrate dev`.
- `app/routes/proxy.push-subscribe.tsx` — новый.
- `app/routes/proxy.push-heartbeat.tsx` — новый.
- `app/routes/internal.cron.send-abandoned-cart-push.tsx` — новый.
- `app/routes/proxy.settings.tsx` — добавить `pushNotifications` в JSON.
- `app/routes/app._index.tsx` — новая секция настроек push.
- `extensions/micro-triggers-storefront/assets/sw.js` — новый, вручную (не Vite).
- `app/storefront-src/src/triggers/push.ts` — новый.
- `app/storefront-src/src/triggers/exit-popup.ts` — CTA-кнопка подписки.
- `app/storefront-src/src/shared.ts` — `reportCartState()`,
  `urlBase64ToUint8Array()`.
- `app/storefront-src/src/types.ts` — новые поля в `TriggerContext`/`AllSettings`.
- `app/storefront-src/src/core.ts` — регистрация триггера, урлы в ctx.

## 8. Открытые технические риски, требующие проверки в процессе (не блокируют старт кода, но должны быть явно перепроверены)

1. **`sw.js` и `emptyOutDir: true` в `vite.config.ts`** — нужно решить
   способом, не ломающим существующую сборку триггеров: либо
   `vite-plugin-static-copy`, либо простой пост-сборочный `fs.copyFile` в
   npm-скрипте `build:extension` (`&& node copy-sw.js`), либо ручное
   размещение `sw.js` прямо в `extensions/.../assets/` и `emptyOutDir:
   false` + explicit `assetFileNames`-паттерн, чтобы не задеть его. Решаю
   на месте по факту первой пробной сборки — приоритет самому простому
   варианту (copy-скрипт), не усложняя vite.config.ts экспериментальными
   плагинами.
2. **Scope service worker, зарегистрированного с CDN extension-пути** —
   нужно подтвердить на живом dev store, что `register()` действительно
   не бросает `SecurityError`/scope-mismatch при регистрации с
   `cdn.shopify.com/extensions/<uid>/.../sw.js`. Если оба origin
   (страница магазина и CDN extension-путь) не совпадают — push вообще не
   заработает, и придётся раздавать `sw.js` иначе. **Решено с
   пользователем**: пишем весь код как в этом плане, проверяем на живом
   dev store вместе; если origin-проблема подтвердится — вернёмся и
   пересмотрим способ раздачи `sw.js` отдельным заходом, не блокируя
   написание остального кода сейчас.
3. **web-push payload encryption** — библиотека `web-push` берёт на себя
   RFC 8291 encryption, но стоит подтвердить размер payload (уведомление
   `{title, body, icon}` как JSON должно уложиться в лимит 4KB) — не
   ожидается проблемой при таком маленьком payload, но не проверено.

## 9. Верификация

1. `npm install web-push`, сгенерировать VAPID-ключи, заполнить `.env`.
2. `npx prisma migrate dev --name push_notifications` (остановить `npm run
   dev`, если запущен — тот же EPERM-риск на Windows, что в прошлой сессии).
3. `npm run typecheck`, `npm run lint`, `npm run build`.
4. Живой QA (пользователь делает сам, как и в прошлой сессии): `npm run
   dev`, открыть витрину dev-темы, в exit-popup нажать "Enable
   notifications", разрешить permission, подтвердить появление записи в
   таблице `PushSubscription` (через `npx prisma studio` или прямой SQL).
   Вызвать `internal.cron.send-abandoned-cart-push` вручную (`curl` с
   `Authorization: Bearer <CRON_SECRET>`) сразу после уменьшения
   `delayMinutes` до 0 в настройках — подтвердить приход браузерного
   уведомления.
5. Обновить `docs/technical/micro-triggers-tech.md` (новый шаг) и
   `docs/business/micro-triggers-roadmap-v2.md` (отметить push как
   реализовано на уровне MVP-триггера "брошенная корзина" + зафиксировать
   план развития — настраиваемый набор триггеров, back-in-stock,
   произвольная рассылка — как отдельный будущий пункт).

**Не входит в этот заход** (фиксируется в доке как план развития):
- Настраиваемый набор триггеров push (back-in-stock, произвольная
  рассылка вручную из Admin UI) — только "брошенная корзина" сейчас.
- Настройка реального Railway Cron Job / внешнего планировщика — ручной
  шаг вне кода, аналогично billing-плану.
- Живой QA на dev store — пользователь проверяет сам после реализации.
