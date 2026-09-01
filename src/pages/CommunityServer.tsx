import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type FormEvent,
} from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useAuth } from "@/lib/auth";
import { useLibrary } from "@/lib/library";
import { supabase } from "@/lib/supabase";
import {
  addGroupMember,
  archiveCommunityGroup,
  createCommunityCategory,
  deleteCommunityCategory,
  deleteGroupMessage,
  getServer,
  isServerMember,
  joinServer,
  listCommunityCategories,
  listCommunityGroups,
  listGroupMembers,
  listGroupMessages,
  listTeammateCandidates,
  getMyJoinRequestStatus,
  requestJoinServer,
  removeGroupMember,
  renameCommunityCategory,
  listServerMembers,
  sendGroupMessage,
  toggleMessageReaction,
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
  formatPopularity,
  type CommunityCategory,
  type CommunityGroup,
  type CommunityMember,
  type CommunityMemberRole,
  type CommunityMessage,
  type CommunityMessageKind,
  type CommunityServer,
  type CommunityServerMember,
  type SuggestionStatus,
} from "@/lib/community-types";
import { Button } from "@/components/Button";
import { FormError } from "@/components/form";
import { EmptyState, SegmentedControl } from "@/components/layout";
import { AuthedImage } from "@/components/AuthedImage";
import { IconChat, IconPeople, IconPlus, IconSearch, IconSettings, IconX } from "@/components/Icons";
import { communityAuthorLabel, communityShortName } from "@/lib/community-identity";
import { roleColorStyle } from "@/lib/role-color";
import { CommunityDiscordShell, CommunityScrollBody } from "@/components/CommunityRail";
import { ChannelFormModal, CategoryFormModal } from "@/components/community-server-modals";
import { AddServerModal } from "@/components/AddServerModal";

const QUICK_EMOJIS = ["👍", "❤️", "😂", "🔥", "🎉", "👀"];

type Modal =
  | null
  | { type: "create-channel"; categoryId: string | null }
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

