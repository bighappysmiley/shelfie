import type { MentionMember } from "@/lib/community-mentions";

export function MentionAutocomplete({
  members,
  onPick,
}: {
  members: MentionMember[];
  onPick: (member: MentionMember) => void;
}) {
  if (members.length === 0) return null;

  return (
    <ul className="mb-2 max-h-40 overflow-y-auto rounded-lg border border-[var(--community-border)] bg-[var(--community-panel)] py-1 shadow-lg">
      {members.map((m) => (
        <li key={m.userId}>
          <button
            type="button"
            onClick={() => onPick(m)}
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
