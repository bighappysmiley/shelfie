import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type FormEvent,
} from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/lib/supabase";
import {
  addGroupMember,
  archiveCommunityGroup,
  createCommunityCategory,
  createCommunityGroup,
  deleteCommunityCategory,
  deleteGroupMessage,
  listCommunityCategories,
  listCommunityGroups,
  listGroupMembers,
  listGroupMessages,
  listTeammateCandidates,
  removeGroupMember,
  renameCommunityCategory,
  sendGroupMessage,
  updateCommunityGroup,
  updateMemberRole,
  updateSuggestionStatus,
} from "@/lib/community";
import {
  KIND_LABELS,
  MEMBER_ROLE_LABELS,
  SUGGESTION_STATUS_LABELS,
  canManageMembers,
  canModerate,
  formatCommunityTime,
  type CommunityCategory,
  type CommunityGroup,
  type CommunityGroupKind,
  type CommunityMember,
  type CommunityMemberRole,
  type CommunityMessage,
  type CommunityMessageKind,
  type SuggestionStatus,
} from "@/lib/community-types";
import { Button } from "@/components/Button";
import { TextField, TextArea, FormError } from "@/components/form";
import { EmptyState, SegmentedControl } from "@/components/layout";
import { IconChat, IconPlus, IconSettings, IconX } from "@/components/Icons";

type Modal =
  | null
  | { type: "create-channel"; categoryId: string | null; official: boolean }
  | { type: "edit-channel"; channel: CommunityGroup }
  | { type: "create-category" }
  | { type: "edit-category"; category: CommunityCategory };

