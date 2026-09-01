import { IconPeople, IconSettings } from "@/components/Icons";
import { DiscordChannelIcon } from "@/components/community/DiscordIcons";

export function CommunityChatHeader({
  serverName,
  channelName,
  canManageChannel = false,
  memberCount,
  onOpenChannels,
  onOpenMembers,
  onOpenChannelSettings,
}: {
  serverName: string;
  channelName?: string;
  canManageChannel?: boolean;
  memberCount: number;
  onOpenChannels: () => void;
  onOpenMembers: () => void;
  onOpenChannelSettings?: () => void;
}) {
  const inChannel = Boolean(channelName);

  return (
    <header className="flex h-12 shrink-0 items-center gap-1 border-b border-[var(--community-border)] px-2 shadow-[0_1px_0_0_var(--community-border)] md:hidden">
      <button
        type="button"
        onClick={onOpenChannels}
        className="flex min-w-0 flex-1 items-center gap-2 rounded px-1 py-1 text-left hover:bg-[var(--community-channel-hover)]"
        aria-label="Open channels"
      >
        <DiscordChannelIcon kind="text" className="h-5 w-5" />
        <span className="min-w-0 flex-1">
          <span className="block truncate text-base font-semibold text-foreground">
            {inChannel ? channelName : serverName}
          </span>
          <span className="block truncate text-xs text-muted">
            {inChannel ? serverName : "Browse channels"}
          </span>
        </span>
      </button>
      {inChannel && canManageChannel && onOpenChannelSettings && (
        <button
          type="button"
          onClick={onOpenChannelSettings}
          className="rounded p-2 text-muted hover:bg-[var(--community-channel-hover)] hover:text-foreground"
          title="Channel settings"
          aria-label="Channel settings"
        >
          <IconSettings size={18} />
        </button>
      )}
      {memberCount > 0 && (
        <button
          type="button"
          onClick={onOpenMembers}
          className="rounded p-2 text-muted hover:bg-[var(--community-channel-hover)] hover:text-foreground"
          title="Members"
          aria-label="Members"
        >
          <IconPeople size={18} />
        </button>
      )}
    </header>
  );
}