function Chevron({ open }: { open: boolean }) {
  return (
    <svg
      viewBox="0 0 16 16"
      className={`h-3 w-3 shrink-0 transition-transform ${open ? "rotate-0" : "-rotate-90"}`}
      fill="none"
      aria-hidden
    >
      <path d="M4.5 6.5 8 10l3.5-3.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

export function CommunityServerPage() {
  const { serverId, channelId } = useParams<{ serverId: string; channelId?: string }>();
  const navigate = useNavigate();
  const { user, userProfile, isOwner } = useAuth();
  const { libraries } = useLibrary();

  const [server, setServer] = useState<CommunityServer | null>(null);
  const [isMember, setIsMember] = useState(false);
  const [categories, setCategories] = useState<CommunityCategory[]>([]);
  const [channels, setChannels] = useState<CommunityGroup[]>([]);
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(true);
  const [joining, setJoining] = useState(false);
  const [error, setError] = useState("");
  const [modal, setModal] = useState<Modal>(null);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
  const [joinRequestStatus, setJoinRequestStatus] = useState<string | null>(null);
  const [channelSearch, setChannelSearch] = useState("");
  const [showMembers, setShowMembers] = useState(true);
  const [serverMembers, setServerMembers] = useState<CommunityServerMember[]>([]);

  const library = libraries.find((l) => l.id === server?.libraryId);
  const canConfigure = Boolean(isOwner || library?.role === "owner" || server?.canManage);

  const refresh = useCallback(async () => {
    if (!user || !serverId) return;
    setError("");
    try {
      const s = await getServer(serverId);
      if (!s) throw new Error("Server not found");
      const member = await isServerMember(serverId, user.id);
      setIsMember(member);
      const pending = member ? null : await getMyJoinRequestStatus(serverId, user.id);
      setJoinRequestStatus(pending);
      const [cats, groups, srvMembers] = await Promise.all([
        listCommunityCategories(serverId),
        listCommunityGroups(user.id, serverId),
        member ? listServerMembers(serverId) : Promise.resolve([] as CommunityServerMember[]),
      ]);
      setServer({
        ...s,
        isMember: member,
        canManage: library?.role === "owner" || isOwner,
        myJoinRequestStatus: pending,
      });
      setCategories(cats);
      setChannels(groups);
      setServerMembers(srvMembers);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load server");
    } finally {
      setLoading(false);
    }
  }, [user, serverId, library?.role, isOwner]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const orderedCategories = useMemo(
    () =>
      [...categories].sort((a, b) => a.position - b.position || a.name.localeCompare(b.name)),
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

  const filteredChannelsByCategory = useMemo(() => {
    const q = channelSearch.trim().toLowerCase();
    if (!q) return channelsByCategory;
    const map = new Map<string | null, CommunityGroup[]>();
    for (const [key, list] of channelsByCategory) {
      const filtered = list.filter((c) => c.name.toLowerCase().includes(q));
      if (filtered.length > 0) map.set(key, filtered);
    }
    return map;
  }, [channelsByCategory, channelSearch]);

  const active = channels.find((g) => g.id === channelId) ?? null;

  useEffect(() => {
    if (loading || !serverId || channels.length === 0 || channelId) return;
    const first =
      channels.find((c) => orderedCategories[0] && c.categoryId === orderedCategories[0].id) ??
      channels[0];
    navigate(`/community/s/${serverId}/${first.id}`, { replace: true });
  }, [loading, channels, channelId, navigate, orderedCategories, serverId]);

  const tryJoin = async () => {
    if (!user || !server || !serverId) return;
    setJoining(true);
    setError("");
    try {
      if (server.joinMode === "invite") {
        setAddOpen(true);
        return;
      }
      if (server.joinMode === "request") {
        const result = await requestJoinServer(serverId);
        await refresh();
        if (result.status === "requested") {
          setJoinRequestStatus("pending");
        }
        return;
      }
      await joinServer(serverId, user.id);
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not join");
    } finally {
      setJoining(false);
    }
  };

  const joinLabel =
    joinRequestStatus === "pending"
      ? "Requested"
      : server?.joinMode === "request"
        ? "Request to join"
        : server?.joinMode === "invite"
          ? "Enter invite"
          : "Join";

  const sidebar = serverId ? (
    <ChannelSidebar
      categories={orderedCategories}
      channelsByCategory={filteredChannelsByCategory}
      collapsed={collapsed}
      onToggle={(id) => setCollapsed((prev) => ({ ...prev, [id]: !prev[id] }))}
      activeId={channelId}
      canConfigure={canConfigure}
      onSelect={(id) => {
        navigate(`/community/s/${serverId}/${id}`);
        setMobileNavOpen(false);
      }}
      onCreateChannel={(categoryId) => setModal({ type: "create-channel", categoryId })}
      onEditCategory={(category) => setModal({ type: "edit-category", category })}
      onCreateCategory={() => setModal({ type: "create-category" })}
      loading={loading}
    />
  ) : null;

  if (!serverId) {
    return <EmptyState title="Server not found" description="Pick a server from Community." />;
  }

  return (
    <CommunityDiscordShell
      pane="server"
      activeServerId={serverId}
      onAdd={() => setAddOpen(true)}
    >
      <div className="flex min-h-0 flex-1 overflow-hidden">
        <aside className="hidden w-[15.25rem] shrink-0 flex-col border-r border-[var(--community-border)] bg-[var(--community-panel)] min-h-0 md:flex">
          <div className="flex h-12 shrink-0 items-center gap-2 border-b border-[var(--community-border)] px-3">
            {server?.iconUrl ? (
              <AuthedImage src={server.iconUrl} className="h-7 w-7 rounded-lg object-cover" />
            ) : (
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-accent/25 text-[0.625rem] font-bold text-accent">
                {(server?.name || "?").slice(0, 2).toUpperCase()}
              </div>
            )}
            <div className="min-w-0 flex-1">
              <p className="truncate text-[0.875rem] font-semibold text-white">{server?.name || "Server"}</p>
              {server && (
                <p className="truncate text-[0.625rem] text-white/45">{formatPopularity(server)}</p>
              )}
            </div>
            {canConfigure && (
              <Link
                to={`/community/s/${serverId}/settings`}
                className="rounded p-1.5 text-white/45 hover:bg-white/10 hover:text-white"
                title="Server settings"
              >
                <IconSettings size={16} />
              </Link>
            )}
          </div>
          {!isMember && server && (server.isPublic || server.isOfficial || server.joinMode === "invite") && (
            <div className="shrink-0 border-b border-[var(--community-border)] bg-accent/15 px-3 py-2">
              <div className="flex items-center justify-between gap-2">
                <p className="text-[0.75rem] text-white/55">
                  {joinRequestStatus === "pending"
                    ? "Join request pending."
                    : server.joinMode === "invite"
                      ? "Invite-only — enter a code to join."
                      : "Previewing — join to chat."}
                </p>
                <Button
                  size="sm"
                  disabled={joining || !user || joinRequestStatus === "pending"}
                  onClick={() => void tryJoin()}
                >
                  {joining ? "…" : joinLabel}
                </Button>
              </div>
            </div>
          )}
          <div className="shrink-0 px-2 py-2">
            <label className="relative block">
              <IconSearch
                size={14}
                className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-muted"
              />
              <input
                value={channelSearch}
                onChange={(e) => setChannelSearch(e.target.value)}
                placeholder="Search channels"
                className="w-full rounded-lg bg-fill py-1.5 pl-8 pr-2 text-[0.8125rem] outline-none ring-accent placeholder:text-muted focus:ring-2"
              />
            </label>
          </div>
          <CommunityScrollBody className="px-2 py-2">{sidebar}</CommunityScrollBody>
        </aside>

        <div className="flex min-h-0 min-w-0 flex-1 overflow-hidden">
          <div className="flex min-h-0 min-w-0 flex-1 flex-col bg-[var(--community-chat)] text-foreground [&_.text-muted]:!text-muted [&_.text-foreground]:!text-foreground [&_h2]:text-foreground">
          <div className="flex shrink-0 items-center gap-2 border-b border-[var(--community-border)] px-3 py-2 md:hidden">
            <button
              type="button"
              onClick={() => setMobileNavOpen((v) => !v)}
              className="rounded-lg bg-white/10 px-2.5 py-1.5 text-[0.8125rem] font-medium text-white"
            >
              Channels
            </button>
            {active && (
              <p className="flex min-w-0 flex-1 items-center gap-1 truncate text-[0.9375rem] font-semibold text-white">
                <HashGlyph className="h-3.5 w-3.5 text-white/45" />
                {active.name}
              </p>
            )}
            {canConfigure && (
              <Link to={`/community/s/${serverId}/settings`} className="p-1.5 text-muted">
                <IconSettings size={18} />
              </Link>
            )}
            {isMember && (
              <button
                type="button"
                onClick={() => setShowMembers((v) => !v)}
                className={`rounded-lg p-1.5 ${showMembers ? "bg-fill text-foreground" : "text-muted"}`}
                title="Toggle member list"
              >
                <IconPeople size={18} />
              </button>
            )}
          </div>

          {mobileNavOpen && (
            <div className="shrink-0 border-b border-[var(--community-border)] bg-[var(--community-panel)] px-2 py-3 md:hidden">
              {sidebar}
            </div>
          )}

          {error && (
            <div className="px-4 pt-3">
              <FormError message={error} />
            </div>
          )}

          {loading ? (
            <p className="p-6 text-muted">Loading server…</p>
          ) : active && user && server ? (
            <ChannelRoom
              group={active}
              serverId={server.id}
              userId={user.id}
              displayName={communityShortName(userProfile, user.email)}
              authorLabel={communityAuthorLabel(userProfile, user.email)}
              isAppOwner={Boolean(isOwner)}
              canConfigure={canConfigure}
              isMember={isMember}
              onJoin={tryJoin}
              joining={joining}
              joinLabel={joinLabel}
              joinDisabled={joinRequestStatus === "pending"}
              onOpenSettings={() => setModal({ type: "edit-channel", channel: active })}
              onChanged={refresh}
              showServerMembers={showMembers}
              onToggleServerMembers={() => setShowMembers((v) => !v)}
              serverMemberCount={serverMembers.length}
            />
          ) : (
            <div className="flex flex-1 items-center justify-center p-8">
              <EmptyState
                title={server ? `Welcome to ${server.name}` : "Server"}
                description={
                  canConfigure
                    ? "Create a category, then add channels to get started."
                    : "No channels yet."
                }
              />
            </div>
          )}
          </div>

          {showMembers && isMember && serverMembers.length > 0 && (
            <ServerMemberSidebar members={serverMembers} />
          )}
        </div>
      </div>

      <AddServerModal open={addOpen} onClose={() => setAddOpen(false)} onDone={() => void refresh()} />

      {modal?.type === "create-channel" && user && (
        <ChannelFormModal
          title="Create channel"
          categories={categories}
          defaultCategoryId={modal.categoryId}
          serverId={serverId}
          userId={user.id}
          onClose={() => setModal(null)}
          onSaved={async (g) => {
            await refresh();
            setModal(null);
            if (g) navigate(`/community/s/${serverId}/${g.id}`);
          }}
        />
      )}

      {modal?.type === "edit-channel" && user && (
        <ChannelFormModal
          title="Channel settings"
          categories={categories}
          channel={modal.channel}
          serverId={serverId}
          userId={user.id}
          onClose={() => setModal(null)}
          onSaved={async () => {
            await refresh();
            setModal(null);
          }}
          onArchive={
            canConfigure
              ? async () => {
                  if (!confirm(`Archive #${modal.channel.name}?`)) return;
                  await archiveCommunityGroup(modal.channel.id);
                  await refresh();
                  setModal(null);
                  navigate(`/community/s/${serverId}`);
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
            await createCommunityCategory({ serverId, name, userId: user.id });
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
          onDelete={async () => {
            if (!confirm(`Delete category “${modal.category.name}”?`)) return;
            await deleteCommunityCategory(modal.category.id);
            await refresh();
            setModal(null);
          }}
        />
      )}
    </CommunityDiscordShell>
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
  onCreateChannel: (categoryId: string | null) => void;
  onEditCategory: (category: CommunityCategory) => void;
  onCreateCategory: () => void;
  loading: boolean;
}) {
  if (loading) return <p className="px-2 text-[0.8125rem] text-white/45">Loading…</p>;
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
                className="flex min-w-0 flex-1 items-center gap-1 rounded px-1 py-1 text-[0.6875rem] font-bold uppercase tracking-wider text-white/40 hover:text-white/80"
              >
                <Chevron open={open} />
                <span className="flex min-w-0 items-center gap-1 truncate">{cat.name}</span>
              </button>
              {canConfigure && (
                <div className="flex opacity-100 md:opacity-0 md:group-hover:opacity-100">
                  <button
                    type="button"
                    title="Create channel"
                    onClick={() => onCreateChannel(cat.id)}
                    className="rounded p-0.5 text-white/40 hover:bg-white/10 hover:text-white"
                  >
                    <IconPlus size={14} />
                  </button>
                  <button
                    type="button"
                    title="Edit category"
                    onClick={() => onEditCategory(cat)}
                    className="rounded p-0.5 text-white/40 hover:bg-white/10 hover:text-white"
                  >
                    <IconSettings size={14} />
                  </button>
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
                      ? "bg-white/10 font-medium text-white"
                      : "text-white/55 hover:bg-white/[0.06] hover:text-white/90"
                  }`}
                >
                  <HashGlyph className="h-4 w-4 shrink-0 opacity-70" />
                  <span className="truncate">{ch.name}</span>
                </button>
              ))}
          </div>
        );
      })}

      {uncategorized.length > 0 &&
        uncategorized.map((ch) => (
          <button
            key={ch.id}
            type="button"
            onClick={() => onSelect(ch.id)}
            className={`mb-0.5 flex w-full items-center gap-1.5 rounded-[0.5rem] px-2 py-1.5 text-left text-[0.9375rem] ${
              ch.id === activeId
                ? "bg-white/10 font-medium text-white"
                : "text-white/55 hover:bg-white/[0.06]"
            }`}
          >
            <HashGlyph className="h-4 w-4 shrink-0 opacity-70" />
            <span className="truncate">{ch.name}</span>
          </button>
        ))}

      {canConfigure && (
        <div className="space-y-0.5 pt-1">
          <button
            type="button"
            onClick={onCreateCategory}
            className="flex w-full items-center gap-2 rounded-[0.5rem] px-2 py-1.5 text-[0.8125rem] text-white/45 hover:bg-white/[0.06] hover:text-white"
          >
            <IconPlus size={14} />
            Create category
          </button>
          <button
            type="button"
            onClick={() => onCreateChannel(categories[0]?.id ?? null)}
            className="flex w-full items-center gap-2 rounded-[0.5rem] px-2 py-1.5 text-[0.8125rem] text-white/45 hover:bg-white/[0.06] hover:text-white"
          >
            <IconChat size={14} />
            Create channel
          </button>
        </div>
      )}
    </div>
  );
}

function ChannelRoom({
  group,
  serverId,
  userId,
  displayName: _displayName,
  authorLabel,
  isAppOwner,
  canConfigure,
  isMember,
  onJoin,
  joining,
  joinLabel = "Join server",
  joinDisabled = false,
  onOpenSettings,
  onChanged,
  showServerMembers = true,
  onToggleServerMembers,
  serverMemberCount = 0,
}: {
  group: CommunityGroup;
  serverId: string;
  userId: string;
  displayName: string;
  authorLabel: string;
  isAppOwner: boolean;
  canConfigure: boolean;
  isMember: boolean;
  onJoin: () => Promise<void>;
  joining: boolean;
  joinLabel?: string;
  joinDisabled?: boolean;
  onOpenSettings: () => void;
  onChanged: () => void;
  showServerMembers?: boolean;
  onToggleServerMembers?: () => void;
  serverMemberCount?: number;
}) {
  const [tab, setTab] = useState<"room" | "members">("room");
  const [messages, setMessages] = useState<CommunityMessage[]>([]);
  const [members, setMembers] = useState<CommunityMember[]>([]);
  const [draft, setDraft] = useState("");
  const [replyTo, setReplyTo] = useState<CommunityMessage | null>(null);
  const [composeKind, setComposeKind] = useState<CommunityMessageKind>("chat");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);

  const myRole = group.myRole ?? (isAppOwner || canConfigure ? "admin" : isMember ? "member" : null);
  const manage = canManageMembers(myRole, isAppOwner || canConfigure);
  const moderate = canModerate(myRole, isAppOwner || canConfigure);
  const allowsChat = group.kind === "chat" || group.kind === "both";
  const allowsSuggestions = group.kind === "suggestions" || group.kind === "both";
  const canPost = isMember || isAppOwner || canConfigure;

  const load = useCallback(async () => {
    const [msgs, mems] = await Promise.all([
      listGroupMessages(group.id, userId),
      listGroupMembers(group.id),
    ]);
    setMessages(msgs);
    setMembers(mems);
  }, [group.id, userId]);

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
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "community_message_reactions",
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
    setReplyTo(null);
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
        serverId,
        userId,
        body: draft,
        kind,
        authorName: authorLabel,
        replyToId: replyTo?.id ?? null,
      });
      setDraft("");
      setReplyTo(null);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not send");
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <header className="flex shrink-0 flex-wrap items-start justify-between gap-3 border-b border-[var(--community-border)] px-4 py-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="flex items-center gap-1.5 truncate text-[1.0625rem] font-semibold">
              <HashGlyph className="h-4 w-4 text-muted" />
              {group.name}
            </h2>
            <span className="text-[0.6875rem] text-muted">{KIND_LABELS[group.kind]}</span>
          </div>
          {(group.topic || group.description) && (
            <p className="mt-0.5 truncate text-[0.8125rem] text-muted">
              {group.topic || group.description}
            </p>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {isMember && onToggleServerMembers && serverMemberCount > 0 && (
            <button
              type="button"
              onClick={onToggleServerMembers}
              className={`hidden rounded-[var(--radius-control)] p-2 md:inline-flex ${
                showServerMembers ? "bg-fill text-foreground" : "text-muted hover:bg-fill hover:text-foreground"
              }`}
              title="Toggle member list"
            >
              <IconPeople size={18} />
            </button>
          )}
          <SegmentedControl
            value={tab}
            onChange={setTab}
            options={[
              { value: "room", label: "Chat" },
              { value: "members", label: `Members (${members.length})` },
            ]}
          />
          {(canConfigure || manage) && (
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
          onChanged={async () => {
            await load();
            onChanged();
          }}
        />
      ) : (
        <>
          <CommunityScrollBody className="px-4 py-4">
            <ul className="space-y-1">
              {messages.length === 0 && (
                <li className="py-12 text-center text-muted">
                  Welcome to #{group.name}. Say hello!
                </li>
              )}
              {messages.map((m) => (
                <MessageRow
                  key={m.id}
                  message={m}
                  isMine={m.authorId === userId}
                  canModerate={moderate}
                  userId={userId}
                  onReply={() => setReplyTo(m)}
                  onReact={async (emoji) => {
                    await toggleMessageReaction(m.id, userId, emoji);
                    await load();
                  }}
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
          </CommunityScrollBody>

          <form
            onSubmit={onSend}
            className="shrink-0 border-t border-[var(--community-border)] p-3"
          >
            {replyTo && (
              <div className="mb-2 flex items-center gap-2 rounded-lg border-l-2 border-accent bg-fill px-3 py-2">
                <div className="min-w-0 flex-1">
                  <p className="text-[0.75rem] font-medium text-accent">
                    Replying to {replyTo.authorName || "Member"}
                  </p>
                  <p className="truncate text-[0.75rem] text-muted">{replyTo.body}</p>
                </div>
                <button
                  type="button"
                  onClick={() => setReplyTo(null)}
                  className="shrink-0 rounded p-1 text-muted hover:text-foreground"
                >
                  <IconX size={14} />
                </button>
              </div>
            )}
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
                  placeholder={`Message #${group.name}`}
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
              <div className="rounded-[var(--radius-control)] border border-dashed border-black/10 px-4 py-3 text-center dark:border-white/10">
                <p className="mb-2 text-[0.875rem] text-muted">Join this server to post messages.</p>
                <Button size="sm" disabled={joining || joinDisabled} onClick={() => void onJoin()}>
                  {joining ? "Joining…" : joinLabel}
                </Button>
              </div>
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
  userId: _userId,
  onReply,
  onReact,
  onStatus,
  onDelete,
}: {
  message: CommunityMessage;
  isMine: boolean;
  canModerate: boolean;
  userId: string;
  onReply: () => void;
  onReact: (emoji: string) => Promise<void>;
  onStatus: (s: SuggestionStatus) => Promise<void>;
  onDelete: () => Promise<void>;
}) {
  const [pickerOpen, setPickerOpen] = useState(false);

  if (message.kind === "system") {
    return <li className="text-center text-[0.75rem] text-muted">{message.body}</li>;
  }
  const isSuggestion = message.kind === "suggestion";
  const initial = (message.authorName || "?")[0]?.toUpperCase();

  return (
    <li className="group relative flex gap-3 rounded px-2 py-1 hover:bg-[var(--community-hover)]">
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-accent/20 text-sm font-semibold text-accent">
        {initial}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-baseline gap-2">
          <span className="text-[0.875rem] font-semibold">
            {isMine ? "You" : message.authorName || "Member"}
          </span>
          <span className="text-[0.6875rem] text-muted">{formatCommunityTime(message.createdAt)}</span>
          {isSuggestion && message.suggestionStatus && (
            <span className="text-[0.6875rem] text-muted">
              · {SUGGESTION_STATUS_LABELS[message.suggestionStatus]}
            </span>
          )}
        </div>

        {message.replyPreview && (
          <div className="mb-1 flex items-center gap-1 border-l-2 border-accent/50 pl-2 text-[0.75rem] text-muted">
            <span className="font-medium text-accent">{message.replyPreview.authorName || "Member"}</span>
            <span className="truncate">{message.replyPreview.body}</span>
          </div>
        )}

        {isSuggestion && (
          <p className="mb-0.5 text-[0.6875rem] font-semibold uppercase tracking-wide text-muted">
            Suggestion
          </p>
        )}
        <p className="whitespace-pre-wrap break-words text-[0.9375rem]">{message.body}</p>

        {message.reactions.length > 0 && (
          <div className="mt-1 flex flex-wrap gap-1">
            {message.reactions.map((r) => (
              <button
                key={r.emoji}
                type="button"
                onClick={() => void onReact(r.emoji)}
                className={`flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs transition ${
                  r.reactedByMe
                    ? "border-accent/50 bg-accent/15"
                    : "border-[var(--community-border)] bg-fill hover:border-accent/30"
                }`}
              >
                <span>{r.emoji}</span>
                <span className="text-muted">{r.count}</span>
              </button>
            ))}
          </div>
        )}

        {(canMod || isMine) && isSuggestion && canMod && message.suggestionStatus === "open" && (
          <div className="mt-1 flex flex-wrap gap-2">
            <button type="button" className="text-[0.75rem] text-link" onClick={() => void onStatus("accepted")}>
              Accept
            </button>
            <button type="button" className="text-[0.75rem] text-link" onClick={() => void onStatus("declined")}>
              Decline
            </button>
            <button type="button" className="text-[0.75rem] text-link" onClick={() => void onStatus("implemented")}>
              Mark implemented
            </button>
          </div>
        )}
      </div>

      <div className="absolute -top-3 right-2 hidden items-center gap-0.5 rounded border border-[var(--community-border)] bg-[var(--community-panel)] p-0.5 shadow-sm group-hover:flex">
        {QUICK_EMOJIS.slice(0, 3).map((emoji) => (
          <button
            key={emoji}
            type="button"
            onClick={() => void onReact(emoji)}
            className="rounded p-1 text-sm hover:bg-[var(--community-hover)]"
          >
            {emoji}
          </button>
        ))}
        <button
          type="button"
          onClick={() => setPickerOpen((v) => !v)}
          className="rounded p-1 text-[0.75rem] text-muted hover:bg-[var(--community-hover)]"
        >
          +
        </button>
        <button
          type="button"
          onClick={onReply}
          className="rounded px-1.5 py-1 text-[0.6875rem] text-muted hover:bg-[var(--community-hover)]"
        >
          Reply
        </button>
        {(canMod || isMine) && (
          <button
            type="button"
            onClick={() => void onDelete()}
            className="rounded px-1.5 py-1 text-[0.6875rem] text-muted hover:text-destructive"
          >
            Delete
          </button>
        )}
      </div>

      {pickerOpen && (
        <div className="absolute -top-10 right-2 z-10 flex gap-1 rounded border border-[var(--community-border)] bg-[var(--community-panel)] p-1.5 shadow-lg">
          {QUICK_EMOJIS.map((emoji) => (
            <button
              key={emoji}
              type="button"
              onClick={() => {
                void onReact(emoji);
                setPickerOpen(false);
              }}
              className="rounded p-1 text-lg hover:bg-[var(--community-hover)]"
            >
              {emoji}
            </button>
          ))}
        </div>
      )}
    </li>
  );
}

function ServerMemberSidebar({ members }: { members: CommunityServerMember[] }) {
  const grouped = useMemo(() => {
    const map = new Map<string, CommunityServerMember[]>();
    for (const m of members) {
      const list = map.get(m.roleName) ?? [];
      list.push(m);
      map.set(m.roleName, list);
    }
    return [...map.entries()].sort((a, b) => {
      const posA = a[1][0]?.rolePosition ?? 100;
      const posB = b[1][0]?.rolePosition ?? 100;
      return posA - posB;
    });
  }, [members]);

  return (
    <aside className="hidden w-52 shrink-0 flex-col border-l border-[var(--community-border)] bg-[var(--community-panel)] min-h-0 md:flex">
      <CommunityScrollBody className="px-2 py-3">
        {grouped.map(([roleName, roleMembers]) => (
          <div key={roleName} className="mb-4">
            <p className="mb-1 px-2 text-[0.6875rem] font-bold uppercase tracking-wider text-muted">
              {roleName} — {roleMembers.length}
            </p>
            {roleMembers.map((m) => {
              const label = m.displayName || m.communityUsername || "Member";
              const colorStyle = m.roleColor ? roleColorStyle(m.roleColor) : undefined;
              return (
                <div
                  key={m.userId}
                  className="flex items-center gap-2 rounded px-2 py-1.5 hover:bg-[var(--community-hover)]"
                >
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-accent/20 text-xs font-medium text-accent">
                    {label[0]?.toUpperCase()}
                  </div>
                  <span className="truncate text-[0.875rem]" style={colorStyle}>
                    {label}
                  </span>
                </div>
              );
            })}
          </div>
        ))}
      </CommunityScrollBody>
    </aside>
  );
}

function MembersPanel({
  groupId,
  members,
  userId,
  canManage,
  onChanged,
}: {
  groupId: string;
  members: CommunityMember[];
  userId: string;
  canManage: boolean;
  onChanged: () => Promise<void>;
}) {
  const [candidates, setCandidates] = useState<{ userId: string; displayName: string | null }[]>([]);
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
    <CommunityScrollBody className="p-4">
      <div className="space-y-4">
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
                    await updateMemberRole(groupId, m.userId, e.target.value as CommunityMemberRole);
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
            <p className="text-[0.8125rem] text-muted">No library teammates to add.</p>
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
    </CommunityScrollBody>
  );
}

