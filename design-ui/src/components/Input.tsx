import React from "react";

interface FieldWrapperProps {
  label?: string;
  hint?: string;
  error?: string;
  children: React.ReactNode;
}

/** Wraps any field with a label above and hint/error below, per Simple UI spacing. */
export function Field({ label, hint, error, children }: FieldWrapperProps) {
  return (
    <div className="s-field">
      {label && <label className="s-field__label">{label}</label>}
      {children}
      {error ? (
        <span className="s-field__error">{error}</span>
      ) : hint ? (
        <span className="s-field__hint">{hint}</span>
      ) : null}
    </div>
  );
}

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  error?: boolean;
}

export function Input({ error, className = "", ...rest }: InputProps) {
  const classes = ["s-input", error ? "s-input--error" : "", className].filter(Boolean).join(" ");
  return <input className={classes} {...rest} />;
}

export function Textarea({
  error,
  className = "",
  ...rest
}: React.TextareaHTMLAttributes<HTMLTextAreaElement> & { error?: boolean }) {
  const classes = ["s-input", error ? "s-input--error" : "", className].filter(Boolean).join(" ");
  return <textarea className={classes} {...rest} />;
}

export function Select({
  error,
  className = "",
  children,
  ...rest
}: React.SelectHTMLAttributes<HTMLSelectElement> & { error?: boolean }) {
  const classes = ["s-input", error ? "s-input--error" : "", className].filter(Boolean).join(" ");
  return (
    <select className={classes} {...rest}>
      {children}
    </select>
  );
}

export interface SwitchProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label?: string;
}

export function Switch({ checked, onChange, label }: SwitchProps) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      className="s-switch"
      onClick={() => onChange(!checked)}
    />
  );
}
