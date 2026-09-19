import { fetchCart, formatMoney } from "../shared";
import type { FreeShippingBarSettings, TriggerContext } from "../types";

const DISMISSED_KEY = "mt-free-shipping-dismissed";

export function init(settings: FreeShippingBarSettings, ctx: TriggerContext) {
  if (!settings || !settings.enabled) return;

  const { styling } = ctx;
  let textEl: HTMLSpanElement | null = null;

  function isDismissed(): boolean {
    try {
      return window.sessionStorage.getItem(DISMISSED_KEY) === "1";
    } catch (e) {
      return false;
    }
  }

  function dismiss() {
    try {
      window.sessionStorage.setItem(DISMISSED_KEY, "1");
    } catch (e) {
      // sessionStorage недоступен (приватный режим) — бар просто закроется
      // только на текущий рендер, без запоминания между добавлениями в корзину.
    }
    const bar = document.querySelector<HTMLDivElement>(
      "[data-micro-triggers-free-shipping]",
    );
    if (bar) bar.style.display = "none";
  }

  function render() {
    if (isDismissed()) return;

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
          "position:fixed;bottom:8px;left:8px;right:8px;z-index:2147482998;" +
          `background:${styling.barBackgroundColor};color:${styling.barTextColor};` +
          "text-align:center;padding:8px 32px 8px 12px;" +
          `font-family:${styling.fontFamily};font-size:${styling.fontSize}px;` +
          `font-weight:${styling.fontWeight};border-radius:${styling.borderRadius}px;`;
        if (styling.boxShadow) {
          bar.style.boxShadow = styling.shadow.barBottom;
        }

        textEl = document.createElement("span");
        bar.appendChild(textEl);

        const closeBtn = document.createElement("button");
        closeBtn.type = "button";
        closeBtn.setAttribute("aria-label", "Close");
        closeBtn.textContent = "×";
        closeBtn.style.cssText =
          "position:absolute;right:8px;top:50%;transform:translateY(-50%);" +
          `border:none;background:transparent;color:${styling.barTextColor};cursor:pointer;` +
          "font-size:16px;line-height:1;padding:4px;";
        closeBtn.addEventListener("click", dismiss);
        bar.appendChild(closeBtn);

        document.body.appendChild(bar);
      }
      bar.style.display = "block";

      if (total >= thresholdCents) {
        textEl!.textContent =
          settings.successMessage || "You've unlocked free shipping!";
      } else {
        const remaining = formatMoney(thresholdCents - total, cart.currency);
        textEl!.textContent = String(
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
