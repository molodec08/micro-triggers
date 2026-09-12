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
      fontFamily: styling.fontFamily,
      fontSize: styling.fontSize,
      fontWeight: styling.fontWeight,
      borderRadius: styling.borderRadius,
      boxShadow: styling.boxShadow,
      animation: styling.animation,
    };
  }

  const bodyStyle = window.getComputedStyle(document.body);
  return {
    backgroundColor: readCssVar(bodyStyle, BACKGROUND_VARS) || "#ffffff",
    textColor: readCssVar(bodyStyle, TEXT_VARS) || "#111111",
    accentColor: readCssVar(bodyStyle, ACCENT_VARS) || "#2c6ecb",
    fontFamily: bodyStyle.fontFamily || "sans-serif",
    fontSize: styling.fontSize,
    fontWeight: "normal",
    borderRadius: styling.borderRadius,
    boxShadow: styling.boxShadow,
    animation: styling.animation,
  };
}
