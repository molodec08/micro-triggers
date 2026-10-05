import { createHmac, timingSafeEqual } from "node:crypto";

// authenticate.webhook() бросает исключение и при неверной подписи, и при
// неудачном обновлении offline-токена после деинсталляции. В catch-ветке
// вебхуков, которые удаляют данные, сначала отдельно проверяем HMAC —
// иначе поддельный запрос с чужим X-Shopify-Shop-Domain стёр бы данные
// магазина. rawBody нужно прочитать из request.clone() до
// authenticate.webhook(), который сам потребляет тело запроса.
export function isValidWebhookHmac(request: Request, rawBody: string): boolean {
  const secret = process.env.SHOPIFY_API_SECRET;
  const received = request.headers.get("X-Shopify-Hmac-Sha256");
  if (!secret || !received) return false;

  const expected = createHmac("sha256", secret).update(rawBody, "utf8").digest();
  const receivedBytes = Buffer.from(received, "base64");

  return (
    receivedBytes.length === expected.length &&
    timingSafeEqual(receivedBytes, expected)
  );
}
