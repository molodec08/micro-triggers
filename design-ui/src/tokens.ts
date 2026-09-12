// Simple UI — token values mirrored in TS for cases where you need the raw
// value in JS (charts, canvas, inline SVG) rather than via CSS var().
// The source of truth is tokens.css — keep these two in sync by hand,
// there are few enough values that a build step isn't worth it yet.

export const color = {
  ink: "#10233d",
  inkSecondary: "#4b617a",
  inkMuted: "#8b9aac",
  canvas: "#fafaf8",
  surface: "#ffffff",
  border: "#e2e5e9",
  borderStrong: "#c6ccd3",
  accent: "#1d5fa8",
  accentHover: "#164a85",
  accentSoft: "#eaf2fa",
  success: "#1f7a4d",
  warning: "#b5730a",
  danger: "#b23a3a",
} as const;

export const space = {
  1: 4,
  2: 8,
  3: 12,
  4: 16,
  6: 24,
  8: 32,
  12: 48,
} as const;

export const radius = {
  sm: 6,
  md: 10,
  lg: 14,
} as const;
