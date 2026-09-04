import { supabase } from "./supabase";
import { compressCover } from "./cover-upload";
import type {
  CommunityCategory,
  CommunityGroup,
  CommunityGroupKind,
  CommunityJoinMode,
  CommunityJoinRequest,
  CommunityMember,
  CommunityMemberRole,
  CommunityMessage,
  CommunityMessageKind,
  CommunityServer,
  CommunityServerAuditEntry,
  CommunityServerBan,
  CommunityServerEmoji,
  CommunityServerMember,
  CommunityServerRole,
  CommunityServerSticker,
  CommunityServerWebhook,
  DefaultNotifications,
  ExplicitContentFilter,
  JoinRequestStatus,
  SuggestionStatus,
  VerificationLevel,
} from "./community-types";
import { normalizeGroupKind } from "./community-types";
import { getBoostLevel } from "./pro";
import { bumpCommunityRail } from "./community-events";
import { isBlockedImageFile, moderateImageContent, moderateTextContent } from "./content-moderation";
import { getChannelNotificationLevel } from "./community-notification-prefs";
import { loadResolvedChannelPermissions } from "./community-permissions";

function normalizeDescription(value: string | null | undefined): string | null {
  if (value == null) return null;
  const trimmed = value
    .split(/\r?\n/)
    .map((line) => line.trimEnd())
    .join("\n")
    .trim();
  return trimmed || null;
}

type ServerRow = {
  id: string;
  library_id: string | null;
  name: string;
  description: string | null;
  icon_url: string | null;
  is_public: boolean;
  is_official: boolean;
  official_position: number | null;
  invite_code: string | null;
  join_mode?: string | null;
  member_count: number;
  message_count: number;
  activity_score: number | string;
  last_activity_at: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  rules?: string | null;
  welcome_message?: string | null;
  verification_level?: string | null;
  explicit_content_filter?: string | null;
  default_notifications?: string | null;
  system_channel_id?: string | null;
  rules_channel_id?: string | null;
  automod_enabled?: boolean | null;
  automod_keywords?: string[] | null;
  boost_count?: number | null;
  banner_url?: string | null;
  vanity_slug?: string | null;
};

function generateInviteCode(): string {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let out = "";
  for (let i = 0; i < 8; i += 1) {
    out += alphabet[Math.floor(Math.random() * alphabet.length)]!;
  }
  return out;
}

function normalizeJoinMode(raw: string | null | undefined): CommunityJoinMode {
  if (raw === "request" || raw === "invite" || raw === "open") return raw;
  return "open";
}

type RoleRow = {
  id: string;
  server_id: string;
  name: string;
  position: number;
  color: string;
  icon_url: string | null;
  can_manage_server: boolean;
  can_manage_channels: boolean;
  can_moderate: boolean;
  can_kick_members?: boolean;
  can_ban_members?: boolean;
  can_manage_messages?: boolean;
  can_invite_users?: boolean;
  hoist?: boolean;
  mentionable?: boolean;
  is_everyone: boolean;
  created_at: string;
};

type CategoryRow = {
  id: string;
  server_id: string | null;
  name: string;
  position: number;
  is_official: boolean;
  created_at: string;
};

type GroupRow = {
  id: string;
  server_id: string | null;
  name: string;
  description: string | null;
  topic: string | null;
  kind: CommunityGroupKind;
  category_id: string | null;
  position: number;
  is_official: boolean;
  icon: string | null;
  created_by: string;
  archived_at: string | null;
  created_at: string;
  updated_at: string;
  slow_mode_seconds?: number | null;
};

type MessageRow = {
  id: string;
  group_id: string;
  author_id: string | null;
  body: string;
  kind: CommunityMessageKind;
  suggestion_status: SuggestionStatus | null;
  author_name: string | null;
  reply_to_id: string | null;
  created_at: string;
  forum_title?: string | null;
  forum_tags?: string[] | null;
  forum_locked?: boolean | null;
  forum_pinned?: boolean | null;
};

function normalizeVerificationLevel(raw: string | null | undefined): VerificationLevel {
  if (raw === "low" || raw === "medium" || raw === "high") return raw;
  return "none";
}

function normalizeContentFilter(raw: string | null | undefined): ExplicitContentFilter {
  if (raw === "no_role" || raw === "all") return raw;
  return "disabled";
}

function normalizeDefaultNotifications(raw: string | null | undefined): DefaultNotifications {
  return raw === "mentions" ? "mentions" : "all";
}

function mapServer(row: ServerRow, extra?: Partial<CommunityServer>): CommunityServer {
  return {
    id: row.id,
    libraryId: row.library_id,
    name: row.name,
    description: row.description,
    iconUrl: row.icon_url,
    isPublic: row.is_public,
    isOfficial: row.is_official,
    officialPosition: row.official_position,
    inviteCode: row.invite_code ?? "",
    joinMode: normalizeJoinMode(row.join_mode),
    memberCount: row.member_count ?? 0,
    messageCount: row.message_count ?? 0,
    activityScore: Number(row.activity_score ?? 0),
    lastActivityAt: row.last_activity_at,
    createdBy: row.created_by,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    rules: row.rules ?? null,
    welcomeMessage: row.welcome_message ?? null,
    verificationLevel: normalizeVerificationLevel(row.verification_level),
    explicitContentFilter: normalizeContentFilter(row.explicit_content_filter),
    defaultNotifications: normalizeDefaultNotifications(row.default_notifications),
    systemChannelId: row.system_channel_id ?? null,
    rulesChannelId: row.rules_channel_id ?? null,
    automodEnabled: Boolean(row.automod_enabled),
    automodKeywords: row.automod_keywords ?? [],
    boostCount: row.boost_count ?? 0,
    boostLevel: getBoostLevel(row.boost_count ?? 0),
    bannerUrl: row.banner_url ?? null,
    vanitySlug: row.vanity_slug ?? null,
    ...extra,
  };
}

function mapServerFromRpc(row: Record<string, unknown>, extra?: Partial<CommunityServer>): CommunityServer {
  return mapServer(
    {
      id: String(row.id ?? ""),
      library_id: row.library_id ? String(row.library_id) : null,
      name: String(row.name ?? ""),
      description: (row.description as string | null) ?? null,
      icon_url: (row.icon_url as string | null) ?? null,
      is_public: Boolean(row.is_public),
      is_official: Boolean(row.is_official),
      official_position: (row.official_position as number | null) ?? null,
      invite_code: (row.invite_code as string | null) ?? null,
      join_mode: (row.join_mode as string | null) ?? "open",
      member_count: Number(row.member_count ?? 0),
      message_count: Number(row.message_count ?? 0),
      activity_score: Number(row.activity_score ?? 0),
      last_activity_at: (row.last_activity_at as string | null) ?? null,
      created_by: (row.created_by as string | null) ?? null,
      created_at: String(row.created_at ?? ""),
      updated_at: String(row.updated_at ?? ""),
    },
    extra,
  );
}

function rpcErrorMessage(err: unknown, fallback: string): string {
  if (err && typeof err === "object" && "message" in err) {
    const msg = String((err as { message: string }).message || "");
    const cleaned = msg.replace(/^.*?: /, "").trim();
    return cleaned || fallback;
  }
  return fallback;
}

function mapRole(row: RoleRow): CommunityServerRole {
  return {
    id: row.id,
    serverId: row.server_id,
    name: row.name,
    position: row.position,
    color: row.color,
    iconUrl: row.icon_url,
    canManageServer: row.can_manage_server,
    canManageChannels: row.can_manage_channels,
    canModerate: row.can_moderate,
    canKickMembers: row.can_kick_members ?? false,
    canBanMembers: row.can_ban_members ?? false,
    canManageMessages: row.can_manage_messages ?? false,
    canInviteUsers: row.can_invite_users ?? false,
    hoist: row.hoist ?? false,
    mentionable: row.mentionable ?? true,
    isEveryone: row.is_everyone,
    createdAt: row.created_at,
  };
}

function mapCategory(row: CategoryRow): CommunityCategory {
  return {
    id: row.id,
    serverId: row.server_id,
    name: row.name,
    position: row.position,
    isOfficial: row.is_official,
    createdAt: row.created_at,
  };
}

function mapGroup(row: GroupRow, extra?: Partial<CommunityGroup>): CommunityGroup {
  return {
    id: row.id,
    serverId: row.server_id,
    name: row.name,
    description: row.description,
    topic: row.topic,
    kind: normalizeGroupKind(row.kind),
    categoryId: row.category_id,
    position: row.position ?? 0,
    isOfficial: Boolean(row.is_official),
    icon: row.icon || "hash",
    createdBy: row.created_by,
    archivedAt: row.archived_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    slowModeSeconds: row.slow_mode_seconds ?? 0,
    ...extra,
  };
}

function mapMessage(row: MessageRow, extra?: Partial<CommunityMessage>): CommunityMessage {
  return {
    id: row.id,
    groupId: row.group_id,
    authorId: row.author_id,
    body: row.body,
    kind: row.kind,
    suggestionStatus: row.suggestion_status,
    authorName: row.author_name,
    replyToId: row.reply_to_id,
    reactions: [],
    createdAt: row.created_at,
    editedAt: (row as { edited_at?: string | null }).edited_at ?? null,
    forumTitle: row.forum_title ?? null,
    forumTags: row.forum_tags ?? [],
    forumLocked: Boolean(row.forum_locked),
    forumPinned: Boolean(row.forum_pinned),
    ...extra,
  };
}

