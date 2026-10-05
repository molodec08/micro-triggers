import { fetchCart, trackEvent } from "../shared";
import type { StickyCartBarSettings, TriggerContext } from "../types";

export function init(settings: StickyCartBarSettings, ctx: TriggerContext) {
  if (!settings || !settings.enabled) return;

  let bar: HTMLDivElement | null = null;
  let textEl: HTMLSpanElement | null = null;
  let impressionTracked = false;
  const { styling, eventUrl } = ctx;

  function buildBar() {
    bar = document.createElement("div");
    bar.setAttribute("data-micro-triggers-sticky-bar", "");
    bar.style.cssText =
      // max(..., env(safe-area-inset-*)) keeps the bar clear of the notch
      // and rounded corners on phones; elsewhere env() resolves to 0.
      "position:fixed;top:max(8px,env(safe-area-inset-top));" +
      "left:max(8px,env(safe-area-inset-left));right:max(8px,env(safe-area-inset-right));" +
      "z-index:2147482999;box-sizing:border-box;min-height:44px;" +
      `background:${styling.barBackgroundColor};color:${styling.barTextColor};` +
      "text-align:center;padding:12px 48px 12px 12px;" +
      `font-family:${styling.fontFamily};font-size:${styling.fontSize}px;` +
      `font-weight:${styling.fontWeight};border-radius:${styling.borderRadius}px;`;
    if (styling.boxShadow) {
      bar.style.boxShadow = styling.shadow.barTop;
    }
    bar.setAttribute("data-mt-anim", styling.animation);

    textEl = document.createElement("span");
    bar.appendChild(textEl);

    const closeBtn = document.createElement("button");
    closeBtn.type = "button";
    closeBtn.setAttribute("aria-label", "Close");
    closeBtn.textContent = "×";
    closeBtn.style.cssText =
      // 44x44 tap target (Apple HIG minimum) spanning the bar's full height.
      "position:absolute;top:0;right:0;bottom:0;width:44px;min-height:44px;" +
      "display:flex;align-items:center;justify-content:center;" +
      `border:none;background:transparent;color:${styling.barTextColor};cursor:pointer;` +
      "font-size:20px;line-height:1;padding:0;";
    closeBtn.addEventListener("click", (event) => {
      event.stopPropagation();
      if (bar) bar.style.display = "none";
    });
    bar.appendChild(closeBtn);

    // Clicking the bar itself (not the close button) counts as a
    // conversion — the shopper acted on the nudge to go back to their cart.
    bar.addEventListener("click", () => {
      trackEvent(eventUrl, "stickyCartBar", "conversion");
    });

    document.body.appendChild(bar);
  }

  function show() {
    fetchCart().then((cart) => {
      const count = cart && cart.item_count ? cart.item_count : 0;
      if (!count) {
        if (bar) bar.style.display = "none";
        return;
      }
      if (!bar) buildBar();
      if (textEl) {
        textEl.textContent = String(settings.message || "").replace(
          "{count}",
          String(count),
        );
      }
      if (bar) bar.style.display = "block";
      if (!impressionTracked) {
        impressionTracked = true;
        trackEvent(eventUrl, "stickyCartBar", "impression");
      }
    });
  }

  // Shows when the shopper comes back to the store: switching back to this
  // tab/app, or returning to this page via Back (restored from bfcache, which
  // fires pageshow instead of a fresh load). Independent of the blinking tab
  // trigger, which can't run on mobile and may be disabled by the merchant.
  document.addEventListener("visibilitychange", () => {
    if (!document.hidden) show();
  });
  window.addEventListener("pageshow", (event) => {
    if (event.persisted) show();
  });
}
