import { fetchCart } from "../shared";
import type { BlinkingTabSettings, TriggerContext } from "../types";

export function init(settings: BlinkingTabSettings, ctx: TriggerContext) {
  if (!settings || !settings.enabled) return;

  let blinking = false;
  let intervalId: number | null = null;
  const message = settings.message || "Come back! Your cart is waiting";
  const intervalMs = settings.intervalMs > 0 ? settings.intervalMs : 1000;

  document.addEventListener("visibilitychange", () => {
    if (document.hidden) {
      fetchCart().then((cart) => {
        const hasItems = !!cart && cart.item_count > 0;
        if (!hasItems || blinking) return;
        blinking = true;
        let showMessage = false;
        intervalId = window.setInterval(() => {
          document.title = showMessage ? message : ctx.originalTitle;
          showMessage = !showMessage;
        }, intervalMs);
      });
    } else {
      const wasBlinking = blinking;
      blinking = false;
      if (intervalId) {
        window.clearInterval(intervalId);
        intervalId = null;
      }
      document.title = ctx.originalTitle;
      if (wasBlinking && ctx.onBlinkStop) ctx.onBlinkStop();
    }
  });
}
