import { useEffect, useRef, type ReactNode } from "react";
import { createPortal } from "react-dom";

export function MessageContextMenu({
  open,
  x,
  y,
  onClose,
  children,
}: {
  open: boolean;
  x: number;
  y: number;
  onClose: () => void;
  children: ReactNode;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (ref.current?.contains(e.target as Node)) return;
      onClose();
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  }, [open, onClose]);

  if (!open) return null;

  const maxX = typeof window !== "undefined" ? window.innerWidth - 220 : x;
  const maxY = typeof window !== "undefined" ? window.innerHeight - 280 : y;

  return createPortal(
    <div
      ref={ref}
      className="community-discord-shell fixed z-[130] min-w-[12rem] overflow-hidden rounded-md border border-[var(--community-border)] bg-[var(--community-panel)] py-1 shadow-xl"
      style={{ left: Math.min(x, maxX), top: Math.min(y, maxY) }}
      role="menu"
    >
      {children}
    </div>,
    document.body,
  );
}

export function ContextMenuItem({
  children,
  onClick,
  destructive = false,
}: {
  children: ReactNode;
  onClick?: () => void;
  destructive?: boolean;
}) {
  return (
    <button
      type="button"
      role="menuitem"
      onClick={onClick}
      className={`flex w-full items-center gap-2 px-3 py-1.5 text-left text-sm hover:bg-[var(--community-hover)] ${
        destructive ? "text-destructive" : "text-foreground"
      }`}
    >
      {children}
    </button>
  );
}
