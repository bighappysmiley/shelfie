import type { MentionMember, MentionRole } from "@/lib/community-mentions";
import { roleColorTextStyle } from "@/lib/role-color";

export function MentionAutocomplete({
  members,
  roles = [],
  onPickMember,
  onPickRole,
}: {
  members: MentionMember[];
  roles?: MentionRole[];
  onPickMember: (member: MentionMember) => void;
  onPickRole?: (role: MentionRole) => void;
}) {
  if (members.length === 0 && roles.length === 0) return null;

  return (
    <ul className="relative z-20 mb-2 max-h-48 overflow-y-auto rounded-lg border border-[var(--community-border)] bg-[var(--community-panel)] py-1 shadow-lg">
      {roles.map((r) => (
        <li key={r.id}>
          <button
            type="button"
            onClick={() => onPickRole?.(r)}
            className="flex w-full items-center gap-2 px-3 py-2 text-left text-[0.875rem] hover:bg-[var(--community-hover)]"
          >
            <span
              className="flex h-7 w-7 items-center justify-center rounded-full text-[0.75rem] font-bold"
              style={{ ...roleColorTextStyle(r.color), background: "var(--community-channel-hover)" }}
            >
              @
            </span>
            <span className="min-w-0 truncate" style={roleColorTextStyle(r.color)}>
              {r.name}
              <span className="ml-1 text-muted">role</span>
            </span>
          </button>
        </li>
      ))}
      {members.map((m) => (
        <li key={m.userId}>
          <button
            type="button"
            onClick={() => onPickMember(m)}
            className="flex w-full items-center gap-2 px-3 py-2 text-left text-[0.875rem] hover:bg-[var(--community-hover)]"
          >
            <span className="flex h-7 w-7 items-center justify-center rounded-full bg-accent/20 text-[0.75rem] font-semibold text-accent">
              {m.label.slice(0, 1).toUpperCase()}
            </span>
            <span className="min-w-0 truncate">
              {m.label}
              {m.username && <span className="text-muted"> @{m.username}</span>}
            </span>
          </button>
        </li>
      ))}
    </ul>
  );
}
