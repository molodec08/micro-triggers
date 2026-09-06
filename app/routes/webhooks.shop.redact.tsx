import type { ActionFunctionArgs } from "react-router";
import { authenticate } from "../shopify.server";
import db from "../db.server";

// 48 часов после удаления магазина Shopify отправляет этот webhook.
// Удаляем все данные, связанные с магазином (сессии и настройки триггеров).
export const action = async ({ request }: ActionFunctionArgs) => {
  const { shop, topic } = await authenticate.webhook(request);

  console.log(`Received ${topic} webhook for ${shop}`);

  await db.session.deleteMany({ where: { shop } });
  await db.blinkingTabTrigger.deleteMany({ where: { shop } });
  await db.exitPopupTrigger.deleteMany({ where: { shop } });
  await db.soundTrigger.deleteMany({ where: { shop } });

  return new Response();
};
