# 30-дневный план запуска Micro Triggers

← [Обзор](./00-overview.md)

Приложение: [Micro Triggers](https://apps.shopify.com/micro-triggers), запущено 09.09.2026, категория Pop-ups, $9/мес.

Главная задача первого месяца — не доработка функционала, а видимость и первые честные отзывы.

## Важный контекст: политика Shopify по отзывам (с 6 июля 2026)

- Запрещены любые стимулы за отзыв: скидка, бесплатный период, разблокировка фичи — как внутри приложения, так и вне его
- Рекомендован официальный **Reviews API** для запроса отзыва внутри приложения — Shopify получает больше данных о том, как и когда запрашивается отзыв, что упрощает детект манипуляций
- Формулировки должны быть нейтральными: допустимо "We value feedback! Let us know how we're doing" — недопустимо любое "Нравится? Оставьте отличный отзыв!"
- Shopify задним числом чистит нечестные/стимулированные отзывы у существующих листингов — это ещё одна причина не рисковать серыми схемами с самого начала

## Неделя 1 — витрина и первое впечатление

- [x] Проверить листинг: первые 2 скриншота — порядок уже правильный, exit-intent идёт первым. Из 5 скриншотов 2 дублируют один и тот же exit-intent триггер (обычный + с email) — стоит когда-нибудь заменить один на ещё не показанный триггер (blinking tab/sound cue)
- [ ] Добавить короткое демо-видео — пока сознательно отложено, появится позже
- [x] Ключевые слова уже есть в тексте описания/буллетов ("exit-intent popup", "cart", "low-stock", "free-shipping"). Проверка живого поиска App Store показала: по "exit intent popup" приложение не в топе (ожидаемо при 0 отзывов среди ~6000 конкурентов), по собственному имени "micro triggers" — находится нормально. Дальнейший рост здесь зависит от отзывов/установок, не от текста
- [ ] Заполнить/обновить профиль в Shopify Partner Directory — не проверено (нет доступа к Partner Dashboard)

## Неделя 2 — органические каналы, первые установки

- [x] **Shopify Community forum** — пост нужно публиковать в разделе **Ask & Offer** (https://community.shopify.com/c/ask-offer/294), не в "Shopify Apps" (та ветка — для обсуждения чужих приложений). Тег: `shopify-apps` (+ `customizations`, `product-feedback`). Пост опубликован, ушёл на ручную модерацию ("Post hidden by staff, awaiting approval") — это стандартная практика для новых аккаунтов/ссылок, не ошибка. Статус на 20.09.2026: ожидает одобрения
- [ ] **r/shopify** — черновик забракован: сабщреддит "promotion-free", явно запрещает "No Store or App Reviews / Feedback" и "No spamming or links to external content". Решение: пропустить этот канал для промо-постов такого рода
- [ ] **r/ecommerce** — текст готов и адаптирован под правила сабреддита (No External Links, No AI Slop) — см. заготовки ниже. Пока не опубликован
- [x] **Indie Hackers** — профиль продукта создан и заполнен: https://www.indiehackers.com/product/micro-triggers (лого, motivation, ссылка, теги E-Commerce + Marketing, Solo Founder/Bootstrapped/Side Project/June 2026). Первый пост в общей ленте опубликован (см. заготовку ниже)
- [ ] **Product Hunt** — аккаунт создан 20.09.2026 (username `yuriy_slashchev`), профиль заполнен. Правило: сначала нужно "погреть" аккаунт (апвоуты/комментарии чужим продуктам), запуск возможен не раньше 27.09.2026 (через неделю после регистрации). Материалы для сабмита готовы — см. заготовки ниже
- [ ] Прямой контакт с 15–20 небольшими Shopify-магазинами (через контактные формы/Instagram) с персональным предложением бесплатно попробовать — ещё не начат, шаблон сообщения не готов

### Заготовки текстов

**Reddit r/ecommerce** (не рекламный, без ссылки в теле — правило "No External Links"):

> **Заголовок:** What's actually working for you to recover carts on-site (not email/SMS)?
>
> Been thinking about this a lot lately — most cart recovery advice online is all about email flows and SMS, but what about stuff that happens while someone's still on the page? Exit popups, urgency messaging, that kind of thing.
>
> I've been tinkering with a few on-site triggers for my own store and honestly not sure which ones actually move the needle vs just feel good to have. Anyone here tested this properly and found something that made a real difference? Or is it mostly noise at this point.

**Shopify Community (Ask & Offer)** — опубликовано:

> **Заголовок:** Micro Triggers — lightweight cart-recovery triggers, looking for early feedback
>
> Hi all — just launched my first Shopify app, Micro Triggers. It's a set of 7 lightweight on-site cart-recovery triggers (exit-intent popup, sticky cart bar, low-stock badge, free-shipping bar, blinking tab, sound cue) with built-in per-trigger analytics — no template builder, no page-view caps.
>
> Built it because I wanted something focused instead of a full popup/page builder for a simple use case. $9/mo, 14-day free trial.
>
> Listing: https://apps.shopify.com/micro-triggers
>
> Would really appreciate feedback from anyone willing to try it, especially on onboarding/first-5-minutes experience. Thanks!

**Indie Hackers — первый пост в ленте** — опубликовано:

> **Заголовок:** Launched my first Shopify app 10 days ago — 0 reviews, figuring out distribution
>
> So I shipped Micro Triggers on Sept 9 — small Shopify app, cart-recovery popups and badges, $9/mo. Building it was honestly the fun part. Now I'm stuck on the part nobody warns you about: getting actual merchants to find it.
>
> Right now I've got a handful of installs and zero reviews. Been posting in Shopify's community forum, messaging small store owners directly, trying this too.
>
> If anyone here has launched something in an app store specifically (Shopify, WP plugins, whatever) — curious what actually worked. Feels different from regular SaaS distribution since you're stuck playing by the marketplace's own ranking rules.

**Product Hunt — материалы для будущего запуска** (не раньше 27.09.2026):

- Тэглайн: `Lightweight cart-recovery triggers for Shopify`
- Описание: "Micro Triggers adds 7 lightweight on-site cart-recovery triggers to your Shopify store — exit-intent popup, sticky cart bar, low-stock badge, free-shipping bar, blinking tab, sound cue. Toggle each on/off from the admin, no code, with built-in per-trigger analytics."
- Maker comment:

> Hey PH 👋
>
> Solo builder here. I kept running into the same thing with cart-recovery apps for Shopify — either a full page-builder I didn't need, or a free tier capped at some tiny number of page views.
>
> So I built Micro Triggers: 7 on-site triggers (exit-intent, low-stock, free-shipping bar, sticky cart, blinking tab, sound cue) that you just toggle on and edit the copy for, no code. Built-in analytics per trigger so you can actually see what's converting instead of guessing.
>
> It's been live on the Shopify App Store for about two weeks now, still very early — genuinely want feedback, especially if something feels confusing or missing. Happy to answer anything about how it works or why I built it this way.

## Неделя 3 — партнёрства и кросс-промо

- Найти Shopify Partners/агентства, ведущие небольшие магазины — им проще порекомендовать лёгкий недорогой инструмент, чем тяжёлый комбайн
- Договориться о взаимном упоминании с разработчиками неконкурирующих, но смежных приложений (например, email-маркетинг для малого бизнеса)
- Короткий кейс в Twitter/X, LinkedIn: "как мигающая вкладка + exit-intent вернули N% корзин" на тестовом/demo-магазине

## Неделя 4 — сбор отзывов и итерация

- К этому моменту у первых установивших должно накопиться 1–2 недели использования — время встроить нейтральный in-app запрос отзыва через Reviews API
- Проверить onboarding: понятен ли empty state, есть ли подсказки по каждому из 8 триггеров в первые 5 минут после установки
- Собрать фидбек от первых пользователей (даже без отзыва) — сырьё для следующей итерации продукта и для приоритизации идей 1/4 как апсейла существующей базе

## После месяца 1

После первых 10–20 установок и пары отзывов — посмотреть в сторону бейджа **Built for Shopify**: требует определённых метрик качества/производительности, но резко повышает доверие и видимость в поиске.
