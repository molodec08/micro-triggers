import type { ActionFunctionArgs } from "react-router";
import { authenticate } from "../shopify.server";
import db from "../db.server";

const VALID_TRIGGERS = new Set([
  "blinkingTab",
  "exitPopup",
  "sound",
  "stickyCartBar",
  "lowStockBadge",
  "freeShippingBar",
]);
const VALID_EVENT_TYPES = new Set(["impression", "conversion"]);

export const action = async ({ request }: ActionFunctionArgs) => {
  if (request.method !== "POST") {
    return Response.json({ error: "method not allowed" }, { status: 405 });
  }

  const { session } = await authenticate.public.appProxy(request);

  if (!session) {
    return Response.json({ error: "unknown shop" }, { status: 401 });
  }

  // sendBeacon() sends its Blob body with the browser-assigned
  // "text/plain;charset=UTF-8" content type, not "application/json" — the
  // trigger modules' fetch(..., keepalive: true) fallback does set
  // "application/json", but request.json() here works for either since it
  // parses the raw body regardless of Content-Type.
  const body = await request.json().catch(() => null);
  const trigger = typeof body?.trigger === "string" ? body.trigger : "";
  const eventType = typeof body?.eventType === "string" ? body.eventType : "";

  if (!VALID_TRIGGERS.has(trigger) || !VALID_EVENT_TYPES.has(eventType)) {
    return Response.json({ error: "invalid event" }, { status: 400 });
  }

  await db.triggerEvent.create({
    data: { shop: session.shop, trigger, eventType },
  });

  return Response.json({ ok: true });
};
