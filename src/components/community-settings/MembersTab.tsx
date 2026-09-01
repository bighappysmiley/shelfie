import { useMemo, useState } from "react";
import {
  assignServerMemberRole,
  banServerMember,
  kickServerMember,
} from "@/lib/community";
import type { CommunityServerMember, CommunityServerRole } from "@/lib/community-types";
import { roleColorStyle, roleColorTextStyle } from "@/lib/role-color";
import { Button } from "@/components/Button";
import { EmptyState } from "@/components/layout";

export function MembersTab({
  serverId,
  members,
  roles,
  currentUserId,
  onChanged,
  onError,
}: {
  serverId: string;
  members: CommunityServerMember[];
  roles: CommunityServerRole[];
  currentUserId: string;
  onChanged: () => Promise<void>;
  onError: (msg: string) => void;
}) {
  const [query, setQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState<string>("all");
  const [busyId, setBusyId] = useState<string | null>(null);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return members.filter((m) => {
      const label = (m.displayName || m.communityUsername || "").toLowerCase();
      const matchesQuery = !q || label.includes(q) || m.userId.includes(q);
      const matchesRole = roleFilter === "all" || m.roleId === roleFilter;
      return matchesQuery && matchesRole;
    });
  }, [members, query, roleFilter]);

  if (members.length === 0) {
    return <EmptyState title="No members" description="Members appear here once they join." />;
  }

  return (
    <div className="max-w-2xl space-y-4">
      <p className="text-[0.875rem] text-muted">
        {members.length} member{members.length === 1 ? "" : "s"} · search, change roles, kick, or ban.
      </p>

      <div className="flex flex-col gap-2 sm:flex-row">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search members…"
          className="min-w-0 flex-1 rounded-[var(--radius-control)] bg-fill px-3 py-2 text-[0.9375rem]"
        />
        <select
          value={roleFilter}
          onChange={(e) => setRoleFilter(e.target.value)}
          className="rounded-[var(--radius-control)] bg-fill px-3 py-2 text-[0.9375rem]"
        >
          <option value="all">All roles</option>
          {roles.map((r) => (
            <option key={r.id} value={r.id}>
              {r.name}
            </option>
          ))}
        </select>
      </div>

      <ul className="space-y-2">
        {filtered.map((m) => {
          const label = m.displayName || m.communityUsername || "Member";
          const isSelf = m.userId === currentUserId;
          return (
            <li
              key={m.userId}
              className="flex flex-col gap-3 rounded-[var(--radius-group)] bg-surface px-3 py-3 shadow-sm ring-1 ring-black/[0.04] dark:ring-white/[0.06] sm:flex-row sm:items-center"
            >
              <div className="flex min-w-0 flex-1 items-center gap-3">
                <div
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-sm font-semibold text-white"
                  style={roleColorStyle(m.roleColor)}
                >
                  {label[0]?.toUpperCase()}
                </div>
                <div className="min-w-0">
                  <p className="truncate font-medium">
                    {label}
                    {isSelf ? " (you)" : ""}
                  </p>
                  <p className="text-[0.75rem]">
                    <span style={roleColorTextStyle(m.roleColor)}>{m.roleName}</span>
                    <span className="text-muted"> · joined {new Date(m.joinedAt).toLocaleDateString()}</span>
                  </p>
                </div>
              </div>

              {!isSelf && (
                <div className="flex flex-wrap items-center gap-2">
                  <select
                    value={m.roleId ?? ""}
                    disabled={busyId === m.userId}
                    onChange={async (e) => {
                      setBusyId(m.userId);
                      onError("");
                      try {
                        await assignServerMemberRole(serverId, m.userId, e.target.value);
                        await onChanged();
                      } catch (err) {
                        onError(err instanceof Error ? err.message : "Could not update role");
                      } finally {
                        setBusyId(null);
                      }
                    }}
                    className="rounded-[var(--radius-control)] bg-fill px-2 py-1.5 text-[0.8125rem]"
                  >
                    {roles.map((r) => (
                      <option key={r.id} value={r.id}>
                        {r.name}
                      </option>
                    ))}
                  </select>
                  <Button
                    size="sm"
                    variant="ghost"
                    disabled={busyId === m.userId}
                    onClick={async () => {
                      if (!confirm(`Kick ${label} from this server?`)) return;
                      setBusyId(m.userId);
                      onError("");
                      try {
                        await kickServerMember(serverId, m.userId);
                        await onChanged();
                      } catch (err) {
                        onError(err instanceof Error ? err.message : "Could not kick");
                      } finally {
                        setBusyId(null);
                      }
                    }}
                  >
                    Kick
                  </Button>
                  <Button
                    size="sm"
                    variant="danger"
                    disabled={busyId === m.userId}
                    onClick={async () => {
                      const reason = prompt(`Ban ${label}? Optional reason:`) ?? "";
                      if (reason === null) return;
                      setBusyId(m.userId);
                      onError("");
                      try {
                        await banServerMember(serverId, m.userId, reason);
                        await onChanged();
                      } catch (err) {
                        onError(err instanceof Error ? err.message : "Could not ban");
                      } finally {
                        setBusyId(null);
                      }
                    }}
                  >
                    Ban
                  </Button>
                </div>
              )}
            </li>
          );
        })}
      </ul>

      {filtered.length === 0 && (
        <p className="text-center text-[0.875rem] text-muted">No members match your filters.</p>
      )}
    </div>
  );
}
