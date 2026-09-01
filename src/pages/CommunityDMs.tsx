import { useCallback, useEffect, useState, type FormEvent } from "react";
import { Link, useParams } from "react-router-dom";
import { useAuth } from "@/lib/auth";
import { CommunityDiscordShell, CommunityScrollBody } from "@/components/CommunityRail";
import { FormError } from "@/components/form";
import {
  blockDmUser,
  listDmMessages,
  listMyDmThreads,
  markDmThreadRead,
  sendDmMessage,
  subscribeDmMessages,
  type DmMessage,
  type DmThreadSummary,
} from "@/lib/community-dms";
import { getCommunityProfile } from "@/lib/community-profile";
import { IconArrowLeft } from "@/components/Icons";

export function CommunityDMsPage() {
  const { threadId } = useParams<{ threadId?: string }>();
  const { user } = useAuth();
  const [threads, setThreads] = useState<DmThreadSummary[]>([]);
  const [messages, setMessages] = useState<DmMessage[]>([]);
  const [draft, setDraft] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const [otherLabel, setOtherLabel] = useState("Direct Message");
  const [otherUserId, setOtherUserId] = useState<string | null>(null);

  const refreshThreads = useCallback(async () => {
    if (!user) return;
    try {
      setThreads(await listMyDmThreads());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load messages");
    } finally {
      setLoading(false);
    }
  }, [user]);

  const loadMessages = useCallback(async () => {
    if (!threadId) return;
    const list = await listDmMessages(threadId);
    setMessages(list);
    await markDmThreadRead(threadId);
    window.dispatchEvent(new Event("community-rail-refresh"));
  }, [threadId]);

  useEffect(() => {
    void refreshThreads();
  }, [refreshThreads]);

  useEffect(() => {
    if (!threadId || !user) return;
    let cancelled = false;
    void (async () => {
      try {
        await loadMessages();
        const thread = threads.find((t) => t.threadId === threadId);
        if (thread?.otherUser?.userId) {
          setOtherUserId(thread.otherUser.userId);
          const profile = await getCommunityProfile(thread.otherUser.userId);
          if (!cancelled) {
            setOtherLabel(
              profile?.communityDisplayName ||
                profile?.displayName ||
                (profile?.communityUsername ? `@${profile.communityUsername}` : "Member"),
            );
          }
        }
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : "Could not load conversation");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [threadId, user, threads, loadMessages]);

  useEffect(() => {
    if (!threadId) return;
    return subscribeDmMessages(threadId, () => {
      void loadMessages();
      void refreshThreads();
    });
  }, [threadId, loadMessages, refreshThreads]);

  const onSend = async (e: FormEvent) => {
    e.preventDefault();
    if (!user || !threadId || !draft.trim()) return;
    setSending(true);
    setError("");
    try {
      const msg = await sendDmMessage(threadId, user.id, draft);
      setMessages((prev) => [...prev, msg]);
      setDraft("");
      void refreshThreads();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not send");
    } finally {
      setSending(false);
    }
  };

  if (!user) {
    return (
      <CommunityDiscordShell pane="dm" onAdd={() => {}}>
        <div className="p-6 text-muted">Sign in to view direct messages.</div>
      </CommunityDiscordShell>
    );
  }

  return (
    <CommunityDiscordShell pane="dm" onAdd={() => {}}>
      <div className="flex min-h-0 flex-1 overflow-hidden">
        <aside
          className={`flex shrink-0 flex-col border-r border-[var(--community-border)] bg-[var(--community-panel)] md:w-72 ${
            threadId ? "hidden md:flex md:max-w-xs md:w-72" : "w-full max-w-none"
          }`}
        >
          <div className="border-b border-[var(--community-border)] px-4 py-3">
            <h1 className="text-lg font-semibold">Direct Messages</h1>
          </div>
          <CommunityScrollBody className="p-2">
            {loading && <p className="px-2 text-sm text-muted">Loading…</p>}
            {!loading && threads.length === 0 && (
              <p className="px-2 py-4 text-sm text-muted">No conversations yet. Message someone from their profile.</p>
            )}
            {threads.map((thread) => {
              const label =
                thread.otherUser?.displayName ||
                (thread.otherUser?.username ? `@${thread.otherUser.username}` : "Member");
              const active = thread.threadId === threadId;
              return (
                <Link
                  key={thread.threadId}
                  to={`/community/dm/${thread.threadId}`}
                  className={`mb-1 block rounded-lg px-3 py-2 hover:bg-[var(--community-hover)] ${
                    active ? "bg-[var(--community-hover)]" : ""
                  }`}
                >
                  <p className="truncate text-sm font-medium">{label}</p>
                  {thread.lastMessage && (
                    <p className="truncate text-xs text-muted">{thread.lastMessage.body}</p>
                  )}
                </Link>
              );
            })}
          </CommunityScrollBody>
        </aside>

        <div
          className={`flex min-w-0 flex-1 flex-col bg-[var(--community-chat)] ${
            !threadId ? "hidden md:flex" : ""
          }`}
        >
          {!threadId ? (
            <div className="flex flex-1 items-center justify-center p-6 text-muted">
              Select a conversation or message someone from their profile.
            </div>
          ) : (
            <>
              <div className="flex items-center gap-2 border-b border-[var(--community-border)] px-4 py-3">
                <Link
                  to="/community/dm"
                  className="rounded p-1 text-muted hover:bg-[var(--community-hover)] md:hidden"
                  aria-label="Back to conversations"
                >
                  <IconArrowLeft size={18} />
                </Link>
                <span className="flex-1 font-semibold">{otherLabel}</span>
                {otherUserId && otherUserId !== user.id && (
                  <button
                    type="button"
                    className="text-xs text-destructive"
                    onClick={async () => {
                      if (!confirm("Block this user? They will not be able to message you.")) return;
                      try {
                        await blockDmUser(otherUserId);
                        setError("User blocked.");
                      } catch (err) {
                        setError(err instanceof Error ? err.message : "Could not block user");
                      }
                    }}
                  >
                    Block
                  </button>
                )}
              </div>
              <CommunityScrollBody className="flex-1 space-y-3 p-4">
                {messages.map((m) => (
                  <div
                    key={m.id}
                    className={`max-w-[85%] rounded-2xl px-3 py-2 text-sm ${
                      m.authorId === user.id
                        ? "ml-auto bg-accent text-accent-contrast"
                        : "bg-[var(--community-input)]"
                    }`}
                  >
                    {m.body}
                  </div>
                ))}
              </CommunityScrollBody>
              <form onSubmit={onSend} className="border-t border-[var(--community-border)] p-3">
                {error && (
                  <div className="mb-2">
                    <FormError message={error} />
                  </div>
                )}
                <div className="flex gap-2">
                  <input
                    value={draft}
                    onChange={(e) => setDraft(e.target.value)}
                    placeholder="Message"
                    className="min-w-0 flex-1 rounded-lg bg-[var(--community-input)] px-3 py-2 text-sm outline-none"
                  />
                  <button
                    type="submit"
                    disabled={sending || !draft.trim()}
                    className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-accent-contrast disabled:opacity-50"
                  >
                    Send
                  </button>
                </div>
              </form>
            </>
          )}
        </div>
      </div>
    </CommunityDiscordShell>
  );
}
