import { supabase } from "@/lib/supabase";
import type { CommunityServerRole } from "@/lib/community-types";

export type PermissionOverrideTarget = "category" | "channel";

export type PermissionFlag =
  | "allowView"
  | "allowSendMessages"
  | "allowManageMessages"
  | "allowManageChannel"
  | "allowConnect"
  | "allowMentionEveryone";

export interface PermissionOverridePatch {
  allowView?: boolean | null;
  allowSendMessages?: boolean | null;
  allowManageMessages?: boolean | null;
  allowManageChannel?: boolean | null;
  allowConnect?: boolean | null;
  allowMentionEveryone?: boolean | null;
}

export interface CommunityPermissionOverride {
  id: string;
  serverId: string;
  targetType: PermissionOverrideTarget;
  targetId: string;
  roleId: string;
  allowView: boolean | null;
  allowSendMessages: boolean | null;
  allowManageMessages: boolean | null;
  allowManageChannel: boolean | null;
  allowConnect: boolean | null;
  allowMentionEveryone: boolean | null;
}

export interface ResolvedChannelPermissions {
  view: boolean;
  sendMessages: boolean;
  manageMessages: boolean;
  manageChannel: boolean;
  connect: boolean;
  mentionEveryone: boolean;
}

export const PERMISSION_LABELS: Record<keyof ResolvedChannelPermissions, string> = {
  view: "View channel",
  sendMessages: "Send messages",
  manageMessages: "Manage messages",
  manageChannel: "Manage channel",
  connect: "Connect (voice)",
  mentionEveryone: "Mention @everyone",
};

type OverrideRow = {
  id: string;
  server_id: string;
  target_type: string;
  target_id: string;
  role_id: string;
  allow_view: boolean | null;
  allow_send_messages: boolean | null;
  allow_manage_messages: boolean | null;
  allow_manage_channel: boolean | null;
  allow_connect: boolean | null;
  allow_mention_everyone: boolean | null;
};

function mapOverride(row: OverrideRow): CommunityPermissionOverride {
  return {
    id: row.id,
    serverId: row.server_id,
    targetType: row.target_type as PermissionOverrideTarget,
    targetId: row.target_id,
    roleId: row.role_id,
    allowView: row.allow_view,
    allowSendMessages: row.allow_send_messages,
    allowManageMessages: row.allow_manage_messages,
    allowManageChannel: row.allow_manage_channel,
    allowConnect: row.allow_connect,
    allowMentionEveryone: row.allow_mention_everyone,
  };
}

export function basePermissionsFromRole(role: CommunityServerRole): ResolvedChannelPermissions {
  const elevated =
    role.canManageServer || role.name === "Owner" || role.name === "Admin";
  return {
    view: true,
    sendMessages: true,
    manageMessages: role.canManageMessages || role.canModerate || elevated,
    manageChannel: role.canManageChannels || elevated,
    connect: true,
    mentionEveryone: role.canModerate || elevated,
  };
}

function applyPatch(
  base: ResolvedChannelPermissions,
  patch: PermissionOverridePatch | null | undefined,
): ResolvedChannelPermissions {
  if (!patch) return base;
  const next = { ...base };
  if (patch.allowView != null) next.view = patch.allowView;
  if (patch.allowSendMessages != null) next.sendMessages = patch.allowSendMessages;
  if (patch.allowManageMessages != null) next.manageMessages = patch.allowManageMessages;
  if (patch.allowManageChannel != null) next.manageChannel = patch.allowManageChannel;
  if (patch.allowConnect != null) next.connect = patch.allowConnect;
  if (patch.allowMentionEveryone != null) next.mentionEveryone = patch.allowMentionEveryone;
  return next;
}