function HashGlyph({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden>
      <path
        d="M10 4 8 20M16 4l-2 16M5 9h14M4 15h14"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}

function PinGlyph({ className = "h-3 w-3" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="currentColor" aria-hidden>
      <path d="M16 3a1 1 0 0 1 .8 1.6l-1.7 2.26 1.45 4.34a1 1 0 0 1-.33 1.1L13 14.7V20a1 1 0 1 1-2 0v-5.3l-3.22-2.4a1 1 0 0 1-.33-1.1l1.45-4.34L7.2 4.6A1 1 0 0 1 8 3h8Z" />
    </svg>
  );
}

function Chevron({ open }: { open: boolean }) {
  return (
    <svg
      viewBox="0 0 16 16"
      className={`h-3 w-3 shrink-0 transition-transform ${open ? "rotate-0" : "-rotate-90"}`}
      fill="none"
      aria-hidden
    >
      <path
        d="M4.5 6.5 8 10l3.5-3.5"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function CommunityPage() {
  const { groupId } = useParams();
  const navigate = useNavigate();
  const { user, userProfile, isOwner } = useAuth();
  const canConfigure = Boolean(isOwner);

  const [categories, setCategories] = useState<CommunityCategory[]>([]);
  const [channels, setChannels] = useState<CommunityGroup[]>([]);
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [modal, setModal] = useState<Modal>(null);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  const refresh = useCallback(async () => {
    if (!user) return;
    setError("");
    try {
      const [cats, groups] = await Promise.all([
        listCommunityCategories(),
        listCommunityGroups(user.id),
      ]);
      setCategories(cats);
      setChannels(groups);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load community");
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const orderedCategories = useMemo(
    () =>
      [...categories].sort((a, b) => {
        if (a.isOfficial !== b.isOfficial) return a.isOfficial ? -1 : 1;
        return a.position - b.position || a.name.localeCompare(b.name);
      }),
    [categories],
  );

  const channelsByCategory = useMemo(() => {
    const map = new Map<string | null, CommunityGroup[]>();
    for (const ch of channels) {
      const key = ch.categoryId;
      const list = map.get(key) ?? [];
      list.push(ch);
      map.set(key, list);
    }
    for (const list of map.values()) {
      list.sort((a, b) => a.position - b.position || a.name.localeCompare(b.name));
    }
    return map;
  }, [channels]);

  const active = channels.find((g) => g.id === groupId) ?? null;

  useEffect(() => {
    if (loading || channels.length === 0 || groupId) return;
    const first =
      channels.find((c) => c.isOfficial) ??
      channels.find((c) => orderedCategories[0] && c.categoryId === orderedCategories[0].id) ??
      channels[0];
    navigate(`/community/${first.id}`, { replace: true });
  }, [loading, channels, groupId, navigate, orderedCategories]);

  const sidebar = (
    <ChannelSidebar
      categories={orderedCategories}
      channelsByCategory={channelsByCategory}
      collapsed={collapsed}
      onToggle={(id) => setCollapsed((prev) => ({ ...prev, [id]: !prev[id] }))}
      activeId={groupId}
      canConfigure={canConfigure}
      onSelect={(id) => {
        navigate(`/community/${id}`);
        setMobileNavOpen(false);
      }}
      onCreateChannel={(categoryId, official) =>
        setModal({ type: "create-channel", categoryId, official })
      }
      onEditCategory={(category) => setModal({ type: "edit-category", category })}
      onCreateCategory={() => setModal({ type: "create-category" })}
      loading={loading}
    />
  );

  return (
    <div className="-mx-4 -my-4 sm:-mx-5 sm:-my-5 lg:-mx-8 lg:-my-7">
      <div className="flex min-h-[calc(100dvh-4.5rem)] overflow-hidden rounded-[var(--radius-group)] bg-surface shadow-sm ring-1 ring-black/[0.04] dark:ring-white/[0.06] lg:min-h-[calc(100dvh-3.5rem)]">
        <aside className="hidden w-[15.25rem] shrink-0 flex-col border-r border-black/[0.06] bg-fill/50 dark:border-white/[0.08] md:flex">
          <div className="flex h-12 items-center border-b border-black/[0.06] px-3 dark:border-white/[0.08]">
            <p className="truncate text-[0.9375rem] font-semibold tracking-tight">Pine Community</p>
          </div>
          <div className="flex-1 overflow-y-auto px-2 py-3">{sidebar}</div>
          {user && (
            <div className="border-t border-black/[0.06] px-3 py-2.5 dark:border-white/[0.08]">
              <p className="truncate text-[0.8125rem] font-medium">
                {userProfile?.displayName || user.email}
              </p>
              <p className="text-[0.6875rem] text-muted">
                {canConfigure ? "Owner" : "Member"}
              </p>
            </div>
          )}
        </aside>

        <div className="flex min-w-0 flex-1 flex-col">
          <div className="flex items-center gap-2 border-b border-black/[0.06] px-3 py-2 md:hidden dark:border-white/[0.08]">
            <button
              type="button"
              onClick={() => setMobileNavOpen((v) => !v)}
              className="rounded-[var(--radius-control)] bg-fill px-2.5 py-1.5 text-[0.8125rem] font-medium"
            >
              Channels
            </button>
            {active && (
              <p className="flex min-w-0 flex-1 items-center gap-1 truncate text-[0.9375rem] font-semibold">
                <HashGlyph className="h-3.5 w-3.5 text-muted" />
                {active.name}
              </p>
            )}
          </div>

          {mobileNavOpen && (
            <div className="border-b border-black/[0.06] bg-fill/70 px-2 py-3 md:hidden dark:border-white/[0.08]">
              {sidebar}
            </div>
          )}

          {error && (
            <div className="px-4 pt-3">
              <FormError message={error} />
            </div>
          )}

          {loading ? (
            <p className="p-6 text-muted">Loading community…</p>
          ) : active && user ? (
            <ChannelRoom
              group={active}
              userId={user.id}
              displayName={userProfile?.displayName?.trim() || user.email || "Member"}
              isAppOwner={canConfigure}
              onOpenSettings={() => setModal({ type: "edit-channel", channel: active })}
              onChanged={refresh}
            />
          ) : (
            <div className="flex flex-1 items-center justify-center p-8">
              <EmptyState
                title="Welcome to Community"
                description={
                  canConfigure
                    ? "Create Official channels in the pinned Official category, or organize Text Channels for your team."
                    : "When channels are available, pick one from the sidebar."
                }
              />
            </div>
          )}
        </div>
      </div>

      {modal?.type === "create-channel" && user && (
        <ChannelFormModal
          title={modal.official ? "Create official channel" : "Create channel"}
          categories={categories}
          defaultCategoryId={modal.categoryId}
          forceOfficial={modal.official}
          isOwner={canConfigure}
          userId={user.id}
          onClose={() => setModal(null)}
          onSaved={async (g) => {
            await refresh();
            setModal(null);
            if (g) navigate(`/community/${g.id}`);
          }}
        />
      )}

      {modal?.type === "edit-channel" && user && (
        <ChannelFormModal
          title="Channel settings"
          categories={categories}
          channel={modal.channel}
          isOwner={canConfigure}
          userId={user.id}
          onClose={() => setModal(null)}
          onSaved={async () => {
            await refresh();
            setModal(null);
          }}
          onArchive={
            canConfigure
              ? async () => {
                  if (!confirm(`Archive #${modal.channel.name}? Members will lose access.`)) return;
                  await archiveCommunityGroup(modal.channel.id);
                  await refresh();
                  setModal(null);
                  navigate("/community");
                }
              : undefined
          }
        />
      )}

      {modal?.type === "create-category" && user && (
        <CategoryFormModal
          title="Create category"
          onClose={() => setModal(null)}
          onSubmit={async (name) => {
            await createCommunityCategory({ name, userId: user.id });
            await refresh();
            setModal(null);
          }}
        />
      )}

      {modal?.type === "edit-category" && (
        <CategoryFormModal
          title="Edit category"
          initialName={modal.category.name}
          onClose={() => setModal(null)}
          onSubmit={async (name) => {
            await renameCommunityCategory(modal.category.id, name);
            await refresh();
            setModal(null);
          }}
          onDelete={
            !modal.category.isOfficial
              ? async () => {
                  if (
                    !confirm(
                      `Delete category “${modal.category.name}”? Channels become uncategorized.`,
                    )
                  ) {
                    return;
                  }
                  await deleteCommunityCategory(modal.category.id);
                  await refresh();
                  setModal(null);
                }
              : undefined
          }
        />
      )}
    </div>
  );
}

function ChannelSidebar({
  categories,
  channelsByCategory,
  collapsed,
  onToggle,
  activeId,
  canConfigure,
  onSelect,
  onCreateChannel,
  onEditCategory,
  onCreateCategory,
  loading,
}: {
  categories: CommunityCategory[];
  channelsByCategory: Map<string | null, CommunityGroup[]>;
  collapsed: Record<string, boolean>;
  onToggle: (id: string) => void;
  activeId?: string;
  canConfigure: boolean;
  onSelect: (id: string) => void;
  onCreateChannel: (categoryId: string | null, official: boolean) => void;
  onEditCategory: (category: CommunityCategory) => void;
  onCreateCategory: () => void;
  loading: boolean;
}) {
  if (loading) {
    return <p className="px-2 text-[0.8125rem] text-muted">Loading…</p>;
  }

  const uncategorized = channelsByCategory.get(null) ?? [];

  return (
    <div className="space-y-3">
      {categories.map((cat) => {
        const list = channelsByCategory.get(cat.id) ?? [];
        const open = !collapsed[cat.id];
        return (
          <div key={cat.id}>
            <div className="group flex items-center gap-0.5 px-1">
              <button
                type="button"
                onClick={() => onToggle(cat.id)}
                className="flex min-w-0 flex-1 items-center gap-1 rounded px-1 py-1 text-[0.6875rem] font-bold uppercase tracking-wider text-muted hover:text-foreground"
              >
                <Chevron open={open} />
                <span className="flex min-w-0 items-center gap-1 truncate">
                  {cat.isOfficial && <PinGlyph className="h-2.5 w-2.5 shrink-0" />}
                  {cat.name}
                </span>
              </button>
              {canConfigure && (
                <div className="flex opacity-100 md:opacity-0 md:group-hover:opacity-100">
                  <button
                    type="button"
                    title="Create channel"
                    onClick={() => onCreateChannel(cat.id, cat.isOfficial)}
                    className="rounded p-0.5 text-muted hover:bg-fill-secondary hover:text-foreground"
                  >
                    <IconPlus size={14} />
                  </button>
                  {!cat.isOfficial && (
                    <button
                      type="button"
                      title="Edit category"
                      onClick={() => onEditCategory(cat)}
                      className="rounded p-0.5 text-muted hover:bg-fill-secondary hover:text-foreground"
                    >
                      <IconSettings size={14} />
                    </button>
                  )}
                </div>
              )}
            </div>
            {open &&
              list.map((ch) => (
                <button
                  key={ch.id}
                  type="button"
                  onClick={() => onSelect(ch.id)}
                  className={`mb-0.5 flex w-full items-center gap-1.5 rounded-[0.5rem] px-2 py-1.5 text-left text-[0.9375rem] transition ${
                    ch.id === activeId
                      ? "bg-fill-secondary font-medium text-foreground"
                      : "text-muted hover:bg-fill hover:text-foreground"
                  }`}
                >
                  <HashGlyph className="h-4 w-4 shrink-0 opacity-70" />
                  <span className="truncate">{ch.name}</span>
                  {ch.isOfficial && (
                    <span className="ml-auto rounded bg-accent/15 px-1 py-0.5 text-[0.5625rem] font-semibold uppercase tracking-wide text-accent">
                      Off
                    </span>
                  )}
                </button>
              ))}
            {open && list.length === 0 && (
              <p className="px-3 py-1 text-[0.75rem] text-muted">No channels yet</p>
            )}
          </div>
        );
      })}

      {uncategorized.length > 0 && (
        <div>
          <p className="px-2 py-1 text-[0.6875rem] font-bold uppercase tracking-wider text-muted">
            Channels
          </p>
          {uncategorized.map((ch) => (
            <button
              key={ch.id}
              type="button"
              onClick={() => onSelect(ch.id)}
              className={`mb-0.5 flex w-full items-center gap-1.5 rounded-[0.5rem] px-2 py-1.5 text-left text-[0.9375rem] ${
                ch.id === activeId ? "bg-fill-secondary font-medium" : "text-muted hover:bg-fill"
              }`}
            >
              <HashGlyph className="h-4 w-4 shrink-0 opacity-70" />
              <span className="truncate">{ch.name}</span>
            </button>
          ))}
        </div>
      )}

      {canConfigure && (
        <div className="space-y-0.5 pt-1">
          <button
            type="button"
            onClick={onCreateCategory}
            className="flex w-full items-center gap-2 rounded-[0.5rem] px-2 py-1.5 text-[0.8125rem] text-muted hover:bg-fill hover:text-foreground"
          >
            <IconPlus size={14} />
            Create category
          </button>
          <button
            type="button"
            onClick={() =>
              onCreateChannel(categories.find((c) => !c.isOfficial)?.id ?? null, false)
            }
            className="flex w-full items-center gap-2 rounded-[0.5rem] px-2 py-1.5 text-[0.8125rem] text-muted hover:bg-fill hover:text-foreground"
          >
            <IconChat size={14} />
            Create channel
          </button>
          <button
            type="button"
            onClick={() =>
              onCreateChannel(categories.find((c) => c.isOfficial)?.id ?? null, true)
            }
            className="flex w-full items-center gap-2 rounded-[0.5rem] px-2 py-1.5 text-[0.8125rem] text-accent hover:bg-fill"
          >
            <PinGlyph className="h-3.5 w-3.5" />
            New official channel
          </button>
        </div>
      )}
    </div>
  );
}

function ChannelRoom({
  group,
  userId,
  displayName,
  isAppOwner,
  onOpenSettings,
  onChanged,
}: {
  group: CommunityGroup;
  userId: string;
  displayName: string;
  isAppOwner: boolean;
  onOpenSettings: () => void;
  onChanged: () => void;
}) {
  const [tab, setTab] = useState<"room" | "members">("room");
  const [messages, setMessages] = useState<CommunityMessage[]>([]);
  const [members, setMembers] = useState<CommunityMember[]>([]);
  const [draft, setDraft] = useState("");
  const [composeKind, setComposeKind] = useState<CommunityMessageKind>("chat");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);

  const myRole = group.myRole ?? (isAppOwner ? "admin" : group.isOfficial ? "member" : null);
  const manage = canManageMembers(myRole, isAppOwner);
  const moderate = canModerate(myRole, isAppOwner);
  const allowsChat = group.kind === "chat" || group.kind === "both";
  const allowsSuggestions = group.kind === "suggestions" || group.kind === "both";
  const canPost = Boolean(myRole) || group.isOfficial || isAppOwner;

  const load = useCallback(async () => {
    const [msgs, mems] = await Promise.all([
      listGroupMessages(group.id),
      listGroupMembers(group.id),
    ]);
    setMessages(msgs);
    setMembers(mems);
  }, [group.id]);

  useEffect(() => {
    void load().catch((err) =>
      setError(err instanceof Error ? err.message : "Failed to load channel"),
    );
  }, [load]);

  useEffect(() => {
    const channel = supabase
      .channel(`community:${group.id}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "community_messages",
          filter: `group_id=eq.${group.id}`,
        },
        () => {
          void load();
        },
      )
      .subscribe();
    return () => {
      void supabase.removeChannel(channel);
    };
  }, [group.id, load]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length]);

  useEffect(() => {
    setComposeKind(group.kind === "suggestions" ? "suggestion" : "chat");
    setTab("room");
  }, [group.id, group.kind]);

  const onSend = async (e: FormEvent) => {
    e.preventDefault();
    if (!draft.trim() || !canPost) return;
    setSending(true);
    setError("");
    try {
      const kind: CommunityMessageKind =
        composeKind === "suggestion" && allowsSuggestions ? "suggestion" : "chat";
      if (kind === "chat" && !allowsChat) {
        setError("This channel is suggestions-only.");
        return;
      }
      await sendGroupMessage({
        groupId: group.id,
        userId,
        body: draft,
        kind,
        authorName: displayName,
      });
      setDraft("");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not send");
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <header className="flex flex-wrap items-start justify-between gap-3 border-b border-black/[0.06] px-4 py-3 dark:border-white/[0.08]">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="flex items-center gap-1.5 truncate text-[1.0625rem] font-semibold">
              <HashGlyph className="h-4 w-4 text-muted" />
              {group.name}
            </h2>
            {group.isOfficial && (
              <span className="rounded bg-accent/15 px-1.5 py-0.5 text-[0.625rem] font-semibold uppercase tracking-wide text-accent">
                Official
              </span>
            )}
            <span className="text-[0.6875rem] text-muted">{KIND_LABELS[group.kind]}</span>
          </div>
          {(group.topic || group.description) && (
            <p className="mt-0.5 truncate text-[0.8125rem] text-muted">
              {group.topic || group.description}
            </p>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <SegmentedControl
            value={tab}
            onChange={setTab}
            options={[
              { value: "room", label: "Chat" },
              { value: "members", label: `Members (${members.length})` },
            ]}
          />
          {(isAppOwner || manage) && (
            <button
              type="button"
              onClick={onOpenSettings}
              className="rounded-[var(--radius-control)] p-2 text-muted hover:bg-fill hover:text-foreground"
              title="Channel settings"
            >
              <IconSettings size={18} />
            </button>
          )}
        </div>
      </header>

      {tab === "members" ? (
        <MembersPanel
          groupId={group.id}
          members={members}
          userId={userId}
          canManage={manage}
          isOfficial={group.isOfficial}
          onChanged={async () => {
            await load();
            onChanged();
          }}
        />
      ) : (
        <>
          <ul className="flex-1 space-y-3 overflow-y-auto px-4 py-4">
            {messages.length === 0 && (
              <li className="flex flex-col items-center justify-center py-12 text-center">
                <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-fill">
                  <HashGlyph className="h-6 w-6 text-muted" />
                </div>
                <p className="text-[1.0625rem] font-semibold">Welcome to #{group.name}</p>
                <p className="mt-1 max-w-sm text-[0.875rem] text-muted">
                  {group.topic || group.description || "This is the start of the channel."}
                </p>
              </li>
            )}
            {messages.map((m) => (
              <MessageRow
                key={m.id}
                message={m}
                isMine={m.authorId === userId}
                canModerate={moderate}
                onStatus={async (status) => {
                  await updateSuggestionStatus(m.id, status);
                  await load();
                }}
                onDelete={async () => {
                  await deleteGroupMessage(m.id);
                  await load();
                }}
              />
            ))}
            <div ref={bottomRef} />
          </ul>

          <form
            onSubmit={onSend}
            className="border-t border-black/[0.06] p-3 dark:border-white/[0.08]"
          >
            {allowsChat && allowsSuggestions && canPost && (
              <div className="mb-2">
                <SegmentedControl
                  value={composeKind === "suggestion" ? "suggestion" : "chat"}
                  onChange={(v) => setComposeKind(v)}
                  options={[
                    { value: "chat", label: "Chat" },
                    { value: "suggestion", label: "Suggestion" },
                  ]}
                />
              </div>
            )}
            {error && <FormError message={error} />}
            {canPost ? (
              <div className="flex gap-2">
                <textarea
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  rows={2}
                  placeholder={
                    composeKind === "suggestion"
                      ? `Suggest something in #${group.name}…`
                      : `Message #${group.name}`
                  }
                  className="min-h-[2.75rem] flex-1 resize-none rounded-[var(--radius-control)] bg-fill px-3 py-2 text-[1.0625rem] outline-none ring-accent focus:ring-2"
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      void onSend(e);
                    }
                  }}
                />
                <Button type="submit" disabled={sending || !draft.trim()}>
                  {sending ? "…" : "Send"}
                </Button>
              </div>
            ) : (
              <p className="rounded-[var(--radius-control)] border border-dashed border-black/10 px-4 py-3 text-center text-[0.875rem] text-muted dark:border-white/10">
                You need access to post in this channel.
              </p>
            )}
          </form>
        </>
      )}
    </div>
  );
}