async function seedDefaultRoles(serverId: string): Promise<void> {
  const defaults = [
    {
      name: "Owner",
      position: 0,
      color: "#E11D48",
      can_manage_server: true,
      can_manage_channels: true,
      can_moderate: true,
      can_kick_members: true,
      can_ban_members: true,
      can_manage_messages: true,
      can_invite_users: true,
      hoist: true,
      mentionable: true,
      is_everyone: false,
    },
    {
      name: "Admin",
      position: 10,
      color: "#F59E0B",
      can_manage_server: true,
      can_manage_channels: true,
      can_moderate: true,
      can_kick_members: true,
      can_ban_members: true,
      can_manage_messages: true,
      can_invite_users: true,
      hoist: true,
      mentionable: true,
      is_everyone: false,
    },
    {
      name: "Moderator",
      position: 20,
      color: "#3B82F6",
      can_manage_server: false,
      can_manage_channels: false,
      can_moderate: true,
      can_kick_members: true,
      can_ban_members: true,
      can_manage_messages: true,
      can_invite_users: true,
      hoist: true,
      mentionable: true,
      is_everyone: false,
    },
    {
      name: "Member",
      position: 100,
      color: "#6B7280",
      can_manage_server: false,
      can_manage_channels: false,
      can_moderate: false,
      can_kick_members: false,
      can_ban_members: false,
      can_manage_messages: false,
      can_invite_users: true,
      hoist: false,
      mentionable: true,
      is_everyone: true,
    },
  ];
  for (const role of defaults) {
    await supabase.from("community_server_roles").upsert(
      { server_id: serverId, ...role },
      { onConflict: "server_id,name", ignoreDuplicates: true },
    );
  }
}

/** Legacy seeded category names — never show or recreate these. */
const LEGACY_DEFAULT_CATEGORY_NAMES = new Set(["text channels", "official"]);

export async function recomputeServerScore(serverId: string): Promise<void> {
  const [{ count: members }, { data: groups }] = await Promise.all([
    supabase
      .from("community_server_members")
      .select("*", { count: "exact", head: true })
      .eq("server_id", serverId),
    supabase.from("community_groups").select("id").eq("server_id", serverId),
  ]);
  const groupIds = (groups ?? []).map((g) => g.id as string);
  let messageCount = 0;
  let lastActivity: string | null = null;
  if (groupIds.length > 0) {
    const { count, data: latest } = await supabase
      .from("community_messages")
      .select("created_at", { count: "exact" })
      .in("group_id", groupIds)
      .order("created_at", { ascending: false })
      .limit(1);
    messageCount = count ?? 0;
    lastActivity = latest?.[0]?.created_at ?? null;
  }
  const memberCount = members ?? 0;
  const recentBoost =
    lastActivity && Date.now() - new Date(lastActivity).getTime() < 7 * 24 * 60 * 60 * 1000
      ? 50
      : 0;
  const activityScore = memberCount * 5 + messageCount * 2 + recentBoost;
  await supabase
    .from("community_servers")
    .update({
      member_count: memberCount,
      message_count: messageCount,
      activity_score: activityScore,
      last_activity_at: lastActivity,
      updated_at: new Date().toISOString(),
    })
    .eq("id", serverId);
}

/** Create a community server linked to a library (explicit only — never auto-created). */
export async function createLibraryServer(input: {
  libraryId: string;
  name: string;
  description?: string;
  isPublic?: boolean;
  userId: string;
  isLibraryOwner: boolean;
  isAppOwner?: boolean;
}): Promise<CommunityServer> {
  if (!input.isLibraryOwner && !input.isAppOwner) {
    throw new Error("Only the library owner can create a server");
  }

  assertModeratedTextFields([input.name, input.description]);

  const { data, error } = await supabase
    .from("community_servers")
    .insert({
      library_id: input.libraryId,
      name: input.name.trim() || "My Server",
      description: normalizeDescription(input.description),
      is_public: Boolean(input.isPublic),
      is_official: false,
      official_position: null,
      invite_code: generateInviteCode(),
      join_mode: input.isPublic ? "open" : "invite",
      created_by: input.userId,
    })
    .select("*")
    .single();
  if (error || !data) throw error ?? new Error("Could not create server");

  const server = data as ServerRow;
  await seedDefaultRoles(server.id);

  const { data: ownerRole } = await supabase
    .from("community_server_roles")
    .select("id")
    .eq("server_id", server.id)
    .eq("name", "Owner")
    .maybeSingle();

  await supabase.from("community_server_members").upsert({
    server_id: server.id,
    user_id: input.userId,
    role_id: ownerRole?.id ?? null,
  });

  await recomputeServerScore(server.id);
  bumpCommunityRail();
  return mapServer(server, { canManage: true, isMember: true, memberCount: 1 });
}

/** Look up one existing server for a library — does not create one. */
export async function getServerForLibrary(libraryId: string): Promise<CommunityServer | null> {
  const { data, error } = await supabase
    .from("community_servers")
    .select("*")
    .eq("library_id", libraryId)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;
  return mapServer(data as ServerRow);
}

export async function listServersForLibrary(libraryId: string): Promise<CommunityServer[]> {
  const { data, error } = await supabase
    .from("community_servers")
    .select("*")
    .eq("library_id", libraryId)
    .order("created_at", { ascending: true });
  if (error) throw error;
  return ((data ?? []) as ServerRow[]).map((r) => mapServer(r));
}

export async function listPublicServers(userId?: string): Promise<CommunityServer[]> {
  const { data, error } = await supabase
    .from("community_servers")
    .select("*")
    .eq("is_public", true)
    .eq("is_official", false)
    .order("activity_score", { ascending: false })
    .order("member_count", { ascending: false })
    .order("name", { ascending: true });
  if (error) throw error;
  const rows = (data ?? []) as ServerRow[];
  const memberIds = userId ? await memberServerIdSet(userId) : new Set<string>();
  const pending = userId ? await pendingRequestServerIdSet(userId) : new Set<string>();
  return rows.map((r) =>
    mapServer(r, {
      isMember: memberIds.has(r.id),
      myJoinRequestStatus: pending.has(r.id) ? "pending" : null,
    }),
  );
}

export async function listOfficialServers(userId?: string): Promise<CommunityServer[]> {
  const { data, error } = await supabase
    .from("community_servers")
    .select("*")
    .eq("is_official", true)
    .order("official_position", { ascending: true, nullsFirst: false })
    .order("activity_score", { ascending: false })
    .order("name", { ascending: true });
  if (error) throw error;
  const rows = (data ?? []) as ServerRow[];
  const memberIds = userId ? await memberServerIdSet(userId) : new Set<string>();
  const pending = userId ? await pendingRequestServerIdSet(userId) : new Set<string>();
  return rows.map((r) =>
    mapServer(r, {
      isMember: memberIds.has(r.id),
      myJoinRequestStatus: pending.has(r.id) ? "pending" : null,
    }),
  );
}

async function memberServerIdSet(userId: string): Promise<Set<string>> {
  const { data } = await supabase
    .from("community_server_members")
    .select("server_id")
    .eq("user_id", userId);
  return new Set((data ?? []).map((m) => m.server_id as string));
}

async function pendingRequestServerIdSet(userId: string): Promise<Set<string>> {
  const { data } = await supabase
    .from("community_server_join_requests")
    .select("server_id")
    .eq("user_id", userId)
    .eq("status", "pending");
  return new Set((data ?? []).map((m) => m.server_id as string));
}

/** Servers the user has joined (membership only — libraries do not auto-appear). */
export async function listMyServers(userId: string): Promise<CommunityServer[]> {
  const [{ data: memberships }, { data: libraryMemberships }] = await Promise.all([
    supabase.from("community_server_members").select("server_id, role_id").eq("user_id", userId),
    supabase.from("library_members").select("library_id, role").eq("user_id", userId),
  ]);

  const memberServerIds = (memberships ?? []).map((m) => m.server_id as string);
  if (memberServerIds.length === 0) return [];

  const roleByServer = new Map(
    (memberships ?? []).map((m) => [m.server_id as string, m.role_id as string | null]),
  );
  const libraryRole = new Map(
    (libraryMemberships ?? []).map((m) => [m.library_id as string, m.role as string]),
  );

  const { data, error } = await supabase
    .from("community_servers")
    .select("*")
    .in("id", memberServerIds)
    .order("name");
  if (error) throw error;

  return ((data ?? []) as ServerRow[]).map((r) =>
    mapServer(r, {
      myRoleId: roleByServer.get(r.id) ?? null,
      isMember: true,
      canManage: Boolean(r.library_id && libraryRole.get(r.library_id) === "owner"),
    }),
  );
}

export async function getServer(serverId: string): Promise<CommunityServer | null> {
  const { data, error } = await supabase
    .from("community_servers")
    .select("*")
    .eq("id", serverId)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;
  return mapServer(data as ServerRow);
}

