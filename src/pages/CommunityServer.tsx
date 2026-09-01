import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  forwardRef,
  type FormEvent,
} from "react";
import { Link, useNavigate, useParams, useLocation } from "react-router-dom";
import { useAuth } from "@/lib/auth";
import { useLibrary } from "@/lib/library";
import { supabase } from "@/lib/supabase";
import {
  archiveCommunityGroup,
  acceptServerRules,
  createCommunityCategory,
  deleteCommunityCategory,
  deleteGroupMessage,
  getMyRulesAccepted,
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
  listServerWebhooks,
  uploadCommunityImage,
  toggleMessageReaction,
  updateSuggestionStatus,
  getChannelLastRead,
} from "@/lib/community";
import { ensureChannelNotificationsForServer } from "@/lib/community-notification-prefs";
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
  type CommunityServerWebhook,
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
import { ThreadsPanel } from "@/components/community/ThreadsPanel";
import { VoiceConnectedBar } from "@/components/community/VoiceConnectedBar";
import { ReactionTooltip } from "@/components/community/ReactionTooltip";
import { ChannelWelcome } from "@/components/community/ChannelWelcome";
import { ChatAuthorBadge } from "@/components/community/ChatAuthorBadge";
import { CommunityAvatar } from "@/components/community/CommunityAvatar";
import {
  CommunityMessageContent,
  CommunityReactionEmoji,
} from "@/components/community/CommunityMessageContent";
import { MessageEditModal } from "@/components/community/MessageEditModal";
import { MessageTimestamp } from "@/components/community/MessageTimestamp";
import { CommunityUserPanel } from "@/components/community/CommunityUserPanel";
import { ServerChannelHeader } from "@/components/community/ServerChannelHeader";
import { MemberListPanel } from "@/components/community/MemberListPanel";
import {
  MessageDateDivider,
  TypingIndicator,
  UnreadDivider,
  formatMessageDateDivider,
  messageDayKey,
} from "@/components/community/discord-ui";
import { EmojiPicker } from "@/components/community/EmojiPicker";
import { KeyboardShortcutsModal } from "@/components/community/KeyboardShortcutsModal";
import { ContextMenuItem, MessageContextMenu } from "@/components/community/MessageContextMenu";
import { CommunityProfileModal } from "@/components/community/CommunityProfileModal";
import { ChannelFormModal, CategoryFormModal } from "@/components/community-server-modals";
import { AddServerModal } from "@/components/AddServerModal";
import { InvitePeopleModal } from "@/components/community/InvitePeopleModal";
import { ServerRulesModal } from "@/components/community/ServerRulesModal";
import { ServerSearchModal } from "@/components/community/ServerSearchModal";
import { PinnedMessagesBar } from "@/components/community/PinnedMessagesBar";
import { MentionAutocomplete } from "@/components/community/MentionAutocomplete";
import {
  applyMention,
  applyRoleMention,
  extractMentionQuery,
  filterMentionMembers,
  filterMentionRoles,
  type MentionMember,
  type MentionRole,
} from "@/lib/community-mentions";
import { getChannelDraft, setChannelDraft, draftPreview, getAllChannelDrafts } from "@/lib/community-drafts";
import { loadResolvedChannelPermissions, batchLoadResolvedChannelPermissions, type ResolvedChannelPermissions } from "@/lib/community-permissions";
import { getVoicePrefs, toggleVoiceDeafened, toggleVoiceMuted } from "@/lib/community-voice-prefs";
import { useCommunityHotkeys } from "@/hooks/useCommunityHotkeys";
import { useServerPresence } from "@/hooks/useServerPresence";
import { useIsDesktop } from "@/hooks/useIsDesktop";
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

function ServerPreviewBanner({
  server,
  joinRequestStatus,
  joining,
  user,
  joinLabel,
  onJoin,
}: {
  server: CommunityServer;
  joinRequestStatus: string | null;
  joining: boolean;
  user: { id: string } | null;
  joinLabel: string;
  onJoin: () => void;
}) {
  return (
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
          onClick={onJoin}
        >
          {joining ? "…" : joinLabel}
        </Button>
      </div>
    </div>
  );
}

