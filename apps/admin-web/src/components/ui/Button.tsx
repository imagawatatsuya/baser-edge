import type { ButtonHTMLAttributes } from "react";

type Props = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "default" | "primary" | "danger" | "link";
};

export function Button({ variant = "default", className = "", ...props }: Props) {
  const classes = [
    variant === "link" ? "btn-link" : "btn",
    variant === "primary" ? "btn-primary" : "",
    variant === "danger" ? "btn-danger" : "",
    className,
  ].filter(Boolean).join(" ");
  return <button type="button" className={classes} {...props} />;
}