export async function updateServer(
  serverId: string,
  patch: {
    name?: string;
    description?: string | null;
    iconUrl?: string | null;
    isPublic?: boolean;
    isOfficial?: boolean;
    officialPosition?: number | null;
    /** Required when demoting from official; cleared automatically when promoting. */
    libraryId?: string | null;
    joinMode?: CommunityJoinMode;
    rules?: string | null;
    welcomeMessage?: string | null;
    verificationLevel?: VerificationLevel;
    explicitContentFilter?: ExplicitContentFilter;
    defaultNotifications?: DefaultNotifications;
    systemChannelId?: string | null;
    rulesChannelId?: string | null;
    automodEnabled?: boolean;
    automodKeywords?: string[];
    bannerUrl?: string | null;
    vanitySlug?: string | null;
  },
): Promise<void> {
  assertModeratedTextFields([
    patch.name,
    patch.description,
    patch.rules,
    patch.welcomeMessage,
  ]);

  const row: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (patch.name !== undefined) row.name = patch.name.trim();
  if (patch.description !== undefined) row.description = normalizeDescription(patch.description);
  if (patch.iconUrl !== undefined) row.icon_url = patch.iconUrl || null;
  if (patch.bannerUrl !== undefined) row.banner_url = patch.bannerUrl || null;
  if (patch.vanitySlug !== undefined) {
    const slug = patch.vanitySlug?.trim().toLowerCase().replace(/[^a-z0-9-]/g, "") || null;
    row.vanity_slug = slug;
  }
  if (patch.isPublic !== undefined) row.is_public = patch.isPublic;
  if (patch.joinMode !== undefined) row.join_mode = patch.joinMode;
  if (patch.rules !== undefined) row.rules = patch.rules?.trim() || null;
  if (patch.welcomeMessage !== undefined) row.welcome_message = patch.welcomeMessage?.trim() || null;
  if (patch.verificationLevel !== undefined) row.verification_level = patch.verificationLevel;
  if (patch.explicitContentFilter !== undefined) row.explicit_content_filter = patch.explicitContentFilter;
  if (patch.defaultNotifications !== undefined) row.default_notifications = patch.defaultNotifications;
  if (patch.systemChannelId !== undefined) row.system_channel_id = patch.systemChannelId || null;
  if (patch.rulesChannelId !== undefined) row.rules_channel_id = patch.rulesChannelId || null;
  if (patch.automodEnabled !== undefined) row.automod_enabled = patch.automodEnabled;
  if (patch.automodKeywords !== undefined) {
    row.automod_keywords = patch.automodKeywords.map((k) => k.trim().toLowerCase()).filter(Boolean);
  }
  if (patch.isOfficial !== undefined) {
    row.is_official = patch.isOfficial;
    if (patch.isOfficial) {
      // Official servers are platform communities — not tied to a personal library.
      row.library_id = null;
      if (patch.officialPosition === undefined) {
        const { data: max } = await supabase
          .from("community_servers")
          .select("official_position")
          .eq("is_official", true)
          .order("official_position", { ascending: false })
          .limit(1)
          .maybeSingle();
        row.official_position = (max?.official_position ?? -1) + 1;
      }
    } else {
      row.official_position = null;
      const nextLibraryId = patch.libraryId?.trim() || null;
      if (!nextLibraryId) {
        throw new Error("Link this server to a library before removing Official status.");
      }
      row.library_id = nextLibraryId;
    }
  } else if (patch.libraryId !== undefined) {
    row.library_id = patch.libraryId?.trim() || null;
  }
  if (patch.officialPosition !== undefined) row.official_position = patch.officialPosition;

  const { error } = await supabase.from("community_servers").update(row).eq("id", serverId);
  if (error) throw error;

  if (patch.rules !== undefined || patch.rulesChannelId !== undefined) {
    await syncServerRulesToChannel(serverId);
  }
}

export async function syncServerRulesToChannel(serverId: string): Promise<void> {
  const server = await getServer(serverId);
  if (!server?.rulesChannelId || !server.rules?.trim()) return;

  const rulesBody = `**Server Rules**\n\n${server.rules.trim()}`;
  const { data: existing } = await supabase
    .from("community_messages")
    .select("id")
    .eq("group_id", server.rulesChannelId)
    .eq("kind", "system")
    .ilike("body", "%Server Rules%")
    .limit(1)
    .maybeSingle();

  if (existing?.id) {
    await supabase
      .from("community_messages")
      .update({ body: rulesBody, edited_at: new Date().toISOString() })
      .eq("id", existing.id as string);
    return;
  }

  await supabase.from("community_messages").insert({
    group_id: server.rulesChannelId,
    author_id: null,
    body: rulesBody,
    kind: "system",
    author_name: "Server",
  });
}

/** App owner: set ordered list of official server ids. */
export async function reorderOfficialServers(orderedIds: string[]): Promise<void> {
  for (let i = 0; i < orderedIds.length; i++) {
    const { error } = await supabase
      .from("community_servers")
      .update({
        is_official: true,
        official_position: i,
        updated_at: new Date().toISOString(),
      })
      .eq("id", orderedIds[i]);
    if (error) throw error;
  }
}

/** App owner: move one official server to the top of the Discover list. */
export async function pinOfficialServerToTop(serverId: string): Promise<void> {
  const servers = await listOfficialServers();
  const orderedIds = servers.map((s) => s.id);
  const index = orderedIds.indexOf(serverId);
  if (index <= 0) return;
  orderedIds.splice(index, 1);
  orderedIds.unshift(serverId);
  await reorderOfficialServers(orderedIds);
}

export async function getMyRulesAccepted(serverId: string, userId: string): Promise<string | null> {
  const { data, error } = await supabase
    .from("community_server_members")
    .select("rules_accepted_at")
    .eq("server_id", serverId)
    .eq("user_id", userId)
    .maybeSingle();
  if (error) {
    if (error.code === "42703" || /column .+ does not exist/i.test(error.message ?? "")) {
      return null;
    }
    throw error;
  }
  return (data?.rules_accepted_at as string | null) ?? null;
}

export async function acceptServerRules(serverId: string): Promise<void> {
  const { error } = await supabase.rpc("accept_community_server_rules", { p_server_id: serverId });
  if (error) throw new Error(rpcErrorMessage(error, "Could not accept rules"));
}

export type JoinOutcome = {
  status: "joined" | "already_member" | "requested";
  server: CommunityServer;
};

export async function joinServer(serverId: string, _userId?: string): Promise<JoinOutcome> {
  const { data, error } = await supabase.rpc("join_community_server", { p_server_id: serverId });
  if (error) throw new Error(rpcErrorMessage(error, "Could not join server"));
  const payload = data as { status: JoinOutcome["status"]; server: Record<string, unknown> };
  const server = mapServerFromRpc(payload.server, {
    isMember: payload.status === "joined" || payload.status === "already_member",
    myJoinRequestStatus: payload.status === "requested" ? "pending" : null,
  });
  bumpCommunityRail();
  return { status: payload.status, server };
}

export async function joinServerByInviteCode(_userId: string | undefined, code: string): Promise<JoinOutcome> {
  const { data, error } = await supabase.rpc("join_server_by_invite_code", {
    p_code: code.trim(),
  });
  if (error) throw new Error(rpcErrorMessage(error, "Invalid invite code"));
  const payload = data as { status: JoinOutcome["status"]; server: Record<string, unknown> };
  const server = mapServerFromRpc(payload.server, {
    isMember: payload.status === "joined" || payload.status === "already_member",
    myJoinRequestStatus: payload.status === "requested" ? "pending" : null,
  });
  if (payload.status !== "requested") bumpCommunityRail();
  return { status: payload.status, server };
}

export async function joinServerByVanitySlug(userId: string, slug: string): Promise<JoinOutcome> {
  const normalized = slug.trim().toLowerCase();
  const { data, error } = await supabase
    .from("community_servers")
    .select("invite_code")
    .eq("vanity_slug", normalized)
    .maybeSingle();
  if (error) throw error;
  if (!data?.invite_code) throw new Error("Server not found");
  return joinServerByInviteCode(userId, data.invite_code as string);
}

export async function requestJoinServer(serverId: string, message?: string): Promise<JoinOutcome> {
  const { data, error } = await supabase.rpc("request_join_community_server", {
    p_server_id: serverId,
    p_message: message?.trim() || null,
  });
  if (error) throw new Error(rpcErrorMessage(error, "Could not send join request"));
  const payload = data as { status: JoinOutcome["status"]; server: Record<string, unknown> };
  return {
    status: payload.status,
    server: mapServerFromRpc(payload.server, {
      isMember: payload.status === "joined" || payload.status === "already_member",
      myJoinRequestStatus: payload.status === "requested" ? "pending" : null,
    }),
  };
}

export async function reviewJoinRequest(requestId: string, approve: boolean): Promise<"approved" | "rejected"> {
  const { data, error } = await supabase.rpc("review_join_request", {
    p_request_id: requestId,
    p_approve: approve,
  });
  if (error) throw new Error(rpcErrorMessage(error, "Could not review request"));
  const status = (data as { status: "approved" | "rejected" }).status;
  if (status === "approved") bumpCommunityRail();
  return status;
}

export async function listPendingJoinRequests(serverId: string): Promise<CommunityJoinRequest[]> {
  const { data, error } = await supabase
    .from("community_server_join_requests")
    .select("id, server_id, user_id, status, message, reviewed_by, reviewed_at, created_at")
    .eq("server_id", serverId)
    .eq("status", "pending")
    .order("created_at", { ascending: true });
  if (error) throw error;

  const rows = data ?? [];
  const userIds = [...new Set(rows.map((r) => r.user_id as string))];
  const profileByUser = new Map<string, { displayName: string | null; email: string | null }>();

  if (userIds.length > 0) {
    const { data: profiles } = await supabase
      .from("user_profiles")
      .select("user_id, display_name, community_display_name, community_username")
      .in("user_id", userIds);
    for (const p of profiles ?? []) {
      profileByUser.set(p.user_id as string, {
        displayName:
          (p.community_display_name as string | null) ||
          (p.display_name as string | null) ||
          (p.community_username ? `@${p.community_username}` : null),
        email: null,
      });
    }
  }

  return rows.map((r) => ({
    id: r.id as string,
    serverId: r.server_id as string,
    userId: r.user_id as string,
    status: r.status as JoinRequestStatus,
    message: (r.message as string | null) ?? null,
    reviewedBy: (r.reviewed_by as string | null) ?? null,
    reviewedAt: (r.reviewed_at as string | null) ?? null,
    createdAt: r.created_at as string,
    displayName: profileByUser.get(r.user_id as string)?.displayName ?? null,
    email: profileByUser.get(r.user_id as string)?.email ?? null,
  }));
}

