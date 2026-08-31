import type { ReactNode } from "react";

export function Container({
  children,
  className = "",
  size = "wide",
}: {
  children: ReactNode;
  className?: string;
  size?: "wide" | "narrow" | "form";
}) {
  const widths = {
    wide: "max-w-4xl",
    narrow: "max-w-xl",
    form: "max-w-md",
  };
  return (
    <div className={`mx-auto w-full ${widths[size]} px-4 sm:px-5 ${className}`}>
      {children}
    </div>
  );
}

export function Section({
  children,
  className = "",
  size = "wide",
  id,
}: {
  children: ReactNode;
  className?: string;
  size?: "wide" | "narrow" | "form";
  id?: string;
}) {
  return (
    <section
      id={id}
      className={`py-6 sm:py-8 ${id ? "scroll-mt-20" : ""} ${className}`}
    >
      <Container size={size}>{children}</Container>
    </section>
  );
}

export function Card({
  children,
  className = "",
  onClick,
}: {
  children: ReactNode;
  className?: string;
  onClick?: () => void;
}) {
  return (
    <div
      className={`rounded-lg border border-black/10 bg-surface p-4 sm:p-5 dark:border-white/10 ${className}`}
      onClick={onClick}
      role={onClick ? "button" : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={onClick ? (e) => e.key === "Enter" && onClick() : undefined}
    >
      {children}
    </div>
  );
}

export function PageHeader({
  title,
  subtitle,
  action,
}: {
  title: string;
  subtitle?: ReactNode;
  action?: ReactNode;
}) {
  return (
    <div className="mb-5 flex flex-col gap-3 sm:mb-6 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight sm:text-[1.65rem]">{title}</h1>
        {subtitle && <div className="mt-1.5 text-[0.95rem] leading-relaxed text-muted">{subtitle}</div>}
      </div>
      {action}
    </div>
  );
}

export function EmptyState({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="py-12 text-center">
      <h2 className="text-lg font-semibold">{title}</h2>
      {description && <p className="mt-1.5 text-sm text-muted">{description}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

export function Badge({
  children,
  variant = "default",
}: {
  children: ReactNode;
  variant?: "default" | "warning" | "success";
}) {
  const styles = {
    default: "bg-accent-soft text-foreground",
    warning: "bg-warning-bg text-warning",
    success: "bg-success-bg text-success",
  };
  return (
    <span className={`inline-flex items-center rounded px-1.5 py-0.5 text-xs font-medium ${styles[variant]}`}>
      {children}
    </span>
  );
}
