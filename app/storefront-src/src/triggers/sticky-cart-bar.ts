import { fetchCart } from "../shared";
import type { StickyCartBarSettings, TriggerContext } from "../types";

export function init(settings: StickyCartBarSettings, ctx: TriggerContext) {
  if (!settings || !settings.enabled) return;

  let bar: HTMLDivElement | null = null;
  let textEl: HTMLSpanElement | null = null;
  const { styling } = ctx;

  function buildBar() {
    bar = document.createElement("div");
    bar.setAttribute("data-micro-triggers-sticky-bar", "");
    bar.style.cssText =
      "position:fixed;top:0;left:0;right:0;z-index:2147482999;" +
      `background:${styling.backgroundColor};color:${styling.textColor};` +
      "text-align:center;padding:8px 32px 8px 12px;" +
      `font-family:${styling.fontFamily};font-size:${styling.fontSize}px;` +
      `font-weight:${styling.fontWeight};position:fixed;`;
    if (styling.boxShadow) {
      bar.style.boxShadow = "0 2px 8px rgba(0,0,0,0.15)";
    }
    bar.setAttribute("data-mt-anim", styling.animation);

    textEl = document.createElement("span");
    bar.appendChild(textEl);

    const closeBtn = document.createElement("button");
    closeBtn.type = "button";
    closeBtn.setAttribute("aria-label", "Close");
    closeBtn.textContent = "×";
    closeBtn.style.cssText =
      "position:absolute;right:8px;top:50%;transform:translateY(-50%);" +
      `border:none;background:transparent;color:${styling.textColor};cursor:pointer;` +
      "font-size:16px;line-height:1;padding:4px;";
    closeBtn.addEventListener("click", () => {
      if (bar) bar.style.display = "none";
    });
    bar.appendChild(closeBtn);

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
    });
  }

  ctx.registerBlinkStopHandler(show);
}
