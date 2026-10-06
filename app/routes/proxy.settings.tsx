import type { LoaderFunctionArgs } from "react-router";
import { authenticate } from "../shopify.server";
import db from "../db.server";
import { getShopPlan, STOREFRONT_PLAN_MAX_AGE_MS } from "../plan.server";

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
    savedStyling,
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

  // Free: Pro-триггеры и кастомные стили выключаются здесь, а не только в
  // админке — иначе после отмены Pro сохранённые enabled=true продолжили бы
  // работать на витрине. styling = null даёт дефолты ниже (стили темы).
  const isPro =
    (await getShopPlan(shop, { maxAgeMs: STOREFRONT_PLAN_MAX_AGE_MS })) ===
    "pro";
  const styling = isPro ? savedStyling : null;

  return Response.json(
    {
      blinkingTab: {
        enabled: blinkingTab?.enabled ?? false,
        message: blinkingTab?.message ?? "",
        intervalMs: blinkingTab?.intervalMs ?? 1000,
      },
      exitPopup: {
        enabled: isPro && (exitPopup?.enabled ?? false),
        message: exitPopup?.message ?? "",
        discountCode: exitPopup?.discountCode ?? null,
        sensitivityPx: exitPopup?.sensitivityPx ?? 20,
        countdownSeconds: exitPopup?.countdownSeconds ?? 0,
      },
      sound: {
        enabled: isPro && (sound?.enabled ?? false),
        soundFileUrl: sound?.soundFileUrl ?? null,
        soundPreset: sound?.soundPreset ?? "beep",
        playOnAddCart: sound?.playOnAddCart ?? true,
        playOnCheckout: sound?.playOnCheckout ?? false,
      },
      stickyCartBar: {
        enabled: isPro && (stickyCartBar?.enabled ?? false),
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
        enabled: isPro && (emailCapture?.enabled ?? false),
        message: emailCapture?.message ?? "",
      },
      styling: {
        useThemeStyles: styling?.useThemeStyles ?? true,
        backgroundColor: styling?.backgroundColor ?? "#ffffff",
        textColor: styling?.textColor ?? "#10233d",
        accentColor: styling?.accentColor ?? "#1d5fa8",
        barBackgroundColor: styling?.barBackgroundColor ?? "#10233d",
        barTextColor: styling?.barTextColor ?? "#f4f8fb",
        fontFamily: styling?.fontFamily ?? "inherit",
        fontSize: styling?.fontSize ?? 14,
        fontWeight: styling?.fontWeight ?? "normal",
        borderRadius: styling?.borderRadius ?? 14,
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
