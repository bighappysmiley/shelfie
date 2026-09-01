import { useRef, useState, type ReactNode } from "react";
import { CommunityPopover, PopoverItem } from "@/components/community/discord-ui";
import { IconBell } from "@/components/Icons";
import {
  CHANNEL_NOTIFICATION_LABELS,
  getChannelNotificationLevel,
  setChannelNotificationLevel,
  type ChannelNotificationLevel,
} from "@/lib/community-notification-prefs";

function ToolbarButton({
  label,
  onClick,
  active = false,
  muted = false,
  children,
}: {
  label: string;
  onClick?: () => void;
  active?: boolean;
  muted?: boolean;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      title={label}
      className={`rounded p-1.5 transition hover:bg-[var(--community-channel-hover)] hover:text-foreground ${
        active ? "text-foreground" : muted ? "text-muted/60" : "text-muted"
      }`}
    >
      {children}
    </button>
  );
}

export function ChannelNotificationButton({
  userId,
  channelId,
}: {
  userId: string;
  channelId: string;
}) {
  const btnRef = useRef<HTMLButtonElement>(null);
  const [open, setOpen] = useState(false);
  const [level, setLevel] = useState<ChannelNotificationLevel>(() =>
    getChannelNotificationLevel(userId, channelId),
  );

  const select = (next: ChannelNotificationLevel) => {
    setChannelNotificationLevel(userId, channelId, next);
    setLevel(next);
    setOpen(false);
  };

  const label =
    level === "mute"
      ? "Channel muted"
      : level === "mentions"
        ? "Only @mentions"
        : "All messages";

  return (
    <>
      <ToolbarButton
        label={`Notification settings — ${label}`}
        onClick={() => setOpen((v) => !v)}
        active={open}
        muted={level === "mute"}
      >
        <span className="relative inline-flex">
          <IconBell size={18} />
          {level === "mute" && (
            <span
              className="pointer-events-none absolute inset-0 flex items-center justify-center text-[0.625rem] font-bold text-destructive"
              aria-hidden
            >
              /
            </span>
          )}
        </span>
      </ToolbarButton>
      <CommunityPopover open={open} onClose={() => setOpen(false)} anchorRef={btnRef} align="right">
        <p className="px-3 py-2 text-[0.6875rem] font-bold uppercase tracking-wide text-muted">
          Notifications
        </p>
        {(["all", "mentions", "mute"] as const).map((option) => (
          <PopoverItem key={option} onClick={() => select(option)}>
            <span className="flex w-full items-center justify-between gap-2">
              <span>{CHANNEL_NOTIFICATION_LABELS[option]}</span>
              {level === option && <span className="text-accent">✓</span>}
            </span>
          </PopoverItem>
        ))}
      </CommunityPopover>
    </>
  );
}
