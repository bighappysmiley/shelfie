import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/lib/auth";
import { APP_WORDMARK_PRIMARY } from "@/lib/brand";
import {
  listMyNotifications,
  subscribeToNotifications,
  type AppNotification,
} from "@/lib/admin";

type ToastItem = {
  id: string;
  title: string;
  body: string;
};

const AUTO_DISMISS_MS = 5600;

export function NotificationToaster() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [toast, setToast] = useState<ToastItem | null>(null);
  const [phase, setPhase] = useState<"in" | "out" | "idle">("idle");
  const dismissTimer = useRef<number | null>(null);
  const touchStartY = useRef<number | null>(null);
  const seenIds = useRef<Set<string>>(new Set());
  const bootstrapped = useRef(false);

  const clearTimer = () => {
    if (dismissTimer.current != null) {
      window.clearTimeout(dismissTimer.current);
      dismissTimer.current = null;
    }
  };

  const hide = useCallback(() => {
    clearTimer();
    setPhase("out");
    window.setTimeout(() => {
      setToast(null);
      setPhase("idle");
    }, 220);
  }, []);

  const show = useCallback(
    (note: AppNotification) => {
      if (seenIds.current.has(note.id)) return;
      seenIds.current.add(note.id);
      clearTimer();
      setToast({ id: note.id, title: note.title, body: note.body });
      setPhase("out");
      window.requestAnimationFrame(() => {
        window.requestAnimationFrame(() => setPhase("in"));
      });
      dismissTimer.current = window.setTimeout(() => hide(), AUTO_DISMISS_MS);
    },
    [hide],
  );

  useEffect(() => {
    if (!user) {
      bootstrapped.current = false;
      seenIds.current.clear();
      return;
    }

    let cancelled = false;

    void listMyNotifications()
      .then((notes) => {
        if (cancelled) return;
        for (const n of notes) seenIds.current.add(n.id);
        bootstrapped.current = true;
      })
      .catch(() => {
        bootstrapped.current = true;
      });

    const unsubscribe = subscribeToNotifications(user.id, (note) => {
      if (!bootstrapped.current) {
        seenIds.current.add(note.id);
        return;
      }
      show(note);
    });

    const poll = window.setInterval(() => {
      void listMyNotifications()
        .then((notes) => {
          if (!bootstrapped.current) return;
          const newest = notes.find((n) => !seenIds.current.has(n.id) && !n.readAt);
          if (newest) show(newest);
          for (const n of notes) seenIds.current.add(n.id);
        })
        .catch(() => {});
    }, 25_000);

    return () => {
      cancelled = true;
      unsubscribe();
      window.clearInterval(poll);
      clearTimer();
    };
  }, [user, show]);

  if (!toast || phase === "idle") return null;

  return (
    <div
      className="pointer-events-none fixed inset-x-0 top-0 z-[80] flex justify-center px-3 pt-[max(0.75rem,env(safe-area-inset-top))]"
      aria-live="polite"
    >
      <button
        type="button"
        className={`pointer-events-auto w-full max-w-md origin-top rounded-2xl border border-black/10 bg-surface/95 p-3 text-left shadow-[0_12px_40px_rgba(0,0,0,0.18)] backdrop-blur-xl transition-all duration-200 dark:border-white/10 ${
          phase === "in"
            ? "translate-y-0 opacity-100"
            : "-translate-y-[120%] opacity-0"
        }`}
        onClick={() => {
          hide();
          navigate("/notifications");
        }}
        onTouchStart={(e) => {
          touchStartY.current = e.touches[0]?.clientY ?? null;
        }}
        onTouchEnd={(e) => {
          const start = touchStartY.current;
          touchStartY.current = null;
          if (start == null) return;
          const end = e.changedTouches[0]?.clientY ?? start;
          if (end - start < -36) hide();
        }}
      >
        <div className="flex items-start gap-3">
          <div
            className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-accent text-[0.75rem] font-bold text-accent-contrast"
            aria-hidden
          >
            {APP_WORDMARK_PRIMARY.slice(0, 1)}
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-baseline justify-between gap-2">
              <p className="truncate text-[0.6875rem] font-semibold uppercase tracking-wide text-muted">
                {APP_WORDMARK_PRIMARY}
              </p>
              <p className="shrink-0 text-[0.6875rem] text-muted">now</p>
            </div>
            <p className="mt-0.5 truncate text-[0.9375rem] font-semibold text-foreground">
              {toast.title}
            </p>
            <p className="mt-0.5 line-clamp-2 text-[0.875rem] text-muted">{toast.body}</p>
          </div>
        </div>
        <p className="mt-2 text-center text-[0.625rem] text-muted">
          Swipe up to dismiss · Tap to open
        </p>
      </button>
    </div>
  );
}
