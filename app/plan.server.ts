import db from "./db.server";

// Тарифы: Free — blinking tab, low-stock badge, free-shipping bar.
// Pro — всё остальное, плюс Analytics и Styling.
// Планы живут в Partner Dashboard (Shopify App Pricing). Pro определяется по
// handle плана в Partner Dashboard — "standard" (задан при создании плана,
// изменить нельзя). Мерчант везде видит название Standard; "pro" — только
// внутреннее имя тарифа в коде и в ShopPlan.plan.
// Бесплатный план и отсутствие подписки (activeSubscription === null)
// одинаково считаются Free — не известно наверняка, создаёт ли Shopify
// контракт при выборе бесплатного плана, а так приложение работает в обоих
// случаях.
export type Plan = "free" | "pro";

export const PRO_PLAN_HANDLE = "standard";

export const PRO_TRIGGERS = new Set([
  "exitPopup",
  "sound",
  "stickyCartBar",
  "emailCapture",
]);

const APP_HANDLE = "micro-triggers";
const PARTNER_API_VERSION = "2026-07";

// Админка держит подтверждённый Pro в кеше 5 минут (рекомендация Shopify для
// кеша activeSubscription), Free перепроверяет на каждом заходе.
// Сторфронт — раз в сутки: отмена Pro без захода
// мерчанта в админку подхватывается с этой задержкой, т.к. для Shopify App
// Pricing Billing API webhooks не приходят.
export const ADMIN_PLAN_MAX_AGE_MS = 5 * 60 * 1000;
export const STOREFRONT_PLAN_MAX_AGE_MS = 24 * 60 * 60 * 1000;

export function pricingPlansUrl(shop: string): string {
  const storeHandle = shop.replace(".myshopify.com", "");
  return `https://admin.shopify.com/store/${storeHandle}/charges/${APP_HANDLE}/pricing_plans`;
}

// Пока Partner API client не настроен (env пустые), тариф не проверяется и
// все магазины считаются Pro — то же fail-open поведение, что было раньше с
// billing.check(), чтобы деплой без env не отключил триггеры у мерчантов.
function isPartnerApiConfigured(): boolean {
  return Boolean(
    process.env.SHOPIFY_PARTNER_ORG_ID &&
    process.env.SHOPIFY_PARTNER_API_ACCESS_TOKEN &&
    process.env.SHOPIFY_APP_GID,
  );
}

async function fetchPlanFromPartnerApi(shopGid: string): Promise<Plan> {
  const res = await fetch(
    `https://partners.shopify.com/${process.env.SHOPIFY_PARTNER_ORG_ID}/api/${PARTNER_API_VERSION}/graphql.json`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Shopify-Access-Token": process.env.SHOPIFY_PARTNER_API_ACCESS_TOKEN!,
      },
      body: JSON.stringify({
        query: `query ActiveSubscription($appId: ID!, $shopId: ID!) {
          activeSubscription(appId: $appId, shopId: $shopId) {
            items {
              handle
            }
          }
        }`,
        variables: { appId: process.env.SHOPIFY_APP_GID, shopId: shopGid },
      }),
    },
  );
  const { data, errors } = await res.json();

  // Троттлинг (4 req/s) и прочие сбои — исключение, а не "нет подписки",
  // чтобы платящий мерчант не был понижен до Free из-за временной ошибки.
  if (!res.ok || errors) {
    throw new Error(
      `Partner API request failed: ${JSON.stringify(errors ?? res.status)}`,
    );
  }

  const items: { handle: string | null }[] =
    data.activeSubscription?.items ?? [];
  return items.some((item) => item.handle === PRO_PLAN_HANDLE) ? "pro" : "free";
}

interface GetShopPlanOptions {
  maxAgeMs: number;
  // Нужен только чтобы один раз получить GID магазина для Partner API;
  // сторфронт его не передаёт и полагается на сохранённый shopGid.
  getShopGid?: () => Promise<string>;
  // Кешировать только подтверждённый Pro (рекомендация Shopify): иначе
  // мерчант, только что оплативший Pro, до maxAgeMs видел бы Free.
  recheckFree?: boolean;
}

export async function getShopPlan(
  shop: string,
  { maxAgeMs, getShopGid, recheckFree = false }: GetShopPlanOptions,
): Promise<Plan> {
  if (!isPartnerApiConfigured()) return "pro";

  const cached = await db.shopPlan.findUnique({ where: { shop } });
  const cachedPlan: Plan = cached?.plan === "pro" ? "pro" : "free";

  if (
    cached &&
    Date.now() - cached.checkedAt.getTime() < maxAgeMs &&
    !(recheckFree && cachedPlan === "free")
  ) {
    return cachedPlan;
  }

  let shopGid: string | undefined;
  let plan: Plan;
  try {
    shopGid = cached?.shopGid ?? (await getShopGid?.());
    if (!shopGid) return cachedPlan;
    plan = await fetchPlanFromPartnerApi(shopGid);
  } catch (error) {
    console.error(`Plan check failed for ${shop}, using cached plan:`, error);
    return cachedPlan;
  }

  // Лоадеры app.tsx и дочернего роута выполняются параллельно и оба могут
  // дойти до upsert для нового магазина — проигравший create упадёт на
  // unique(shop). Тариф при этом уже получен, так что сбой записи не влияет
  // на ответ.
  try {
    await db.shopPlan.upsert({
      where: { shop },
      create: { shop, shopGid, plan, checkedAt: new Date() },
      update: { shopGid, plan, checkedAt: new Date() },
    });
  } catch (error) {
    console.error(`Failed to cache plan for ${shop}:`, error);
  }
  return plan;
}

interface AdminGraphqlClient {
  graphql: (query: string) => Promise<Response>;
}

export function getAdminShopPlan(
  admin: AdminGraphqlClient,
  shop: string,
): Promise<Plan> {
  return getShopPlan(shop, {
    maxAgeMs: ADMIN_PLAN_MAX_AGE_MS,
    recheckFree: true,
    // activeSubscription принимает GID магазина, а не myshopify-домен.
    getShopGid: async () => {
      const res = await admin.graphql(`#graphql
        query ShopId {
          shop {
            id
          }
        }`);
      const { data } = await res.json();
      return data.shop.id;
    },
  });
}

// Shopify рекомендует отправлять мерчанта на страницу выбора плана после
// установки. Делаем это один раз на магазин: если бесплатный план не создаёт
// подписку, повторный редирект при каждом заходе зациклил бы Free-мерчанта.
export async function shouldPromptPlanSelection(
  shop: string,
): Promise<boolean> {
  if (!isPartnerApiConfigured()) return false;

  const record = await db.shopPlan.findUnique({ where: { shop } });
  if (!record || record.plan === "pro" || record.pricingPromptedAt) {
    return false;
  }

  await db.shopPlan.update({
    where: { shop },
    data: { pricingPromptedAt: new Date() },
  });
  return true;
}
