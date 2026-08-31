const fieldClasses =
  "w-full bg-transparent px-0 py-2 text-[1.0625rem] text-foreground placeholder:text-muted/80 focus:outline-none";

export function TextField({
  label,
  hint,
  className = "",
  grouped = false,
  ...props
}: React.InputHTMLAttributes<HTMLInputElement> & {
  label: string;
  hint?: string;
  grouped?: boolean;
}) {
  if (grouped) {
    return (
      <label className={`block px-4 py-1 hairline-b last:border-b-0 ${className}`}>
        <span className="block text-[0.8125rem] text-muted">{label}</span>
        <input className={fieldClasses} {...props} />
        {hint && <span className="mt-0.5 block text-[0.8125rem] text-muted">{hint}</span>}
      </label>
    );
  }

  return (
    <label className={`block ${className}`}>
      <span className="mb-1.5 block text-[0.8125rem] font-medium text-muted">{label}</span>
      <input
        className="w-full rounded-[var(--radius-control)] bg-fill px-3.5 py-2.5 text-[1.0625rem] text-foreground placeholder:text-muted/80 focus:outline-none focus:ring-2 focus:ring-accent/30"
        {...props}
      />
      {hint && <span className="mt-1.5 block text-[0.8125rem] text-muted">{hint}</span>}
    </label>
  );
}

export function SelectField({
  label,
  hint,
  className = "",
  children,
  grouped = false,
  ...props
}: React.SelectHTMLAttributes<HTMLSelectElement> & {
  label: string;
  hint?: string;
  grouped?: boolean;
}) {
  if (grouped) {
    return (
      <label className={`flex min-h-[44px] items-center justify-between gap-3 px-4 py-2 hairline-b last:border-b-0 ${className}`}>
        <span className="shrink-0 text-[1.0625rem]">{label}</span>
        <select
          className="max-w-[55%] truncate bg-transparent text-right text-[1.0625rem] text-muted focus:outline-none"
          {...props}
        >
          {children}
        </select>
      </label>
    );
  }

  return (
    <label className={`block ${className}`}>
      <span className="mb-1.5 block text-[0.8125rem] font-medium text-muted">{label}</span>
      <select
        className="w-full rounded-[var(--radius-control)] bg-fill px-3.5 py-2.5 text-[1.0625rem] text-foreground focus:outline-none focus:ring-2 focus:ring-accent/30"
        {...props}
      >
        {children}
      </select>
      {hint && <span className="mt-1.5 block text-[0.8125rem] text-muted">{hint}</span>}
    </label>
  );
}

export function FormError({ message }: { message: string }) {
  return (
    <p role="alert" className="px-1 text-[0.9375rem] text-destructive">
      {message}
    </p>
  );
}

export function TextArea({
  label,
  hint,
  className = "",
  grouped = false,
  ...props
}: React.TextareaHTMLAttributes<HTMLTextAreaElement> & {
  label: string;
  hint?: string;
  grouped?: boolean;
}) {
  if (grouped) {
    return (
      <label className={`block px-4 py-2 hairline-b last:border-b-0 ${className}`}>
        <span className="block text-[0.8125rem] text-muted">{label}</span>
        <textarea className={`${fieldClasses} min-h-28 resize-y`} {...props} />
        {hint && <span className="mt-1 block text-[0.8125rem] text-muted">{hint}</span>}
      </label>
    );
  }

  return (
    <label className={`block ${className}`}>
      <span className="mb-1.5 block text-[0.8125rem] font-medium text-muted">{label}</span>
      <textarea
        className="w-full min-h-28 resize-y rounded-[var(--radius-control)] bg-fill px-3.5 py-2.5 text-[1.0625rem] text-foreground placeholder:text-muted/80 focus:outline-none focus:ring-2 focus:ring-accent/30"
        {...props}
      />
      {hint && <span className="mt-1.5 block text-[0.8125rem] text-muted">{hint}</span>}
    </label>
  );
}

export function SearchInput({
  value,
  onChange,
  placeholder = "Search",
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  return (
    <div className="relative">
      <svg
        className="pointer-events-none absolute top-1/2 left-3.5 h-4 w-4 -translate-y-1/2 text-muted"
        viewBox="0 0 16 16"
        fill="none"
        aria-hidden
      >
        <circle cx="7" cy="7" r="4.5" stroke="currentColor" strokeWidth="1.5" />
        <path d="M10.5 10.5L14 14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      </svg>
      <input
        type="search"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full rounded-[var(--radius-control)] bg-fill py-2.5 pr-3.5 pl-10 text-[1.0625rem] text-foreground placeholder:text-muted/80 focus:outline-none focus:ring-2 focus:ring-accent/30"
        aria-label="Search"
      />
    </div>
  );
}
