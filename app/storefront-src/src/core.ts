import { getScriptAttribute, resolveStyling } from "./shared";
import type { AllSettings, TriggerContext } from "./types";

function getSettingsUrl(): string {
  return getScriptAttribute("data-settings-url") || "/apps/micro-triggers/settings";
}

function getLeadUrl(): string {
  return getScriptAttribute("data-lead-url") || "/apps/micro-triggers/lead";
}

// One static import() call per trigger, each in its own arm, so Vite can
// analyze every call site and emit one chunk per trigger at build time — a
// disabled trigger's chunk is never requested by the browser. Each trigger
// module only depends on ./shared (never on this file), so loading a
// trigger never pulls this dispatcher in.
function loadTrigger(trigger: keyof AllSettings, settings: AllSettings, ctx: TriggerContext) {
  switch (trigger) {
    case "blinkingTab":
      return import("./triggers/blinking-tab").then((mod) =>
        mod.init(settings.blinkingTab, ctx),
      );
    case "exitPopup":
      return import("./triggers/exit-popup").then((mod) =>
        mod.init({ ...settings.exitPopup, emailCapture: settings.emailCapture }, ctx),
      );
    case "sound":
      return import("./triggers/sound").then((mod) => mod.init(settings.sound, ctx));
    case "stickyCartBar":
      return import("./triggers/sticky-cart-bar").then((mod) =>
        mod.init(settings.stickyCartBar, ctx),
      );
    case "lowStockBadge":
      return import("./triggers/low-stock-badge").then((mod) =>
        mod.init(settings.lowStockBadge, ctx),
      );
    case "freeShippingBar":
      return import("./triggers/free-shipping-bar").then((mod) =>
        mod.init(settings.freeShippingBar, ctx),
      );
    case "emailCapture":
      return Promise.resolve(); // handled inside the exit-popup module
    case "styling":
      return Promise.resolve();
  }
}

async function init() {
  const originalTitle = document.title;
  const settingsUrl = getSettingsUrl();
  const leadUrl = getLeadUrl();

  let settings: AllSettings;
  try {
    const res = await fetch(settingsUrl, { credentials: "same-origin" });
    settings = await res.json();
  } catch (e) {
    // Настройки недоступны — триггеры молча не активируются.
    return;
  }

  const styling = resolveStyling(settings.styling);

  // Sticky cart bar shows itself when blinking-tab stops blinking. Both
  // trigger chunks load in parallel and in unspecified order, so the handler
  // is a mutable box: whichever module resolves last still sees the other's
  // registration through this shared reference.
  let blinkStopHandler: (() => void) | null = null;
  const ctx: TriggerContext = {
    leadUrl,
    styling,
    originalTitle,
    get onBlinkStop() {
      return blinkStopHandler;
    },
    registerBlinkStopHandler(handler) {
      blinkStopHandler = handler;
    },
  } as TriggerContext;

  const triggers: (keyof AllSettings)[] = [
    "blinkingTab",
    "exitPopup",
    "sound",
    "stickyCartBar",
    "lowStockBadge",
    "freeShippingBar",
  ];

  for (const trigger of triggers) {
    const triggerSettings = settings[trigger] as { enabled?: boolean };
    if (!triggerSettings || !triggerSettings.enabled) continue;

    loadTrigger(trigger, settings, ctx)?.catch(() => {
      // Chunk failed to load (offline/CDN issue) — fail silently, other
      // triggers keep working independently.
    });
  }
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", init);
} else {
  init();
}
