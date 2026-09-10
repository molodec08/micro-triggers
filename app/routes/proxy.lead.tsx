import type { ActionFunctionArgs } from "react-router";
import { authenticate } from "../shopify.server";
import db from "../db.server";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const action = async ({ request }: ActionFunctionArgs) => {
  if (request.method !== "POST") {
    return Response.json({ error: "method not allowed" }, { status: 405 });
  }

  const { session } = await authenticate.public.appProxy(request);

  if (!session) {
    return Response.json({ error: "unknown shop" }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const email = typeof body?.email === "string" ? body.email.trim() : "";

  if (!email || !EMAIL_RE.test(email)) {
    return Response.json({ error: "invalid email" }, { status: 400 });
  }

  await db.capturedLead.create({
    data: { shop: session.shop, email },
  });

  return Response.json({ ok: true });
};
