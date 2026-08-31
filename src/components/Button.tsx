import type { ButtonHTMLAttributes, ReactNode } from "react";
import { Link } from "react-router-dom";

type Variant = "primary" | "secondary" | "tinted" | "ghost" | "plain" | "danger";

const base =
  "inline-flex min-h-[44px] items-center justify-center gap-2 rounded-[var(--radius-pill)] px-5 text-[1.0625rem] font-medium transition-all active:scale-[0.98] disabled:pointer-events-none disabled:opacity-40";

const variants: Record<Variant, string> = {
  primary: "bg-accent text-accent-contrast hover:bg-accent-hover",
  secondary: "bg-fill text-foreground hover:bg-fill-secondary",
  tinted: "bg-accent-soft text-foreground hover:bg-fill",
  ghost: "text-foreground hover:bg-fill-secondary",
  plain: "min-h-0 rounded-none px-0 py-0 text-link hover:text-link-hover active:opacity-60",
  danger: "bg-destructive-bg text-destructive hover:opacity-90",
};

const sizes = {
  default: "px-5",
  sm: "min-h-[36px] px-4 text-[0.9375rem]",
  toolbar: "min-h-[32px] rounded-[var(--radius-control)] px-3 text-[0.8125rem]",
};

export function Button({
  variant = "primary",
  size = "default",
  className = "",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: Variant;
  size?: keyof typeof sizes;
}) {
  return (
    <button
      className={`${base} ${variants[variant]} ${sizes[size]} ${className}`}
      {...props}
    />
  );
}

export function ButtonLink({
  to,
  variant = "primary",
  size = "default",
  className = "",
  children,
}: {
  to: string;
  variant?: Variant;
  size?: keyof typeof sizes;
  className?: string;
  children: ReactNode;
}) {
  return (
    <Link to={to} className={`${base} ${variants[variant]} ${sizes[size]} ${className}`}>
      {children}
    </Link>
  );
}
