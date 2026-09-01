import type { CommunityMessage } from "@/lib/community-types";
import { formatCommunityTime } from "@/lib/community-types";
import { plainTextFromMarkdown } from "@/lib/community-markdown";
import { CommunityDrawer } from "@/components/CommunityDrawer";
import { useIsDesktop } from "@/hooks/useIsDesktop";

function ThreadsList({
  threads,
  activeThreadId,
  onSelect,
}: {
  threads: { root: CommunityMessage; replyCount: number }[];
  activeThreadId?: string | null;
  onSelect: (rootId: string) => void;
}) {
  if (threads.length === 0) {
    return (
      <p className="px-4 py-4 text-sm text-muted">
        No active threads yet. Reply to a message and choose &quot;Create thread&quot; to start one.
      </p>
    );
  }

  return (
    <ul className="space-y-1 p-2">
      {threads.map(({ root, replyCount }) => (
        <li key={root.id}>
          <button
            type="button"
            onClick={() => onSelect(root.id)}
            className={`w-full rounded-lg px-3 py-2.5 text-left hover:bg-[var(--community-hover)] ${
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
  );
}

export function ThreadsPanel({
  threads,
  activeThreadId,
  onSelect,
  onClose,
  open = true,
}: {
  threads: { root: CommunityMessage; replyCount: number }[];
  activeThreadId?: string | null;
  onSelect: (rootId: string) => void;
  onClose: () => void;
  open?: boolean;
}) {
  const isDesktop = useIsDesktop();

  if (!open) return null;

  if (!isDesktop) {
    return (
      <CommunityDrawer open={open} onClose={onClose} side="right" title="Threads" width="min(20rem,92vw)">
        <ThreadsList threads={threads} activeThreadId={activeThreadId} onSelect={onSelect} />
      </CommunityDrawer>
    );
  }

  return (
    <aside className="hidden w-60 shrink-0 flex-col border-l border-[var(--community-border)] bg-[var(--community-panel)] min-h-0 md:flex">
      <div className="flex h-12 shrink-0 items-center justify-between border-b border-[var(--community-border)] px-3">
        <h3 className="text-sm font-semibold text-foreground">Threads</h3>
        <button
          type="button"
          onClick={onClose}
          className="rounded px-2 py-1 text-xs text-muted hover:bg-[var(--community-hover)] hover:text-foreground"
        >
          Close
        </button>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto">
        <ThreadsList threads={threads} activeThreadId={activeThreadId} onSelect={onSelect} />
      </div>
    </aside>
  );
}