export async function getMyJoinRequestStatus(
  serverId: string,
  userId: string,
): Promise<JoinRequestStatus | null> {
  const { data } = await supabase
    .from("community_server_join_requests")
    .select("status")
    .eq("server_id", serverId)
    .eq("user_id", userId)
    .maybeSingle();
  return (data?.status as JoinRequestStatus | undefined) ?? null;
}

export async function regenerateServerInviteCode(serverId: string): Promise<string> {
  const code = generateInviteCode();
  const { error } = await supabase
    .from("community_servers")
    .update({ invite_code: code, updated_at: new Date().toISOString() })
    .eq("id", serverId);
  if (error) throw error;
  return code;
}

export async function leaveServer(serverId: string, _userId: string): Promise<void> {
  const { error } = await supabase.rpc("leave_community_server", { p_server_id: serverId });
  if (error) throw new Error(rpcErrorMessage(error, "Could not leave server"));
  try {
    await recomputeServerScore(serverId);
  } catch {
    // Score update may be restricted; membership delete still succeeded.
  }
  bumpCommunityRail();
}

export async function isServerMember(serverId: string, userId: string): Promise<boolean> {
  const { data } = await supabase
    .from("community_server_members")
    .select("user_id")
    .eq("server_id", serverId)
    .eq("user_id", userId)
    .maybeSingle();
  return Boolean(data);
}

export async function deleteServer(serverId: string): Promise<void> {
  const { error } = await supabase.from("community_servers").delete().eq("id", serverId);
  if (error) throw error;
}

export async function listServerRoles(serverId: string): Promise<CommunityServerRole[]> {
  const { data, error } = await supabase
    .from("community_server_roles")
    .select("*")
    .eq("server_id", serverId)
    .order("position", { ascending: true });
  if (error) throw error;
  return ((data ?? []) as RoleRow[]).map(mapRole);
}

export async function createServerRole(
  serverId: string,
  input: { name: string; color?: string; iconUrl?: string | null },
): Promise<CommunityServerRole> {
  const { data: max } = await supabase
    .from("community_server_roles")
    .select("position")
    .eq("server_id", serverId)
    .order("position", { ascending: false })
    .limit(1)
    .maybeSingle();

  const { data, error } = await supabase
    .from("community_server_roles")
    .insert({
      server_id: serverId,
      name: input.name.trim(),
      color: input.color || "#6B7280",
      icon_url: input.iconUrl || null,
      position: Math.min((max?.position ?? 90) + 1, 99),
      can_manage_server: false,
      can_manage_channels: false,
      can_moderate: false,
      is_everyone: false,
    })
    .select("*")
    .single();
  if (error || !data) throw error ?? new Error("Could not create role");
  return mapRole(data as RoleRow);
}

export async function updateServerRole(
  roleId: string,
  patch: {
    name?: string;
    color?: string;
    iconUrl?: string | null;
    position?: number;
    canManageServer?: boolean;
    canManageChannels?: boolean;
    canModerate?: boolean;
    canKickMembers?: boolean;
    canBanMembers?: boolean;
    canManageMessages?: boolean;
    canInviteUsers?: boolean;
    hoist?: boolean;
    mentionable?: boolean;
  },
): Promise<void> {
  const base: Record<string, unknown> = {};
  const extended: Record<string, unknown> = {};
  if (patch.name !== undefined) base.name = patch.name.trim();
  if (patch.color !== undefined) base.color = patch.color;
  if (patch.iconUrl !== undefined) base.icon_url = patch.iconUrl;
  if (patch.position !== undefined) base.position = patch.position;
  if (patch.canManageServer !== undefined) base.can_manage_server = patch.canManageServer;
  if (patch.canManageChannels !== undefined) base.can_manage_channels = patch.canManageChannels;
  if (patch.canModerate !== undefined) base.can_moderate = patch.canModerate;
  if (patch.canKickMembers !== undefined) extended.can_kick_members = patch.canKickMembers;
  if (patch.canBanMembers !== undefined) extended.can_ban_members = patch.canBanMembers;
  if (patch.canManageMessages !== undefined) extended.can_manage_messages = patch.canManageMessages;
  if (patch.canInviteUsers !== undefined) extended.can_invite_users = patch.canInviteUsers;
  if (patch.hoist !== undefined) extended.hoist = patch.hoist;
  if (patch.mentionable !== undefined) extended.mentionable = patch.mentionable;

  const full = { ...base, ...extended };
  const { error } = await supabase.from("community_server_roles").update(full).eq("id", roleId);
  if (!error) return;

  const msg = String(error.message ?? "");
  const missingColumn =
    msg.includes("can_kick_members") ||
    msg.includes("can_ban_members") ||
    msg.includes("can_manage_messages") ||
    msg.includes("can_invite_users") ||
    msg.includes("hoist") ||
    msg.includes("mentionable") ||
    (msg.includes("column") && msg.includes("does not exist"));

  if (missingColumn && Object.keys(extended).length > 0) {
    const { error: retry } = await supabase.from("community_server_roles").update(base).eq("id", roleId);
    if (!retry) return;
    throw retry;
  }

  throw error;
}

export async function deleteServerRole(roleId: string): Promise<void> {
  const { error } = await supabase
    .from("community_server_roles")
    .delete()
    .eq("id", roleId)
    .eq("is_everyone", false);
  if (error) throw error;
}

export async function uploadCommunityImage(
  file: File,
  options?: { moderate?: boolean; serverId?: string; userId?: string },
): Promise<string> {
  let shouldModerate = options?.moderate;
  if (shouldModerate === undefined && options?.serverId && options?.userId) {
    shouldModerate = await shouldModerateCommunityImage(options.serverId, options.userId);
  }
  if (shouldModerate === undefined) shouldModerate = true;
  if (shouldModerate) {
    const blocked = isBlockedImageFile(file);
    if (blocked) throw new Error(blocked);
  }

  const raw = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error("Could not read file"));
    reader.readAsDataURL(file);
  });
  const { dataUrl, mediaType } = await compressCover(raw, 256, 0.85);

  if (shouldModerate) {
    const verdict = await moderateImageContent(dataUrl, mediaType);
    if (!verdict.safe) {
      throw new Error(verdict.reason || "Image blocked: inappropriate content is not allowed.");
    }
  }

  const { data: session } = await supabase.auth.getSession();
  const token = session.session?.access_token;
  if (!token) throw new Error("Sign in to upload");

  const endpoint = "/api/community/covers";
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`,
  };

  const res = await fetch(endpoint, {
    method: "POST",
    headers,
    body: JSON.stringify({ image: dataUrl, mediaType }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: "Upload failed" }));
    throw new Error(err.error || "Upload failed");
  }
  const data = (await res.json()) as { url: string };
  return data.url;
}

export async function listCommunityCategories(serverId: string): Promise<CommunityCategory[]> {
  const { data, error } = await supabase
    .from("community_categories")
    .select("*")
    .eq("server_id", serverId)
    .order("position", { ascending: true })
    .order("created_at", { ascending: true });
  if (error) throw error;
  return ((data ?? []) as CategoryRow[])
    .map(mapCategory)
    .filter((c) => !LEGACY_DEFAULT_CATEGORY_NAMES.has(c.name.trim().toLowerCase()));
}

export async function createCommunityCategory(input: {
  serverId: string;
  name: string;
  userId: string;
}): Promise<CommunityCategory> {
  const { data: existing } = await supabase
    .from("community_categories")
    .select("position")
    .eq("server_id", input.serverId)
    .order("position", { ascending: false })
    .limit(1);
  const nextPos = ((existing?.[0]?.position as number | undefined) ?? 0) + 10;

  const { data, error } = await supabase
    .from("community_categories")
    .insert({
      name: input.name.trim(),
      position: nextPos,
      is_official: false,
      server_id: input.serverId,
      created_by: input.userId,
    })
    .select("*")
    .single();
  if (error || !data) throw error ?? new Error("Could not create category");
  return mapCategory(data as CategoryRow);
}

export async function renameCommunityCategory(id: string, name: string): Promise<void> {
  const { error } = await supabase
    .from("community_categories")
    .update({ name: name.trim() })
    .eq("id", id);
  if (error) throw error;
}

export async function deleteCommunityCategory(id: string): Promise<void> {
  const { error } = await supabase.from("community_categories").delete().eq("id", id);
  if (error) throw error;
}

export async function listCommunityGroups(
  userId: string,
  serverId: string,
): Promise<CommunityGroup[]> {
  const [{ data: memberships }, { data: groups, error }] = await Promise.all([
    supabase.from("community_group_members").select("group_id, role").eq("user_id", userId),
    supabase
      .from("community_groups")
      .select("*")
      .eq("server_id", serverId)
      .is("archived_at", null)
      .order("position", { ascending: true })
      .order("created_at", { ascending: true }),
  ]);
  if (error) throw error;

  const roleByGroup = new Map(
    (memberships ?? []).map((m) => [m.group_id as string, m.role as CommunityMemberRole]),
  );
  const rows = (groups ?? []) as GroupRow[];

  return Promise.all(
    rows.map(async (g) => {
      const { count } = await supabase
        .from("community_group_members")
        .select("*", { count: "exact", head: true })
        .eq("group_id", g.id);
      return mapGroup(g, {
        myRole: roleByGroup.get(g.id) ?? null,
        memberCount: count ?? 0,
      });
    }),
  );
}

export async function syncServerMembersToChannel(
  serverId: string,
  groupId: string,
  creatorUserId: string,
): Promise<void> {
  const { data: members, error } = await supabase
    .from("community_server_members")
    .select("user_id")
    .eq("server_id", serverId);
  if (error) throw error;

  const rows = (members ?? []).map((m) => ({
    group_id: groupId,
    user_id: m.user_id as string,
    role: (m.user_id as string) === creatorUserId ? "admin" : "member",
  }));

  if (rows.length === 0) {
    await supabase.from("community_group_members").insert({
      group_id: groupId,
      user_id: creatorUserId,
      role: "admin",
    });
    return;
  }

  await supabase.from("community_group_members").upsert(rows, { onConflict: "group_id,user_id" });
}

export async function getServerRoleForMember(
  serverId: string,
  userId: string,
  roles?: CommunityServerRole[],
): Promise<CommunityServerRole | null> {
  const roleId = await getMyServerRoleId(serverId, userId);
  if (!roleId) return null;
  const list = roles ?? (await listServerRoles(serverId));
  return list.find((r) => r.id === roleId) ?? null;
}

export async function createCommunityGroup(input: {
  serverId: string;
  name: string;
  description?: string;
  topic?: string;
  kind?: CommunityGroupKind;
  categoryId?: string | null;
  userId: string;
  slowModeSeconds?: number;
}): Promise<CommunityGroup> {
  const categoryId = input.categoryId ?? null;
  const kind = input.kind ?? "text";

  let siblingsQuery = supabase
    .from("community_groups")
    .select("position")
    .eq("server_id", input.serverId);
  siblingsQuery = categoryId
    ? siblingsQuery.eq("category_id", categoryId)
    : siblingsQuery.is("category_id", null);
  const { data: siblings } = await siblingsQuery
    .order("position", { ascending: false })
    .limit(1);
  const nextPos = ((siblings?.[0]?.position as number | undefined) ?? 0) + 1;

  const { data, error } = await supabase
    .from("community_groups")
    .insert({
      name: input.name.trim(),
      description: input.description?.trim() || null,
      topic: input.topic?.trim() || null,
      kind,
      category_id: categoryId,
      server_id: input.serverId,
      is_official: false,
      position: nextPos,
      icon: "hash",
      created_by: input.userId,
      slow_mode_seconds: Math.max(0, input.slowModeSeconds ?? 0),
    })
    .select("*")
    .single();
  if (error || !data) throw error ?? new Error("Could not create channel");

  const group = data as GroupRow;
  await syncServerMembersToChannel(input.serverId, group.id, input.userId);

  await supabase.from("community_messages").insert({
    group_id: group.id,
    author_id: input.userId,
    body: `Welcome to #${group.name}.`,
    kind: "system",
    author_name: "Pine",
  });

  await recomputeServerScore(input.serverId);
  return mapGroup(group, { myRole: "admin", memberCount: 1 });
}

