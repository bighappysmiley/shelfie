import { useRegisterSW } from "virtual:pwa-register/react";
import { APP_WORDMARK_PRIMARY } from "@/lib/brand";

export function UpdateBanner() {
  const {
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    immediate: true,
    onRegisteredSW(_swUrl, registration) {
      if (!registration) return;

      // If a waiting worker already exists (common on desktop with stale cache), prompt now.
      if (registration.waiting) {
        setNeedRefresh(true);
      }

      const check = () => {
        void registration.update();
      };

      check();
      window.setInterval(check, 30_000);
      window.addEventListener("focus", check);
      document.addEventListener("visibilitychange", () => {
        if (document.visibilityState === "visible") check();
      });
    },
  });

  if (!needRefresh) return null;

  return (
    <div
      className="safe-top sticky top-0 z-[60] border-b border-hairline bg-accent px-4 py-3 text-accent-contrast"
      role="status"
    >
      <div className="mx-auto flex max-w-5xl items-center justify-between gap-3 lg:max-w-6xl">
        <p className="text-[0.9375rem] font-medium leading-snug">
          There&apos;s an update to {APP_WORDMARK_PRIMARY}. Refresh to get the latest version.
        </p>
        <div className="flex shrink-0 items-center gap-2">
          <button
            type="button"
            className="rounded-[var(--radius-control)] px-2 py-1.5 text-[0.875rem] text-accent-contrast/80 hover:text-accent-contrast"
            onClick={() => setNeedRefresh(false)}
          >
            Later
          </button>
          <button
            type="button"
            className="rounded-[var(--radius-control)] bg-accent-contrast px-3 py-1.5 text-[0.875rem] font-semibold text-accent"
            onClick={() => void updateServiceWorker(true)}
          >
            Refresh
          </button>
        </div>
      </div>
    </div>
  );
}
