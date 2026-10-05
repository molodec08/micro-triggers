import type { ActionFunctionArgs } from "react-router";
import { authenticate } from "../shopify.server";
import db from "../db.server";

// Единственные customer data, которые хранит приложение, — email-адреса из
// exit-попапа (CapturedLead). Shopify не ждёт данные в ответе на вебхук:
// их нужно передать владельцу магазина отдельно. Здесь фиксируем запрос и
// найденные записи (без самого email в логах), чтобы по data_request.id
// можно было подготовить выгрузку для магазина.
export const action = async ({ request }: ActionFunctionArgs) => {
  const { shop, topic, payload } = await authenticate.webhook(request);

  console.log(`Received ${topic} webhook for ${shop}`);

  const email =
    typeof payload?.customer?.email === "string"
      ? payload.customer.email.trim()
      : "";

  if (email) {
    const leads = await db.capturedLead.findMany({
      where: { shop, email: { equals: email, mode: "insensitive" } },
      select: { id: true, createdAt: true },
    });
    console.log(
      `customers/data_request ${payload?.data_request?.id ?? "unknown"} for ${shop}: ${leads.length} captured lead(s)`,
      leads.map((lead) => lead.id),
    );
  }

  return new Response();
};
