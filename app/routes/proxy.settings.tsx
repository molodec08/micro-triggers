import type { LoaderFunctionArgs } from "react-router";
import { authenticate } from "../shopify.server";
import db from "../db.server";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { session } = await authenticate.public.appProxy(request);

  if (!session) {
    return Response.json({ error: "unknown shop" }, { status: 401 });
  }

  const shop = session.shop;

  const [blinkingTab, exitPopup, sound] = await Promise.all([
    db.blinkingTabTrigger.findUnique({ where: { shop } }),
    db.exitPopupTrigger.findUnique({ where: { shop } }),
    db.soundTrigger.findUnique({ where: { shop } }),
  ]);

  return Response.json(
    {
      blinkingTab: {
        enabled: blinkingTab?.enabled ?? false,
        message: blinkingTab?.message ?? "",
      },
      exitPopup: {
        enabled: exitPopup?.enabled ?? false,
        message: exitPopup?.message ?? "",
        discountCode: exitPopup?.discountCode ?? null,
      },
      sound: {
        enabled: sound?.enabled ?? false,
        soundFileUrl: sound?.soundFileUrl ?? null,
        playOnAddCart: sound?.playOnAddCart ?? true,
        playOnCheckout: sound?.playOnCheckout ?? false,
      },
    },
    {
      headers: {
        "Cache-Control": "public, max-age=30",
      },
    },
  );
};
