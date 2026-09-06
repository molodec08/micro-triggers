import type { ActionFunctionArgs } from "react-router";
import { authenticate } from "../shopify.server";

// Приложение не хранит и не читает customer data — только собственные
// настройки триггеров (см. shopify.app.toml, access_scopes). Отвечаем 200,
// подтверждая получение и обрабатываемость запроса без выдачи данных.
export const action = async ({ request }: ActionFunctionArgs) => {
  const { shop, topic } = await authenticate.webhook(request);

  console.log(`Received ${topic} webhook for ${shop}`);

  return new Response();
};
