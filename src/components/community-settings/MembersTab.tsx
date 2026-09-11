import { useEffect, useMemo, useState } from "react";
import {
  assignServerMemberRole,
  banServerMember,
  kickServerMember,
} from "@/lib/community";
import { listServerTags, setMemberTags } from "@/lib/community-tags";
import type {
  CommunityServerMember,
  CommunityServerRole,
  CommunityServerTag,
} from "@/lib/community-types";
import { roleColorStyle, roleColorTextStyle } from "@/lib/role-color";
import { TagIcon } from "@/components/community-settings/TagsPanel";
import { Button } from "@/components/Button";
import { EmptyState } from "@/components/layout";

export function MembersTab({
  serverId,
  members,
  roles,
  currentUserId,
  actorRole,
  canManageServer = false,
  onChanged,
  onError,
}: {
  serverId: string;
  members: CommunityServerMember[];
  roles: CommunityServerRole[];
  currentUserId: string;
  actorRole?: CommunityServerRole | null;
  /** True for platform owners / anyone who can open server settings. */
  canManageServer?: boolean;
  onChanged: () => Promise<void>;
  onError: (msg: string) => void;
}) {
  const [query, setQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [busyId, setBusyId] = useState<string | null>(null);
  const [tags, setTags] = useState<CommunityServerTag[]>([]);
  const [tagDraft, setTagDraft] = useState<Record<string, string[]>>({});

  const canKick = Boolean(
    canManageServer ||
      actorRole?.canManageServer ||
      actorRole?.canModerate ||
      actorRole?.canKickMembers,
  );
  const canBan = Boolean(
    canManageServer ||
      actorRole?.canManageServer ||
      actorRole?.canModerate ||
      actorRole?.canBanMembers,
  );
  const canAssignRoles = Boolean(
    canManageServer || actorRole?.canManageServer || actorRole?.canModerate,
  );
  const canAssignTags = canAssignRoles;

  useEffect(() => {
    void listServerTags(serverId)
      .then(setTags)
      .catch(() => setTags([]));
  }, [serverId]);

  useEffect(() => {
    const next: Record<string, string[]> = {};
    for (const m of members) {
      next[m.userId] = (m.tags ?? []).map((t) => t.id);
    }
    setTagDraft(next);
  }, [members]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return members.filter((m) => {
      const label = (m.displayName || m.communityUsername || "").toLowerCase();
      return (
        (!q || label.includes(q) || m.userId.includes(q)) &&
        (roleFilter === "all" || m.roleId === roleFilter)
      );
    });
  }, [members, query, roleFilter]);

  if (members.length === 0) {
    return <EmptyState title="No members" description="Members appear here once they join." />;
  }

  return (
    <div className="max-w-2xl space-y-4">
      <p className="text-[0.875rem] text-muted">
        {members.length} member{members.length === 1 ? "" : "s"} · roles, tags, kick, or ban.
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
          const selectedTagIds = tagDraft[m.userId] ?? [];

          return (
            <li
              key={m.userId}
              className="flex flex-col gap-3 rounded-[var(--radius-group)] bg-surface px-3 py-3 shadow-sm ring-1 ring-black/[0.04] dark:ring-white/[0.06]"
            >
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
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
                      <span className="text-muted">
                        {" "}
                        · joined {new Date(m.joinedAt).toLocaleDateString()}
                      </span>
                    </p>
                  </div>
                </div>

                {!isSelf && (canAssignRoles || canKick || canBan) && (
                  <div className="flex flex-wrap items-center gap-2">
                    {canAssignRoles && (
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
                    )}
                    {canKick && (
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
                    )}
                    {canBan && (
                      <Button
                        size="sm"
                        variant="danger"
                        disabled={busyId === m.userId}
                        onClick={async () => {
                          const reason = prompt(`Ban ${label}? Optional reason:`) ?? "";
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
                    )}
                  </div>
                )}
              </div>

              {canAssignTags && tags.length > 0 && (
                <div className="border-t border-black/[0.06] pt-2 dark:border-white/[0.08]">
                  <p className="mb-1.5 text-[0.75rem] font-medium text-muted">Profile tags</p>
                  <div className="flex flex-wrap gap-2">
                    {tags.map((tag) => {
                      const checked = selectedTagIds.includes(tag.id);
                      return (
                        <label
                          key={tag.id}
                          className={`inline-flex cursor-pointer items-center gap-1.5 rounded-full px-2.5 py-1 text-[0.75rem] ring-1 transition ${
                            checked
                              ? "bg-accent/10 font-medium ring-accent"
                              : "ring-black/10 hover:bg-fill dark:ring-white/15"
                          }`}
                        >
                          <input
                            type="checkbox"
                            className="sr-only"
                            checked={checked}
                            disabled={busyId === m.userId}
                            onChange={() => {
                              setTagDraft((prev) => {
                                const cur = prev[m.userId] ?? [];
                                return {
                                  ...prev,
                                  [m.userId]: checked
                                    ? cur.filter((id) => id !== tag.id)
                                    : [...cur, tag.id],
                                };
                              });
                            }}
                          />
                          <TagIcon tag={tag} />
                          <span style={roleColorTextStyle(tag.color)}>{tag.name}</span>
                        </label>
                      );
                    })}
                  </div>
                  <Button
                    size="sm"
                    className="mt-2"
                    disabled={busyId === m.userId}
                    onClick={async () => {
                      setBusyId(m.userId);
                      onError("");
                      try {
                        await setMemberTags(serverId, m.userId, tagDraft[m.userId] ?? []);
                        await onChanged();
                      } catch (err) {
                        onError(err instanceof Error ? err.message : "Could not update tags");
                      } finally {
                        setBusyId(null);
                      }
                    }}
                  >
                    Save tags
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