function MessageRow({
  message,
  isMine,
  canModerate: canMod,
  onStatus,
  onDelete,
}: {
  message: CommunityMessage;
  isMine: boolean;
  canModerate: boolean;
  onStatus: (s: SuggestionStatus) => Promise<void>;
  onDelete: () => Promise<void>;
}) {
  if (message.kind === "system") {
    return <li className="text-center text-[0.75rem] text-muted">{message.body}</li>;
  }

  const isSuggestion = message.kind === "suggestion";

  return (
    <li className={`group flex flex-col ${isMine ? "items-end" : "items-start"}`}>
      <p className="mb-1 px-1 text-[0.75rem] text-muted">
        {isMine ? "You" : message.authorName || "Member"} · {formatCommunityTime(message.createdAt)}
        {isSuggestion && message.suggestionStatus && (
          <> · {SUGGESTION_STATUS_LABELS[message.suggestionStatus]}</>
        )}
      </p>
      <div
        className={`max-w-[85%] rounded-[1.125rem] px-3.5 py-2 text-[1.0625rem] leading-snug ${
          isMine
            ? "rounded-br-[0.375rem] bg-chat-mine text-accent-contrast"
            : "rounded-bl-[0.375rem] bg-chat-theirs text-foreground"
        }`}
      >
        {isSuggestion && (
          <p className="mb-1 text-[0.6875rem] font-semibold uppercase tracking-wide opacity-80">
            Suggestion
          </p>
        )}
        <p className="whitespace-pre-wrap">{message.body}</p>
      </div>
      {(canMod || isMine) && (
        <div className="mt-1 flex flex-wrap gap-2 px-1 opacity-100 sm:opacity-0 sm:group-hover:opacity-100">
          {isSuggestion && canMod && message.suggestionStatus === "open" && (
            <>
              <button
                type="button"
                className="text-[0.75rem] text-link"
                onClick={() => void onStatus("accepted")}
              >
                Accept
              </button>
              <button
                type="button"
                className="text-[0.75rem] text-link"
                onClick={() => void onStatus("declined")}
              >
                Decline
              </button>
              <button
                type="button"
                className="text-[0.75rem] text-link"
                onClick={() => void onStatus("implemented")}
              >
                Mark implemented
              </button>
            </>
          )}
          <button type="button" className="text-[0.75rem] text-muted" onClick={() => void onDelete()}>
            Delete
          </button>
        </div>
      )}
    </li>
  );
}