export async function updateCommunityGroup(
  groupId: string,
  patch: {
    name?: string;
    description?: string | null;
    topic?: string | null;
    kind?: CommunityGroupKind;
    categoryId?: string | null;
    position?: number;
    serverId?: string;
    slowModeSeconds?: number;
  },
): Promise<void> {
  const row: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (patch.name !== undefined) row.name = patch.name.trim();
  if (patch.description !== undefined) row.description = patch.description?.trim() || null;
  if (patch.topic !== undefined) row.topic = patch.topic?.trim() || null;
  if (patch.kind !== undefined) row.kind = patch.kind;
  if (patch.position !== undefined) row.position = patch.position;
  if (patch.categoryId !== undefined) row.category_id = patch.categoryId;
  if (patch.slowModeSeconds !== undefined) row.slow_mode_seconds = patch.slowModeSeconds;

  const { error } = await supabase.from("community_groups").update(row).eq("id", groupId);
  if (error) throw error;
}

export async function archiveCommunityGroup(groupId: string): Promise<void> {
  const { error } = await supabase
    .from("community_groups")
    .update({ archived_at: new Date().toISOString(), updated_at: new Date().toISOString() })
    .eq("id", groupId);
  if (error) throw error;
}

export async function listGroupMembers(groupId: string): Promise<CommunityMember[]> {
  const { data, error } = await supabase
    .from("community_group_members")
    .select("user_id, role, joined_at")
    .eq("group_id", groupId)
    .order("joined_at");
  if (error) throw error;

  const rows = data ?? [];
  const ids = rows.map((r) => r.user_id as string);
  if (ids.length === 0) return [];

  const { data: profiles } = await supabase
    .from("user_profiles")
    .select("user_id, display_name")
    .in("user_id", ids);

  const names = new Map(
    (profiles ?? []).map((p) => [p.user_id as string, (p.display_name as string | null) ?? null]),
  );

  return rows.map((r) => ({
    userId: r.user_id as string,
    role: r.role as CommunityMemberRole,
    joinedAt: r.joined_at as string,
    displayName: names.get(r.user_id as string) ?? null,
    email: null,
  }));
}

export async function addGroupMember(
  groupId: string,
  userId: string,
  role: CommunityMemberRole = "member",
): Promise<void> {
  const { error } = await supabase.from("community_group_members").upsert({
    group_id: groupId,
    user_id: userId,
    role,
  });
  if (error) throw error;
}

export async function updateMemberRole(
  groupId: string,
  userId: string,
  role: CommunityMemberRole,
): Promise<void> {
  const { error } = await supabase
    .from("community_group_members")
    .update({ role })
    .eq("group_id", groupId)
    .eq("user_id", userId);
  if (error) throw error;
}

export async function removeGroupMember(groupId: string, userId: string): Promise<void> {
  const { error } = await supabase
    .from("community_group_members")
    .delete()
    .eq("group_id", groupId)
    .eq("user_id", userId);
  if (error) throw error;
}

export async function listGroupMessages(
  groupId: string,
  userId?: string,
  opts?: { serverId?: string },
): Promise<CommunityMessage[]> {
  if (opts?.serverId && userId) {
    const { data: group } = await supabase
      .from("community_groups")
      .select("category_id")
      .eq("id", groupId)
      .maybeSingle();
    const role = await getServerRoleForMember(opts.serverId, userId);
    const perms = await loadResolvedChannelPermissions(
      opts.serverId,
      groupId,
      (group?.category_id as string | null) ?? null,
      role,
    );
    if (!perms.view) return [];
  }

  const { data, error } = await supabase
    .from("community_messages")
    .select("*")
    .eq("group_id", groupId)
    .order("created_at");
  if (error) throw error;
  const rows = (data ?? []) as MessageRow[];
  const byId = new Map(rows.map((r) => [r.id, r]));

  const messageIds = rows.map((r) => r.id);
  const reactionRows: { message_id: string; emoji: string; user_id: string }[] = [];
  if (messageIds.length > 0) {
    const { data: rx } = await supabase
      .from("community_message_reactions")
      .select("message_id, emoji, user_id")
      .in("message_id", messageIds);
    if (rx) reactionRows.push(...(rx as typeof reactionRows));
  }

  const reactionsByMessage = new Map<string, Map<string, { count: number; mine: boolean; userIds: string[] }>>();
  for (const rx of reactionRows) {
    const map = reactionsByMessage.get(rx.message_id) ?? new Map();
    const entry = map.get(rx.emoji) ?? { count: 0, mine: false, userIds: [] };
    entry.count += 1;
    entry.userIds.push(rx.user_id);
    if (userId && rx.user_id === userId) entry.mine = true;
    map.set(rx.emoji, entry);
    reactionsByMessage.set(rx.message_id, map);
  }

  return rows.map((row) => {
    const replySource = row.reply_to_id ? byId.get(row.reply_to_id) : null;
    const rxMap = reactionsByMessage.get(row.id);
    const reactions = rxMap
      ? [...rxMap.entries()].map(([emoji, v]) => ({
          emoji,
          count: v.count,
          reactedByMe: v.mine,
          userIds: v.userIds,
        }))
      : [];
    return mapMessage(row, {
      replyPreview: replySource
        ? {
            authorName: replySource.author_name,
            body: replySource.body.slice(0, 160),
          }
        : null,
      reactions,
    });
  });
}

export type ServerMessageSearchHit = {
  message: CommunityMessage;
  channelId: string;
  channelName: string;
};

function escapeIlikePattern(value: string): string {
  return value.replace(/[%_\\]/g, (char) => `\\${char}`);
}

export async function searchServerMessages(
  channelIds: string[],
  channelNames: Map<string, string>,
  query: string,
  limit = 50,
): Promise<ServerMessageSearchHit[]> {
  const q = query.trim();
  if (!q || channelIds.length === 0) return [];

  const { data, error } = await supabase
    .from("community_messages")
    .select("*")
    .in("group_id", channelIds)
    .ilike("body", `%${escapeIlikePattern(q)}%`)
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw error;

  return ((data ?? []) as MessageRow[]).map((row) => ({
    message: mapMessage(row),
    channelId: row.group_id,
    channelName: channelNames.get(row.group_id) ?? "channel",
  }));
}

