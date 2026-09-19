import React from "react";

type ButtonVariant = "primary" | "secondary" | "ghost";

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
}

export function Button({ variant = "secondary", className = "", ...rest }: ButtonProps) {
  const classes = ["s-btn", `s-btn--${variant}`, className].filter(Boolean).join(" ");
  return <button className={classes} {...rest} />;
}
