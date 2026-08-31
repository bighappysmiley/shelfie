import type { ReactNode, ButtonHTMLAttributes } from "react";
import { Link } from "react-router-dom";

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
    wide: "max-w-3xl",
    narrow: "max-w-xl",
    form: "max-w-md",
  };
  return (
    <div className={`mx-auto w-full ${widths[size]} px-4 sm:px-5 ${className}`}>
      {children}
    </div>
  );
}

export function PageHeader({
  title,
  subtitle,
  action,
  large = true,
}: {
  title: string;
  subtitle?: ReactNode;
  action?: ReactNode;
  large?: boolean;
}) {
  return (
    <header className="mb-5">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <h1
            className={
              large
                ? "text-[1.75rem] font-bold tracking-tight sm:text-[2.125rem]"
                : "text-xl font-semibold tracking-tight"
            }
          >
            {title}
          </h1>
          {subtitle && (
            <p className="mt-1 text-[0.9375rem] leading-snug text-muted">{subtitle}</p>
          )}
        </div>
        {action && <div className="shrink-0 pt-1">{action}</div>}
      </div>
    </header>
  );
}

export function Group({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`overflow-hidden rounded-[var(--radius-group)] bg-surface shadow-sm ring-1 ring-black/[0.04] dark:ring-white/[0.06] ${className}`}
    >
      {children}
    </div>
  );
}

export function GroupHeader({
  children,
  action,
  className = "",
}: {
  children: ReactNode;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div className={`mb-1.5 flex items-center justify-between gap-3 px-1 ${className}`}>
      <p className="text-[0.8125rem] leading-snug text-muted">{children}</p>
      {action}
    </div>
  );
}

export function GroupFooter({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <p className={`mt-2 px-1 text-[0.8125rem] leading-snug text-muted ${className}`}>
      {children}
    </p>
  );
}

function Chevron() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 14 14"
      fill="none"
      className="shrink-0 text-tertiary"
      aria-hidden
    >
      <path
        d="M5 3.5L8.5 7L5 10.5"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

const rowBase =
  "flex min-h-[44px] w-full items-center gap-3 px-4 py-3 text-left text-[1.0625rem] leading-snug transition-colors";

export function ListRow({
  title,
  subtitle,
  trailing,
  chevron = false,
  destructive = false,
  className = "",
  children,
  ...props
}: {
  title?: string;
  subtitle?: string;
  trailing?: ReactNode;
  chevron?: boolean;
  destructive?: boolean;
  className?: string;
  children?: ReactNode;
} & (
  | { to: string; onClick?: never }
  | { onClick?: () => void; to?: never }
  | { to?: never; onClick?: never }
)) {
  const content = children ?? (
    <>
      <div className="min-w-0 flex-1">
        {title && (
          <p className={`truncate ${destructive ? "text-destructive" : "text-foreground"}`}>
            {title}
          </p>
        )}
        {subtitle && <p className="truncate text-[0.9375rem] text-muted">{subtitle}</p>}
      </div>
      {trailing && <div className="shrink-0 text-[0.9375rem] text-muted">{trailing}</div>}
      {chevron && <Chevron />}
    </>
  );

  const cls = `${rowBase} hairline-b last:border-b-0 active:bg-fill-secondary ${className}`;

  if ("to" in props && props.to) {
    return (
      <Link to={props.to} className={cls}>
        {content}
      </Link>
    );
  }

  if ("onClick" in props && props.onClick) {
    return (
      <button type="button" onClick={props.onClick} className={cls}>
        {content}
      </button>
    );
  }

  return <div className={`${rowBase} hairline-b last:border-b-0 ${className}`}>{content}</div>;
}

export function SegmentedControl<T extends string>({
  value,
  onChange,
  options,
  className = "",
}: {
  value: T;
  onChange: (v: T) => void;
  options: { value: T; label: string }[];
  className?: string;
}) {
  return (
    <div
      className={`flex rounded-[var(--radius-control)] bg-fill p-0.5 ${className}`}
      role="tablist"
    >
      {options.map((opt) => {
        const active = value === opt.value;
        return (
          <button
            key={opt.value}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onChange(opt.value)}
            className={`min-h-[32px] flex-1 rounded-[0.4375rem] px-3 text-[0.8125rem] font-medium transition-all ${
              active
                ? "bg-surface text-foreground shadow-sm"
                : "text-muted hover:text-foreground"
            }`}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
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
      className={`overflow-hidden rounded-[var(--radius-group)] bg-surface p-4 shadow-sm ring-1 ring-black/[0.04] dark:ring-white/[0.06] ${className}`}
      onClick={onClick}
      role={onClick ? "button" : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={onClick ? (e) => e.key === "Enter" && onClick() : undefined}
    >
      {children}
    </div>
  );
}

/** @deprecated Use GroupHeader */
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
    <div className={`mb-1.5 flex items-center justify-between gap-3 px-1 ${className}`}>
      <p className="text-[0.8125rem] text-muted">{title}</p>
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
    <div className="px-4 py-14 text-center">
      <h2 className="text-[1.0625rem] font-semibold">{title}</h2>
      {description && (
        <p className="mx-auto mt-2 max-w-xs text-[0.9375rem] leading-snug text-muted">
          {description}
        </p>
      )}
      {action && <div className="mt-5">{action}</div>}
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
    default: "bg-fill text-foreground",
    warning: "bg-warning-bg text-warning",
    success: "bg-success-bg text-success",
  };
  return (
    <span
      className={`inline-flex items-center rounded-[var(--radius-pill)] px-2 py-0.5 text-[0.75rem] font-medium ${styles[variant]}`}
    >
      {children}
    </span>
  );
}

export function Banner({
  children,
  variant = "default",
  className = "",
}: {
  children: ReactNode;
  variant?: "default" | "warning" | "success";
  className?: string;
}) {
  const styles = {
    default: "bg-fill text-foreground",
    warning: "bg-warning-bg text-warning",
    success: "bg-success-bg text-success",
  };
  return (
    <div className={`rounded-[var(--radius-group)] px-4 py-3 text-[0.9375rem] ${styles[variant]} ${className}`}>
      {children}
    </div>
  );
}

export function ToggleRow({
  label,
  hint,
  checked,
  onChange,
}: {
  label: string;
  hint?: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <div className="flex min-h-[44px] items-center justify-between gap-3 px-4 py-2.5 hairline-b last:border-b-0">
      <div className="min-w-0">
        <p className="text-[1.0625rem]">{label}</p>
        {hint && <p className="text-[0.8125rem] text-muted">{hint}</p>}
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={`relative h-[31px] w-[51px] shrink-0 rounded-full transition-colors ${
          checked ? "bg-success" : "bg-fill"
        }`}
      >
        <span
          className={`absolute top-[2px] left-[2px] h-[27px] w-[27px] rounded-full bg-white shadow transition-transform ${
            checked ? "translate-x-[20px]" : "translate-x-0"
          }`}
        />
      </button>
    </div>
  );
}

export function PlainButton({
  children,
  className = "",
  destructive = false,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { destructive?: boolean }) {
  return (
    <button
      type="button"
      className={`min-h-[44px] w-full px-4 py-3 text-center text-[1.0625rem] font-normal transition-opacity active:opacity-60 disabled:opacity-40 ${
        destructive ? "text-destructive" : "text-link"
      } ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}
