import type { ActionFunctionArgs } from "react-router";
import { authenticate } from "../shopify.server";
import db from "../db.server";

// Единственные customer data, которые хранит приложение, — email-адреса,
// оставленные покупателями в exit-попапе (CapturedLead). Удаляем все записи
// этого покупателя в данном магазине. Сравнение без учёта регистра: адрес
// сохраняется в том виде, в каком его ввёл покупатель.
export const action = async ({ request }: ActionFunctionArgs) => {
  const { shop, topic, payload } = await authenticate.webhook(request);

  console.log(`Received ${topic} webhook for ${shop}`);

  const email =
    typeof payload?.customer?.email === "string"
      ? payload.customer.email.trim()
      : "";

  if (email) {
    const { count } = await db.capturedLead.deleteMany({
      where: { shop, email: { equals: email, mode: "insensitive" } },
    });
    console.log(`Redacted ${count} captured lead(s) for ${shop}`);
  }

  return new Response();
};
