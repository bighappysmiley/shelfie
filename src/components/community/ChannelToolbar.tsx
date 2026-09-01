import type { ReactNode } from "react";
import { DiscordChannelIcon } from "@/components/community/DiscordIcons";
import { ChannelNotificationButton } from "@/components/community/ChannelNotificationPopover";
import { ToolbarDivider } from "@/components/community/discord-ui";
import { IconPeople, IconPin, IconSearch, IconSettings, IconThreads } from "@/components/Icons";
import { KIND_LABELS, type CommunityGroup } from "@/lib/community-types";

function ToolbarButton({
  label,
  onClick,
  active = false,
  children,
}: {
  label: string;
  onClick?: () => void;
  active?: boolean;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      title={label}
      className={`rounded p-1.5 text-muted transition hover:bg-[var(--community-channel-hover)] hover:text-foreground ${
        active ? "text-foreground" : ""
      }`}
    >
      {children}
    </button>
  );
}

function ChannelSearchBar({
  group,
  searchQuery,
  onSearchChange,
  searchResultCount,
  onSearchPrev,
  onSearchNext,
}: {
  group: CommunityGroup;
  searchQuery: string;
  onSearchChange: (q: string) => void;
  searchResultCount?: number;
  onSearchPrev?: () => void;
  onSearchNext?: () => void;
}) {
  return (
    <div className="border-t border-[var(--community-border)] px-3 py-2 md:px-4">
      <div className="relative flex items-center gap-2">
        <div className="relative min-w-0 flex-1">
          <IconSearch
            size={16}
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted"
          />
          <input
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder={`Search #${group.name}`}
            className="w-full rounded-md bg-[var(--community-input)] py-2 pl-9 pr-3 text-[0.875rem] outline-none ring-1 ring-[var(--community-border)] placeholder:text-muted/70 focus:ring-accent/40"
            autoFocus
          />
        </div>
        {searchResultCount !== undefined && (
          <span className="shrink-0 text-xs text-muted">{searchResultCount} found</span>
        )}
        {onSearchPrev && searchResultCount !== undefined && searchResultCount > 0 && (
          <button
            type="button"
            onClick={onSearchPrev}
            className="shrink-0 rounded px-2 py-1 text-xs text-muted hover:bg-[var(--community-hover)] hover:text-foreground"
          >
            Prev
          </button>
        )}
        {onSearchNext && searchResultCount !== undefined && searchResultCount > 0 && (
          <button
            type="button"
            onClick={onSearchNext}
            className="shrink-0 rounded px-2 py-1 text-xs text-muted hover:bg-[var(--community-hover)] hover:text-foreground"
          >
            Next
          </button>
        )}
      </div>
    </div>
  );
}

export function ChannelToolbar({
  group,
  variant = "desktop",
  pinnedCount = 0,
  pinsOpen = false,
  onTogglePins,
  searchOpen = false,
  onToggleSearch,
  searchQuery = "",
  onSearchChange,
  searchResultCount,
  onSearchNext,
  onSearchPrev,
  membersOpen = false,
  onToggleMembers,
  memberCount = 0,
  onOpenSettings,
  canManage = false,
  threadsOpen = false,
  onToggleThreads,
  userId,
}: {
  group: CommunityGroup;
  variant?: "mobile" | "desktop";
  pinnedCount?: number;
  pinsOpen?: boolean;
  onTogglePins?: () => void;
  searchOpen?: boolean;
  onToggleSearch?: () => void;
  searchQuery?: string;
  onSearchChange?: (q: string) => void;
  searchResultCount?: number;
  onSearchNext?: () => void;
  onSearchPrev?: () => void;
  membersOpen?: boolean;
  onToggleMembers?: () => void;
  memberCount?: number;
  onOpenSettings?: () => void;
  canManage?: boolean;
  threadsOpen?: boolean;
  onToggleThreads?: () => void;
  userId?: string;
}) {
  const isMobile = variant === "mobile";

  const actionButtons = (
    <>
      {group.kind === "text" && onToggleThreads && (
        <ToolbarButton label="Threads" onClick={onToggleThreads} active={threadsOpen}>
          <IconThreads size={18} />
        </ToolbarButton>
      )}
      {userId && (
        <ChannelNotificationButton userId={userId} channelId={group.id} />
      )}
      {pinnedCount > 0 && onTogglePins && (
        <ToolbarButton label="Pinned messages" onClick={onTogglePins} active={pinsOpen}>
          <span className="relative inline-flex">
            <IconPin size={18} />
            <span className="absolute -right-1.5 -top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[0.625rem] font-bold leading-none text-white">
              {pinnedCount > 9 ? "9+" : pinnedCount}
            </span>
          </span>
        </ToolbarButton>
      )}
      {!isMobile && onToggleMembers && memberCount > 0 && (
        <ToolbarButton label="Member list" onClick={onToggleMembers} active={membersOpen}>
          <IconPeople size={18} />
        </ToolbarButton>
      )}
      {isMobile && onToggleMembers && memberCount > 0 && (
        <ToolbarButton label="Member list" onClick={onToggleMembers} active={membersOpen}>
          <IconPeople size={18} />
        </ToolbarButton>
      )}
      {isMobile && canManage && onOpenSettings && (
        <ToolbarButton label="Channel settings" onClick={onOpenSettings}>
          <IconSettings size={18} />
        </ToolbarButton>
      )}
      {onToggleSearch && (
        <>
          {!isMobile && <ToolbarDivider />}
          <ToolbarButton label="Search" onClick={onToggleSearch} active={searchOpen}>
            <IconSearch size={18} />
          </ToolbarButton>
        </>
      )}
      {!isMobile && canManage && onOpenSettings && (
        <ToolbarButton label="Channel settings" onClick={onOpenSettings}>
          <IconSettings size={18} />
        </ToolbarButton>
      )}
    </>
  );

  if (isMobile) {
    return (
      <header className="shrink-0 border-b border-[var(--community-border)] shadow-[0_1px_0_0_var(--community-border)] md:hidden">
        <div className="flex h-10 items-center justify-end gap-0.5 px-2">{actionButtons}</div>
        {searchOpen && onSearchChange && (
          <ChannelSearchBar
            group={group}
            searchQuery={searchQuery}
            onSearchChange={onSearchChange}
            searchResultCount={searchResultCount}
            onSearchPrev={onSearchPrev}
            onSearchNext={onSearchNext}
          />
        )}
      </header>
    );
  }

  return (
    <header className="hidden shrink-0 border-b border-[var(--community-border)] shadow-[0_1px_0_0_var(--community-border)] md:block">
      <div className="flex h-12 items-center gap-1 px-4">
        <div className="flex min-w-0 flex-1 items-center gap-1.5">
          <DiscordChannelIcon kind={group.kind} className="h-5 w-5" />
          <h2 className="truncate text-base font-semibold text-foreground">{group.name}</h2>
          <span className="hidden text-xl leading-none text-muted sm:inline">|</span>
          <p className="hidden min-w-0 truncate text-sm text-muted sm:block">
            {group.topic || group.description || KIND_LABELS[group.kind]}
          </p>
        </div>
        <div className="flex shrink-0 items-center">{actionButtons}</div>
      </div>
      {searchOpen && onSearchChange && (
        <ChannelSearchBar
          group={group}
          searchQuery={searchQuery}
          onSearchChange={onSearchChange}
          searchResultCount={searchResultCount}
          onSearchPrev={onSearchPrev}
          onSearchNext={onSearchNext}
        />
      )}
    </header>
  );
}
