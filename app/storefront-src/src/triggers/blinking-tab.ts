import { fetchCart, trackEvent } from "../shared";
import type { BlinkingTabSettings, TriggerContext } from "../types";

export function init(settings: BlinkingTabSettings, ctx: TriggerContext) {
  if (!settings || !settings.enabled) return;

  let blinking = false;
  let intervalId: number | null = null;
  let impressionTracked = false;
  const message = settings.message || "Come back! Your cart is waiting";
  const intervalMs = settings.intervalMs > 0 ? settings.intervalMs : 1000;

  document.addEventListener("visibilitychange", () => {
    if (document.hidden) {
      fetchCart().then((cart) => {
        const hasItems = !!cart && cart.item_count > 0;
        // The cart request can resolve after the shopper has already come
        // back (mobile browsers freeze background pages mid-request) —
        // starting to blink on a visible tab would never stop.
        if (!hasItems || blinking || !document.hidden) return;
        blinking = true;
        if (!impressionTracked) {
          impressionTracked = true;
          trackEvent(ctx.eventUrl, "blinkingTab", "impression");
        }
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
      if (wasBlinking) {
        // The user switched back to this tab while it was blinking — counts
        // as the trigger successfully pulling them back.
        trackEvent(ctx.eventUrl, "blinkingTab", "conversion");
        if (ctx.onBlinkStop) ctx.onBlinkStop();
      }
    }
  });
}
