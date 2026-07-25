import type { ReactNode } from "react";

export function Field({
  label,
  hint,
  error,
  children,
  htmlFor,
}: {
  label: string;
  hint?: string;
  error?: string;
  children: ReactNode;
  htmlFor?: string;
}) {
  return (
    <div className="field">
      <label htmlFor={htmlFor}>{label}</label>
      {children}
      {hint ? <small className="field-hint">{hint}</small> : null}
      {error ? <small className="status status-error">{error}</small> : null}
    </div>
  );
}