export async function sendGroupMessage(input: {
  groupId: string;
  serverId: string;
  userId: string;
  body: string;
  kind: CommunityMessageKind;
  authorName: string;
  replyToId?: string | null;
  skipAutomod?: boolean;
  forumTitle?: string | null;
}): Promise<CommunityMessage> {
  const trimmed = input.body.trim();
  if (!trimmed) throw new Error("Message cannot be empty");

  if (!input.skipAutomod) {
    await assertContentAllowed(input.serverId, trimmed);
    await assertSlowMode(input.groupId, input.userId);
    await assertSendAllowed(input.serverId, input.groupId, input.userId);
    await assertMentionsAllowed(input.serverId, input.groupId, input.userId, trimmed);
  }

  const { data, error } = await supabase
    .from("community_messages")
    .insert({
      group_id: input.groupId,
      author_id: input.userId,
      body: trimmed,
      kind: input.kind,
      suggestion_status: input.kind === "suggestion" ? "open" : null,
      author_name: input.authorName,
      reply_to_id: input.replyToId ?? null,
      forum_title: input.forumTitle?.trim() || null,
    })
    .select("*")
    .single();
  if (error || !data) throw error ?? new Error("Could not send");
  void recomputeServerScore(input.serverId);

  const message = mapMessage(data as MessageRow);
  void dispatchServerWebhooks(input.serverId, "message.created", {
    message: {
      id: message.id,
      groupId: message.groupId,
      authorId: message.authorId,
      body: message.body,
      authorName: message.authorName,
      createdAt: message.createdAt,
    },
  });

  return message;
}

export async function toggleMessageReaction(
  messageId: string,
  userId: string,
  emoji: string,
): Promise<void> {
  const { data: existing } = await supabase
    .from("community_message_reactions")
    .select("emoji")
    .eq("message_id", messageId)
    .eq("user_id", userId)
    .eq("emoji", emoji)
    .maybeSingle();
  if (existing) {
    const { error } = await supabase
      .from("community_message_reactions")
      .delete()
      .eq("message_id", messageId)
      .eq("user_id", userId)
      .eq("emoji", emoji);
    if (error) throw error;
    return;
  }
  const { error } = await supabase.from("community_message_reactions").insert({
    message_id: messageId,
    user_id: userId,
    emoji,
  });
  if (error) throw error;
}

export async function listServerMembers(serverId: string): Promise<CommunityServerMember[]> {
  const { data, error } = await supabase
    .from("community_server_members")
    .select("user_id, role_id, joined_at, community_server_roles(name, color, position, hoist)")
    .eq("server_id", serverId)
    .order("joined_at");
  if (error) throw error;

  const userIds = (data ?? []).map((m) => m.user_id as string);
  const profileByUser = new Map<string, { displayName: string | null; username: string | null }>();
  if (userIds.length > 0) {
    const { data: profiles } = await supabase
      .from("user_profiles")
      .select("user_id, display_name, community_display_name, community_username")
      .in("user_id", userIds);
    for (const p of profiles ?? []) {
      profileByUser.set(p.user_id as string, {
        displayName:
          (p.community_display_name as string | null) ||
          (p.display_name as string | null) ||
          null,
        username: (p.community_username as string | null) ?? null,
      });
    }
  }

  return (data ?? [])
    .map((m) => {
      const role = m.community_server_roles as
        | { name: string; color: string; position: number; hoist: boolean }
        | { name: string; color: string; position: number; hoist: boolean }[]
        | null;
      const roleObj = Array.isArray(role) ? role[0] : role;
      const profile = profileByUser.get(m.user_id as string);
      return {
        userId: m.user_id as string,
        roleId: (m.role_id as string | null) ?? null,
        roleName: roleObj?.name ?? "Member",
        roleColor: roleObj?.color ?? "#6B7280",
        rolePosition: roleObj?.position ?? 100,
        roleHoist: roleObj?.hoist ?? false,
        displayName: profile?.displayName ?? null,
        communityUsername: profile?.username ?? null,
        joinedAt: m.joined_at as string,
      };
    })
    .sort(
      (a, b) =>
        a.rolePosition - b.rolePosition ||
        (a.displayName ?? a.communityUsername ?? "").localeCompare(
          b.displayName ?? b.communityUsername ?? "",
        ),
    );
}

export async function listServerRolesWithCounts(serverId: string): Promise<CommunityServerRole[]> {
  const roles = await listServerRoles(serverId);
  const { data } = await supabase
    .from("community_server_members")
    .select("role_id")
    .eq("server_id", serverId);
  const counts = new Map<string, number>();
  for (const row of data ?? []) {
    const roleId = row.role_id as string | null;
    if (roleId) counts.set(roleId, (counts.get(roleId) ?? 0) + 1);
  }
  return roles.map((role) => ({ ...role, memberCount: counts.get(role.id) ?? 0 }));
}

export async function assignServerMemberRole(
  serverId: string,
  userId: string,
  roleId: string,
): Promise<void> {
  const { error } = await supabase.rpc("assign_server_member_role", {
    p_server_id: serverId,
    p_user_id: userId,
    p_role_id: roleId,
  });
  if (error) throw new Error(rpcErrorMessage(error, "Could not update role"));
}

export async function kickServerMember(serverId: string, userId: string): Promise<void> {
  const { error } = await supabase.rpc("kick_server_member", {
    p_server_id: serverId,
    p_user_id: userId,
  });
  if (error) throw new Error(rpcErrorMessage(error, "Could not kick member"));
  bumpCommunityRail();
}

export async function banServerMember(
  serverId: string,
  userId: string,
  reason?: string,
): Promise<void> {
  const { error } = await supabase.rpc("ban_server_member", {
    p_server_id: serverId,
    p_user_id: userId,
    p_reason: reason?.trim() || null,
  });
  if (error) throw new Error(rpcErrorMessage(error, "Could not ban member"));
  bumpCommunityRail();
}

export async function unbanServerMember(serverId: string, userId: string): Promise<void> {
  const { error } = await supabase.rpc("unban_server_member", {
    p_server_id: serverId,
    p_user_id: userId,
  });
  if (error) throw new Error(rpcErrorMessage(error, "Could not unban member"));
}

export async function listServerBans(serverId: string): Promise<CommunityServerBan[]> {
  const { data, error } = await supabase
    .from("community_server_bans")
    .select("user_id, reason, banned_by, created_at")
    .eq("server_id", serverId)
    .order("created_at", { ascending: false });
  if (error) throw error;

  const userIds = (data ?? []).map((b) => b.user_id as string);
  const profileByUser = new Map<string, { displayName: string | null; username: string | null }>();
  if (userIds.length > 0) {
    const { data: profiles } = await supabase
      .from("user_profiles")
      .select("user_id, display_name, community_display_name, community_username")
      .in("user_id", userIds);
    for (const p of profiles ?? []) {
      profileByUser.set(p.user_id as string, {
        displayName:
          (p.community_display_name as string | null) ||
          (p.display_name as string | null) ||
          null,
        username: (p.community_username as string | null) ?? null,
      });
    }
  }

  return (data ?? []).map((b) => {
    const profile = profileByUser.get(b.user_id as string);
    return {
      userId: b.user_id as string,
      reason: (b.reason as string | null) ?? null,
      bannedBy: (b.banned_by as string | null) ?? null,
      createdAt: b.created_at as string,
      displayName: profile?.displayName ?? null,
      communityUsername: profile?.username ?? null,
    };
  });
}

export async function listServerAuditLog(
  serverId: string,
  limit = 50,
): Promise<CommunityServerAuditEntry[]> {
  const { data, error } = await supabase
    .from("community_server_audit_log")
    .select("id, server_id, actor_id, action, target_user_id, target_label, details, created_at")
    .eq("server_id", serverId)
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw error;

  const actorIds = [...new Set((data ?? []).map((e) => e.actor_id as string | null).filter(Boolean))];
  const actorNames = new Map<string, string | null>();
  if (actorIds.length > 0) {
    const { data: profiles } = await supabase
      .from("user_profiles")
      .select("user_id, display_name, community_display_name, community_username")
      .in("user_id", actorIds as string[]);
    for (const p of profiles ?? []) {
      actorNames.set(
        p.user_id as string,
        (p.community_display_name as string | null) ||
          (p.display_name as string | null) ||
          (p.community_username as string | null) ||
          null,
      );
    }
  }

  return (data ?? []).map((e) => ({
    id: e.id as string,
    serverId: e.server_id as string,
    actorId: (e.actor_id as string | null) ?? null,
    action: e.action as string,
    targetUserId: (e.target_user_id as string | null) ?? null,
    targetLabel: (e.target_label as string | null) ?? null,
    details: (e.details as Record<string, unknown> | null) ?? null,
    createdAt: e.created_at as string,
    actorName: e.actor_id ? actorNames.get(e.actor_id as string) ?? null : null,
  }));
}

export async function reorderServerRoles(serverId: string, orderedRoleIds: string[]): Promise<void> {
  for (let i = 0; i < orderedRoleIds.length; i++) {
    const { error } = await supabase
      .from("community_server_roles")
      .update({ position: i * 10 })
      .eq("id", orderedRoleIds[i])
      .eq("server_id", serverId);
    if (error) throw error;
  }
}

export async function updateCategoryPosition(categoryId: string, position: number): Promise<void> {
  const { error } = await supabase
    .from("community_categories")
    .update({ position })
    .eq("id", categoryId);
  if (error) throw error;
}

export async function updateChannelPosition(channelId: string, position: number): Promise<void> {
  const { error } = await supabase
    .from("community_groups")
    .update({ position, updated_at: new Date().toISOString() })
    .eq("id", channelId);
  if (error) throw error;
}

export async function getMyServerRoleId(
  serverId: string,
  userId: string,
): Promise<string | null> {
  const { data } = await supabase
    .from("community_server_members")
    .select("role_id")
    .eq("server_id", serverId)
    .eq("user_id", userId)
    .maybeSingle();
  return (data?.role_id as string | null) ?? null;
}

