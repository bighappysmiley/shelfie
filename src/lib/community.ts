import { supabase } from "./supabase";
import { getActiveLibraryId } from "./library-storage";
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
  CommunityServerRole,
  JoinRequestStatus,
  SuggestionStatus,
} from "./community-types";
import { bumpCommunityRail } from "./community-events";

type ServerRow = {
  id: string;
  library_id: string;
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
};

type MessageRow = {
  id: string;
  group_id: string;
  author_id: string | null;
  body: string;
  kind: CommunityMessageKind;
  suggestion_status: SuggestionStatus | null;
  author_name: string | null;
  created_at: string;
};

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
    ...extra,
  };
}

function mapServerFromRpc(row: Record<string, unknown>, extra?: Partial<CommunityServer>): CommunityServer {
  return mapServer(
    {
      id: String(row.id ?? ""),
      library_id: String(row.library_id ?? ""),
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
    kind: row.kind,
    categoryId: row.category_id,
    position: row.position ?? 0,
    isOfficial: Boolean(row.is_official),
    icon: row.icon || "hash",
    createdBy: row.created_by,
    archivedAt: row.archived_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    ...extra,
  };
}

function mapMessage(row: MessageRow): CommunityMessage {
  return {
    id: row.id,
    groupId: row.group_id,
    authorId: row.author_id,
    body: row.body,
    kind: row.kind,
    suggestionStatus: row.suggestion_status,
    authorName: row.author_name,
    createdAt: row.created_at,
  };
}

async function seedDefaultRoles(serverId: string): Promise<void> {
  const defaults = [
    { name: "Owner", position: 0, color: "#E11D48", can_manage_server: true, can_manage_channels: true, can_moderate: true, is_everyone: false },
    { name: "Admin", position: 10, color: "#F59E0B", can_manage_server: true, can_manage_channels: true, can_moderate: true, is_everyone: false },
    { name: "Moderator", position: 20, color: "#3B82F6", can_manage_server: false, can_manage_channels: false, can_moderate: true, is_everyone: false },
    { name: "Member", position: 100, color: "#6B7280", can_manage_server: false, can_manage_channels: false, can_moderate: false, is_everyone: true },
  ];
  for (const role of defaults) {
    await supabase.from("community_server_roles").upsert(
      { server_id: serverId, ...role },
      { onConflict: "server_id,name", ignoreDuplicates: true },
    );
  }
}

async function seedDefaultCategories(serverId: string): Promise<void> {
  const { data: existing } = await supabase
    .from("community_categories")
    .select("id, is_official, name")
    .eq("server_id", serverId);
  const rows = existing ?? [];
  if (!rows.some((r) => r.is_official)) {
    await supabase.from("community_categories").insert({
      name: "Official",
      position: 0,
      is_official: true,
      server_id: serverId,
    });
  }
  if (!rows.some((r) => !r.is_official && r.name === "Text Channels")) {
    await supabase.from("community_categories").insert({
      name: "Text Channels",
      position: 10,
      is_official: false,
      server_id: serverId,
    });
  }
}

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

  const { data, error } = await supabase
    .from("community_servers")
    .insert({
      library_id: input.libraryId,
      name: input.name.trim() || "My Server",
      description: input.description?.trim() || null,
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
  await seedDefaultCategories(server.id);

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
      canManage: libraryRole.get(r.library_id) === "owner",
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
    joinMode?: CommunityJoinMode;
  },
): Promise<void> {
  const row: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (patch.name !== undefined) row.name = patch.name.trim();
  if (patch.description !== undefined) row.description = patch.description?.trim() || null;
  if (patch.iconUrl !== undefined) row.icon_url = patch.iconUrl || null;
  if (patch.isPublic !== undefined) row.is_public = patch.isPublic;
  if (patch.joinMode !== undefined) row.join_mode = patch.joinMode;
  if (patch.isOfficial !== undefined) {
    row.is_official = patch.isOfficial;
    if (patch.isOfficial && patch.officialPosition === undefined) {
      const { data: max } = await supabase
        .from("community_servers")
        .select("official_position")
        .eq("is_official", true)
        .order("official_position", { ascending: false })
        .limit(1)
        .maybeSingle();
      row.official_position = (max?.official_position ?? -1) + 1;
    }
    if (!patch.isOfficial) row.official_position = null;
  }
  if (patch.officialPosition !== undefined) row.official_position = patch.officialPosition;

  const { error } = await supabase.from("community_servers").update(row).eq("id", serverId);
  if (error) throw error;
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

export async function leaveServer(serverId: string, userId: string): Promise<void> {
  const { error } = await supabase
    .from("community_server_members")
    .delete()
    .eq("server_id", serverId)
    .eq("user_id", userId);
  if (error) throw error;
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
  },
): Promise<void> {
  const row: Record<string, unknown> = {};
  if (patch.name !== undefined) row.name = patch.name.trim();
  if (patch.color !== undefined) row.color = patch.color;
  if (patch.iconUrl !== undefined) row.icon_url = patch.iconUrl;
  if (patch.position !== undefined) row.position = patch.position;
  if (patch.canManageServer !== undefined) row.can_manage_server = patch.canManageServer;
  if (patch.canManageChannels !== undefined) row.can_manage_channels = patch.canManageChannels;
  if (patch.canModerate !== undefined) row.can_moderate = patch.canModerate;
  const { error } = await supabase.from("community_server_roles").update(row).eq("id", roleId);
  if (error) throw error;
}

export async function deleteServerRole(roleId: string): Promise<void> {
  const { error } = await supabase
    .from("community_server_roles")
    .delete()
    .eq("id", roleId)
    .eq("is_everyone", false);
  if (error) throw error;
}

export async function uploadCommunityImage(file: File): Promise<string> {
  const raw = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error("Could not read file"));
    reader.readAsDataURL(file);
  });
  const { dataUrl, mediaType } = await compressCover(raw, 256, 0.85);

  const { data: session } = await supabase.auth.getSession();
  const token = session.session?.access_token;
  if (!token) throw new Error("Sign in to upload");

  const libraryId = getActiveLibraryId();
  if (!libraryId) throw new Error("Select a library first");

  const res = await fetch("/api/covers", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
      "X-Library-Id": libraryId,
    },
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
  return ((data ?? []) as CategoryRow[]).map(mapCategory);
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
    .eq("id", id)
    .eq("is_official", false);
  if (error) throw error;
}

