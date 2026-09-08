import { useState } from "react";
import { IconDots, IconPeople } from "@/components/Icons";
import { DiscordChannelIcon } from "@/components/community/DiscordIcons";
import { CommunityActionSheet } from "@/components/CommunityActionSheet";
import type { CommunityGroupKind } from "@/lib/community-types";

export function CommunityChatHeader({
  serverName,
  channelName,
  channelKind = "text",
  channelIcon,
  canManageChannel = false,
  memberCount,
  pinnedCount = 0,
  pinsOpen = false,
  searchOpen = false,
  onOpenChannels,
  onOpenMembers,
  onOpenChannelSettings,
  onToggleSearch,
  onTogglePins,
}: {
  serverName: string;
  channelName?: string;
  channelKind?: CommunityGroupKind;
  channelIcon?: string | null;
  canManageChannel?: boolean;
  memberCount: number;
  pinnedCount?: number;
  pinsOpen?: boolean;
  searchOpen?: boolean;
  userId?: string;
  channelId?: string;
  onOpenChannels: () => void;
  onOpenMembers?: () => void;
  onOpenChannelSettings?: () => void;
  onToggleSearch?: () => void;
  onTogglePins?: () => void;
}) {
  const inChannel = Boolean(channelName);
  const [moreOpen, setMoreOpen] = useState(false);

  const moreActions = [
    onToggleSearch
      ? {
          id: "search",
          label: searchOpen ? "Hide search" : "Search messages",
          onClick: () => {
            setMoreOpen(false);
            onToggleSearch();
          },
        }
      : null,
    pinnedCount > 0 && onTogglePins
      ? {
          id: "pins",
          label: pinsOpen ? "Hide pins" : `Pinned messages (${pinnedCount})`,
          onClick: () => {
            setMoreOpen(false);
            onTogglePins();
          },
        }
      : null,
    canManageChannel && onOpenChannelSettings
      ? {
          id: "settings",
          label: "Channel settings",
          onClick: () => {
            setMoreOpen(false);
            onOpenChannelSettings();
          },
        }
      : null,
  ].filter(Boolean) as { id: string; label: string; onClick: () => void }[];

  return (
    <>
      <header className="safe-top flex h-12 shrink-0 items-center gap-1 border-b border-[var(--community-border)] px-2 shadow-[0_1px_0_0_var(--community-border)] md:hidden">
        <button
          type="button"
          onClick={onOpenChannels}
          className="flex min-w-0 flex-1 items-center gap-2 rounded-lg px-2 py-1.5 text-left hover:bg-[var(--community-channel-hover)]"
          aria-label="Open channels"
        >
          <DiscordChannelIcon kind={channelKind} icon={channelIcon} className="h-5 w-5" />
          <span className="min-w-0 flex-1">
            <span className="block truncate text-base font-semibold text-foreground">
              {inChannel ? channelName : serverName}
            </span>
            <span className="block truncate text-xs text-muted">
              {inChannel ? serverName : "Browse channels"}
            </span>
          </span>
        </button>

        {memberCount > 0 && onOpenMembers && (
          <button
            type="button"
            onClick={onOpenMembers}
            className="rounded-lg p-2 text-muted hover:bg-[var(--community-channel-hover)] hover:text-foreground"
            title="Members"
            aria-label="Members"
          >
            <IconPeople size={18} />
          </button>
        )}

        {inChannel && moreActions.length > 0 && (
          <button
            type="button"
            onClick={() => setMoreOpen(true)}
            className="rounded-lg p-2 text-muted hover:bg-[var(--community-channel-hover)] hover:text-foreground"
            title="More"
            aria-label="More channel actions"
          >
            <IconDots size={18} />
          </button>
        )}
      </header>

      <CommunityActionSheet
        open={moreOpen}
        onClose={() => setMoreOpen(false)}
        title="Channel actions"
        actions={moreActions}
      />
    </>
  );
}