export async function shouldModerateCommunityImage(
  serverId: string,
  userId: string,
): Promise<boolean> {
  const { data: server, error } = await supabase
    .from("community_servers")
    .select("explicit_content_filter")
    .eq("id", serverId)
    .maybeSingle();
  if (error) throw error;

  const filter = (server?.explicit_content_filter as ExplicitContentFilter | null) ?? "disabled";
  if (filter === "disabled") return false;
  if (filter === "all") return true;

  const role = await getServerRoleForMember(serverId, userId);
  if (!role) return true;
  return !(
    role.canManageServer ||
    role.canManageChannels ||
    role.canModerate ||
    role.canManageMessages
  );
}

export async function updateSuggestionStatus(
  messageId: string,
  status: SuggestionStatus,
): Promise<void> {
  const { error } = await supabase
    .from("community_messages")
    .update({ suggestion_status: status })
    .eq("id", messageId)
    .eq("kind", "suggestion");
  if (error) throw error;
}

export async function deleteGroupMessage(messageId: string): Promise<void> {
  const { error } = await supabase.from("community_messages").delete().eq("id", messageId);
  if (error) throw error;
}

export async function updateGroupMessage(
  messageId: string,
  userId: string,
  body: string,
  serverId?: string,
): Promise<void> {
  const trimmed = body.trim();
  if (!trimmed) throw new Error("Message cannot be empty");

  let sid = serverId;
  if (!sid) {
    const { data: msg } = await supabase
      .from("community_messages")
      .select("group_id")
      .eq("id", messageId)
      .maybeSingle();
    if (msg?.group_id) {
      const { data: group } = await supabase
        .from("community_groups")
        .select("server_id")
        .eq("id", msg.group_id as string)
        .maybeSingle();
      sid = (group?.server_id as string | undefined) ?? undefined;
    }
  }
  if (sid) await assertContentAllowed(sid, trimmed);

  const { error } = await supabase
    .from("community_messages")
    .update({ body: trimmed, edited_at: new Date().toISOString() })
    .eq("id", messageId)
    .eq("author_id", userId);
  if (error) throw error;
}

export async function listServerUnreadTotals(
  userId: string,
  serverIds: string[],
): Promise<Map<string, number>> {
  if (serverIds.length === 0) return new Map();
  const { data: groups, error } = await supabase
    .from("community_groups")
    .select("id, server_id")
    .in("server_id", serverIds)
    .is("archived_at", null);
  if (error) throw error;

  const groupIds = (groups ?? []).map((g) => g.id as string);
  const unread = await listUnreadCounts(userId, groupIds);
  const totals = new Map<string, number>();
  for (const g of groups ?? []) {
    const count = unread.get(g.id as string) ?? 0;
    if (count <= 0) continue;
    const sid = g.server_id as string;
    totals.set(sid, (totals.get(sid) ?? 0) + count);
  }
  return totals;
}

export async function listTeammateCandidates(
  userId: string,
): Promise<{ userId: string; displayName: string | null }[]> {
  const { data: memberships } = await supabase
    .from("library_members")
    .select("library_id")
    .eq("user_id", userId);

  const libraryIds = (memberships ?? []).map((m) => m.library_id as string);
  if (libraryIds.length === 0) return [];

  const { data: mates } = await supabase
    .from("library_members")
    .select("user_id")
    .in("library_id", libraryIds);

  const ids = [...new Set((mates ?? []).map((m) => m.user_id as string))].filter(
    (id) => id !== userId,
  );
  if (ids.length === 0) return [];

  const { data: profiles } = await supabase
    .from("user_profiles")
    .select("user_id, display_name")
    .in("user_id", ids);

  const byId = new Map(
    (profiles ?? []).map((p) => [p.user_id as string, (p.display_name as string | null) ?? null]),
  );

  return ids.map((id) => ({ userId: id, displayName: byId.get(id) ?? null }));
}

export async function markChannelRead(userId: string, groupId: string): Promise<void> {
  const { error } = await supabase.from("community_group_read_state").upsert({
    user_id: userId,
    group_id: groupId,
    last_read_at: new Date().toISOString(),
  });
  if (error) throw error;
}

export async function getChannelLastRead(userId: string, groupId: string): Promise<string | null> {
  const { data } = await supabase
    .from("community_group_read_state")
    .select("last_read_at")
    .eq("user_id", userId)
    .eq("group_id", groupId)
    .maybeSingle();
  return (data?.last_read_at as string | undefined) ?? null;
}

export async function listUnreadCounts(
  userId: string,
  groupIds: string[],
): Promise<Map<string, number>> {
  const result = new Map<string, number>();
  if (groupIds.length === 0) return result;

  const { data: readStates } = await supabase
    .from("community_group_read_state")
    .select("group_id, last_read_at")
    .eq("user_id", userId)
    .in("group_id", groupIds);

  const lastRead = new Map(
    (readStates ?? []).map((r) => [r.group_id as string, r.last_read_at as string]),
  );

  await Promise.all(
    groupIds.map(async (gid) => {
      if (getChannelNotificationLevel(userId, gid) === "mute") return;
      const readAt = lastRead.get(gid) ?? "1970-01-01T00:00:00Z";
      const { count, error } = await supabase
        .from("community_messages")
        .select("id", { count: "exact", head: true })
        .eq("group_id", gid)
        .gt("created_at", readAt);
      if (!error && count && count > 0) result.set(gid, count);
    }),
  );

  return result;
}

export async function pinMessage(groupId: string, messageId: string, userId: string): Promise<void> {
  const { error } = await supabase.from("community_pinned_messages").upsert({
    group_id: groupId,
    message_id: messageId,
    pinned_by: userId,
    pinned_at: new Date().toISOString(),
  });
  if (error) throw error;
}

export async function unpinMessage(groupId: string, messageId: string): Promise<void> {
  const { error } = await supabase
    .from("community_pinned_messages")
    .delete()
    .eq("group_id", groupId)
    .eq("message_id", messageId);
  if (error) throw error;
}

export async function listPinnedMessages(groupId: string): Promise<CommunityMessage[]> {
  const { data: pins, error } = await supabase
    .from("community_pinned_messages")
    .select("message_id")
    .eq("group_id", groupId)
    .order("pinned_at", { ascending: false });
  if (error) throw error;
  const ids = (pins ?? []).map((p) => p.message_id as string);
  if (ids.length === 0) return [];

  const { data: messages, error: msgErr } = await supabase
    .from("community_messages")
    .select("*")
    .in("id", ids);
  if (msgErr) throw msgErr;

  const byId = new Map((messages ?? []).map((m) => [m.id as string, m]));
  return ids
    .map((id) => byId.get(id))
    .filter(Boolean)
    .map((row) => mapMessage(row as MessageRow));
}

async function assertSlowMode(groupId: string, userId: string): Promise<void> {
  const { data: group, error } = await supabase
    .from("community_groups")
    .select("slow_mode_seconds")
    .eq("id", groupId)
    .maybeSingle();
  if (error) throw error;

  const seconds = (group?.slow_mode_seconds as number | null) ?? 0;
  if (seconds <= 0) return;

  const { data: last } = await supabase
    .from("community_messages")
    .select("created_at")
    .eq("group_id", groupId)
    .eq("author_id", userId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!last?.created_at) return;
  const elapsed = Date.now() - new Date(last.created_at as string).getTime();
  if (elapsed < seconds * 1000) {
    const wait = Math.ceil((seconds * 1000 - elapsed) / 1000);
    throw new Error(`Slow mode is on. Wait ${wait}s before sending again.`);
  }
}

async function assertSendAllowed(
  serverId: string,
  channelId: string,
  userId: string,
): Promise<void> {
  const { data: group } = await supabase
    .from("community_groups")
    .select("category_id")
    .eq("id", channelId)
    .maybeSingle();

  const role = await getServerRoleForMember(serverId, userId);
  const perms = await loadResolvedChannelPermissions(
    serverId,
    channelId,
    (group?.category_id as string | null) ?? null,
    role,
  );
  if (!perms.sendMessages) {
    throw new Error("You do not have permission to send messages in this channel.");
  }
}

async function assertMentionsAllowed(
  serverId: string,
  channelId: string,
  userId: string,
  body: string,
): Promise<void> {
  if (!/@everyone|@here/i.test(body)) return;

  const { data: group } = await supabase
    .from("community_groups")
    .select("category_id")
    .eq("id", channelId)
    .maybeSingle();

  const role = await getServerRoleForMember(serverId, userId);
  const perms = await loadResolvedChannelPermissions(
    serverId,
    channelId,
    (group?.category_id as string | null) ?? null,
    role,
  );
  if (!perms.mentionEveryone) {
    throw new Error("You do not have permission to mention @everyone or @here in this channel.");
  }
}

async function assertContentAllowed(serverId: string, body: string): Promise<void> {
  const { data, error } = await supabase
    .from("community_servers")
    .select("automod_keywords, automod_enabled")
    .eq("id", serverId)
    .maybeSingle();
  if (error) throw error;

  const extraKeywords =
    data?.automod_enabled === false
      ? []
      : ((data?.automod_keywords as string[] | null) ?? []);
  const result = moderateTextContent(body, extraKeywords);
  if (!result.allowed) {
    throw new Error(result.reason);
  }
}

function assertModeratedTextFields(fields: Array<string | null | undefined>): void {
  for (const field of fields) {
    if (!field?.trim()) continue;
    const result = moderateTextContent(field);
    if (!result.allowed) {
      throw new Error(result.reason);
    }
  }
}

