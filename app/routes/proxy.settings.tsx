import type { LoaderFunctionArgs } from "react-router";
import { authenticate } from "../shopify.server";
import db from "../db.server";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { session } = await authenticate.public.appProxy(request);

  if (!session) {
    return Response.json({ error: "unknown shop" }, { status: 401 });
  }

  const shop = session.shop;

  const [
    blinkingTab,
    exitPopup,
    sound,
    stickyCartBar,
    lowStockBadge,
    freeShippingBar,
    emailCapture,
    styling,
  ] = await Promise.all([
    db.blinkingTabTrigger.findUnique({ where: { shop } }),
    db.exitPopupTrigger.findUnique({ where: { shop } }),
    db.soundTrigger.findUnique({ where: { shop } }),
    db.stickyCartBarTrigger.findUnique({ where: { shop } }),
    db.lowStockBadgeTrigger.findUnique({ where: { shop } }),
    db.freeShippingBarTrigger.findUnique({ where: { shop } }),
    db.emailCaptureTrigger.findUnique({ where: { shop } }),
    db.triggerStyleSettings.findUnique({ where: { shop } }),
  ]);

  return Response.json(
    {
      blinkingTab: {
        enabled: blinkingTab?.enabled ?? false,
        message: blinkingTab?.message ?? "",
        intervalMs: blinkingTab?.intervalMs ?? 1000,
      },
      exitPopup: {
        enabled: exitPopup?.enabled ?? false,
        message: exitPopup?.message ?? "",
        discountCode: exitPopup?.discountCode ?? null,
        sensitivityPx: exitPopup?.sensitivityPx ?? 20,
        countdownSeconds: exitPopup?.countdownSeconds ?? 0,
      },
      sound: {
        enabled: sound?.enabled ?? false,
        soundFileUrl: sound?.soundFileUrl ?? null,
        soundPreset: sound?.soundPreset ?? "beep",
        playOnAddCart: sound?.playOnAddCart ?? true,
        playOnCheckout: sound?.playOnCheckout ?? false,
      },
      stickyCartBar: {
        enabled: stickyCartBar?.enabled ?? false,
        message: stickyCartBar?.message ?? "",
      },
      lowStockBadge: {
        enabled: lowStockBadge?.enabled ?? false,
        threshold: lowStockBadge?.threshold ?? 5,
        message: lowStockBadge?.message ?? "",
      },
      freeShippingBar: {
        enabled: freeShippingBar?.enabled ?? false,
        thresholdCents: freeShippingBar?.thresholdCents ?? 5000,
        message: freeShippingBar?.message ?? "",
        successMessage: freeShippingBar?.successMessage ?? "",
      },
      emailCapture: {
        enabled: emailCapture?.enabled ?? false,
        message: emailCapture?.message ?? "",
      },
      styling: {
        useThemeStyles: styling?.useThemeStyles ?? true,
        backgroundColor: styling?.backgroundColor ?? "#ffffff",
        textColor: styling?.textColor ?? "#111111",
        accentColor: styling?.accentColor ?? "#2c6ecb",
        fontFamily: styling?.fontFamily ?? "inherit",
        fontSize: styling?.fontSize ?? 14,
        fontWeight: styling?.fontWeight ?? "normal",
        borderRadius: styling?.borderRadius ?? 8,
        boxShadow: styling?.boxShadow ?? true,
        animation: styling?.animation ?? "fade",
      },
    },
    {
      headers: {
        "Cache-Control": "public, max-age=30",
      },
    },
  );
};
