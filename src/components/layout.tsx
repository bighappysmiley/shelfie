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
    <div className={`mx-auto w-full ${widths[size]} px-4 sm:px-6 ${className}`}>
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
      className={`rounded-md border border-black/10 bg-surface p-4 shadow-sm dark:border-white/10 ${className}`}
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
    <header className="mb-6 border-b border-black/10 pb-5 dark:border-white/10">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-xl font-semibold tracking-tight sm:text-2xl">{title}</h1>
          {subtitle && (
            <p className="mt-1 text-sm leading-relaxed text-muted">{subtitle}</p>
          )}
        </div>
        {action && <div className="shrink-0">{action}</div>}
      </div>
    </header>
  );
}

export function SectionHeading({
  title,
  action,
  className = "",
}: {
  title: string;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div className={`mb-3 flex items-center justify-between gap-3 ${className}`}>
      <h2 className="text-sm font-semibold uppercase tracking-wide text-muted">{title}</h2>
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
    <div className="rounded-md border border-dashed border-black/15 bg-surface px-6 py-10 text-center dark:border-white/15">
      <h2 className="text-base font-semibold">{title}</h2>
      {description && <p className="mx-auto mt-2 max-w-sm text-sm text-muted">{description}</p>}
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
    <span
      className={`inline-flex items-center rounded px-1.5 py-0.5 text-xs font-medium ${styles[variant]}`}
    >
      {children}
    </span>
  );
}
