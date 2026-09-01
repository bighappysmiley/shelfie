import { unbanServerMember } from "@/lib/community";
import type { CommunityServerAuditEntry, CommunityServerBan } from "@/lib/community-types";
import { Button } from "@/components/Button";
import { EmptyState } from "@/components/layout";

const ACTION_LABELS: Record<string, string> = {
  member_role_update: "Changed member role",
  member_kick: "Kicked member",
  member_ban: "Banned member",
  member_unban: "Unbanned member",
};

export function ModerationTab({
  serverId,
  bans,
  auditLog,
  onChanged,
  onError,
}: {
  serverId: string;
  bans: CommunityServerBan[];
  auditLog: CommunityServerAuditEntry[];
  onChanged: () => Promise<void>;
  onError: (msg: string) => void;
}) {
  return (
    <div className="max-w-2xl space-y-6">
      <section>
        <h3 className="mb-2 text-[0.9375rem] font-semibold">Banned users</h3>
        {bans.length === 0 ? (
          <EmptyState title="No bans" description="Banned users cannot rejoin until unbanned." />
        ) : (
          <ul className="space-y-2">
            {bans.map((ban) => {
              const label = ban.displayName || ban.communityUsername || "User";
              return (
                <li
                  key={ban.userId}
                  className="flex items-center gap-3 rounded-[var(--radius-group)] bg-surface px-3 py-3 shadow-sm ring-1 ring-black/[0.04] dark:ring-white/[0.06]"
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium">{label}</p>
                    {ban.reason && (
                      <p className="truncate text-[0.8125rem] text-muted">{ban.reason}</p>
                    )}
                    <p className="text-[0.6875rem] text-muted">
                      {new Date(ban.createdAt).toLocaleString()}
                    </p>
                  </div>
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={async () => {
                      onError("");
                      try {
                        await unbanServerMember(serverId, ban.userId);
                        await onChanged();
                      } catch (err) {
                        onError(err instanceof Error ? err.message : "Could not unban");
                      }
                    }}
                  >
                    Unban
                  </Button>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <section>
        <h3 className="mb-2 text-[0.9375rem] font-semibold">Audit log</h3>
        {auditLog.length === 0 ? (
          <p className="text-[0.875rem] text-muted">No moderation actions recorded yet.</p>
        ) : (
          <ul className="space-y-1">
            {auditLog.map((entry) => (
              <li
                key={entry.id}
                className="rounded-lg bg-fill px-3 py-2 text-[0.8125rem]"
              >
                <p>
                  <span className="font-medium">{entry.actorName || "Someone"}</span>{" "}
                  {ACTION_LABELS[entry.action] ?? entry.action}
                  {entry.targetLabel ? `: ${entry.targetLabel}` : ""}
                </p>
                <p className="text-[0.6875rem] text-muted">
                  {new Date(entry.createdAt).toLocaleString()}
                </p>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
