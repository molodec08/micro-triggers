import type { ActionFunctionArgs } from "react-router";
import { authenticate } from "../shopify.server";

// Приложение не хранит customer data — нечего удалять по этому запросу.
export const action = async ({ request }: ActionFunctionArgs) => {
  const { shop, topic } = await authenticate.webhook(request);

  console.log(`Received ${topic} webhook for ${shop}`);

  return new Response();
};