function MembersPanel({
  groupId,
  members,
  userId,
  canManage,
  isOfficial,
  onChanged,
}: {
  groupId: string;
  members: CommunityMember[];
  userId: string;
  canManage: boolean;
  isOfficial: boolean;
  onChanged: () => Promise<void>;
}) {
  const [candidates, setCandidates] = useState<{ userId: string; displayName: string | null }[]>(
    [],
  );
  const [addId, setAddId] = useState("");
  const [addRole, setAddRole] = useState<CommunityMemberRole>("member");
  const [error, setError] = useState("");

  useEffect(() => {
    void listTeammateCandidates(userId)
      .then((list) => {
        const existing = new Set(members.map((m) => m.userId));
        setCandidates(list.filter((c) => !existing.has(c.userId)));
      })
      .catch(() => setCandidates([]));
  }, [userId, members]);

  return (
    <div className="space-y-4 overflow-y-auto p-4">
      {isOfficial && (
        <p className="rounded-[var(--radius-control)] bg-fill px-3 py-2 text-[0.8125rem] text-muted">
          Official channels are open to everyone signed in. Listed members have explicit roles.
        </p>
      )}
      <ul className="space-y-2">
        {members.map((m) => (
          <li
            key={m.userId}
            className="flex items-center justify-between gap-3 rounded-[var(--radius-control)] bg-fill px-3 py-2"
          >
            <div className="min-w-0">
              <p className="truncate font-medium">
                {m.displayName || "Member"}
                {m.userId === userId ? " (you)" : ""}
              </p>
              <p className="text-[0.8125rem] text-muted">{MEMBER_ROLE_LABELS[m.role]}</p>
            </div>
            {canManage && m.userId !== userId && (
              <div className="flex items-center gap-2">
                <select
                  className="rounded-[var(--radius-control)] bg-surface px-2 py-1 text-[0.8125rem]"
                  value={m.role}
                  onChange={async (e) => {
                    await updateMemberRole(
                      groupId,
                      m.userId,
                      e.target.value as CommunityMemberRole,
                    );
                    await onChanged();
                  }}
                >
                  {(Object.keys(MEMBER_ROLE_LABELS) as CommunityMemberRole[]).map((r) => (
                    <option key={r} value={r}>
                      {MEMBER_ROLE_LABELS[r]}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  className="text-[0.8125rem] text-muted hover:text-destructive"
                  onClick={async () => {
                    await removeGroupMember(groupId, m.userId);
                    await onChanged();
                  }}
                >
                  Remove
                </button>
              </div>
            )}
          </li>
        ))}
      </ul>

      {canManage && (
        <div className="rounded-[var(--radius-control)] bg-fill p-3">
          <p className="mb-2 text-[0.875rem] font-medium">Add teammate</p>
          {candidates.length === 0 ? (
            <p className="text-[0.8125rem] text-muted">
              No other library teammates to add. Invite someone to your library first.
            </p>
          ) : (
            <div className="flex flex-col gap-2 sm:flex-row">
              <select
                className="flex-1 rounded-[var(--radius-control)] bg-surface px-3 py-2 text-[0.9375rem]"
                value={addId}
                onChange={(e) => setAddId(e.target.value)}
              >
                <option value="">Choose person…</option>
                {candidates.map((c) => (
                  <option key={c.userId} value={c.userId}>
                    {c.displayName || c.userId.slice(0, 8)}
                  </option>
                ))}
              </select>
              <select
                className="rounded-[var(--radius-control)] bg-surface px-3 py-2 text-[0.9375rem]"
                value={addRole}
                onChange={(e) => setAddRole(e.target.value as CommunityMemberRole)}
              >
                {(Object.keys(MEMBER_ROLE_LABELS) as CommunityMemberRole[]).map((r) => (
                  <option key={r} value={r}>
                    {MEMBER_ROLE_LABELS[r]}
                  </option>
                ))}
              </select>
              <Button
                size="sm"
                disabled={!addId}
                onClick={async () => {
                  setError("");
                  try {
                    await addGroupMember(groupId, addId, addRole);
                    setAddId("");
                    await onChanged();
                  } catch (err) {
                    setError(err instanceof Error ? err.message : "Could not add");
                  }
                }}
              >
                Add
              </Button>
            </div>
          )}
          {error && <FormError message={error} />}
        </div>
      )}
    </div>
  );
}

function ChannelFormModal({
  title,
  categories,
  channel,
  defaultCategoryId,
  forceOfficial,
  isOwner,
  userId,
  onClose,
  onSaved,
  onArchive,
}: {
  title: string;
  categories: CommunityCategory[];
  channel?: CommunityGroup;
  defaultCategoryId?: string | null;
  forceOfficial?: boolean;
  isOwner: boolean;
  userId: string;
  onClose: () => void;
  onSaved: (g?: CommunityGroup) => Promise<void>;
  onArchive?: () => Promise<void>;
}) {
  const officialCat = categories.find((c) => c.isOfficial);
  const [name, setName] = useState(channel?.name ?? "");
  const [kind, setKind] = useState<CommunityGroupKind>(channel?.kind ?? "both");
  const [topic, setTopic] = useState(channel?.topic ?? "");
  const [description, setDescription] = useState(channel?.description ?? "");
  const [isOfficial, setIsOfficial] = useState(Boolean(forceOfficial || channel?.isOfficial));
  const [categoryId, setCategoryId] = useState(
    channel?.categoryId ||
      defaultCategoryId ||
      (forceOfficial ? officialCat?.id : categories.find((c) => !c.isOfficial)?.id) ||
      "",
  );
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (isOfficial && officialCat?.id) setCategoryId(officialCat.id);
  }, [isOfficial, officialCat?.id]);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError("Give the channel a name.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      if (channel) {
        await updateCommunityGroup(channel.id, {
          name,
          kind,
          topic,
          description,
          categoryId: categoryId || null,
          isOfficial,
        });
        await onSaved();
      } else {
        const g = await createCommunityGroup({
          name,
          kind,
          topic,
          description,
          categoryId: categoryId || null,
          isOfficial,
          userId,
        });
        await onSaved(g);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save");
      setBusy(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onClick={onClose}
    >
      <form
        onClick={(e) => e.stopPropagation()}
        onSubmit={onSubmit}
        className="w-full max-w-md rounded-[1.25rem] bg-surface p-5 shadow-xl ring-1 ring-black/[0.06] dark:ring-white/[0.08]"
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-[1.125rem] font-semibold">{title}</h2>
          <button type="button" onClick={onClose} className="text-muted hover:text-foreground">
            <IconX size={18} />
          </button>
        </div>

        <div className="space-y-3">
          <TextField
            label="Channel name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="general"
            required
            autoFocus
          />
          <TextField
            label="Topic"
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
            placeholder="What’s this channel about?"
          />
          <TextArea
            label="Description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={2}
          />
          <div>
            <p className="mb-2 text-[0.8125rem] font-medium text-muted">Type</p>
            <SegmentedControl
              value={kind}
              onChange={setKind}
              options={[
                { value: "both", label: "Chat & suggestions" },
                { value: "chat", label: "Chat" },
                { value: "suggestions", label: "Suggestions" },
              ]}
            />
          </div>
          <label className="block text-[0.8125rem] font-medium text-muted">
            Category
            <select
              value={categoryId}
              onChange={(e) => setCategoryId(e.target.value)}
              disabled={isOfficial}
              className="mt-1 w-full rounded-[var(--radius-control)] bg-fill px-3 py-2 text-[0.9375rem] text-foreground outline-none ring-accent focus:ring-2 disabled:opacity-60"
            >
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.isOfficial ? `📌 ${c.name}` : c.name}
                </option>
              ))}
            </select>
          </label>
          {isOwner && (
            <label className="flex items-start gap-2 rounded-[var(--radius-control)] bg-fill p-3 text-[0.875rem]">
              <input
                type="checkbox"
                checked={isOfficial}
                disabled={forceOfficial}
                onChange={(e) => setIsOfficial(e.target.checked)}
                className="mt-0.5"
              />
              <span>
                <span className="font-medium">Official channel</span>
                <span className="mt-0.5 block text-[0.75rem] text-muted">
                  Pins under Official. Visible to everyone signed in.
                </span>
              </span>
            </label>
          )}
        </div>

        {error && (
          <div className="mt-3">
            <FormError message={error} />
          </div>
        )}

        <div className="mt-4 flex items-center gap-2">
          {onArchive && (
            <button
              type="button"
              onClick={() => void onArchive()}
              className="text-[0.875rem] text-destructive"
            >
              Archive
            </button>
          )}
          <div className="flex-1" />
          <Button type="button" variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" disabled={busy || !name.trim()}>
            {busy ? "Saving…" : channel ? "Save" : "Create"}
          </Button>
        </div>
      </form>
    </div>
  );
}

