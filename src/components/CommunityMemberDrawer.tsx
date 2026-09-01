import type { CommunityServerMember } from "@/lib/community-types";
import type { CommunityProfile } from "@/lib/community-types";
import { communityAuthorLabel } from "@/lib/community-identity";
import { roleColorStyle } from "@/lib/role-color";
import { CommunityDrawer } from "@/components/CommunityDrawer";
import { CommunityAvatar } from "@/components/community/CommunityAvatar";

export function CommunityMemberDrawer({
  open,
  onClose,
  members,
  memberProfiles,
  onOpenProfile,
}: {
  open: boolean;
  onClose: () => void;
  members: CommunityServerMember[];
  memberProfiles?: Map<string, CommunityProfile>;
  onOpenProfile?: (target: { userId?: string; username?: string | null }) => void;
}) {
  const grouped = members.reduce<Map<string, CommunityServerMember[]>>((map, m) => {
    const list = map.get(m.roleName) ?? [];
    list.push(m);
    map.set(m.roleName, list);
    return map;
  }, new Map());

  const entries = [...grouped.entries()].sort(
    (a, b) => (a[1][0]?.rolePosition ?? 100) - (b[1][0]?.rolePosition ?? 100),
  );

  return (
    <CommunityDrawer open={open} onClose={onClose} side="right" title={`Members — ${members.length}`} width="min(16rem,80vw)">
      <div className="px-2 py-3">
        {entries.map(([roleName, roleMembers]) => (
          <div key={roleName} className="mb-4">
            <p className="mb-1 px-2 text-[0.6875rem] font-bold uppercase tracking-wider text-muted">
              {roleName} — {roleMembers.length}
            </p>
            <ul className="space-y-0.5">
              {roleMembers.map((m) => {
                const label = communityAuthorLabel(
                  { communityUsername: m.communityUsername, displayName: m.displayName },
                  null,
                );
                return (
                  <li key={m.userId}>
                    <button
                      type="button"
                      onClick={() => {
                        onOpenProfile?.({ userId: m.userId, username: m.communityUsername });
                        onClose();
                      }}
                      className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left hover:bg-[var(--community-hover)]"
                    >
                      <CommunityAvatar
                        profile={memberProfiles?.get(m.userId)}
                        fallbackName={label}
                        size="sm"
                        style={roleColorStyle(m.roleColor)}
                      />
                      <span className="min-w-0 truncate text-[0.875rem]">{label}</span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
        {members.length === 0 && <p className="px-2 text-[0.8125rem] text-muted">No members yet.</p>}
      </div>
    </CommunityDrawer>
  );
}
