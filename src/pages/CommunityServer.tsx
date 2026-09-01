import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  forwardRef,
  type FormEvent,
} from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useAuth } from "@/lib/auth";
import { useLibrary } from "@/lib/library";
import { supabase } from "@/lib/supabase";
import {
  archiveCommunityGroup,
  createCommunityCategory,
  deleteCommunityCategory,
  deleteGroupMessage,
  getServer,
  isServerMember,
  joinServer,
  listCommunityCategories,
  listCommunityGroups,
  listGroupMessages,
  getMyJoinRequestStatus,
  requestJoinServer,
  renameCommunityCategory,
  listServerMembers,
  listServerRoles,
  listServerBoosts,
  markChannelRead,
  listUnreadCounts,
  listPinnedMessages,
  pinMessage,
  unpinMessage,
  updateGroupMessage,
  sendGroupMessage,
  listServerEmoji,
  listServerStickers,
  uploadCommunityImage,
  toggleMessageReaction,
  updateSuggestionStatus,
} from "@/lib/community";
import {
  SUGGESTION_STATUS_LABELS,
  canManageMembers,
  canModerate,
  formatCommunityTime,
  type CommunityCategory,
  type CommunityGroup,
  type CommunityMessage,
  type CommunityServer,
  type CommunityServerMember,
  type CommunityServerEmoji,
  type CommunityServerRole,
  type CommunityServerSticker,
  type SuggestionStatus,
} from "@/lib/community-types";
import { Button } from "@/components/Button";
import { FormError } from "@/components/form";
import { EmptyState } from "@/components/layout";
import { IconChat, IconDots, IconPlus, IconReply, IconSearch, IconSettings } from "@/components/Icons";
import { communityAuthorLabel, communityShortName } from "@/lib/community-identity";
import { isAppOwnerUser, listAppOwnerUserIds } from "@/lib/app-owner";
import { getChatRoleIconUrl } from "@/lib/chat-badges";
import { roleColorTextStyle } from "@/lib/role-color";
import { CommunityDiscordShell, CommunityScrollBody } from "@/components/CommunityRail";
import { CommunityChatHeader } from "@/components/CommunityChatHeader";
import { CommunityDrawer } from "@/components/CommunityDrawer";
import { CommunityMemberDrawer } from "@/components/CommunityMemberDrawer";
import { CommunityActionSheet } from "@/components/CommunityActionSheet";
import { ChannelKindGlyph, channelKindBanner, canPostInChannelKind } from "@/components/community/ChannelKind";
import { DiscordChannelIcon } from "@/components/community/DiscordIcons";
import { ChannelMessageComposer } from "@/components/community/ChannelMessageComposer";
import { ChannelToolbar } from "@/components/community/ChannelToolbar";
import { ChannelWelcome } from "@/components/community/ChannelWelcome";
import { ChatAuthorBadge } from "@/components/community/ChatAuthorBadge";
import { CommunityAvatar } from "@/components/community/CommunityAvatar";
import { CommunityUserPanel } from "@/components/community/CommunityUserPanel";
import { ServerChannelHeader } from "@/components/community/ServerChannelHeader";
import { MemberListPanel } from "@/components/community/MemberListPanel";
import {
  MessageDateDivider,
  TypingIndicator,
  formatMessageDateDivider,
  messageDayKey,
} from "@/components/community/discord-ui";
import { CommunityProfileModal } from "@/components/community/CommunityProfileModal";
import { ChannelFormModal, CategoryFormModal } from "@/components/community-server-modals";
import { AddServerModal } from "@/components/AddServerModal";
import { PinnedMessagesBar } from "@/components/community/PinnedMessagesBar";
import { MentionAutocomplete } from "@/components/community/MentionAutocomplete";
import {
  applyMention,
  extractMentionQuery,
  filterMentionMembers,
  renderMessageWithMentions,
  type MentionMember,
} from "@/lib/community-mentions";
import { listCommunityProfiles } from "@/lib/community-profile";
import type { CommunityProfile } from "@/lib/community-types";

const QUICK_EMOJIS = ["👍", "❤️", "😂", "🔥", "🎉", "👀"];
const MESSAGE_GROUP_MS = 7 * 60 * 1000;

function shouldGroupMessages(prev: CommunityMessage | null, curr: CommunityMessage): boolean {
  if (!prev || !curr.authorId || prev.authorId !== curr.authorId) return false;
  if (prev.kind !== "chat" || curr.kind !== "chat") return false;
  const prevTime = new Date(prev.createdAt).getTime();
  const currTime = new Date(curr.createdAt).getTime();
  return currTime - prevTime < MESSAGE_GROUP_MS;
}