function CategoryFormModal({
  title,
  initialName = "",
  onClose,
  onSubmit,
  onDelete,
}: {
  title: string;
  initialName?: string;
  onClose: () => void;
  onSubmit: (name: string) => Promise<void>;
  onDelete?: () => Promise<void>;
}) {
  const [name, setName] = useState(initialName);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    setBusy(true);
    setError("");
    try {
      await onSubmit(name.trim());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save");
      setBusy(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onClick={onClose}
    >
      <form
        onClick={(e) => e.stopPropagation()}
        onSubmit={submit}
        className="w-full max-w-sm rounded-[1.25rem] bg-surface p-5 shadow-xl ring-1 ring-black/[0.06] dark:ring-white/[0.08]"
      >
        <h2 className="mb-4 text-[1.125rem] font-semibold">{title}</h2>
        <TextField
          label="Name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
          autoFocus
        />
        {error && (
          <div className="mt-3">
            <FormError message={error} />
          </div>
        )}
        <div className="mt-4 flex items-center gap-2">
          {onDelete && (
            <button
              type="button"
              onClick={() => void onDelete()}
              className="text-[0.875rem] text-destructive"
            >
              Delete
            </button>
          )}
          <div className="flex-1" />
          <Button type="button" variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" disabled={busy || !name.trim()}>
            Save
          </Button>
        </div>
      </form>
    </div>
  );
}
