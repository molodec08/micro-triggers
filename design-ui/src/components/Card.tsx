import React from "react";

export function Card({ className = "", ...rest }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={["s-card", className].filter(Boolean).join(" ")} {...rest} />;
}

type BadgeTone = "accent" | "success" | "warning" | "danger";

export function Badge({
  tone = "accent",
  className = "",
  ...rest
}: React.HTMLAttributes<HTMLSpanElement> & { tone?: BadgeTone }) {
  return <span className={["s-badge", `s-badge--${tone}`, className].filter(Boolean).join(" ")} {...rest} />;
}
