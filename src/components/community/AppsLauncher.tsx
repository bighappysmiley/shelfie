import { CommunityPopover } from "@/components/community/discord-ui";
import { IconClock, IconWebhook } from "@/components/Icons";

export type AppLauncherItem = {
  id: string;
  name: string;
  description?: string;
  icon?: "timestamp" | "webhook" | "bot";
  onClick: () => void;
};

function AppIcon({ kind }: { kind: AppLauncherItem["icon"] }) {
  if (kind === "timestamp") {
    return (
      <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent/15 text-accent">
        <IconClock size={22} />
      </span>
    );
  }
  if (kind === "webhook") {
    return (
      <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--community-channel-hover)] text-muted">
        <IconWebhook size={22} />
      </span>
    );
  }
  return (
    <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--community-channel-hover)]">
      <span className="grid grid-cols-2 gap-0.5">
        {[0, 1, 2, 3].map((i) => (
          <span key={i} className="h-2 w-2 rounded-sm bg-muted/70" />
        ))}
      </span>
    </span>
  );
}

export function AppsLauncher({
  open,
  onClose,
  anchorRef,
  items,
}: {
  open: boolean;
  onClose: () => void;
  anchorRef: React.RefObject<HTMLElement | null>;
  items: AppLauncherItem[];
}) {
  return (
    <CommunityPopover open={open} onClose={onClose} anchorRef={anchorRef} align="left">
      <div className="w-full max-w-[18rem] p-3 sm:w-72">
        <p className="mb-2 px-1 text-xs font-semibold uppercase tracking-wide text-muted">Apps</p>
        <div className="grid grid-cols-3 gap-2">
          {items.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => {
                item.onClick();
                onClose();
              }}
              className="flex flex-col items-center gap-1.5 rounded-lg p-2 text-center hover:bg-[var(--community-hover)]"
            >
              <AppIcon kind={item.icon ?? "bot"} />
              <span className="line-clamp-2 text-[0.6875rem] font-medium leading-tight text-foreground">
                {item.name}
              </span>
            </button>
          ))}
        </div>
        {items.length === 0 && (
          <p className="px-1 py-4 text-center text-sm text-muted">No apps available yet.</p>
        )}
      </div>
    </CommunityPopover>
  );
}
