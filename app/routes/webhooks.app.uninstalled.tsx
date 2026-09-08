import type { ActionFunctionArgs } from "react-router";
import { authenticate } from "../shopify.server";
import db from "../db.server";

export const action = async ({ request }: ActionFunctionArgs) => {
  // authenticate.webhook() пытается обновить offline-токен магазина до того,
  // как вернуть контекст. Для магазина, который уже деинсталлировал
  // приложение (типичный случай для этого самого вебхука), обновление токена
  // не может пройти, и SDK сам бросает Response(500) — наш код ниже даже не
  // успевает выполниться. Shopify в ответ на 500 ретраит доставку вебхука до
  // 9+ раз без результата (см. docs/technical/micro-triggers-tech.md).
  // Чистим сессию по shop-домену из заголовка и отвечаем 200, чтобы
  // остановить бессмысленные ретраи — если сессии для этого shop не было,
  // deleteMany просто ничего не удалит.
  let webhookContext;
  try {
    webhookContext = await authenticate.webhook(request);
  } catch (error) {
    const shop = request.headers.get("X-Shopify-Shop-Domain");
    console.error(
      `authenticate.webhook failed for app/uninstalled (shop=${shop ?? "unknown"}), likely an expired offline token that could not be refreshed:`,
      error,
    );
    if (shop) {
      await db.session.deleteMany({ where: { shop } });
    }
    return new Response();
  }

  const { shop, session, topic } = webhookContext;

  console.log(`Received ${topic} webhook for ${shop}`);

  // Webhook requests can trigger multiple times and after an app has already been uninstalled.
  // If this webhook already ran, the session may have been deleted previously.
  if (session) {
    await db.session.deleteMany({ where: { shop } });
  }

  return new Response();
};
