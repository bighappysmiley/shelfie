import { useEffect, useRef, type ReactNode } from "react";
import { createPortal } from "react-dom";

export function ToolbarDivider() {
  return <span className="mx-2 hidden h-6 w-px shrink-0 bg-[var(--community-border)] sm:inline-block" />;
}

export function MessageDateDivider({ label }: { label: string }) {
  return (
    <li className="relative my-4 flex items-center px-4" aria-hidden>
      <div className="h-px flex-1 bg-[var(--community-border)]" />
      <span className="mx-4 shrink-0 rounded-full bg-[var(--community-panel)] px-2 py-0.5 text-xs font-semibold text-muted">
        {label}
      </span>
      <div className="h-px flex-1 bg-[var(--community-border)]" />
    </li>
  );
}

export function PresenceDot({ status = "online" }: { status?: "online" | "idle" | "dnd" | "offline" }) {
  const color =
    status === "online"
      ? "bg-success"
      : status === "idle"
        ? "bg-warning"
        : status === "dnd"
          ? "bg-destructive"
          : "bg-muted";
  return (
    <span
      className={`absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full border-[3px] border-[var(--community-user-bar)] ${color}`}
    />
  );
}

export function TypingIndicator({ names }: { names: string[] }) {
  if (names.length === 0) return null;
  const label =
    names.length === 1
      ? `${names[0]} is typing`
      : names.length === 2
        ? `${names[0]} and ${names[1]} are typing`
        : "Several people are typing";
  return (
    <p className="flex items-center gap-2 px-4 pb-1 text-xs text-muted">
      <span className="flex gap-0.5" aria-hidden>
        <span className="community-typing-dot h-1.5 w-1.5 rounded-full bg-muted" />
        <span className="community-typing-dot community-typing-dot--2 h-1.5 w-1.5 rounded-full bg-muted" />
        <span className="community-typing-dot community-typing-dot--3 h-1.5 w-1.5 rounded-full bg-muted" />
      </span>
      {label}…
    </p>
  );
}

export function ChevronDown({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden>
      <path d="m6 9 6 6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

export function CommunityPopover({
  open,
  onClose,
  anchorRef,
  children,
  align = "left",
}: {
  open: boolean;
  onClose: () => void;
  anchorRef: React.RefObject<HTMLElement | null>;
  children: ReactNode;
  align?: "left" | "right";
}) {
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      const t = e.target as Node;
      if (panelRef.current?.contains(t) || anchorRef.current?.contains(t)) return;
      onClose();
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open, onClose, anchorRef]);

  if (!open || !anchorRef.current) return null;

  const rect = anchorRef.current.getBoundingClientRect();
  const style: React.CSSProperties = {
    position: "fixed",
    top: rect.bottom + 6,
    ...(align === "right" ? { right: window.innerWidth - rect.right } : { left: rect.left }),
    zIndex: 120,
  };

  return createPortal(
    <div
      ref={panelRef}
      style={style}
      className="min-w-[12rem] overflow-hidden rounded-md border border-[var(--community-border)] bg-[var(--community-panel)] py-1 shadow-lg"
    >
      {children}
    </div>,
    document.body,
  );
}

export function PopoverItem({
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
      onClick={onClick}
      className={`flex w-full items-center gap-2 px-3 py-1.5 text-left text-sm hover:bg-[var(--community-hover)] ${
        destructive ? "text-destructive" : "text-foreground"
      }`}
    >
      {children}
    </button>
  );
}

export function formatMessageDateDivider(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  const sameDay =
    d.getFullYear() === now.getFullYear() &&
    d.getMonth() === now.getMonth() &&
    d.getDate() === now.getDate();
  if (sameDay) return "Today";
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  const isYesterday =
    d.getFullYear() === yesterday.getFullYear() &&
    d.getMonth() === yesterday.getMonth() &&
    d.getDate() === yesterday.getDate();
  if (isYesterday) return "Yesterday";
  return d.toLocaleDateString(undefined, { month: "long", day: "numeric", year: "numeric" });
}

export function messageDayKey(iso: string): string {
  const d = new Date(iso);
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
}
