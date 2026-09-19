import type { LowStockBadgeSettings, TriggerContext } from "../types";

interface ProductVariant {
  id: number;
  available?: boolean;
}

interface Product {
  variants: ProductVariant[];
}

export function init(settings: LowStockBadgeSettings, ctx: TriggerContext) {
  if (!settings || !settings.enabled) return;

  // Работает только на странице товара (`/products/{handle}`).
  const match = window.location.pathname.match(/\/products\/([^/?#]+)/);
  if (!match) return;

  const form = document.querySelector<HTMLFormElement>(
    'form[action*="/cart/add"]',
  );
  if (!form) return;

  let badge: HTMLParagraphElement | null = null;
  const { styling, inventoryUrl } = ctx;
  // Публичный `product.js` не отдаёт inventory_quantity (только available) —
  // точный остаток запрашивается отдельно через Admin API (см.
  // proxy.inventory.tsx). Кэшируем по variant id, чтобы не дёргать backend
  // повторно при пересчёте бейджа для того же варианта.
  const quantityCache = new Map<number, number | null>();
  let requestSeq = 0;

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

      form.addEventListener("submit", (event) => {
        const target = event.target as HTMLFormElement;
        if (!target.action || target.action.indexOf("/cart/add") === -1) return;
        const idInputNow = form.querySelector<HTMLInputElement>('[name="id"]');
        const variantId = idInputNow && Number(idInputNow.value);
        // Остаток на складе меняется на сервере только после того, как
        // /cart/add завершится — запрашиваем свежее число с небольшой
        // задержкой (тем же паттерном, что sticky-cart-bar/free-shipping-bar
        // используют после добавления в корзину), не дожидаясь смены
        // варианта пользователем.
        window.setTimeout(() => {
          if (typeof variantId === "number") quantityCache.delete(variantId);
          renderForCurrentVariant(product);
        }, 300);
      });
    })
    .catch(() => {
      // Тема/store не предоставляют product JSON — бейдж просто не показывается.
    });

  function renderForCurrentVariant(product: Product) {
    const idInput = form!.querySelector<HTMLInputElement>('[name="id"]');
    const variantId = idInput && Number(idInput.value);
    const variant =
      (product.variants || []).find((v) => v.id === variantId) ||
      product.variants[0];
    if (!variant || variant.available === false) {
      hideBadge();
      return;
    }

    const seq = ++requestSeq;
    if (quantityCache.has(variant.id)) {
      applyQuantity(quantityCache.get(variant.id)!);
      return;
    }

    fetch(inventoryUrl + "?variantId=" + variant.id, {
      credentials: "same-origin",
    })
      .then((res) => res.json())
      .then((data: { quantity: number | null }) => {
        const quantity = typeof data.quantity === "number" ? data.quantity : null;
        quantityCache.set(variant.id, quantity);
        // Пользователь мог переключить вариант, пока запрос летел —
        // применяем результат только если это ещё актуальный вариант.
        if (seq === requestSeq) applyQuantity(quantity);
      })
      .catch(() => {
        if (seq === requestSeq) hideBadge();
      });
  }

  function applyQuantity(quantity: number | null) {
    if (quantity === null) {
      hideBadge();
      return;
    }
    renderBadge(quantity);
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
