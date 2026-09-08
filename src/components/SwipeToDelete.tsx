import { useRef, useState, type ReactNode } from "react";

const REVEAL_PX = 88;
const DELETE_PX = 120;

/**
 * Horizontal swipe row: swipe left to reveal Delete, or past the threshold to remove.
 */
export function SwipeToDelete({
  children,
  onDelete,
  disabled = false,
}: {
  children: ReactNode;
  onDelete: () => void | Promise<void>;
  disabled?: boolean;
}) {
  const [offset, setOffset] = useState(0);
  const [busy, setBusy] = useState(false);
  const startX = useRef<number | null>(null);
  const startY = useRef<number | null>(null);
  const locked = useRef<"h" | "v" | null>(null);
  const baseOffset = useRef(0);

  const clamp = (x: number) => Math.min(0, Math.max(-REVEAL_PX - 24, x));

  const finish = async (next: number) => {
    if (next <= -DELETE_PX) {
      setOffset(-320);
      setBusy(true);
      try {
        await onDelete();
      } catch {
        setOffset(0);
        baseOffset.current = 0;
      } finally {
        setBusy(false);
      }
      return;
    }
    const snapped = next <= -REVEAL_PX / 2 ? -REVEAL_PX : 0;
    setOffset(snapped);
    baseOffset.current = snapped;
  };

  return (
    <div className="relative overflow-hidden">
      <div
        className="absolute inset-y-0 right-0 flex w-[88px] items-stretch justify-end"
        aria-hidden
      >
        <button
          type="button"
          disabled={busy || disabled}
          className="flex w-full items-center justify-center bg-destructive px-3 text-[0.875rem] font-semibold text-white"
          onClick={() => void finish(-DELETE_PX)}
        >
          {busy ? "…" : "Delete"}
        </button>
      </div>

      <div
        className="relative bg-surface transition-transform duration-150 ease-out touch-pan-y"
        style={{ transform: `translateX(${offset}px)` }}
        onTouchStart={(e) => {
          if (disabled || busy) return;
          startX.current = e.touches[0]?.clientX ?? null;
          startY.current = e.touches[0]?.clientY ?? null;
          locked.current = null;
        }}
        onTouchMove={(e) => {
          if (disabled || busy || startX.current == null) return;
          const x = e.touches[0]?.clientX ?? startX.current;
          const y = e.touches[0]?.clientY ?? startY.current ?? 0;
          const dx = x - startX.current;
          const dy = y - (startY.current ?? y);
          if (!locked.current) {
            if (Math.abs(dx) < 8 && Math.abs(dy) < 8) return;
            locked.current = Math.abs(dx) > Math.abs(dy) ? "h" : "v";
          }
          if (locked.current !== "h") return;
          e.preventDefault();
          setOffset(clamp(baseOffset.current + dx));
        }}
        onTouchEnd={() => {
          if (disabled || busy || locked.current !== "h") {
            startX.current = null;
            locked.current = null;
            return;
          }
          void finish(offset);
          startX.current = null;
          locked.current = null;
        }}
        onTouchCancel={() => {
          startX.current = null;
          locked.current = null;
          setOffset(baseOffset.current);
        }}
      >
        {children}
      </div>
    </div>
  );
}
