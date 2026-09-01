import type { ReactNode } from "react";
import { DiscordChannelIcon } from "@/components/community/DiscordIcons";
import { ToolbarDivider } from "@/components/community/discord-ui";
import { IconBell, IconPeople, IconPin, IconSearch, IconSettings, IconThreads } from "@/components/Icons";
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

export function ChannelToolbar({
  group,
  pinnedCount = 0,
  pinsOpen = false,
  onTogglePins,
  searchOpen = false,
  onToggleSearch,
  searchQuery = "",
  onSearchChange,
  membersOpen = false,
  onToggleMembers,
  memberCount = 0,
  onOpenSettings,
  canManage = false,
}: {
  group: CommunityGroup;
  pinnedCount?: number;
  pinsOpen?: boolean;
  onTogglePins?: () => void;
  searchOpen?: boolean;
  onToggleSearch?: () => void;
  searchQuery?: string;
  onSearchChange?: (q: string) => void;
  membersOpen?: boolean;
  onToggleMembers?: () => void;
  memberCount?: number;
  onOpenSettings?: () => void;
  canManage?: boolean;
}) {
  return (
    <header className="shrink-0 border-b border-[var(--community-border)] shadow-[0_1px_0_0_var(--community-border)]">
      <div className="flex h-12 items-center gap-1 px-4">
        <div className="flex min-w-0 flex-1 items-center gap-1.5">
          <DiscordChannelIcon kind={group.kind} className="h-5 w-5" />
          <h2 className="truncate text-base font-semibold text-foreground">{group.name}</h2>
          <span className="hidden text-xl leading-none text-muted sm:inline">|</span>
          <p className="hidden min-w-0 truncate text-sm text-muted sm:block">
            {group.topic || group.description || KIND_LABELS[group.kind]}
          </p>
        </div>

        <div className="flex shrink-0 items-center">
          {group.kind === "text" && (
            <ToolbarButton label="Threads">
              <IconThreads size={18} />
            </ToolbarButton>
          )}
          <ToolbarButton label="Notification settings">
            <IconBell size={18} />
          </ToolbarButton>
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
          {onToggleMembers && memberCount > 0 && (
            <ToolbarButton label="Member list" onClick={onToggleMembers} active={membersOpen}>
              <IconPeople size={18} />
            </ToolbarButton>
          )}
          {onToggleSearch && (
            <>
              <ToolbarDivider />
              <ToolbarButton label="Search" onClick={onToggleSearch} active={searchOpen}>
                <IconSearch size={18} />
              </ToolbarButton>
            </>
          )}
          {canManage && onOpenSettings && (
            <ToolbarButton label="Channel settings" onClick={onOpenSettings}>
              <IconSettings size={18} />
            </ToolbarButton>
          )}
        </div>
      </div>

      {searchOpen && onSearchChange && (
        <div className="border-t border-[var(--community-border)] px-4 py-2">
          <div className="relative">
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
        </div>
      )}
    </header>
  );
}
