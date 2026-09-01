import type { ReactNode } from "react";
import { ChannelKindGlyph } from "@/components/community/ChannelKind";
import { IconBell, IconPeople, IconPin, IconSearch, IconSettings } from "@/components/Icons";
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
      className={`rounded p-1.5 text-muted transition hover:bg-[var(--community-hover)] hover:text-foreground ${
        active ? "bg-[var(--community-hover)] text-foreground" : ""
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
    <header className="shrink-0 border-b border-[var(--community-border)]">
      <div className="flex h-12 items-center gap-2 px-4">
        <div className="flex min-w-0 flex-1 items-center gap-2">
          <ChannelKindGlyph kind={group.kind} className="h-5 w-5 shrink-0 text-muted" />
          <h2 className="truncate text-[0.9375rem] font-semibold text-foreground">{group.name}</h2>
          <span className="hidden text-[var(--community-border)] sm:inline">|</span>
          <p className="hidden min-w-0 truncate text-[0.8125rem] text-muted sm:block">
            {group.topic || group.description || KIND_LABELS[group.kind]}
          </p>
        </div>

        <div className="flex shrink-0 items-center">
          {pinnedCount > 0 && onTogglePins && (
            <ToolbarButton label="Pinned messages" onClick={onTogglePins} active={pinsOpen}>
              <IconPin size={18} />
            </ToolbarButton>
          )}
          {onToggleSearch && (
            <ToolbarButton label="Search" onClick={onToggleSearch} active={searchOpen}>
              <IconSearch size={18} />
            </ToolbarButton>
          )}
          <ToolbarButton label="Notification settings">
            <IconBell size={18} />
          </ToolbarButton>
          {onToggleMembers && memberCount > 0 && (
            <ToolbarButton label="Member list" onClick={onToggleMembers} active={membersOpen}>
              <IconPeople size={18} />
            </ToolbarButton>
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
              className="w-full rounded-md bg-[var(--community-input)] py-2 pl-9 pr-3 text-[0.875rem] outline-none ring-1 ring-white/[0.06] placeholder:text-muted/70 focus:ring-accent/40"
              autoFocus
            />
          </div>
        </div>
      )}
    </header>
  );
}
