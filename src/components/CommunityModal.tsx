import { useEffect, type FormEvent, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { IconX } from "@/components/Icons";

export function CommunityModal({
  open,
  onClose,
  title,
  children,
  footer,
  maxWidth = "max-w-md",
  tone = "app",
  onSubmit,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  footer?: ReactNode;
  maxWidth?: string;
  tone?: "app" | "community";
  onSubmit?: (e: FormEvent) => void;
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

  const shellClass =
    tone === "community"
      ? "community-discord-shell bg-[var(--community-panel)] text-foreground"
      : "bg-surface text-foreground ring-1 ring-black/[0.06] dark:ring-white/[0.08]";

  const borderClass =
    tone === "community" ? "border-[var(--community-border)]" : "border-black/[0.06] dark:border-white/[0.08]";

  const body = (
    <>
      <div className={`flex shrink-0 items-center justify-between border-b ${borderClass} px-5 py-4`}>
        <h2 className="text-[1.125rem] font-semibold">{title}</h2>
        <button type="button" onClick={onClose} className="text-muted hover:text-foreground">
          <IconX size={18} />
        </button>
      </div>
      <div className="community-scroll min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 py-4 pb-[calc(1rem+env(safe-area-inset-bottom,0px))]">
        {children}
      </div>
      {footer ? (
        <div
          className={`shrink-0 border-t ${borderClass} px-5 py-4 pb-[calc(1rem+env(safe-area-inset-bottom,0px))]`}
        >
          {footer}
        </div>
      ) : null}
    </>
  );

  return createPortal(
    <div
      className="fixed inset-0 z-[100] flex items-end justify-center bg-black/55 p-0 sm:items-center sm:p-4"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="community-modal-title"
    >
      {onSubmit ? (
        <form
          onSubmit={onSubmit}
          onClick={(e) => e.stopPropagation()}
          className={`flex max-h-[min(90dvh,calc(100dvh-env(safe-area-inset-bottom,0px)))] w-full ${maxWidth} flex-col rounded-t-2xl shadow-xl sm:max-h-[min(85dvh,40rem)] sm:rounded-2xl ${shellClass}`}
        >
          {body}
        </form>
      ) : (
        <div
          onClick={(e) => e.stopPropagation()}
          className={`flex max-h-[min(90dvh,calc(100dvh-env(safe-area-inset-bottom,0px)))] w-full ${maxWidth} flex-col rounded-t-2xl shadow-xl sm:max-h-[min(85dvh,40rem)] sm:rounded-2xl ${shellClass}`}
        >
          {body}
        </div>
      )}
    </div>,
    document.body,
  );
}
