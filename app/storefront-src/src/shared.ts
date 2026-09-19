import type { ResolvedStyle, StylingSettings } from "./types";

export function getScriptAttribute(name: string): string | null {
  const script = document.currentScript as HTMLScriptElement | null;
  return script && script.getAttribute(name);
}

export function fetchCart() {
  return fetch("/cart.js", { credentials: "same-origin" })
    .then((res) => res.json())
    .catch(() => null);
}

// Derives a neutral border/hover shade from a merchant color, the way
// design-ui's tokens.css hand-picks --border-strong / --surface-sunken next
// to --ink / --surface — custom styling only exposes one text/background
// color, not a whole neutral scale, so this mixes towards it instead.
// color-mix() is supported by all browsers current enough to run this
// storefront widget; on an unsupported browser the color is used as-is,
// which still renders (just without the alpha/mix effect).
export function withAlpha(color: string, alpha: number, onto?: string): string {
  const base = onto || "transparent";
  return `color-mix(in srgb, ${color} ${Math.round(alpha * 100)}%, ${base})`;
}

export function formatMoney(cents: number, currencyCode?: string): string {
  const amount = cents / 100;
  try {
    return new Intl.NumberFormat(undefined, {
      style: "currency",
      currency: currencyCode || "USD",
    }).format(amount);
  } catch (e) {
    return amount.toFixed(2) + " " + (currencyCode || "");
  }
}

// Popular Shopify theme CSS custom properties (Dawn, Horizon and derivatives)
// checked in priority order; first one that resolves to a non-empty value on
// <body> wins. Themes that use different names simply fall through to the
// hardcoded default below.
const BACKGROUND_VARS = [
  "--color-background",
  "--background",
  "--color-base-background-1",
];
const TEXT_VARS = ["--color-foreground", "--text-color", "--color-base-text"];
const ACCENT_VARS = [
  "--color-accent",
  "--color-button",
  "--color-base-accent-1",
  "--color-base-solid-button-labels",
];

// Dawn and most Shopify themes store color custom properties as bare
// "r, g, b" component triples (e.g. "255, 255, 255"), not valid CSS colors —
// the theme's own CSS wraps them as rgb(var(--color-background)) wherever
// it uses them. Used directly as a CSS value, a bare triple is invalid and
// silently dropped by the browser, leaving backgrounds transparent. Detect
// that shape and wrap it the same way the theme does.
const RGB_TRIPLE_RE = /^\d{1,3}\s*,\s*\d{1,3}\s*,\s*\d{1,3}$/;

function readCssVar(style: CSSStyleDeclaration, names: string[]): string {
  for (const name of names) {
    const value = style.getPropertyValue(name).trim();
    if (!value) continue;
    return RGB_TRIPLE_RE.test(value) ? `rgb(${value})` : value;
  }
  return "";
}

// Mirrors design-ui/src/tokens.css: --surface, --ink, --accent, and the
// --shadow-popover / --shadow-card elevation shadows (oriented per surface).
const DEFAULT_BACKGROUND = "#ffffff";
const DEFAULT_TEXT = "#10233d";
const DEFAULT_ACCENT = "#1d5fa8";
const SHADOW = {
  popup: "0 8px 24px rgba(16, 35, 61, 0.12), 0 2px 6px rgba(16, 35, 61, 0.08)",
  barTop: "0 2px 6px rgba(16, 35, 61, 0.12)",
  barBottom: "0 -2px 6px rgba(16, 35, 61, 0.12)",
};

let injectedAnimationCss = false;

function ensureAnimationCss() {
  if (injectedAnimationCss) return;
  injectedAnimationCss = true;
  const style = document.createElement("style");
  style.textContent =
    "@keyframes mtFade{from{opacity:0}to{opacity:1}}" +
    "@keyframes mtSlideUp{from{transform:translateY(16px);opacity:0}to{transform:translateY(0);opacity:1}}" +
    "[data-mt-anim=fade]{animation:mtFade .2s ease-out}" +
    "[data-mt-anim=slide]{animation:mtSlideUp .25s ease-out}";
  document.head.appendChild(style);
}

export function resolveStyling(styling: StylingSettings): ResolvedStyle {
  ensureAnimationCss();

  if (!styling.useThemeStyles) {
    return {
      backgroundColor: styling.backgroundColor,
      textColor: styling.textColor,
      accentColor: styling.accentColor,
      barBackgroundColor: styling.barBackgroundColor,
      barTextColor: styling.barTextColor,
      fontFamily: styling.fontFamily,
      fontSize: styling.fontSize,
      fontWeight: styling.fontWeight,
      borderRadius: styling.borderRadius,
      boxShadow: styling.boxShadow,
      animation: styling.animation,
      shadow: SHADOW,
    };
  }

  const bodyStyle = window.getComputedStyle(document.body);
  const themeBackground = readCssVar(bodyStyle, BACKGROUND_VARS) || DEFAULT_BACKGROUND;
  const themeText = readCssVar(bodyStyle, TEXT_VARS) || DEFAULT_TEXT;
  return {
    backgroundColor: themeBackground,
    textColor: themeText,
    accentColor: readCssVar(bodyStyle, ACCENT_VARS) || DEFAULT_ACCENT,
    // Bars use the same theme colors as the popup here, not their own
    // barBackgroundColor/barTextColor setting — that setting only applies
    // when useThemeStyles is off, same as backgroundColor/textColor above.
    barBackgroundColor: themeBackground,
    barTextColor: themeText,
    fontFamily: bodyStyle.fontFamily || "sans-serif",
    fontSize: styling.fontSize,
    fontWeight: "normal",
    borderRadius: styling.borderRadius,
    boxShadow: styling.boxShadow,
    animation: styling.animation,
    shadow: SHADOW,
  };
}
