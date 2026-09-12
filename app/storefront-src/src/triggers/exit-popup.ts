import { fetchCart } from "../shared";
import type {
  EmailCaptureSettings,
  ExitPopupSettings,
  TriggerContext,
} from "../types";

type Settings = ExitPopupSettings & { emailCapture?: EmailCaptureSettings };

export function init(settings: Settings, ctx: TriggerContext) {
  if (!settings || !settings.enabled) return;

  let shown = false;
  const threshold = settings.sensitivityPx > 0 ? settings.sensitivityPx : 20;
  const countdownSeconds = settings.countdownSeconds || 0;
  const emailCaptureSettings = settings.emailCapture;
  const { styling, leadUrl } = ctx;

  function buildPopup() {
    const overlay = document.createElement("div");
    overlay.setAttribute("data-micro-triggers-exit-popup", "");
    overlay.style.cssText =
      "position:fixed;inset:0;z-index:2147483000;background:rgba(0,0,0,0.5);" +
      "display:flex;align-items:center;justify-content:center;";

    const box = document.createElement("div");
    box.setAttribute("data-mt-anim", styling.animation);
    box.style.cssText =
      `background:${styling.backgroundColor};color:${styling.textColor};` +
      "padding:24px 28px;max-width:360px;text-align:center;" +
      `font-family:${styling.fontFamily};font-size:${styling.fontSize}px;` +
      `font-weight:${styling.fontWeight};border-radius:${styling.borderRadius}px;`;
    if (styling.boxShadow) {
      box.style.boxShadow = "0 8px 24px rgba(0,0,0,0.2)";
    }

    const text = document.createElement("p");
    text.textContent = settings.message || "Wait! Here's a discount for you";
    text.style.cssText = "margin:0 0 12px;font-size:1.15em;";
    box.appendChild(text);

    if (settings.discountCode) {
      const code = document.createElement("p");
      code.textContent = settings.discountCode;
      code.style.cssText =
        "margin:0 0 16px;font-weight:bold;font-size:1.3em;letter-spacing:1px;";
      box.appendChild(code);

      if (countdownSeconds > 0) {
        const countdownEl = document.createElement("p");
        countdownEl.style.cssText = "margin:0 0 16px;font-size:0.85em;opacity:0.7;";
        box.appendChild(countdownEl);

        let remaining = countdownSeconds;
        const render = () => {
          countdownEl.textContent = "Expires in " + remaining + "s";
        };
        render();
        const countdownId = window.setInterval(() => {
          remaining -= 1;
          if (remaining <= 0) {
            window.clearInterval(countdownId);
            countdownEl.textContent = "Offer expired";
            return;
          }
          render();
        }, 1000);
      }
    }

    if (emailCaptureSettings && emailCaptureSettings.enabled) {
      const emailWrap = document.createElement("div");
      emailWrap.style.cssText = "margin:0 0 16px;";

      const emailLabel = document.createElement("p");
      emailLabel.textContent = emailCaptureSettings.message || "Leave your email";
      emailLabel.style.cssText = "margin:0 0 8px;font-size:0.9em;opacity:0.8;";
      emailWrap.appendChild(emailLabel);

      const emailInput = document.createElement("input");
      emailInput.type = "email";
      emailInput.placeholder = "you@example.com";
      emailInput.style.cssText =
        "width:100%;box-sizing:border-box;padding:8px;border:1px solid #ccc;" +
        `border-radius:${Math.min(styling.borderRadius, 4)}px;font-size:0.9em;margin-bottom:8px;`;
      emailWrap.appendChild(emailInput);

      const submitBtn = document.createElement("button");
      submitBtn.type = "button";
      submitBtn.textContent = "Submit";
      submitBtn.style.cssText =
        `border:none;background:${styling.accentColor};color:#fff;padding:8px 16px;` +
        `border-radius:${styling.borderRadius}px;cursor:pointer;width:100%;margin-bottom:4px;`;
      submitBtn.addEventListener("click", () => {
        const email = emailInput.value.trim();
        if (!email || email.indexOf("@") === -1) return;
        submitBtn.disabled = true;
        submitBtn.textContent = "Submitting...";
        fetch(leadUrl, {
          method: "POST",
          credentials: "same-origin",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email }),
        })
          .then(() => {
            submitBtn.textContent = "Thanks!";
          })
          .catch(() => {
            submitBtn.disabled = false;
            submitBtn.textContent = "Submit";
          });
      });
      emailWrap.appendChild(submitBtn);

      box.appendChild(emailWrap);
    }

    const closeBtn = document.createElement("button");
    closeBtn.textContent = "Close";
    closeBtn.style.cssText =
      `border:none;background:${styling.textColor};color:${styling.backgroundColor};` +
      `padding:8px 16px;border-radius:${styling.borderRadius}px;cursor:pointer;`;
    closeBtn.addEventListener("click", () => {
      overlay.remove();
    });
    box.appendChild(closeBtn);

    overlay.appendChild(box);
    overlay.addEventListener("click", (event) => {
      if (event.target === overlay) overlay.remove();
    });

    return overlay;
  }

  document.addEventListener("mouseout", (event: MouseEvent) => {
    if (shown) return;
    // `toElement` is a legacy non-standard IE property, absent from DOM
    // lib.d.ts; older browsers report it instead of `relatedTarget` when
    // the pointer leaves the viewport, which is exactly the exit-intent
    // signal this check needs.
    const legacyRelatedTarget = (event as unknown as { toElement?: Element })
      .toElement;
    if (event.relatedTarget || legacyRelatedTarget) return;
    if (event.clientY > threshold) return;

    fetchCart().then((cart) => {
      const hasItems = !!cart && cart.item_count > 0;
      if (!hasItems || shown) return;
      shown = true;
      document.body.appendChild(buildPopup());
    });
  });
}
