import { useMemo, useState } from "react";
import { CommunityAvatar } from "@/components/community/CommunityAvatar";
import { ChatAuthorBadge } from "@/components/community/ChatAuthorBadge";
import { PresenceDot } from "@/components/community/discord-ui";
import { IconSearch } from "@/components/Icons";
import { isAppOwnerUser } from "@/lib/app-owner";
import { communityAuthorLabel } from "@/lib/community-identity";
import type { CommunityProfile, CommunityServerMember } from "@/lib/community-types";
import { roleColorTextStyle } from "@/lib/role-color";

function MemberRow({
  member,
  profile,
  serverBoosters,
  appOwnerUserIds,
  online,
  onOpenProfile,
}: {
  member: CommunityServerMember;
  profile?: CommunityProfile;
  serverBoosters?: Set<string>;
  appOwnerUserIds: Set<string>;
  online: boolean;
  onOpenProfile?: (target: { userId?: string; username?: string | null }) => void;
}) {
  const label = communityAuthorLabel(
    { communityUsername: member.communityUsername, displayName: member.displayName },
    null,
  );
  const colorStyle = member.roleColor ? roleColorTextStyle(member.roleColor) : undefined;

  return (
    <button
      type="button"
      onClick={() => onOpenProfile?.({ userId: member.userId, username: member.communityUsername })}
      className="flex w-full items-center gap-2 rounded px-2 py-1.5 text-left hover:bg-[var(--community-hover)]"
    >
      <span className="relative shrink-0">
        <CommunityAvatar
          profile={profile}
          fallbackName={label}
          size="sm"
          isServerBooster={serverBoosters?.has(member.userId)}
        />
        <PresenceDot status={online ? "online" : "offline"} />
      </span>
      <span className="flex min-w-0 flex-1 items-center gap-1 truncate text-base" style={colorStyle}>
        <span className="truncate">{label}</span>
        {isAppOwnerUser(member.userId, appOwnerUserIds) && <ChatAuthorBadge isAppOwner />}
      </span>
    </button>
  );
}

function MemberGroup({
  title,
  members,
  memberProfiles,
  serverBoosters,
  appOwnerUserIds,
  onlineUserIds,
  onOpenProfile,
}: {
  title: string;
  members: CommunityServerMember[];
  memberProfiles?: Map<string, CommunityProfile>;
  serverBoosters?: Set<string>;
  appOwnerUserIds: Set<string>;
  onlineUserIds: Set<string>;
  onOpenProfile?: (target: { userId?: string; username?: string | null }) => void;
}) {
  const grouped = useMemo(() => {
    const map = new Map<string, CommunityServerMember[]>();
    for (const m of members) {
      const list = map.get(m.roleName) ?? [];
      list.push(m);
      map.set(m.roleName, list);
    }
    return [...map.entries()].sort(
      (a, b) => (a[1][0]?.rolePosition ?? 100) - (b[1][0]?.rolePosition ?? 100),
    );
  }, [members]);

  if (members.length === 0) return null;

  return (
    <div className="mb-3">
      <p className="mb-1 px-2 text-xs font-semibold uppercase tracking-wide text-muted">
        {title} — {members.length}
      </p>
      {grouped.map(([roleName, roleMembers]) => (
        <div key={roleName} className="mb-2">
          <p className="mb-0.5 px-2 text-xs font-semibold uppercase tracking-wide text-muted/80">
            {roleName} — {roleMembers.length}
          </p>
          {roleMembers.map((m) => (
            <MemberRow
              key={m.userId}
              member={m}
              profile={memberProfiles?.get(m.userId)}
              serverBoosters={serverBoosters}
              appOwnerUserIds={appOwnerUserIds}
              online={onlineUserIds.has(m.userId)}
              onOpenProfile={onOpenProfile}
            />
          ))}
        </div>
      ))}
    </div>
  );
}

export function MemberListPanel({
  members,
  memberProfiles,
  serverBoosters,
  appOwnerUserIds = new Set<string>(),
  onlineUserIds = new Set<string>(),
  onOpenProfile,
  showSearch = true,
}: {
  members: CommunityServerMember[];
  memberProfiles?: Map<string, CommunityProfile>;
  serverBoosters?: Set<string>;
  appOwnerUserIds?: Set<string>;
  onlineUserIds?: Set<string>;
  onOpenProfile?: (target: { userId?: string; username?: string | null }) => void;
  showSearch?: boolean;
}) {
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return members;
    return members.filter((m) => {
      const label = m.displayName || m.communityUsername || "";
      return label.toLowerCase().includes(q);
    });
  }, [members, query]);

  const onlineMembers = useMemo(
    () => filtered.filter((m) => onlineUserIds.has(m.userId)),
    [filtered, onlineUserIds],
  );
  const offlineMembers = useMemo(
    () => filtered.filter((m) => !onlineUserIds.has(m.userId)),
    [filtered, onlineUserIds],
  );

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      {showSearch && (
        <div className="shrink-0 px-2 pb-2 pt-3">
          <label className="relative block">
            <IconSearch
              size={14}
              className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-muted"
            />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search"
              className="w-full rounded bg-[var(--community-input)] py-1.5 pl-8 pr-2 text-sm text-foreground outline-none placeholder:text-muted"
            />
          </label>
        </div>
      )}
      <div className="min-h-0 flex-1 overflow-y-auto px-2 pb-3">
        <MemberGroup
          title="Online"
          members={onlineMembers}
          memberProfiles={memberProfiles}
          serverBoosters={serverBoosters}
          appOwnerUserIds={appOwnerUserIds}
          onlineUserIds={onlineUserIds}
          onOpenProfile={onOpenProfile}
        />
        <MemberGroup
          title="Offline"
          members={offlineMembers}
          memberProfiles={memberProfiles}
          serverBoosters={serverBoosters}
          appOwnerUserIds={appOwnerUserIds}
          onlineUserIds={onlineUserIds}
          onOpenProfile={onOpenProfile}
        />
        {filtered.length === 0 && (
          <p className="px-2 py-4 text-sm text-muted">No members match your search.</p>
        )}
      </div>
    </div>
  );
}
