import { useEffect, type ReactNode } from "react";
import { createPortal } from "react-dom";

export function CommunityDrawer({
  open,
  onClose,
  side = "left",
  title,
  headerActions,
  footer,
  children,
  width = "min(18rem,85vw)",
}: {
  open: boolean;
  onClose: () => void;
  side?: "left" | "right";
  title?: string;
  headerActions?: ReactNode;
  footer?: ReactNode;
  children: ReactNode;
  width?: string;
}) {
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  if (!open) return null;

  const slideFrom = side === "left" ? "community-drawer-left" : "community-drawer-right";
  const position = side === "left" ? "left-0" : "right-0";

  return createPortal(
    <div className="fixed inset-0 z-[110] flex" role="dialog" aria-modal="true">
      <button
        type="button"
        className="community-drawer-backdrop absolute inset-0 bg-black/55"
        onClick={onClose}
        aria-label="Close"
      />
      <aside
        className={`community-discord-shell community-drawer-panel ${slideFrom} absolute top-0 ${position} flex h-full flex-col bg-[var(--community-panel)] shadow-xl`}
        style={{ width }}
        onClick={(e) => e.stopPropagation()}
      >
        {(title || headerActions) && (
          <header className="flex h-12 shrink-0 items-center gap-2 border-b border-[var(--community-border)] px-3">
            {title && <h2 className="min-w-0 flex-1 truncate text-[1rem] font-semibold">{title}</h2>}
            {headerActions}
          </header>
        )}
        <div className="community-scroll min-h-0 flex-1 overflow-y-auto overscroll-contain">{children}</div>
        {footer && (
          <footer className="shrink-0 border-t border-[var(--community-border)] p-2">{footer}</footer>
        )}
      </aside>
    </div>,
    document.body,
  );
}
