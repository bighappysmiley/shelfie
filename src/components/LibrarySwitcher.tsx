import { useState } from "react";
import { useLibrary } from "@/lib/library";

export function LibrarySwitcher({ compact = false }: { compact?: boolean }) {
  const { libraries, activeLibrary, setActiveLibrary, loading } = useLibrary();
  const [open, setOpen] = useState(false);

  if (loading || !activeLibrary) return null;

  if (libraries.length <= 1 && compact) {
    return (
      <span className="hidden truncate text-[0.8125rem] text-muted md:inline max-w-[8rem]">
        {activeLibrary.name}
      </span>
    );
  }

  if (libraries.length <= 1 && !compact) {
    return (
      <div className="rounded-[var(--radius-control)] bg-fill-secondary px-3 py-2">
        <p className="text-[0.6875rem] font-medium uppercase tracking-[0.06em] text-muted">
          Library
        </p>
        <p className="truncate text-[0.9375rem] font-medium text-foreground">
          {activeLibrary.name}
        </p>
      </div>
    );
  }

  return (
    <div className={`relative ${compact ? "" : "w-full"}`}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={
          compact
            ? "flex max-w-[10rem] items-center gap-1 rounded-[var(--radius-control)] px-2 py-1 text-[0.8125rem] text-muted hover:bg-fill-secondary hover:text-foreground sm:max-w-[12rem]"
            : "flex w-full items-center gap-2 rounded-[var(--radius-control)] bg-fill-secondary px-3 py-2 text-left hover:bg-fill"
        }
        aria-expanded={open}
        aria-haspopup="listbox"
      >
        {!compact && (
          <span className="min-w-0 flex-1">
            <span className="block text-[0.6875rem] font-medium uppercase tracking-[0.06em] text-muted">
              Library
            </span>
            <span className="block truncate text-[0.9375rem] font-medium text-foreground">
              {activeLibrary.name}
            </span>
          </span>
        )}
        {compact && (
          <span className="truncate font-medium text-foreground">{activeLibrary.name}</span>
        )}
        <svg width="12" height="12" viewBox="0 0 12 12" aria-hidden className="shrink-0 opacity-60">
          <path d="M3 4.5L6 7.5L9 4.5" stroke="currentColor" strokeWidth="1.5" fill="none" />
        </svg>
      </button>
      {open && (
        <>
          <button
            type="button"
            className="fixed inset-0 z-40 cursor-default"
            aria-label="Close library menu"
            onClick={() => setOpen(false)}
          />
          <ul
            role="listbox"
            className={`absolute z-50 mt-1 overflow-hidden rounded-[var(--radius-group)] bg-surface py-1 shadow-lg ring-1 ring-black/[0.08] dark:ring-white/[0.1] ${
              compact ? "left-0 top-full min-w-[10rem]" : "left-0 right-0 top-full"
            }`}
          >
            {libraries.map((lib) => (
              <li key={lib.id}>
                <button
                  type="button"
                  role="option"
                  aria-selected={lib.id === activeLibrary.id}
                  onClick={() => {
                    setActiveLibrary(lib.id);
                    setOpen(false);
                  }}
                  className={`flex w-full items-center gap-2 px-3 py-2 text-left text-[0.9375rem] hover:bg-fill-secondary ${
                    lib.id === activeLibrary.id ? "font-semibold text-foreground" : "text-muted"
                  }`}
                >
                  <span className="truncate">{lib.name}</span>
                  {lib.role === "owner" && (
                    <span className="ml-auto shrink-0 text-[0.6875rem] uppercase tracking-wide text-tertiary">
                      Owner
                    </span>
                  )}
                </button>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}
