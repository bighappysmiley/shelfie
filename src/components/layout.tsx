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
    wide: "max-w-5xl",
    narrow: "max-w-3xl",
    form: "max-w-md",
  };
  return (
    <div className={`mx-auto w-full ${widths[size]} px-6 sm:px-8 ${className}`}>
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
      className={`py-8 sm:py-12 ${id ? "scroll-mt-24" : ""} ${className}`}
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
      className={`rounded-xl border border-black/8 bg-surface p-6 dark:border-white/10 ${className}`}
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
    <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">{title}</h1>
        {subtitle && (
          <p className="mt-2 text-lg text-muted">{subtitle}</p>
        )}
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
    <div className="py-16 text-center">
      <h2 className="text-xl font-semibold">{title}</h2>
      {description && <p className="mt-2 text-muted">{description}</p>}
      {action && <div className="mt-6">{action}</div>}
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
    <span className={`inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium ${styles[variant]}`}>
      {children}
    </span>
  );
}
