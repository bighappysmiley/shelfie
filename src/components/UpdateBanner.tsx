import { useRegisterSW } from "virtual:pwa-register/react";
import { APP_WORDMARK_PRIMARY } from "@/lib/brand";

export function UpdateBanner() {
  const {
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    onRegisteredSW(_swUrl, registration) {
      if (!registration) return;
      // Check for updates periodically while the app is open.
      window.setInterval(() => {
        void registration.update();
      }, 60_000);
    },
  });

  if (!needRefresh) return null;

  return (
    <div
      className="safe-top sticky top-0 z-[60] border-b border-hairline bg-accent px-4 py-3 text-accent-contrast"
      role="status"
    >
      <div className="mx-auto flex max-w-3xl items-center justify-between gap-3">
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