export function CommunityServerPage() {
  const { serverId, channelId } = useParams<{ serverId: string; channelId?: string }>();
  const navigate = useNavigate();
  const location = useLocation();
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
  const [inviteOpen, setInviteOpen] = useState(false);
  const [rulesAcceptedAt, setRulesAcceptedAt] = useState<string | null>(null);
  const [acceptingRules, setAcceptingRules] = useState(false);
  const [serverSearchOpen, setServerSearchOpen] = useState(false);
  const [voicePrefs, setVoicePrefs] = useState(getVoicePrefs);
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
  const [channelPermsById, setChannelPermsById] = useState<Map<string, ResolvedChannelPermissions>>(
    new Map(),
  );
  const [voiceConnection, setVoiceConnection] = useState<{
    channelId: string;
    channelName: string;
  } | null>(null);

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
        const accepted = await getMyRulesAccepted(serverId, user.id).catch(() => null);
        setRulesAcceptedAt(accepted);
      } else {
        setServerBoosters(new Set());
        setRulesAcceptedAt(null);
      }
      if (member && groups.length > 0) {
        const unread = await listUnreadCounts(
          user.id,
          groups.map((g) => g.id),
        );
        setUnreadCounts(unread);
        ensureChannelNotificationsForServer(
          user.id,
          groups.map((g) => g.id),
          s.defaultNotifications ?? "all",
        );
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
    const source = channelsByCategory;
    const map = new Map<string | null, CommunityGroup[]>();
    for (const [key, list] of source) {
      let visible = list;
      if (isMember && !canConfigure) {
        visible = list.filter((c) => channelPermsById.get(c.id)?.view !== false);
      }
      if (q) visible = visible.filter((c) => c.name.toLowerCase().includes(q));
      if (visible.length > 0) map.set(key, visible);
    }
    return map;
  }, [channelsByCategory, channelSearch, isMember, canConfigure, channelPermsById]);

  const active = channels.find((g) => g.id === channelId) ?? null;

  const activeChannelRole =
    active?.myRole ?? (isOwner || canConfigure ? "admin" : isMember ? "member" : null);
  const canManageActiveChannel = Boolean(
    active && (canConfigure || canManageMembers(activeChannelRole, isOwner || canConfigure)),
  );

  const roleById = useMemo(() => new Map(serverRoles.map((r) => [r.id, r])), [serverRoles]);
  const myServerRoleForMe = useMemo(() => {
    if (!user) return undefined;
    const member = serverMembers.find((m) => m.userId === user.id);
    if (!member) return undefined;
    if (member.roleId) return roleById.get(member.roleId);
    return serverRoles.find((r) => r.isEveryone);
  }, [user, serverMembers, serverRoles, roleById]);
  const canInviteMembers = Boolean(
    isOwner ||
      canConfigure ||
      myServerRoleForMe?.canInviteUsers ||
      myServerRoleForMe?.canManageServer,
  );
  const canPreviewServer = Boolean(
    isMember ||
      canConfigure ||
      server?.isPublic ||
      server?.isOfficial ||
      server?.joinMode === "invite",
  );
  const mustAcceptRules = Boolean(isMember && server?.rules?.trim() && !rulesAcceptedAt);

  useEffect(() => {
    if (!isMember || channels.length === 0) {
      setChannelPermsById(new Map());
      return;
    }
    let cancelled = false;
    void batchLoadResolvedChannelPermissions(
      serverId ?? "",
      channels.map((c) => ({ id: c.id, categoryId: c.categoryId })),
      myServerRoleForMe ?? null,
      { isAppOwner: isOwner, canConfigure },
    ).then((perms) => {
      if (!cancelled) setChannelPermsById(perms);
    });
    return () => {
      cancelled = true;
    };
  }, [channels, isMember, myServerRoleForMe, isOwner, canConfigure, serverId]);
  const myCommunityProfile = user ? memberProfiles.get(user.id) ?? null : null;
  const onlineUserIds = useServerPresence(serverId, user?.id);
  const channelNames = useMemo(() => new Map(channels.map((c) => [c.id, c.name])), [channels]);
  const channelIds = useMemo(() => channels.map((c) => c.id), [channels]);
  const navigateHighlightId =
    (location.state as { highlightMessageId?: string } | null)?.highlightMessageId ?? null;

  useEffect(() => {
    if (loading || !serverId || channels.length === 0 || channelId) return;
    const visibleChannels = isMember && !canConfigure
      ? channels.filter((c) => channelPermsById.get(c.id)?.view !== false)
      : channels;
    const first =
      visibleChannels.find(
        (c) => orderedCategories[0] && c.categoryId === orderedCategories[0].id,
      ) ?? visibleChannels[0];
    if (first) navigate(`/community/s/${serverId}/${first.id}`, { replace: true });
  }, [loading, channels, channelId, navigate, orderedCategories, serverId, isMember, canConfigure, channelPermsById]);

  useEffect(() => {
    if (!isMember) return;
    const onKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      const typing =
        target?.tagName === "INPUT" ||
        target?.tagName === "TEXTAREA" ||
        target?.isContentEditable;
      if (typing) return;
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setServerSearchOpen(true);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [isMember]);

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

  if (!loading && server && !canPreviewServer) {
    return (
      <CommunityDiscordShell pane="server" activeServerId={serverId} onAdd={() => setAddOpen(true)}>
        <div className="flex flex-1 items-center justify-center p-8">
          <EmptyState
            title="Private server"
            description="This server is invite-only. You need an invite to view it."
          />
        </div>
      </CommunityDiscordShell>
    );
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
              onInvite={canInviteMembers ? () => setInviteOpen(true) : undefined}
              onSearch={isMember ? () => setServerSearchOpen(true) : undefined}
            />
          )}
          {!isMember && server && canPreviewServer && (
            <ServerPreviewBanner
              server={server}
              joinRequestStatus={joinRequestStatus}
              joining={joining}
              user={user}
              joinLabel={joinLabel}
              onJoin={() => void tryJoin()}
            />
          )}
          <CommunityScrollBody className="px-2 py-2 pt-3">{sidebar}</CommunityScrollBody>
          {user && (
            <CommunityUserPanel
              profile={myCommunityProfile}
              fallbackName={communityShortName(userProfile, user.email)}
              muted={voicePrefs.muted}
              deafened={voicePrefs.deafened}
              onToggleMute={() => setVoicePrefs(toggleVoiceMuted())}
              onToggleDeafen={() => setVoicePrefs(toggleVoiceDeafened())}
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
              memberCount={isMember ? serverMembers.length : (server.memberCount ?? 0)}
              onOpenChannels={() => setMobileNavOpen(true)}
              onOpenMembers={isMember ? () => setMemberDrawerOpen(true) : undefined}
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
          ) : active && user && server && !mustAcceptRules ? (
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
              allChannels={channels}
              serverRoles={serverRoles}
              onOpenProfile={openProfile}
              onMarkRead={user ? () => void markChannelRead(user.id, active.id) : undefined}
              voiceConnection={voiceConnection}
              onVoiceConnect={(channelId, channelName) =>
                setVoiceConnection({ channelId, channelName })
              }
              onVoiceDisconnect={() => setVoiceConnection(null)}
              onReturnToVoice={
                voiceConnection
                  ? () => navigate(`/community/s/${serverId}/${voiceConnection.channelId}`)
                  : undefined
              }
              voiceMuted={voicePrefs.muted}
              voiceDeafened={voicePrefs.deafened}
              onToggleVoiceMute={() => setVoicePrefs(toggleVoiceMuted())}
              onToggleVoiceDeafen={() => setVoicePrefs(toggleVoiceDeafened())}
              initialHighlightMessageId={navigateHighlightId}
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
              onlineUserIds={onlineUserIds}
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
          {!isMember && server && canPreviewServer && (
            <ServerPreviewBanner
              server={server}
              joinRequestStatus={joinRequestStatus}
              joining={joining}
              user={user}
              joinLabel={joinLabel}
              onJoin={() => {
                void tryJoin();
                setMobileNavOpen(false);
              }}
            />
          )}
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
        open={memberDrawerOpen && isMember}
        onClose={() => setMemberDrawerOpen(false)}
        members={serverMembers}
        memberProfiles={memberProfiles}
        serverBoosters={serverBoosters}
        appOwnerUserIds={appOwnerUserIds}
        onlineUserIds={onlineUserIds}
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

      {server && (
        <InvitePeopleModal
          open={inviteOpen}
          onClose={() => setInviteOpen(false)}
          serverName={server.name}
          inviteCode={server.inviteCode}
        />
      )}

      {server && isMember && user && (
        <ServerSearchModal
          open={serverSearchOpen}
          onClose={() => setServerSearchOpen(false)}
          serverName={server.name}
          channelIds={channelIds}
          channelNames={channelNames}
          onJumpTo={(chId, msgId) => {
            navigate(`/community/s/${serverId}/${chId}`, { state: { highlightMessageId: msgId } });
          }}
        />
      )}

      {server && isMember && server.rules?.trim() && !rulesAcceptedAt && (
        <ServerRulesModal
          open
          serverName={server.name}
          rules={server.rules}
          rulesChannelName={channels.find((c) => c.id === server.rulesChannelId)?.name}
          busy={acceptingRules}
          onAccept={async () => {
            if (!serverId) return;
            setAcceptingRules(true);
            try {
              await acceptServerRules(serverId);
              setRulesAcceptedAt(new Date().toISOString());
            } catch (err) {
              setError(err instanceof Error ? err.message : "Could not accept rules");
            } finally {
              setAcceptingRules(false);
            }
          }}
        />
      )}

      {modal?.type === "create-channel" && user && (
        <ChannelFormModal
          title="Create channel"
          categories={categories}
          defaultCategoryId={modal.categoryId}
          serverId={serverId}
          userId={user.id}
          roles={serverRoles}
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
          roles={serverRoles}
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
  const channelDrafts = getAllChannelDrafts();

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
                  {channelDrafts?.get(ch.id) && ch.id !== activeId && (
                    <span className="ml-auto truncate text-xs text-muted">
                      {draftPreview(channelDrafts.get(ch.id)!, 18)}
                    </span>
                  )}
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
  allChannels = [],
  serverRoles = [],
  onOpenProfile,
  onMarkRead,
  voiceConnection = null,
  onVoiceConnect,
  onVoiceDisconnect,
  onReturnToVoice,
  voiceMuted = false,
  voiceDeafened = false,
  onToggleVoiceMute,
  onToggleVoiceDeafen,
  initialHighlightMessageId,
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
  allChannels?: CommunityGroup[];
  serverRoles?: CommunityServerRole[];
  onOpenProfile?: (target: { userId?: string; username?: string | null }) => void;
  onMarkRead?: () => void;
  voiceConnection?: { channelId: string; channelName: string } | null;
  onVoiceConnect?: (channelId: string, channelName: string) => void;
  onVoiceDisconnect?: () => void;
  onReturnToVoice?: () => void;
  voiceMuted?: boolean;
  voiceDeafened?: boolean;
  onToggleVoiceMute?: () => void;
  onToggleVoiceDeafen?: () => void;
  initialHighlightMessageId?: string | null;
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
  const [serverWebhooks, setServerWebhooks] = useState<CommunityServerWebhook[]>([]);
  const [scrolledUp, setScrolledUp] = useState(false);
  const [highlightMessageId, setHighlightMessageId] = useState<string | null>(null);
  const [lastReadAt, setLastReadAt] = useState<string | null>(null);
  const [slowCooldown, setSlowCooldown] = useState(0);
  const [shortcutsOpen, setShortcutsOpen] = useState(false);
  const [searchMatchIndex, setSearchMatchIndex] = useState(0);
  const [threadsPanelOpen, setThreadsPanelOpen] = useState(false);
  const [threadRootId, setThreadRootId] = useState<string | null>(null);
  const [channelPerms, setChannelPerms] = useState<ResolvedChannelPermissions | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const messageRefs = useRef<Map<string, HTMLLIElement>>(new Map());
  const presenceRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const voiceChannelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  const memberByUserId = useMemo(
    () => new Map(serverMembers.map((m) => [m.userId, m])),
    [serverMembers],
  );

  const memberNames = useMemo(
    () =>
      new Map(
        serverMembers.map((m) => [
          m.userId,
          m.displayName || m.communityUsername || "Member",
        ]),
      ),
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

  const mentionRoles = useMemo<MentionRole[]>(
    () =>
      serverRoles.map((r) => ({
        id: r.id,
        name: r.name,
        color: r.color,
        mentionable: r.mentionable,
      })),
    [serverRoles],
  );

  const mentionRoleSuggestions = useMemo(
    () => (mentionQuery === null ? [] : filterMentionRoles(mentionRoles, mentionQuery)),
    [mentionQuery, mentionRoles],
  );

  const slowModeSeconds = group.slowModeSeconds ?? 0;

  useEffect(() => {
    setDraft(getChannelDraft(group.id));
    setReplyTo(null);
    void getChannelLastRead(userId, group.id).then(setLastReadAt);
  }, [group.id, userId]);

  useEffect(() => {
    setChannelDraft(group.id, draft);
  }, [group.id, draft]);

  useEffect(() => {
    if (slowCooldown <= 0) return;
    const t = window.setInterval(() => setSlowCooldown((c) => Math.max(0, c - 1)), 1000);
    return () => window.clearInterval(t);
  }, [slowCooldown]);

  useCommunityHotkeys({
    onToggleSearch: () => setSearchOpen((v) => !v),
    onCloseSearch: () => {
      setSearchOpen(false);
      setSearchQuery("");
    },
    onShowShortcuts: () => setShortcutsOpen(true),
    searchOpen,
  });

  const jumpToMessage = useCallback((messageId: string) => {
    setHighlightMessageId(messageId);
    messageRefs.current.get(messageId)?.scrollIntoView({ behavior: "smooth", block: "center" });
    window.setTimeout(() => setHighlightMessageId(null), 2000);
  }, []);

  useEffect(() => {
    if (!initialHighlightMessageId) return;
    const timer = window.setTimeout(() => jumpToMessage(initialHighlightMessageId), 300);
    return () => window.clearTimeout(timer);
  }, [initialHighlightMessageId, jumpToMessage, group.id]);

  const myServerRole = useMemo(() => {
    const member = serverMembers.find((m) => m.userId === userId);
    if (!member) return undefined;
    if (member.roleId) return roleById.get(member.roleId);
    return serverRoles.find((r) => r.isEveryone);
  }, [serverMembers, userId, roleById, serverRoles]);

  useEffect(() => {
    void loadResolvedChannelPermissions(
      serverId,
      group.id,
      group.categoryId,
      myServerRole ?? null,
      { isAppOwner, canConfigure },
    ).then(setChannelPerms);
  }, [serverId, group.id, group.categoryId, myServerRole, isAppOwner, canConfigure]);

  const myRole = group.myRole ?? (isAppOwner || canConfigure ? "admin" : isMember ? "member" : null);
  const manage = Boolean(
    channelPerms?.manageChannel ||
      myServerRole?.canManageChannels ||
      myServerRole?.canManageServer ||
      canManageMembers(myRole, isAppOwner || canConfigure),
  );
  const moderate = Boolean(
    channelPerms?.manageMessages ||
      myServerRole?.canModerate ||
      myServerRole?.canManageMessages ||
      myServerRole?.canManageServer ||
      canModerate(myRole, isAppOwner || canConfigure),
  );
  const canPost = Boolean(
    channelPerms?.sendMessages ?? true,
  ) && canPostInChannelKind(group.kind, {
    isMember,
    canConfigure,
    canModerate: moderate,
    canManage: manage,
    isAppOwner: Boolean(isAppOwner),
  });
  const canViewChannel = channelPerms?.view ?? true;
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
  const channelNames = useMemo(() => allChannels.map((c) => ({ name: c.name })), [allChannels]);

  const visibleMessages = useMemo(() => {
    if (isForum) {
      if (forumThreadId) {
        return messages.filter((m) => m.id === forumThreadId || m.replyToId === forumThreadId);
      }
      return forumPosts;
    }
    if (threadRootId) {
      const root = messages.find((m) => m.id === threadRootId);
      if (!root) return [];
      return [
        root,
        ...messages.filter((m) => m.replyToId === threadRootId),
      ].sort((a, b) => a.createdAt.localeCompare(b.createdAt));
    }
    return messages.filter((m) => !m.replyToId);
  }, [isForum, forumThreadId, messages, forumPosts, threadRootId]);

  const threadSummaries = useMemo(() => {
    if (isForum || isVoice) return [];
    const summaries = new Map<string, { root: CommunityMessage; replyCount: number }>();
    for (const m of messages) {
      if (!m.replyToId) continue;
      const root = messages.find((x) => x.id === m.replyToId);
      if (!root || root.replyToId) continue;
      const existing = summaries.get(m.replyToId);
      if (existing) {
        existing.replyCount += 1;
      } else {
        summaries.set(m.replyToId, { root, replyCount: 1 });
      }
    }
    return [...summaries.values()].sort((a, b) =>
      b.root.createdAt.localeCompare(a.root.createdAt),
    );
  }, [isForum, isVoice, messages]);

  const searchMatches = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return visibleMessages;
    return visibleMessages.filter(
      (m) =>
        m.body.toLowerCase().includes(q) ||
        (m.authorName?.toLowerCase().includes(q) ?? false),
    );
  }, [visibleMessages, searchQuery]);

  useEffect(() => {
    setSearchMatchIndex(0);
  }, [searchQuery]);

  useEffect(() => {
    void listServerEmoji(serverId)
      .then(setServerEmoji)
      .catch(() => setServerEmoji([]));
    void listServerStickers(serverId)
      .then(setServerStickers)
      .catch(() => setServerStickers([]));
    void listServerWebhooks(serverId)
      .then(setServerWebhooks)
      .catch(() => setServerWebhooks([]));
  }, [serverId]);

  const load = useCallback(async () => {
    const [msgs, pins] = await Promise.all([
      listGroupMessages(group.id, userId),
      listPinnedMessages(group.id).catch(() => [] as CommunityMessage[]),
    ]);
    setMessages(msgs);
    setPinned(pins);
  }, [group.id, userId]);

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
    setThreadRootId(null);
    setThreadsPanelOpen(false);
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
    if (!channelPerms?.connect) {
      setError("You do not have permission to connect to this voice channel.");
      return;
    }
    const channel = voiceChannelRef.current;
    if (!channel) return;
    if (joinedVoice) {
      await channel.track({ name: authorLabel, inVoice: false });
      setJoinedVoice(false);
      onVoiceDisconnect?.();
    } else {
      await channel.track({ name: authorLabel, inVoice: true });
      setJoinedVoice(true);
      onVoiceConnect?.(group.id, group.name);
    }
  };

  const handleSearchPrev = () => {
    if (searchMatches.length === 0) return;
    const prev = (searchMatchIndex - 1 + searchMatches.length) % searchMatches.length;
    setSearchMatchIndex(prev);
    jumpToMessage(searchMatches[prev]!.id);
  };

  const activeSearchMessageId =
    searchQuery.trim() && searchMatches.length > 0
      ? searchMatches[searchMatchIndex]?.id
      : undefined;

  const onSend = async (e: FormEvent) => {
    e.preventDefault();
    if (!draft.trim() || !canPost || slowCooldown > 0) return;
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
        replyToId: isForum
          ? forumThreadId ?? replyTo?.id ?? null
          : threadRootId ?? replyTo?.id ?? null,
      });
      setDraft("");
      setReplyTo(null);
      setMentionQuery(null);
      if (slowModeSeconds > 0) setSlowCooldown(slowModeSeconds);
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

  const channelToolbarProps = {
    group,
    pinnedCount: pinned.length,
    pinsOpen: pinsExpanded,
    onTogglePins: () => setPinsExpanded((v) => !v),
    searchOpen,
    onToggleSearch: () => setSearchOpen((v) => !v),
    searchQuery,
    onSearchChange: setSearchQuery,
    searchResultCount: searchQuery.trim() ? searchMatches.length : undefined,
    onSearchPrev: searchMatches.length > 0 ? handleSearchPrev : undefined,
    onSearchNext:
      searchMatches.length > 1
        ? () => {
            const next = (searchMatchIndex + 1) % searchMatches.length;
            setSearchMatchIndex(next);
            jumpToMessage(searchMatches[next]!.id);
          }
        : searchMatches.length === 1
          ? () => jumpToMessage(searchMatches[0]!.id)
          : undefined,
    threadsOpen: threadsPanelOpen,
    onToggleThreads:
      group.kind === "text" ? () => setThreadsPanelOpen((v) => !v) : undefined,
    membersOpen: showServerMembers,
    onToggleMembers: onToggleServerMembers,
    memberCount: serverMemberCount,
    onOpenSettings,
    canManage: canConfigure || manage,
    userId,
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col relative">
      <ChannelToolbar variant="mobile" {...channelToolbarProps} />
      <ChannelToolbar variant="desktop" {...channelToolbarProps} />

      {channelPerms && !canViewChannel ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-2 p-8 text-center">
          <p className="text-[1rem] font-semibold text-foreground">No access</p>
          <p className="max-w-sm text-[0.875rem] text-muted">
            Your role doesn&apos;t have permission to view #{group.name}.
          </p>
        </div>
      ) : (
        <>
      {pinned.length > 0 && pinsExpanded && (
        <PinnedMessagesBar
          pins={pinned}
          canManage={moderate || manage}
          mentionMembers={mentionMembers}
          channels={channelNames}
          serverEmoji={serverEmoji}
          serverStickers={serverStickers}
          onJump={jumpToMessage}
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
              {isMember && channelPerms?.connect !== false && (
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
        <div className="flex min-h-0 flex-1">
          <div className="flex min-h-0 min-w-0 flex-1 flex-col">
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
          {!isForum && threadRootId && (
            <div className="shrink-0 border-b border-[var(--community-border)] px-4 py-2">
              <button
                type="button"
                onClick={() => {
                  setThreadRootId(null);
                  setReplyTo(null);
                }}
                className="text-[0.8125rem] text-link"
              >
                ← Back to channel
              </button>
            </div>
          )}
          <CommunityScrollBody
            className="px-0 py-4"
            onScroll={(e) => {
              const el = e.currentTarget;
              const atBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 96;
              setScrolledUp(!atBottom);
              if (atBottom) {
                onMarkRead?.();
                setLastReadAt(new Date().toISOString());
              }
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
                        <div className="mt-1 line-clamp-3">
                          <CommunityMessageContent
                            body={m.body}
                            mentionMembers={mentionMembers}
                            channels={channelNames}
                            serverEmoji={serverEmoji}
                            serverStickers={serverStickers}
                          />
                        </div>
                        <p className="mt-2 text-[0.75rem] text-muted">
                          {replyCountByPost.get(m.id) ?? 0} repl
                          {(replyCountByPost.get(m.id) ?? 0) === 1 ? "y" : "ies"} ·{" "}
                          {formatCommunityTime(m.createdAt)}
                        </p>
                      </button>
                    </li>
                  ))
                : (searchQuery.trim() ? searchMatches : visibleMessages).flatMap((m, index, list) => {
                const prev = index > 0 ? list[index - 1] : null;
                const grouped = shouldGroupMessages(prev, m);
                const member = m.authorId ? memberByUserId.get(m.authorId) : undefined;
                const role = member?.roleId ? roleById.get(member.roleId) : undefined;
                const chatRoleIconUrl = getChatRoleIconUrl(role);
                const items = [];
                if (
                  lastReadAt &&
                  !list.slice(0, index).some((x) => x.createdAt > lastReadAt) &&
                  m.createdAt > lastReadAt &&
                  m.authorId !== userId
                ) {
                  items.push(<UnreadDivider key={`unread-${m.id}`} />);
                }
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
                  mentionRoles={mentionRoles}
                  channels={channelNames}
                  serverEmoji={serverEmoji}
                  serverStickers={serverStickers}
                  searchQuery={searchQuery.trim() || undefined}
                  isSearchActive={m.id === activeSearchMessageId}
                  memberProfiles={memberProfiles}
                  memberNames={memberNames}
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
                  onJumpToReply={
                    m.replyToId ? () => jumpToMessage(m.replyToId!) : undefined
                  }
                  onReply={() => {
                    if (isForum && forumThreadId) setReplyTo(m);
                    else if (isForum) setForumThreadId(m.id);
                    else if (threadRootId) setReplyTo(m);
                    else setReplyTo(m);
                  }}
                  onCreateThread={
                    !isForum && !threadRootId && !m.replyToId && canPost
                      ? () => {
                          setThreadRootId(m.id);
                          setThreadsPanelOpen(true);
                          setReplyTo(null);
                        }
                      : undefined
                  }
                  onEdit={async (body) => {
                    await updateGroupMessage(m.id, userId, body, serverId);
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

          {mentionSuggestions.length > 0 || mentionRoleSuggestions.length > 0 ? (
            <div className="relative z-20 px-3 md:px-4">
              <MentionAutocomplete
                members={mentionSuggestions}
                roles={mentionRoleSuggestions}
                onPickMember={(member) => {
                  const next = applyMention(draft, draft.length, member);
                  setDraft(next.text);
                  setMentionQuery(null);
                }}
                onPickRole={(role) => {
                  const next = applyRoleMention(draft, draft.length, role);
                  setDraft(next.text);
                  setMentionQuery(null);
                }}
              />
            </div>
          ) : null}

          {error && (
            <div className="px-4">
              <FormError message={error} />
            </div>
          )}
          <TypingIndicator names={typingUsers} />

          {scrolledUp && (
            <div className="pointer-events-none absolute bottom-[calc(6.5rem+env(safe-area-inset-bottom,0px))] left-0 right-0 z-10 flex justify-center px-4 md:bottom-24">
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
                    : threadRootId
                      ? "Reply to thread"
                      : group.kind === "announcement"
                        ? `Post an announcement in #${group.name}`
                        : `Message #${group.name}`
              }
              serverEmoji={serverEmoji}
              serverStickers={serverStickers}
              serverWebhooks={serverWebhooks}
              onUploadImage={async (file) => {
                const url = await uploadCommunityImage(file, { serverId, userId });
                setDraft((prev) => `${prev}${prev ? "\n" : ""}![image](${url})\n`);
              }}
              replyPreview={
                replyTo
                  ? { authorName: replyTo.authorName || "Member", body: replyTo.body }
                  : null
              }
              onClearReply={() => setReplyTo(null)}
              hint={isForum && !forumThreadId ? "You're creating a new forum post." : undefined}
              slowModeRemaining={slowCooldown}
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
          </div>

          {threadsPanelOpen && group.kind === "text" && (
            <ThreadsPanel
              open={threadsPanelOpen}
              threads={threadSummaries}
              activeThreadId={threadRootId}
              onSelect={(rootId) => {
                setThreadRootId(rootId);
                setReplyTo(null);
              }}
              onClose={() => setThreadsPanelOpen(false)}
            />
          )}
        </div>
      )}

      {voiceConnection &&
        voiceConnection.channelId !== group.id &&
        onReturnToVoice &&
        onVoiceDisconnect && (
          <VoiceConnectedBar
            channelName={voiceConnection.channelName}
            muted={voiceMuted}
            deafened={voiceDeafened}
            onToggleMute={onToggleVoiceMute}
            onToggleDeafen={onToggleVoiceDeafen}
            onReturn={onReturnToVoice}
            onDisconnect={() => {
              onVoiceDisconnect();
              if (group.kind === "voice" && joinedVoice) {
                void toggleVoice();
              }
            }}
          />
        )}

      <KeyboardShortcutsModal open={shortcutsOpen} onClose={() => setShortcutsOpen(false)} />
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
    mentionRoles = [],
    channels = [],
    serverEmoji = [],
    serverStickers = [],
    searchQuery,
    isSearchActive = false,
    memberProfiles,
    memberNames,
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
    onCreateThread,
    onJumpToReply,
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
    mentionRoles?: MentionRole[];
    channels?: { name: string }[];
    serverEmoji?: CommunityServerEmoji[];
    serverStickers?: CommunityServerSticker[];
    searchQuery?: string;
    isSearchActive?: boolean;
    memberProfiles?: Map<string, CommunityProfile>;
    memberNames?: Map<string, string>;
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
    onCreateThread?: () => void;
    onJumpToReply?: () => void;
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
  const [editOpen, setEditOpen] = useState(false);
  const [menuPos, setMenuPos] = useState<{ x: number; y: number } | null>(null);
  const reactBtnRef = useRef<HTMLButtonElement>(null);
  const longPressRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isDesktop = useIsDesktop();

  const openSheet = () => setSheetOpen(true);
  const openMenu = (x: number, y: number) => setMenuPos({ x, y });

  const sheetActions = [
    ...QUICK_EMOJIS.slice(0, 4).map((emoji) => ({
      label: `React ${emoji}`,
      onClick: () => void onReact(emoji),
    })),
    { label: "Reply", onClick: onReply },
    ...(onCreateThread ? [{ label: "Create thread", onClick: onCreateThread }] : []),
    {
      label: "Copy text",
      onClick: () => void navigator.clipboard.writeText(message.body),
    },
    {
      label: "Copy message ID",
      onClick: () => void navigator.clipboard.writeText(message.id),
    },
    ...(isMine && onEdit && message.kind === "chat"
      ? [
          {
            label: "Edit message",
            onClick: () => setEditOpen(true),
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
      } ${highlighted || isSearchActive ? "community-message-highlight" : ""}`}
      onTouchStart={() => {
        longPressRef.current = setTimeout(openSheet, 500);
      }}
      onTouchEnd={() => {
        if (longPressRef.current) clearTimeout(longPressRef.current);
      }}
      onTouchMove={() => {
        if (longPressRef.current) clearTimeout(longPressRef.current);
      }}
      onTouchCancel={() => {
        if (longPressRef.current) clearTimeout(longPressRef.current);
      }}
      onContextMenu={(e) => {
        e.preventDefault();
        if (isDesktop) openMenu(e.clientX, e.clientY);
        else openSheet();
      }}
    >
      {grouped ? (
        <div className="community-message-avatar-spacer flex shrink-0 items-start justify-end pt-0.5">
          <span className="community-message-timestamp-hover">
            <MessageTimestamp iso={message.createdAt} grouped />
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
            <MessageTimestamp iso={message.createdAt} />
            {isSuggestion && message.suggestionStatus && (
              <span className="text-[0.6875rem] text-muted">
                · {SUGGESTION_STATUS_LABELS[message.suggestionStatus]}
              </span>
            )}
          </div>
        )}

        {message.replyPreview && (
          <button
            type="button"
            onClick={onJumpToReply}
            disabled={!onJumpToReply}
            className="mb-1 flex w-full max-w-md items-center gap-1 border-l-4 border-accent pl-3 text-left text-sm text-muted hover:bg-[var(--community-hover)] disabled:cursor-default disabled:hover:bg-transparent"
          >
            <span className="shrink-0 font-medium text-link">
              {message.replyPreview.authorName || "Member"}
            </span>
            <CommunityMessageContent
              body={message.replyPreview.body}
              mentionMembers={mentionMembers}
              mentionRoles={mentionRoles}
              channels={channels}
              serverEmoji={serverEmoji}
              serverStickers={serverStickers}
              compact
            />
          </button>
        )}

        {isSuggestion && (
          <p className="mb-0.5 text-[0.6875rem] font-semibold uppercase tracking-wide text-muted">
            Suggestion
          </p>
        )}
        <CommunityMessageContent
          body={message.body}
          mentionMembers={mentionMembers}
          mentionRoles={mentionRoles}
          channels={channels}
          serverEmoji={serverEmoji}
          serverStickers={serverStickers}
          searchQuery={searchQuery}
        />
        {message.editedAt && <span className="text-[0.625rem] text-muted"> (edited)</span>}

        {message.reactions.length > 0 && (
          <div className="mt-1 flex flex-wrap gap-1">
            {message.reactions.map((r) => (
              <button
                key={r.emoji}
                type="button"
                onClick={() => void onReact(r.emoji)}
                className={`group/reaction relative flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs transition ${
                  r.reactedByMe
                    ? "border-[var(--accent)] bg-[var(--accent-soft)]"
                    : "border-[var(--community-border)] bg-[var(--community-input)] hover:border-[var(--accent)]"
                }`}
              >
                <ReactionTooltip
                  emoji={r.emoji}
                  userIds={r.userIds ?? []}
                  memberProfiles={memberProfiles}
                  memberNames={memberNames}
                />
                <CommunityReactionEmoji emoji={r.emoji} serverEmoji={serverEmoji} />
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
          ref={reactBtnRef}
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

      {isDesktop && pickerOpen && (
        <EmojiPicker
          open={pickerOpen}
          onClose={() => setPickerOpen(false)}
          anchorRef={reactBtnRef}
          serverEmoji={serverEmoji}
          onPick={(emoji) => void onReact(emoji)}
          align="right"
        />
      )}

      <MessageContextMenu open={Boolean(menuPos)} x={menuPos?.x ?? 0} y={menuPos?.y ?? 0} onClose={() => setMenuPos(null)}>
        {sheetActions.map((action) => (
          <ContextMenuItem
            key={action.label}
            destructive={"destructive" in action && action.destructive}
            onClick={() => {
              action.onClick();
              setMenuPos(null);
            }}
          >
            {action.label}
          </ContextMenuItem>
        ))}
      </MessageContextMenu>

      <CommunityActionSheet open={sheetOpen} onClose={() => setSheetOpen(false)} actions={sheetActions} />

      {onEdit && (
        <MessageEditModal
          open={editOpen}
          initialBody={message.body}
          onClose={() => setEditOpen(false)}
          onSave={(body) => onEdit(body)}
        />
      )}
    </li>
  );
});

function ServerMemberSidebar({
  members,
  memberProfiles,
  serverBoosters,
  appOwnerUserIds = new Set<string>(),
  onlineUserIds = new Set<string>(),
  onOpenProfile,
}: {
  members: CommunityServerMember[];
  memberProfiles?: Map<string, CommunityProfile>;
  serverBoosters?: Set<string>;
  appOwnerUserIds?: Set<string>;
  onlineUserIds?: Set<string>;
  onOpenProfile?: (target: { userId?: string; username?: string | null }) => void;
}) {
  return (
    <aside className="hidden w-60 shrink-0 flex-col bg-[var(--community-panel)] min-h-0 md:flex">
      <MemberListPanel
        members={members}
        memberProfiles={memberProfiles}
        serverBoosters={serverBoosters}
        appOwnerUserIds={appOwnerUserIds}
        onlineUserIds={onlineUserIds}
        onOpenProfile={onOpenProfile}
      />
    </aside>
  );
}

