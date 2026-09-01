import { useEffect, useState } from "react";
import { IconSearch } from "@/components/Icons";
import { CommunityModal } from "@/components/CommunityModal";
import { searchServerMessages, type ServerMessageSearchHit } from "@/lib/community";
import { formatCommunityTime } from "@/lib/community-types";

export function ServerSearchModal({
  open,
  onClose,
  serverName,
  channelIds,
  channelNames,
  onJumpTo,
}: {
  open: boolean;
  onClose: () => void;
  serverName: string;
  channelIds: string[];
  channelNames: Map<string, string>;
  onJumpTo: (channelId: string, messageId: string) => void;
}) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<ServerMessageSearchHit[]>([]);
  const [searching, setSearching] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!open) {
      setQuery("");
      setResults([]);
      setError("");
    }
  }, [open]);

  useEffect(() => {
    const q = query.trim();
    if (!open || q.length < 2) {
      setResults([]);
      return;
    }

    const timer = window.setTimeout(() => {
      setSearching(true);
      setError("");
      void searchServerMessages(channelIds, channelNames, q, 40)
        .then(setResults)
        .catch((err) => {
          setError(err instanceof Error ? err.message : "Search failed");
          setResults([]);
        })
        .finally(() => setSearching(false));
    }, 300);

    return () => window.clearTimeout(timer);
  }, [open, query, channelIds, channelNames]);

  return (
    <CommunityModal
      open={open}
      onClose={onClose}
      title={`Search ${serverName}`}
      tone="community"
      maxWidth="max-w-xl"
    >
      <label className="relative block">
        <IconSearch
          size={16}
          className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted"
        />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search messages across all channels"
          className="w-full rounded-lg bg-[var(--community-input)] py-2.5 pl-9 pr-3 text-[0.9375rem] outline-none ring-1 ring-[var(--community-border)] placeholder:text-muted/70 focus:ring-accent/40"
          autoFocus
        />
      </label>

      <div className="mt-4 min-h-[12rem]">
        {query.trim().length < 2 ? (
          <p className="text-[0.875rem] text-muted">Type at least 2 characters to search.</p>
        ) : searching ? (
          <p className="text-[0.875rem] text-muted">Searching…</p>
        ) : error ? (
          <p className="text-[0.875rem] text-destructive">{error}</p>
        ) : results.length === 0 ? (
          <p className="text-[0.875rem] text-muted">No messages found.</p>
        ) : (
          <ul className="space-y-1">
            {results.map((hit) => (
              <li key={hit.message.id}>
                <button
                  type="button"
                  onClick={() => {
                    onJumpTo(hit.channelId, hit.message.id);
                    onClose();
                  }}
                  className="flex w-full flex-col rounded-lg px-3 py-2 text-left hover:bg-[var(--community-hover)]"
                >
                  <span className="text-[0.75rem] text-muted">
                    #{hit.channelName} · {formatCommunityTime(hit.message.createdAt)}
                    {hit.message.authorName ? ` · ${hit.message.authorName}` : ""}
                  </span>
                  <span className="mt-0.5 line-clamp-2 text-[0.875rem] text-foreground">{hit.message.body}</span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </CommunityModal>
  );
}