async function dispatchServerWebhooks(
  serverId: string,
  event: string,
  payload: Record<string, unknown>,
): Promise<void> {
  try {
    const { data: session } = await supabase.auth.getSession();
    const token = session.session?.access_token;
    if (!token) return;

    await fetch("/api/community/webhooks", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ serverId, event, payload }),
    });
  } catch {
    // Webhook delivery is best-effort
  }
}

type EmojiRow = {
  id: string;
  server_id: string;
  name: string;
  image_url: string;
  created_at: string;
};

type StickerRow = {
  id: string;
  server_id: string;
  name: string;
  description: string | null;
  image_url: string;
  created_at: string;
};

type WebhookRow = {
  id: string;
  server_id: string;
  name: string;
  url: string;
  events: string[];
  created_at: string;
};

function mapEmoji(row: EmojiRow): CommunityServerEmoji {
  return {
    id: row.id,
    serverId: row.server_id,
    name: row.name,
    imageUrl: row.image_url,
    createdAt: row.created_at,
  };
}

function mapSticker(row: StickerRow): CommunityServerSticker {
  return {
    id: row.id,
    serverId: row.server_id,
    name: row.name,
    description: row.description,
    imageUrl: row.image_url,
    createdAt: row.created_at,
  };
}

function mapWebhook(row: WebhookRow): CommunityServerWebhook {
  return {
    id: row.id,
    serverId: row.server_id,
    name: row.name,
    url: row.url,
    events: row.events ?? ["message.created"],
    createdAt: row.created_at,
  };
}

export async function listServerEmoji(serverId: string): Promise<CommunityServerEmoji[]> {
  const { data, error } = await supabase
    .from("community_server_emoji")
    .select("*")
    .eq("server_id", serverId)
    .order("created_at", { ascending: true });
  if (error) throw error;
  return ((data ?? []) as EmojiRow[]).map(mapEmoji);
}

export async function createServerEmoji(input: {
  serverId: string;
  name: string;
  imageUrl: string;
  userId: string;
}): Promise<CommunityServerEmoji> {
  const name = input.name.trim().replace(/:/g, "");
  if (!/^[a-zA-Z0-9_]{2,32}$/.test(name)) {
    throw new Error("Emoji name must be 2–32 letters, numbers, or underscores.");
  }
  const { data, error } = await supabase
    .from("community_server_emoji")
    .insert({
      server_id: input.serverId,
      name,
      image_url: input.imageUrl,
      created_by: input.userId,
    })
    .select("*")
    .single();
  if (error || !data) throw error ?? new Error("Could not add emoji");
  return mapEmoji(data as EmojiRow);
}

export async function deleteServerEmoji(emojiId: string): Promise<void> {
  const { error } = await supabase.from("community_server_emoji").delete().eq("id", emojiId);
  if (error) throw error;
}

export async function listServerStickers(serverId: string): Promise<CommunityServerSticker[]> {
  const { data, error } = await supabase
    .from("community_server_stickers")
    .select("*")
    .eq("server_id", serverId)
    .order("created_at", { ascending: true });
  if (error) throw error;
  return ((data ?? []) as StickerRow[]).map(mapSticker);
}

export async function createServerSticker(input: {
  serverId: string;
  name: string;
  description?: string | null;
  imageUrl: string;
  userId: string;
}): Promise<CommunityServerSticker> {
  const name = input.name.trim();
  if (!name) throw new Error("Sticker name is required.");
  const { data, error } = await supabase
    .from("community_server_stickers")
    .insert({
      server_id: input.serverId,
      name,
      description: input.description?.trim() || null,
      image_url: input.imageUrl,
      created_by: input.userId,
    })
    .select("*")
    .single();
  if (error || !data) throw error ?? new Error("Could not add sticker");
  return mapSticker(data as StickerRow);
}

export async function deleteServerSticker(stickerId: string): Promise<void> {
  const { error } = await supabase.from("community_server_stickers").delete().eq("id", stickerId);
  if (error) throw error;
}

export async function listServerWebhooks(serverId: string): Promise<CommunityServerWebhook[]> {
  const { data, error } = await supabase
    .from("community_server_webhooks")
    .select("id, server_id, name, url, events, created_at")
    .eq("server_id", serverId)
    .order("created_at", { ascending: true });
  if (error) throw error;
  return ((data ?? []) as WebhookRow[]).map(mapWebhook);
}

export async function createServerWebhook(input: {
  serverId: string;
  name: string;
  url: string;
  events?: string[];
  userId: string;
}): Promise<CommunityServerWebhook> {
  const name = input.name.trim();
  const url = input.url.trim();
  if (!name || !url) throw new Error("Webhook name and URL are required.");
  try {
    new URL(url);
  } catch {
    throw new Error("Enter a valid webhook URL.");
  }
  const { data, error } = await supabase
    .from("community_server_webhooks")
    .insert({
      server_id: input.serverId,
      name,
      url,
      events: input.events?.length ? input.events : ["message.created"],
      created_by: input.userId,
    })
    .select("id, server_id, name, url, events, created_at")
    .single();
  if (error || !data) throw error ?? new Error("Could not create webhook");
  return mapWebhook(data as WebhookRow);
}

export interface CommunityServerBoost {
  serverId: string;
  userId: string;
  boostedAt: string;
  displayName?: string | null;
  communityUsername?: string | null;
}

export async function listServerBoosts(serverId: string): Promise<CommunityServerBoost[]> {
  const { data, error } = await supabase
    .from("community_server_boosts")
    .select("server_id, user_id, boosted_at")
    .eq("server_id", serverId)
    .order("boosted_at", { ascending: false });
  if (error) throw error;

  const rows = (data ?? []) as { server_id: string; user_id: string; boosted_at: string }[];
  if (rows.length === 0) return [];

  const userIds = rows.map((r) => r.user_id);
  const { data: profiles } = await supabase
    .from("user_profiles")
    .select("user_id, display_name, community_display_name, community_username")
    .in("user_id", userIds);

  const nameByUser = new Map(
    (profiles ?? []).map((p) => [
      p.user_id as string,
      (p.community_display_name as string | null) ||
        (p.display_name as string | null) ||
        (p.community_username as string | null),
    ]),
  );

  return rows.map((r) => ({
    serverId: r.server_id,
    userId: r.user_id,
    boostedAt: r.boosted_at,
    displayName: nameByUser.get(r.user_id) ?? null,
    communityUsername: (profiles ?? []).find((p) => p.user_id === r.user_id)?.community_username as
      | string
      | null,
  }));
}

export async function isServerBooster(serverId: string, userId: string): Promise<boolean> {
  const { data } = await supabase
    .from("community_server_boosts")
    .select("user_id")
    .eq("server_id", serverId)
    .eq("user_id", userId)
    .maybeSingle();
  return Boolean(data);
}

export async function boostServer(serverId: string, userId: string): Promise<void> {
  const { error } = await supabase.from("community_server_boosts").insert({
    server_id: serverId,
    user_id: userId,
  });
  if (error) {
    if (error.code === "23505") throw new Error("You already boosted this server.");
    throw error;
  }
  await supabase.rpc("sync_server_boost_count", { p_server_id: serverId });
}

export async function unboostServer(serverId: string, userId: string): Promise<void> {
  const { error } = await supabase
    .from("community_server_boosts")
    .delete()
    .eq("server_id", serverId)
    .eq("user_id", userId);
  if (error) throw error;
  await supabase.rpc("sync_server_boost_count", { p_server_id: serverId });
}

export async function listUserBoostedServers(userId: string): Promise<string[]> {
  const { data, error } = await supabase
    .from("community_server_boosts")
    .select("server_id")
    .eq("user_id", userId);
  if (error) throw error;
  return (data ?? []).map((r) => r.server_id as string);
}

export async function deleteServerWebhook(webhookId: string): Promise<void> {
  const { error } = await supabase.from("community_server_webhooks").delete().eq("id", webhookId);
  if (error) throw error;
}

export async function updateServerWebhook(
  webhookId: string,
  patch: { events?: string[]; name?: string; url?: string },
): Promise<void> {
  const row: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (patch.events) row.events = patch.events;
  if (patch.name !== undefined) row.name = patch.name.trim();
  if (patch.url !== undefined) row.url = patch.url.trim();
  const { error } = await supabase.from("community_server_webhooks").update(row).eq("id", webhookId);
  if (error) throw error;
}

export type WebhookDelivery = {
  id: string;
  webhookId: string;
  event: string;
  statusCode: number | null;
  success: boolean;
  errorMessage: string | null;
  createdAt: string;
};

export async function listWebhookDeliveries(webhookId: string): Promise<WebhookDelivery[]> {
  const { data, error } = await supabase
    .from("community_webhook_deliveries")
    .select("id, webhook_id, event, status_code, success, error_message, created_at")
    .eq("webhook_id", webhookId)
    .order("created_at", { ascending: false })
    .limit(20);
  if (error) {
    if (error.code === "42P01") return [];
    throw error;
  }
  return (data ?? []).map((row) => ({
    id: row.id as string,
    webhookId: row.webhook_id as string,
    event: row.event as string,
    statusCode: (row.status_code as number | null) ?? null,
    success: Boolean(row.success),
    errorMessage: (row.error_message as string | null) ?? null,
    createdAt: row.created_at as string,
  }));
}

export async function pingServerWebhook(webhookId: string): Promise<void> {
  const { data: session } = await supabase.auth.getSession();
  const token = session.session?.access_token;
  if (!token) throw new Error("Sign in required");

  const res = await fetch("/api/community/webhooks", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ webhookId, event: "test.ping", payload: { test: true } }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: "Ping failed" }));
    throw new Error(err.error || "Ping failed");
  }
}

