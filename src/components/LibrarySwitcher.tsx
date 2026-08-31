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

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex max-w-[10rem] items-center gap-1 rounded-[var(--radius-control)] px-2 py-1 text-[0.8125rem] text-muted hover:bg-fill-secondary hover:text-foreground sm:max-w-[12rem]"
        aria-expanded={open}
        aria-haspopup="listbox"
      >
        <span className="truncate font-medium text-foreground">{activeLibrary.name}</span>
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
            className="absolute left-0 top-full z-50 mt-1 min-w-[10rem] overflow-hidden rounded-[var(--radius-group)] bg-surface py-1 shadow-lg ring-1 ring-black/[0.08] dark:ring-white/[0.1]"
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