type Modal =
  | null
  | { type: "create-channel"; categoryId: string | null }
  | { type: "edit-channel"; channel: CommunityGroup }
  | { type: "create-category" }
  | { type: "edit-category"; category: CommunityCategory };

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
  const [memberDrawerOpen, setMemberDrawerOpen] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
  const [joinRequestStatus, setJoinRequestStatus] = useState<string | null>(null);
  const [channelSearch, setChannelSearch] = useState("");
  const [showMembers, setShowMembers] = useState(true);
  const [serverMembers, setServerMembers] = useState<CommunityServerMember[]>([]);
  const [unreadCounts, setUnreadCounts] = useState<Map<string, number>>(new Map());
  const [profileTarget, setProfileTarget] = useState<{
    userId?: string;
    username?: string | null;
  } | null>(null);
  const [memberProfiles, setMemberProfiles] = useState<Map<string, CommunityProfile>>(new Map());
  const [serverBoosters, setServerBoosters] = useState<Set<string>>(new Set());
  const [serverRoles, setServerRoles] = useState<CommunityServerRole[]>([]);
  const [appOwnerUserIds, setAppOwnerUserIds] = useState<Set<string>>(new Set());

  const openProfile = useCallback((target: { userId?: string; username?: string | null }) => {
    setProfileTarget(target);
  }, []);

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
      const [cats, groups, srvMembers, roles, ownerIds] = await Promise.all([
        listCommunityCategories(serverId),
        listCommunityGroups(user.id, serverId),
        member ? listServerMembers(serverId) : Promise.resolve([] as CommunityServerMember[]),
        member ? listServerRoles(serverId) : Promise.resolve([] as CommunityServerRole[]),
        listAppOwnerUserIds().catch(() => new Set<string>()),
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
      setServerRoles(roles);
      setAppOwnerUserIds(ownerIds);
      if (srvMembers.length > 0) {
        const profiles = await listCommunityProfiles(srvMembers.map((m) => m.userId));
        setMemberProfiles(profiles);
      } else {
        setMemberProfiles(new Map());
      }
      if (member) {
        const boosts = await listServerBoosts(serverId);
        setServerBoosters(new Set(boosts.map((b) => b.userId)));
      } else {
        setServerBoosters(new Set());
      }
      if (member && groups.length > 0) {
        const unread = await listUnreadCounts(
          user.id,
          groups.map((g) => g.id),
        );
        setUnreadCounts(unread);
      } else {
        setUnreadCounts(new Map());
      }
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

  const activeChannelRole =
    active?.myRole ?? (isOwner || canConfigure ? "admin" : isMember ? "member" : null);
  const canManageActiveChannel = Boolean(
    active && (canConfigure || canManageMembers(activeChannelRole, isOwner || canConfigure)),
  );

  const roleById = useMemo(() => new Map(serverRoles.map((r) => [r.id, r])), [serverRoles]);
  const myCommunityProfile = user ? memberProfiles.get(user.id) ?? null : null;

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
      unreadCounts={unreadCounts}
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
        <aside className="hidden w-60 shrink-0 flex-col bg-[var(--community-panel)] min-h-0 md:flex">
          {server && (
            <ServerChannelHeader
              serverName={server.name}
              serverId={serverId}
              canConfigure={canConfigure}
              onCreateChannel={
                canConfigure
                  ? () => setModal({ type: "create-channel", categoryId: categories[0]?.id ?? null })
                  : undefined
              }
              onInvite={isMember ? () => navigate(`/community/s/${serverId}/settings`) : undefined}
            />
          )}
          {!isMember && server && (server.isPublic || server.isOfficial || server.joinMode === "invite") && (
            <div className="shrink-0 border-b border-[var(--community-border)] bg-[var(--community-channel-hover)] px-3 py-2">
              <div className="flex items-center justify-between gap-2">
                <p className="text-[0.75rem] text-muted">
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
          <CommunityScrollBody className="px-2 py-2 pt-3">{sidebar}</CommunityScrollBody>
          {user && (
            <CommunityUserPanel
              profile={myCommunityProfile}
              fallbackName={communityShortName(userProfile, user.email)}
            />
          )}
        </aside>

        <div className="flex min-h-0 min-w-0 flex-1 overflow-hidden">
          <div className="flex min-h-0 min-w-0 flex-1 flex-col bg-[var(--community-chat)] text-foreground [&_.text-muted]:!text-muted [&_.text-foreground]:!text-foreground [&_h2]:text-foreground">
          {server && !loading && (
            <CommunityChatHeader
              serverName={server.name}
              channelName={active?.name}
              canManageChannel={canManageActiveChannel}
              memberCount={serverMembers.length}
              onOpenChannels={() => setMobileNavOpen(true)}
              onOpenMembers={() => setMemberDrawerOpen(true)}
              onOpenChannelSettings={
                active
                  ? () => setModal({ type: "edit-channel", channel: active })
                  : undefined
              }
            />
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
              serverMembers={serverMembers}
              memberProfiles={memberProfiles}
              serverBoosters={serverBoosters}
              roleById={roleById}
              appOwnerUserIds={appOwnerUserIds}
              onOpenProfile={openProfile}
              onMarkRead={user ? () => void markChannelRead(user.id, active.id) : undefined}
            />
          ) : (
            <div className="flex flex-1 flex-col items-center justify-center gap-4 p-8">
              <EmptyState
                title={server ? `Welcome to ${server.name}` : "Server"}
                description={
                  canConfigure
                    ? "Create a channel or category to get started."
                    : "No channels yet."
                }
              />
              {canConfigure && (
                <div className="flex flex-wrap justify-center gap-2">
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => setModal({ type: "create-category" })}
                  >
                    <IconPlus size={14} className="mr-1.5 inline" />
                    Create category
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => setModal({ type: "create-channel", categoryId: categories[0]?.id ?? null })}
                  >
                    <IconChat size={14} className="mr-1.5 inline" />
                    Create channel
                  </Button>
                </div>
              )}
            </div>
          )}
          </div>

          {showMembers && isMember && serverMembers.length > 0 && (
            <ServerMemberSidebar
              members={serverMembers}
              memberProfiles={memberProfiles}
              serverBoosters={serverBoosters}
              appOwnerUserIds={appOwnerUserIds}
              onOpenProfile={openProfile}
            />
          )}
        </div>
      </div>

      <CommunityDrawer
        open={mobileNavOpen}
        onClose={() => setMobileNavOpen(false)}
        title={server?.name ?? "Channels"}
        headerActions={
          canConfigure && serverId ? (
            <Link
              to={`/community/s/${serverId}/settings`}
              onClick={() => setMobileNavOpen(false)}
              className="rounded-lg p-2 text-muted hover:bg-[var(--community-hover)] hover:text-foreground"
              title="Server settings"
              aria-label="Server settings"
            >
              <IconSettings size={18} />
            </Link>
          ) : undefined
        }
        footer={
          canConfigure ? (
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => {
                  setModal({ type: "create-category" });
                  setMobileNavOpen(false);
                }}
                className="flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-fill px-3 py-2 text-[0.8125rem] font-medium text-foreground hover:bg-[var(--community-hover)]"
              >
                <IconPlus size={14} />
                Category
              </button>
              <button
                type="button"
                onClick={() => {
                  setModal({ type: "create-channel", categoryId: categories[0]?.id ?? null });
                  setMobileNavOpen(false);
                }}
                className="flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-accent px-3 py-2 text-[0.8125rem] font-medium text-accent-contrast hover:opacity-90"
              >
                <IconChat size={14} />
                Channel
              </button>
            </div>
          ) : undefined
        }
      >
        <div className="px-2 py-2">
          <label className="relative mb-2 block">
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
          {sidebar}
        </div>
      </CommunityDrawer>

      <CommunityMemberDrawer
        open={memberDrawerOpen}
        onClose={() => setMemberDrawerOpen(false)}
        members={serverMembers}
        memberProfiles={memberProfiles}
        serverBoosters={serverBoosters}
        appOwnerUserIds={appOwnerUserIds}
        onOpenProfile={openProfile}
      />

      <CommunityProfileModal
        open={Boolean(profileTarget)}
        onClose={() => setProfileTarget(null)}
        userId={profileTarget?.userId}
        username={profileTarget?.username}
        isSelf={Boolean(profileTarget?.userId && user && profileTarget.userId === user.id)}
      />

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
  unreadCounts,
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
  unreadCounts?: Map<string, number>;
  onSelect: (id: string) => void;
  onCreateChannel: (categoryId: string | null) => void;
  onEditCategory: (category: CommunityCategory) => void;
  onCreateCategory: () => void;
  loading: boolean;
}) {
  if (loading) return <p className="px-2 text-[0.8125rem] text-muted">Loading…</p>;
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
                className="flex min-w-0 flex-1 items-center gap-1 rounded px-1 py-0.5 text-left text-xs font-semibold uppercase tracking-wide text-muted hover:text-foreground"
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
                    className="rounded p-0.5 text-muted hover:bg-[var(--community-hover)] hover:text-foreground"
                  >
                    <IconPlus size={14} />
                  </button>
                  <button
                    type="button"
                    title="Edit category"
                    onClick={() => onEditCategory(cat)}
                    className="rounded p-0.5 text-muted hover:bg-[var(--community-hover)] hover:text-foreground"
                  >
                    <IconSettings size={14} />
                  </button>
                </div>
              )}
            </div>
            {open && (
              <div className="pl-2">
              {list.map((ch) => (
                <button
                  key={ch.id}
                  type="button"
                  onClick={() => onSelect(ch.id)}
                  className={`mb-px flex h-8 w-full items-center gap-1.5 rounded px-2 py-0 text-left text-base transition ${
                    ch.id === activeId
                      ? "bg-[var(--community-channel-active)] text-foreground"
                      : "text-muted hover:bg-[var(--community-channel-hover)] hover:text-foreground"
                  }`}
                >
                  <DiscordChannelIcon kind={ch.kind} />
                  <span className={`truncate ${unreadCounts?.get(ch.id) ? "font-semibold text-foreground" : ""}`}>
                    {ch.name}
                  </span>
                  {unreadCounts?.get(ch.id) ? (
                    <span className="ml-auto h-2 w-2 shrink-0 rounded-full bg-foreground" />
                  ) : null}
                </button>
              ))}
              </div>
            )}
          </div>
        );
      })}

      {uncategorized.length > 0 &&
        uncategorized.map((ch) => (
          <button
            key={ch.id}
            type="button"
            onClick={() => onSelect(ch.id)}
            className={`mb-px flex h-8 w-full items-center gap-1.5 rounded px-2 py-0 text-left text-base ${
              ch.id === activeId
                ? "bg-[var(--community-channel-active)] text-foreground"
                : "text-muted hover:bg-[var(--community-channel-hover)] hover:text-foreground"
            }`}
          >
            <DiscordChannelIcon kind={ch.kind} />
            <span className="truncate">{ch.name}</span>
          </button>
        ))}

      {canConfigure && (
        <div className="space-y-0.5 pt-1">
          <button
            type="button"
            onClick={onCreateCategory}
            className="flex w-full items-center gap-2 rounded-[0.5rem] px-2 py-1.5 text-[0.8125rem] text-muted hover:bg-[var(--community-channel-hover)] hover:text-foreground"
          >
            <IconPlus size={14} />
            Create category
          </button>
          <button
            type="button"
            onClick={() => onCreateChannel(categories[0]?.id ?? null)}
            className="flex w-full items-center gap-2 rounded-[0.5rem] px-2 py-1.5 text-[0.8125rem] text-muted hover:bg-[var(--community-channel-hover)] hover:text-foreground"
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
  serverMembers = [],
  memberProfiles = new Map(),
  serverBoosters = new Set<string>(),
  roleById = new Map<string, CommunityServerRole>(),
  appOwnerUserIds = new Set<string>(),
  onOpenProfile,
  onMarkRead,
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
  serverMembers?: CommunityServerMember[];
  memberProfiles?: Map<string, CommunityProfile>;
  serverBoosters?: Set<string>;
  roleById?: Map<string, CommunityServerRole>;
  appOwnerUserIds?: Set<string>;
  onOpenProfile?: (target: { userId?: string; username?: string | null }) => void;
  onMarkRead?: () => void;
}) {
  const [messages, setMessages] = useState<CommunityMessage[]>([]);
  const [pinned, setPinned] = useState<CommunityMessage[]>([]);
  const [typingUsers, setTypingUsers] = useState<string[]>([]);
  const [draft, setDraft] = useState("");
  const [replyTo, setReplyTo] = useState<CommunityMessage | null>(null);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const [mentionQuery, setMentionQuery] = useState<string | null>(null);
  const [forumThreadId, setForumThreadId] = useState<string | null>(null);
  const [joinedVoice, setJoinedVoice] = useState(false);
  const [voiceParticipants, setVoiceParticipants] = useState<{ userId: string; name: string }[]>([]);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [pinsExpanded, setPinsExpanded] = useState(true);
  const [serverEmoji, setServerEmoji] = useState<CommunityServerEmoji[]>([]);
  const [serverStickers, setServerStickers] = useState<CommunityServerSticker[]>([]);
  const [scrolledUp, setScrolledUp] = useState(false);
  const [highlightMessageId, setHighlightMessageId] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const messageRefs = useRef<Map<string, HTMLLIElement>>(new Map());
  const presenceRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const voiceChannelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  const memberByUserId = useMemo(
    () => new Map(serverMembers.map((m) => [m.userId, m])),
    [serverMembers],
  );

  const mentionMembers = useMemo<MentionMember[]>(
    () =>
      serverMembers.map((m) => ({
        userId: m.userId,
        label: m.displayName || m.communityUsername || "Member",
        username: m.communityUsername,
      })),
    [serverMembers],
  );

  const mentionSuggestions = useMemo(
    () => (mentionQuery === null ? [] : filterMentionMembers(mentionMembers, mentionQuery)),
    [mentionQuery, mentionMembers],
  );

  const myRole = group.myRole ?? (isAppOwner || canConfigure ? "admin" : isMember ? "member" : null);
  const manage = canManageMembers(myRole, isAppOwner || canConfigure);
  const moderate = canModerate(myRole, isAppOwner || canConfigure);
  const canPost = canPostInChannelKind(group.kind, {
    isMember,
    canConfigure,
    canModerate: moderate,
    canManage: manage,
    isAppOwner: Boolean(isAppOwner),
  });
  const isVoice = group.kind === "voice";
  const isForum = group.kind === "forum";
  const kindBanner = channelKindBanner(group.kind);

  const forumPosts = useMemo(
    () => (isForum ? messages.filter((m) => !m.replyToId && m.kind !== "system") : []),
    [isForum, messages],
  );
  const replyCountByPost = useMemo(() => {
    const counts = new Map<string, number>();
    for (const m of messages) {
      if (m.replyToId) counts.set(m.replyToId, (counts.get(m.replyToId) ?? 0) + 1);
    }
    return counts;
  }, [messages]);
  const visibleMessages = useMemo(() => {
    let base: CommunityMessage[];
    if (!isForum) base = messages;
    else if (forumThreadId) {
      base = messages.filter((m) => m.id === forumThreadId || m.replyToId === forumThreadId);
    } else {
      base = forumPosts;
    }
    const q = searchQuery.trim().toLowerCase();
    if (!q) return base;
    return base.filter(
      (m) =>
        m.body.toLowerCase().includes(q) ||
        (m.authorName?.toLowerCase().includes(q) ?? false),
    );
  }, [isForum, forumThreadId, messages, forumPosts, searchQuery]);

  useEffect(() => {
    void listServerEmoji(serverId)
      .then(setServerEmoji)
      .catch(() => setServerEmoji([]));
    void listServerStickers(serverId)
      .then(setServerStickers)
      .catch(() => setServerStickers([]));
  }, [serverId]);

  const load = useCallback(async () => {
    const [msgs, pins] = await Promise.all([
      listGroupMessages(group.id, userId),
      listPinnedMessages(group.id).catch(() => [] as CommunityMessage[]),
    ]);
    setMessages(msgs);
    setPinned(pins);
    onMarkRead?.();
  }, [group.id, userId, onMarkRead]);

  useEffect(() => {
    void load().catch((err) =>
      setError(err instanceof Error ? err.message : "Failed to load channel"),
    );
  }, [load]);

  useEffect(() => {
    const channel = supabase
      .channel(`community:${group.id}`, { config: { presence: { key: userId } } })
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
      .on("presence", { event: "sync" }, () => {
        const state = channel.presenceState() as Record<string, { name?: string; typing?: boolean }[]>;
        const names = Object.entries(state)
          .filter(([key]) => key !== userId)
          .flatMap(([, presences]) => presences)
          .filter((p) => p.typing && p.name)
          .map((p) => p.name as string);
        setTypingUsers([...new Set(names)].slice(0, 3));
      })
      .subscribe(async (status) => {
        if (status === "SUBSCRIBED") {
          await channel.track({ name: authorLabel, typing: false });
        }
      });
    presenceRef.current = channel;
    return () => {
      presenceRef.current = null;
      void supabase.removeChannel(channel);
    };
  }, [group.id, load, userId, authorLabel]);

  useEffect(() => {
    if (scrolledUp) return;
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length, scrolledUp]);

  useEffect(() => {
    setReplyTo(null);
    setForumThreadId(null);
    setJoinedVoice(false);
    setSearchOpen(false);
    setSearchQuery("");
  }, [group.id, group.kind]);

  useEffect(() => {
    if (!isVoice || !isMember) return;

    const channel = supabase
      .channel(`voice:${group.id}`, { config: { presence: { key: userId } } })
      .on("presence", { event: "sync" }, () => {
        const state = channel.presenceState() as Record<
          string,
          { name?: string; inVoice?: boolean }[]
        >;
        const participants: { userId: string; name: string }[] = [];
        for (const [key, presences] of Object.entries(state)) {
          for (const p of presences) {
            if (p.inVoice) {
              participants.push({ userId: key, name: p.name || "Member" });
            }
          }
        }
        setVoiceParticipants(participants);
        setJoinedVoice(participants.some((p) => p.userId === userId));
      })
      .subscribe(async (status) => {
        if (status === "SUBSCRIBED") {
          voiceChannelRef.current = channel;
        }
      });

    return () => {
      voiceChannelRef.current = null;
      void supabase.removeChannel(channel);
    };
  }, [group.id, isVoice, isMember, userId]);

  const toggleVoice = async () => {
    const channel = voiceChannelRef.current;
    if (!channel) return;
    if (joinedVoice) {
      await channel.track({ name: authorLabel, inVoice: false });
      setJoinedVoice(false);
    } else {
      await channel.track({ name: authorLabel, inVoice: true });
      setJoinedVoice(true);
    }
  };

  const onSend = async (e: FormEvent) => {
    e.preventDefault();
    if (!draft.trim() || !canPost) return;
    setSending(true);
    setError("");
    try {
      await sendGroupMessage({
        groupId: group.id,
        serverId,
        userId,
        body: draft,
        kind: "chat",
        authorName: authorLabel,
        replyToId: isForum ? forumThreadId ?? replyTo?.id ?? null : replyTo?.id ?? null,
      });
      setDraft("");
      setReplyTo(null);
      setMentionQuery(null);
      if (isForum && !forumThreadId) {
        // Stay on post list after creating a new forum post
      }
      await load();
      onChanged();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not send");
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col relative">
      <ChannelToolbar
          group={group}
          pinnedCount={pinned.length}
          pinsOpen={pinsExpanded}
          onTogglePins={() => setPinsExpanded((v) => !v)}
          searchOpen={searchOpen}
          onToggleSearch={() => setSearchOpen((v) => !v)}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          membersOpen={showServerMembers}
          onToggleMembers={onToggleServerMembers}
          memberCount={serverMemberCount}
          onOpenSettings={onOpenSettings}
          canManage={canConfigure || manage}
        />

      {pinned.length > 0 && pinsExpanded && (
        <PinnedMessagesBar
          pins={pinned}
          canManage={moderate || manage}
          onJump={(messageId) => {
            setHighlightMessageId(messageId);
            messageRefs.current.get(messageId)?.scrollIntoView({ behavior: "smooth", block: "center" });
            window.setTimeout(() => setHighlightMessageId(null), 2000);
          }}
          onUnpin={async (messageId) => {
            await unpinMessage(group.id, messageId);
            await load();
          }}
        />
      )}

      {kindBanner && (
        <div className="shrink-0 border-b border-[var(--community-border)] bg-fill/30 px-4 py-2">
          <p className="text-[0.75rem] text-muted">{kindBanner}</p>
        </div>
      )}

      {isVoice ? (
        <div className="flex min-h-0 flex-1 flex-col">
          <CommunityScrollBody className="flex-1 px-4 py-6">
            <div className="mx-auto max-w-md text-center">
              <ChannelKindGlyph kind="voice" className="mx-auto h-12 w-12 text-accent/60" />
              <p className="mt-3 text-[1rem] font-semibold">#{group.name}</p>
              <p className="mt-1 text-[0.875rem] text-muted">
                Voice lounge — join to show you&apos;re here. Live audio uses your device mic when
                you connect (library communities can hang out while reading).
              </p>
              {isMember && (
                <Button className="mt-4" variant={joinedVoice ? "secondary" : "primary"} onClick={() => void toggleVoice()}>
                  {joinedVoice ? "Leave voice" : "Join voice"}
                </Button>
              )}
            </div>
            <div className="mx-auto mt-8 max-w-md">
              <p className="mb-2 text-[0.6875rem] font-bold uppercase tracking-wider text-muted">
                In voice — {voiceParticipants.length}
              </p>
              {voiceParticipants.length === 0 ? (
                <p className="text-[0.875rem] text-muted">Nobody in voice yet. Be the first!</p>
              ) : (
                <ul className="space-y-1">
                  {voiceParticipants.map((p) => {
                    const profile = memberProfiles.get(p.userId);
                    const member = serverMembers.find((m) => m.userId === p.userId);
                    return (
                      <li key={p.userId}>
                        <button
                          type="button"
                          onClick={() =>
                            onOpenProfile?.({
                              userId: p.userId,
                              username: member?.communityUsername,
                            })
                          }
                          className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 hover:bg-[var(--community-hover)]"
                        >
                          <CommunityAvatar
                            profile={profile}
                            fallbackName={p.name}
                            size="sm"
                          />
                          <span className="text-[0.875rem]">{p.name}</span>
                          {p.userId === userId && (
                            <span className="text-[0.6875rem] text-muted">(you)</span>
                          )}
                        </button>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          </CommunityScrollBody>
        </div>
      ) : (
        <>
          {isForum && forumThreadId && (
            <div className="shrink-0 border-b border-[var(--community-border)] px-4 py-2">
              <button
                type="button"
                onClick={() => {
                  setForumThreadId(null);
                  setReplyTo(null);
                }}
                className="text-[0.8125rem] text-link"
              >
                ← Back to posts
              </button>
            </div>
          )}
          <CommunityScrollBody
            className="px-0 py-4"
            onScroll={(e) => {
              const el = e.currentTarget;
              const atBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 96;
              setScrolledUp(!atBottom);
            }}
          >
            <ul className="space-y-1">
              {!isForum && <ChannelWelcome group={group} />}
              {visibleMessages.length === 0 && (
                <li className="py-12 text-center text-muted">
                  {isForum
                    ? forumThreadId
                      ? "No replies yet. Start the conversation!"
                      : `Welcome to #${group.name}. Create the first post!`
                    : group.kind === "announcement"
                      ? `Welcome to #${group.name}. Announcements appear here.`
                      : `Welcome to #${group.name}. Say hello!`}
                </li>
              )}
              {isForum && !forumThreadId
                ? visibleMessages.map((m) => (
                    <li
                      key={m.id}
                      className="rounded-lg border border-[var(--community-border)] bg-fill/20 p-3 hover:bg-[var(--community-hover)]"
                    >
                      <button
                        type="button"
                        className="w-full text-left"
                        onClick={() => setForumThreadId(m.id)}
                      >
                        <p className="text-[0.8125rem] font-semibold">{m.authorName || "Member"}</p>
                        <p className="mt-1 line-clamp-3 whitespace-pre-wrap text-[0.9375rem]">{m.body}</p>
                        <p className="mt-2 text-[0.75rem] text-muted">
                          {replyCountByPost.get(m.id) ?? 0} repl
                          {(replyCountByPost.get(m.id) ?? 0) === 1 ? "y" : "ies"} ·{" "}
                          {formatCommunityTime(m.createdAt)}
                        </p>
                      </button>
                    </li>
                  ))
                : visibleMessages.flatMap((m, index) => {
                const prev = index > 0 ? visibleMessages[index - 1] : null;
                const grouped = shouldGroupMessages(prev, m);
                const member = m.authorId ? memberByUserId.get(m.authorId) : undefined;
                const role = member?.roleId ? roleById.get(member.roleId) : undefined;
                const chatRoleIconUrl = getChatRoleIconUrl(role);
                const items = [];
                if (!prev || messageDayKey(prev.createdAt) !== messageDayKey(m.createdAt)) {
                  items.push(
                    <MessageDateDivider
                      key={`date-${m.id}`}
                      label={formatMessageDateDivider(m.createdAt)}
                    />,
                  );
                }
                items.push(
                <MessageRow
                  key={m.id}
                  ref={(el) => {
                    if (el) messageRefs.current.set(m.id, el);
                    else messageRefs.current.delete(m.id);
                  }}
                  message={m}
                  grouped={grouped}
                  highlighted={highlightMessageId === m.id}
                  mentionMembers={mentionMembers}
                  authorProfile={m.authorId ? memberProfiles.get(m.authorId) : null}
                  isServerBooster={m.authorId ? serverBoosters.has(m.authorId) : false}
                  isAppOwnerAuthor={isAppOwnerUser(m.authorId, appOwnerUserIds)}
                  roleColor={member?.roleColor}
                  roleIconUrl={chatRoleIconUrl}
                  isMine={m.authorId === userId}
                  canModerate={moderate}
                  canPin={moderate || manage}
                  userId={userId}
                  onOpenProfile={
                    m.authorId
                      ? () =>
                          onOpenProfile?.({
                            userId: m.authorId!,
                            username: member?.communityUsername,
                          })
                      : undefined
                  }
                  onReply={() => {
                    if (isForum && forumThreadId) setReplyTo(m);
                    else if (isForum) setForumThreadId(m.id);
                    else setReplyTo(m);
                  }}
                  onEdit={async (body) => {
                    await updateGroupMessage(m.id, userId, body);
                    await load();
                  }}
                  onReact={async (emoji) => {
                    await toggleMessageReaction(m.id, userId, emoji);
                    await load();
                  }}
                  onPin={async () => {
                    await pinMessage(group.id, m.id, userId);
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
                />,
              );
                return items;
              })}
              <div ref={bottomRef} />
            </ul>
          </CommunityScrollBody>

          {mentionSuggestions.length > 0 && (
            <div className="px-4">
              <MentionAutocomplete
                members={mentionSuggestions}
                onPick={(member) => {
                  const next = applyMention(draft, draft.length, member);
                  setDraft(next.text);
                  setMentionQuery(null);
                }}
              />
            </div>
          )}

          {error && (
            <div className="px-4">
              <FormError message={error} />
            </div>
          )}
          <TypingIndicator names={typingUsers} />

          {scrolledUp && (
            <div className="pointer-events-none absolute bottom-24 left-0 right-0 z-10 flex justify-center px-4">
              <button
                type="button"
                onClick={() => {
                  bottomRef.current?.scrollIntoView({ behavior: "smooth" });
                  setScrolledUp(false);
                }}
                className="pointer-events-auto rounded-full bg-[var(--community-panel)] px-4 py-2 text-sm font-medium text-foreground shadow-lg ring-1 ring-[var(--community-border)] hover:bg-[var(--community-hover)]"
              >
                Jump to Present
              </button>
            </div>
          )}

          {canPost ? (
            <ChannelMessageComposer
              channelName={group.name}
              draft={draft}
              onDraftChange={(value, cursor) => {
                setDraft(value);
                setMentionQuery(
                  cursor === undefined ? null : extractMentionQuery(value, cursor),
                );
              }}
              onTypingChange={(typing) => {
                void presenceRef.current?.track({ name: authorLabel, typing });
              }}
              onSend={onSend}
              sending={sending}
              placeholder={
                isForum && forumThreadId
                  ? "Reply to thread"
                  : isForum
                    ? `Create a post in #${group.name}`
                    : group.kind === "announcement"
                      ? `Post an announcement in #${group.name}`
                      : `Message #${group.name}`
              }
              serverEmoji={serverEmoji}
              serverStickers={serverStickers}
              onUploadImage={async (file) => {
                const url = await uploadCommunityImage(file);
                setDraft((prev) => `${prev}${prev ? "\n" : ""}${url}\n`);
              }}
              replyPreview={
                replyTo
                  ? { authorName: replyTo.authorName || "Member", body: replyTo.body }
                  : null
              }
              onClearReply={() => setReplyTo(null)}
              hint={isForum && !forumThreadId ? "You're creating a new forum post." : undefined}
            />
          ) : group.kind === "announcement" && (isMember || isAppOwner || canConfigure) ? (
            <div className="mx-4 mb-4 rounded-lg border border-dashed border-[var(--community-border)] px-4 py-3 text-center">
              <p className="text-[0.875rem] text-muted">
                Only moderators and admins can post in announcement channels.
              </p>
            </div>
          ) : (
            <div className="mx-4 mb-4 rounded-lg border border-dashed border-[var(--community-border)] px-4 py-3 text-center">
              <p className="mb-2 text-[0.875rem] text-muted">Join this server to post messages.</p>
              <Button size="sm" disabled={joining || joinDisabled} onClick={() => void onJoin()}>
                {joining ? "Joining…" : joinLabel}
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  );
}

const MessageRow = forwardRef(function MessageRow(
  {
    message,
    grouped = false,
    highlighted = false,
    mentionMembers,
    authorProfile,
    isServerBooster = false,
    isAppOwnerAuthor = false,
    roleColor,
    roleIconUrl,
    isMine,
    canModerate: canMod,
    canPin = false,
    userId: _userId,
    onOpenProfile,
    onReply,
    onReact,
    onPin,
    onEdit,
    onStatus,
    onDelete,
  }: {
    message: CommunityMessage;
    grouped?: boolean;
    highlighted?: boolean;
    mentionMembers: MentionMember[];
    authorProfile?: CommunityProfile | null;
    isServerBooster?: boolean;
    isAppOwnerAuthor?: boolean;
    roleColor?: string;
    roleIconUrl?: string | null;
    isMine: boolean;
    canModerate: boolean;
    canPin?: boolean;
    userId: string;
    onOpenProfile?: () => void;
    onReply: () => void;
    onReact: (emoji: string) => Promise<void>;
    onPin?: () => Promise<void>;
    onEdit?: (body: string) => Promise<void>;
    onStatus: (s: SuggestionStatus) => Promise<void>;
    onDelete: () => Promise<void>;
  },
  ref: React.Ref<HTMLLIElement>,
) {
  const [pickerOpen, setPickerOpen] = useState(false);
  const [sheetOpen, setSheetOpen] = useState(false);
  const longPressRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const openSheet = () => setSheetOpen(true);

  const sheetActions = [
    { label: "React 👍", onClick: () => void onReact("👍") },
    { label: "Reply", onClick: onReply },
    {
      label: "Copy text",
      onClick: () => void navigator.clipboard.writeText(message.body),
    },
    ...(isMine && onEdit && message.kind === "chat"
      ? [
          {
            label: "Edit message",
            onClick: () => {
              const next = prompt("Edit message", message.body);
              if (next?.trim()) void onEdit(next.trim());
            },
          },
        ]
      : []),
    ...(canPin && onPin ? [{ label: "Pin message", onClick: () => void onPin() }] : []),
    ...(canMod || isMine
      ? [{ label: "Delete", onClick: () => void onDelete(), destructive: true as const }]
      : []),
  ];

  if (message.kind === "system") {
    return <li ref={ref} className="text-center text-[0.75rem] text-muted">{message.body}</li>;
  }
  const isSuggestion = message.kind === "suggestion";
  const nameStyle = roleColor ? roleColorTextStyle(roleColor) : undefined;

  return (
    <li
      ref={ref}
      className={`group relative flex gap-4 rounded-md px-4 hover:bg-[var(--community-message-hover)] ${
        grouped ? "community-message-grouped py-0.5" : "py-1"
      } ${highlighted ? "community-message-highlight" : ""}`}
      onTouchStart={() => {
        longPressRef.current = setTimeout(openSheet, 500);
      }}
      onTouchEnd={() => {
        if (longPressRef.current) clearTimeout(longPressRef.current);
      }}
      onContextMenu={(e) => {
        e.preventDefault();
        openSheet();
      }}
    >
      {grouped ? (
        <div className="community-message-avatar-spacer flex shrink-0 items-start justify-end pt-0.5">
          <span className="community-message-timestamp-hover text-[0.625rem] leading-none text-muted">
            {formatCommunityTime(message.createdAt)}
          </span>
        </div>
      ) : (
        <button
          type="button"
          onClick={onOpenProfile}
          disabled={!onOpenProfile}
          className="mt-0.5 shrink-0 disabled:cursor-default"
        >
          <CommunityAvatar
            profile={authorProfile}
            fallbackName={message.authorName}
            size="md"
            isServerBooster={isServerBooster}
          />
        </button>
      )}
      <div className="min-w-0 flex-1">
        {!grouped && (
          <div className="flex flex-wrap items-baseline gap-1.5 leading-none">
            <button
              type="button"
              onClick={onOpenProfile}
              disabled={!onOpenProfile}
              className="text-left text-base font-semibold disabled:cursor-default hover:underline"
              style={nameStyle}
            >
              {isMine ? "You" : message.authorName || "Member"}
            </button>
            <ChatAuthorBadge isAppOwner={isAppOwnerAuthor} roleIconUrl={roleIconUrl} />
            <span className="text-[0.6875rem] text-muted">{formatCommunityTime(message.createdAt)}</span>
            {isSuggestion && message.suggestionStatus && (
              <span className="text-[0.6875rem] text-muted">
                · {SUGGESTION_STATUS_LABELS[message.suggestionStatus]}
              </span>
            )}
          </div>
        )}

        {message.replyPreview && (
          <div className="mb-1 flex items-center gap-1 border-l-4 border-accent pl-3 text-sm text-muted">
            <span className="font-medium text-link">{message.replyPreview.authorName || "Member"}</span>
            <span className="truncate">{message.replyPreview.body}</span>
          </div>
        )}

        {isSuggestion && (
          <p className="mb-0.5 text-[0.6875rem] font-semibold uppercase tracking-wide text-muted">
            Suggestion
          </p>
        )}
        <p className="whitespace-pre-wrap break-words text-base leading-[1.375rem] text-foreground">
          {renderMessageWithMentions(message.body, mentionMembers).map((part, i) =>
            part.type === "mention" ? (
              <span key={i} className="community-mention rounded px-0.5 font-medium">
                {part.value}
              </span>
            ) : (
              <span key={i}>{part.value}</span>
            ),
          )}
          {message.editedAt && <span className="text-[0.625rem] text-muted"> (edited)</span>}
        </p>

        {message.reactions.length > 0 && (
          <div className="mt-1 flex flex-wrap gap-1">
            {message.reactions.map((r) => (
              <button
                key={r.emoji}
                type="button"
                onClick={() => void onReact(r.emoji)}
                className={`flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs transition ${
                  r.reactedByMe
                    ? "border-[var(--accent)] bg-[var(--accent-soft)]"
                    : "border-[var(--community-border)] bg-[var(--community-input)] hover:border-[var(--accent)]"
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

      <div className="community-message-actions absolute -top-4 right-4 hidden h-10 items-center gap-0.5 rounded border p-0.5 shadow-md md:group-hover:flex">
        {QUICK_EMOJIS.slice(0, 3).map((emoji) => (
          <button
            key={emoji}
            type="button"
            onClick={() => void onReact(emoji)}
            className="flex h-8 w-8 items-center justify-center rounded text-base hover:bg-[var(--community-hover)]"
            aria-label={`React ${emoji}`}
          >
            {emoji}
          </button>
        ))}
        <button
          type="button"
          onClick={() => setPickerOpen((v) => !v)}
          className="flex h-8 w-8 items-center justify-center rounded text-muted hover:bg-[var(--community-hover)]"
          aria-label="Add reaction"
        >
          +
        </button>
        <button
          type="button"
          onClick={onReply}
          className="flex h-8 w-8 items-center justify-center rounded text-muted hover:bg-[var(--community-hover)]"
          aria-label="Reply"
        >
          <IconReply size={18} />
        </button>
        <button
          type="button"
          onClick={openSheet}
          className="flex h-8 w-8 items-center justify-center rounded text-muted hover:bg-[var(--community-hover)]"
          aria-label="More actions"
        >
          <IconDots size={18} />
        </button>
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

      <CommunityActionSheet open={sheetOpen} onClose={() => setSheetOpen(false)} actions={sheetActions} />
    </li>
  );
});

function ServerMemberSidebar({
  members,
  memberProfiles,
  serverBoosters,
  appOwnerUserIds = new Set<string>(),
  onOpenProfile,
}: {
  members: CommunityServerMember[];
  memberProfiles?: Map<string, CommunityProfile>;
  serverBoosters?: Set<string>;
  appOwnerUserIds?: Set<string>;
  onOpenProfile?: (target: { userId?: string; username?: string | null }) => void;
}) {
  return (
    <aside className="hidden w-60 shrink-0 flex-col bg-[var(--community-panel)] min-h-0 md:flex">
      <MemberListPanel
        members={members}
        memberProfiles={memberProfiles}
        serverBoosters={serverBoosters}
        appOwnerUserIds={appOwnerUserIds}
        onOpenProfile={onOpenProfile}
      />
    </aside>
  );
}

