import type { ActionFunctionArgs } from "react-router";
import { authenticate } from "../shopify.server";
import db from "../db.server";
import { isValidWebhookHmac } from "../webhook-hmac.server";

// Каждая модель в prisma/schema.prisma, у которой есть поле shop, должна
// быть в этом списке — иначе её данные переживут удаление магазина.
async function deleteShopData(shop: string) {
  await db.$transaction([
    db.session.deleteMany({ where: { shop } }),
    db.blinkingTabTrigger.deleteMany({ where: { shop } }),
    db.exitPopupTrigger.deleteMany({ where: { shop } }),
    db.soundTrigger.deleteMany({ where: { shop } }),
    db.stickyCartBarTrigger.deleteMany({ where: { shop } }),
    db.lowStockBadgeTrigger.deleteMany({ where: { shop } }),
    db.freeShippingBarTrigger.deleteMany({ where: { shop } }),
    db.emailCaptureTrigger.deleteMany({ where: { shop } }),
    db.capturedLead.deleteMany({ where: { shop } }),
    db.triggerEvent.deleteMany({ where: { shop } }),
    db.triggerStyleSettings.deleteMany({ where: { shop } }),
    db.shopPlan.deleteMany({ where: { shop } }),
  ]);
}

// 48 часов после удаления магазина Shopify отправляет этот webhook.
// Удаляем все данные, связанные с магазином: сессии, настройки триггеров,
// собранные email и события аналитики.
export const action = async ({ request }: ActionFunctionArgs) => {
  // authenticate.webhook() пытается обновить offline-токен магазина до того,
  // как вернуть контекст. shop/redact приходит уже после того, как магазин
  // деинсталлировал приложение, так что обновление токена не может пройти, и
  // SDK сам бросает Response(500) — наш код ниже даже не успевает
  // выполниться. Shopify в ответ на 500 ретраит доставку вебхука до 9+ раз
  // без результата (см. docs/technical/micro-triggers-tech.md).
  // Чистим данные по shop-домену из заголовка и отвечаем 200, чтобы
  // остановить бессмысленные ретраи.
  const rawBody = await request.clone().text();
  let webhookContext;
  try {
    webhookContext = await authenticate.webhook(request);
  } catch (error) {
    if (!isValidWebhookHmac(request, rawBody)) {
      console.error("Rejected shop/redact webhook with invalid HMAC");
      return new Response(undefined, { status: 401 });
    }
    const shop = request.headers.get("X-Shopify-Shop-Domain");
    console.error(
      `authenticate.webhook failed for shop/redact (shop=${shop ?? "unknown"}), likely an expired offline token that could not be refreshed:`,
      error,
    );
    if (shop) {
      await deleteShopData(shop);
    }
    return new Response();
  }

  const { shop, topic } = webhookContext;

  console.log(`Received ${topic} webhook for ${shop}`);

  await deleteShopData(shop);

  return new Response();
};
