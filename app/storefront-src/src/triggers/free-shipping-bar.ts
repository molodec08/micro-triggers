import { fetchCart, formatMoney } from "../shared";
import type { FreeShippingBarSettings, TriggerContext } from "../types";

export function init(settings: FreeShippingBarSettings, ctx: TriggerContext) {
  if (!settings || !settings.enabled) return;

  const { styling } = ctx;

  function render() {
    fetchCart().then((cart) => {
      if (!cart) return;
      const total = cart.total_price || 0;
      const thresholdCents =
        settings.thresholdCents > 0 ? settings.thresholdCents : 5000;
      let bar = document.querySelector<HTMLDivElement>(
        "[data-micro-triggers-free-shipping]",
      );
      if (!bar) {
        bar = document.createElement("div");
        bar.setAttribute("data-micro-triggers-free-shipping", "");
        // Бар всегда рендерится как отдельная fixed-полоса (тем же паттерном,
        // что и sticky back-to-cart bar), а не полагается на угадывание
        // разметки конкретной темы — см. историю в git blame этого файла для
        // деталей о прошлом подходе, который не работал надёжно. Закреплён
        // снизу (в отличие от sticky back-to-cart bar сверху), чтобы оба бара
        // могли быть видны одновременно без наложения друг на друга.
        bar.setAttribute("data-mt-anim", styling.animation);
        bar.style.cssText =
          "position:fixed;bottom:0;left:0;right:0;z-index:2147482998;" +
          `background:${styling.backgroundColor};color:${styling.textColor};` +
          "text-align:center;padding:8px 12px;" +
          `font-family:${styling.fontFamily};font-size:${styling.fontSize}px;` +
          `font-weight:${styling.fontWeight};`;
        if (styling.boxShadow) {
          bar.style.boxShadow = "0 -2px 8px rgba(0,0,0,0.15)";
        }
        document.body.appendChild(bar);
      }

      if (total >= thresholdCents) {
        bar.textContent =
          settings.successMessage || "You've unlocked free shipping!";
      } else {
        const remaining = formatMoney(thresholdCents - total, cart.currency);
        bar.textContent = String(
          settings.message || "Add {remaining} more to get free shipping!",
        ).replace("{remaining}", remaining);
      }
    });
  }

  document.addEventListener("submit", (event) => {
    const form = event.target as HTMLFormElement;
    if (form && form.action && form.action.indexOf("/cart/add") !== -1) {
      window.setTimeout(render, 300);
    }
  });

  render();
}