export async function deleteCommunityCategory(id: string): Promise<void> {
  const { error } = await supabase
    .from("community_categories")
    .delete()
    .eq("id", id)
    .eq("is_official", false);
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
        myRole: roleByGroup.get(g.id) ?? (g.is_official ? "member" : null),
        memberCount: count ?? 0,
      });
    }),
  );
}

export async function createCommunityGroup(input: {
  serverId: string;
  name: string;
  description?: string;
  topic?: string;
  kind: CommunityGroupKind;
  categoryId?: string | null;
  isOfficial?: boolean;
  userId: string;
}): Promise<CommunityGroup> {
  const isOfficial = Boolean(input.isOfficial);
  let categoryId = input.categoryId ?? null;

  if (isOfficial || !categoryId) {
    const cats = await listCommunityCategories(input.serverId);
    const official = cats.find((c) => c.isOfficial);
    const text =
      cats.find((c) => !c.isOfficial && c.name === "Text Channels") ??
      cats.find((c) => !c.isOfficial);
    if (isOfficial) {
      if (!official) throw new Error("Official category is missing");
      categoryId = official.id;
    } else if (!categoryId) {
      categoryId = text?.id ?? official?.id ?? null;
    }
  }

  if (!categoryId) throw new Error("Pick a category for this channel");

  const { data: siblings } = await supabase
    .from("community_groups")
    .select("position")
    .eq("category_id", categoryId)
    .order("position", { ascending: false })
    .limit(1);
  const nextPos = ((siblings?.[0]?.position as number | undefined) ?? 0) + 1;

  const { data, error } = await supabase
    .from("community_groups")
    .insert({
      name: input.name.trim(),
      description: input.description?.trim() || null,
      topic: input.topic?.trim() || null,
      kind: input.kind,
      category_id: categoryId,
      server_id: input.serverId,
      is_official: isOfficial,
      position: nextPos,
      icon: "hash",
      created_by: input.userId,
    })
    .select("*")
    .single();
  if (error || !data) throw error ?? new Error("Could not create channel");

  const group = data as GroupRow;
  await supabase.from("community_group_members").insert({
    group_id: group.id,
    user_id: input.userId,
    role: "admin",
  });

  await supabase.from("community_messages").insert({
    group_id: group.id,
    author_id: input.userId,
    body: isOfficial
      ? `Official channel #${group.name} is live.`
      : `Welcome to #${group.name}.`,
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
    isOfficial?: boolean;
    position?: number;
    serverId?: string;
  },
): Promise<void> {
  const row: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (patch.name !== undefined) row.name = patch.name.trim();
  if (patch.description !== undefined) row.description = patch.description?.trim() || null;
  if (patch.topic !== undefined) row.topic = patch.topic?.trim() || null;
  if (patch.kind !== undefined) row.kind = patch.kind;
  if (patch.position !== undefined) row.position = patch.position;

  if (patch.isOfficial === true && patch.serverId) {
    const cats = await listCommunityCategories(patch.serverId);
    const official = cats.find((c) => c.isOfficial);
    if (!official) throw new Error("Official category is missing");
    row.is_official = true;
    row.category_id = official.id;
  } else {
    if (patch.isOfficial === false) row.is_official = false;
    if (patch.categoryId !== undefined) row.category_id = patch.categoryId;
  }

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

export async function listGroupMessages(groupId: string): Promise<CommunityMessage[]> {
  const { data, error } = await supabase
    .from("community_messages")
    .select("*")
    .eq("group_id", groupId)
    .order("created_at");
  if (error) throw error;
  return ((data ?? []) as MessageRow[]).map(mapMessage);
}

export async function sendGroupMessage(input: {
  groupId: string;
  serverId: string;
  userId: string;
  body: string;
  kind: CommunityMessageKind;
  authorName: string;
}): Promise<CommunityMessage> {
  const { data, error } = await supabase
    .from("community_messages")
    .insert({
      group_id: input.groupId,
      author_id: input.userId,
      body: input.body.trim(),
      kind: input.kind,
      suggestion_status: input.kind === "suggestion" ? "open" : null,
      author_name: input.authorName,
    })
    .select("*")
    .single();
  if (error || !data) throw error ?? new Error("Could not send");
  void recomputeServerScore(input.serverId);
  return mapMessage(data as MessageRow);
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
