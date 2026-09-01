import type { CommunityMessage } from "@/lib/community-types";
import { formatCommunityTime } from "@/lib/community-types";
import { plainTextFromMarkdown } from "@/lib/community-markdown";

export function ThreadsPanel({
  threads,
  activeThreadId,
  onSelect,
  onClose,
}: {
  threads: { root: CommunityMessage; replyCount: number }[];
  activeThreadId?: string | null;
  onSelect: (rootId: string) => void;
  onClose: () => void;
}) {
  return (
    <aside className="hidden w-60 shrink-0 flex-col border-l border-[var(--community-border)] bg-[var(--community-panel)] min-h-0 md:flex">
      <div className="flex h-12 shrink-0 items-center justify-between border-b border-[var(--community-border)] px-3">
        <h3 className="text-sm font-semibold text-foreground">Threads</h3>
        <button
          type="button"
          onClick={onClose}
          className="text-xs text-muted hover:text-foreground"
        >
          Close
        </button>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto p-2">
        {threads.length === 0 ? (
          <p className="px-2 py-4 text-sm text-muted">
            No active threads yet. Reply to a message and choose &quot;Create thread&quot; to start one.
          </p>
        ) : (
          <ul className="space-y-1">
            {threads.map(({ root, replyCount }) => (
              <li key={root.id}>
                <button
                  type="button"
                  onClick={() => onSelect(root.id)}
                  className={`w-full rounded-lg px-2 py-2 text-left hover:bg-[var(--community-hover)] ${
                    activeThreadId === root.id ? "bg-[var(--community-channel-active)]" : ""
                  }`}
                >
                  <p className="truncate text-sm font-medium text-foreground">
                    {plainTextFromMarkdown(root.body).slice(0, 48) || "Thread"}
                  </p>
                  <p className="mt-0.5 text-xs text-muted">
                    {root.authorName || "Member"} · {replyCount} repl{replyCount === 1 ? "y" : "ies"} ·{" "}
                    {formatCommunityTime(root.createdAt)}
                  </p>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </aside>
  );
}
