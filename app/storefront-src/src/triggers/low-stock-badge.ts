import type { LowStockBadgeSettings, TriggerContext } from "../types";

interface ProductVariant {
  id: number;
  inventory_quantity?: number;
}

interface Product {
  variants: ProductVariant[];
}

export function init(settings: LowStockBadgeSettings, ctx: TriggerContext) {
  if (!settings || !settings.enabled) return;

  // Работает только на странице товара (`/products/{handle}`), где доступен
  // публичный `product.js` с `inventory_quantity` по каждому варианту —
  // Shopify не даёт узнать остаток по variant id без Admin API в общем случае.
  const match = window.location.pathname.match(/\/products\/([^/?#]+)/);
  if (!match) return;

  const form = document.querySelector<HTMLFormElement>(
    'form[action*="/cart/add"]',
  );
  if (!form) return;

  let badge: HTMLParagraphElement | null = null;
  const { styling } = ctx;

  fetch("/products/" + match[1] + ".js", { credentials: "same-origin" })
    .then((res) => res.json())
    .then((product: Product) => {
      renderForCurrentVariant(product);

      const idInput = form.querySelector<HTMLInputElement>('[name="id"]');
      if (idInput) {
        // Большинство тем обновляют это скрытое поле через `change` при
        // выборе другого варианта (размер/цвет) — пересчитываем бейдж.
        idInput.addEventListener("change", () => {
          renderForCurrentVariant(product);
        });
        form.addEventListener("change", () => {
          renderForCurrentVariant(product);
        });
      }
    })
    .catch(() => {
      // Тема/store не предоставляют inventory JSON — бейдж просто не показывается.
    });

  function renderForCurrentVariant(product: Product) {
    const idInput = form!.querySelector<HTMLInputElement>('[name="id"]');
    const variantId = idInput && Number(idInput.value);
    const variant =
      (product.variants || []).find((v) => v.id === variantId) ||
      product.variants[0];
    if (!variant || typeof variant.inventory_quantity !== "number") {
      hideBadge();
      return;
    }
    renderBadge(variant.inventory_quantity);
  }

  function hideBadge() {
    if (badge) badge.style.display = "none";
  }

  function renderBadge(quantity: number) {
    const threshold = settings.threshold > 0 ? settings.threshold : 5;
    if (quantity <= 0 || quantity > threshold) {
      hideBadge();
      return;
    }
    if (!badge) {
      badge = document.createElement("p");
      badge.setAttribute("data-micro-triggers-low-stock", "");
      badge.style.cssText =
        `color:${styling.accentColor};font-size:${styling.fontSize}px;` +
        `font-family:${styling.fontFamily};font-weight:${styling.fontWeight};margin:8px 0;`;
      form!.insertBefore(badge, form!.firstChild);
    }
    badge.textContent = String(
      settings.message || "Only {count} left in stock!",
    ).replace("{count}", String(quantity));
    badge.style.display = "block";
  }
}