function overrideToPatch(o: CommunityPermissionOverride | undefined): PermissionOverridePatch | null {
  if (!o) return null;
  return {
    allowView: o.allowView,
    allowSendMessages: o.allowSendMessages,
    allowManageMessages: o.allowManageMessages,
    allowManageChannel: o.allowManageChannel,
    allowConnect: o.allowConnect,
    allowMentionEveryone: o.allowMentionEveryone,
  };
}

export function resolveChannelPermissions(opts: {
  role: CommunityServerRole | null;
  categoryOverride?: CommunityPermissionOverride | null;
  channelOverride?: CommunityPermissionOverride | null;
  isAppOwner?: boolean;
  canConfigure?: boolean;
}): ResolvedChannelPermissions {
  if (opts.isAppOwner || opts.canConfigure) {
    return {
      view: true,
      sendMessages: true,
      manageMessages: true,
      manageChannel: true,
      connect: true,
      mentionEveryone: true,
    };
  }
  if (!opts.role) {
    return {
      view: false,
      sendMessages: false,
      manageMessages: false,
      manageChannel: false,
      connect: false,
      mentionEveryone: false,
    };
  }

  let perms = basePermissionsFromRole(opts.role);
  perms = applyPatch(perms, overrideToPatch(opts.categoryOverride ?? undefined));
  perms = applyPatch(perms, overrideToPatch(opts.channelOverride ?? undefined));
  return perms;
}

export async function listPermissionOverrides(
  targetType: PermissionOverrideTarget,
  targetId: string,
): Promise<CommunityPermissionOverride[]> {
  const { data, error } = await supabase
    .from("community_permission_overrides")
    .select("*")
    .eq("target_type", targetType)
    .eq("target_id", targetId);
  if (error) {
    if (error.code === "42P01") return [];
    throw error;
  }
  return ((data ?? []) as OverrideRow[]).map(mapOverride);
}

export async function upsertPermissionOverride(input: {
  serverId: string;
  targetType: PermissionOverrideTarget;
  targetId: string;
  roleId: string;
  patch: PermissionOverridePatch;
}): Promise<void> {
  const row = {
    server_id: input.serverId,
    target_type: input.targetType,
    target_id: input.targetId,
    role_id: input.roleId,
    allow_view: input.patch.allowView ?? null,
    allow_send_messages: input.patch.allowSendMessages ?? null,
    allow_manage_messages: input.patch.allowManageMessages ?? null,
    allow_manage_channel: input.patch.allowManageChannel ?? null,
    allow_connect: input.patch.allowConnect ?? null,
    allow_mention_everyone: input.patch.allowMentionEveryone ?? null,
    updated_at: new Date().toISOString(),
  };

  const { error } = await supabase.from("community_permission_overrides").upsert(row, {
    onConflict: "target_type,target_id,role_id",
  });
  if (error) throw error;
}

export async function clearPermissionOverride(
  targetType: PermissionOverrideTarget,
  targetId: string,
  roleId: string,
): Promise<void> {
  const { error } = await supabase
    .from("community_permission_overrides")
    .delete()
    .eq("target_type", targetType)
    .eq("target_id", targetId)
    .eq("role_id", roleId);
  if (error) throw error;
}

export async function loadResolvedChannelPermissions(
  _serverId: string,
  channelId: string,
  categoryId: string | null,
  role: CommunityServerRole | null,
  opts?: { isAppOwner?: boolean; canConfigure?: boolean },
): Promise<ResolvedChannelPermissions> {
  const [categoryOverrides, channelOverrides] = await Promise.all([
    categoryId ? listPermissionOverrides("category", categoryId) : Promise.resolve([]),
    listPermissionOverrides("channel", channelId),
  ]);

  const categoryOverride = role
    ? categoryOverrides.find((o) => o.roleId === role.id)
    : undefined;
  const channelOverride = role ? channelOverrides.find((o) => o.roleId === role.id) : undefined;

  return resolveChannelPermissions({
    role,
    categoryOverride,
    channelOverride,
    isAppOwner: opts?.isAppOwner,
    canConfigure: opts?.canConfigure,
  });
}
