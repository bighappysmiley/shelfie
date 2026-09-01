export type CommunityGroupKind = "text" | "forum" | "voice" | "announcement";
export type CommunityMemberRole = "admin" | "moderator" | "member";
export type CommunityMessageKind = "chat" | "suggestion" | "system";
export type SuggestionStatus = "open" | "accepted" | "declined" | "implemented";
export type CommunityJoinMode = "open" | "request" | "invite";
export type JoinRequestStatus = "pending" | "approved" | "rejected" | "cancelled";
export type VerificationLevel = "none" | "low" | "medium" | "high";
export type ExplicitContentFilter = "disabled" | "no_role" | "all";
export type DefaultNotifications = "all" | "mentions";

export interface CommunityServer {
  id: string;
  libraryId: string;
  name: string;
  description: string | null;
  iconUrl: string | null;
  isPublic: boolean;
  isOfficial: boolean;
  officialPosition: number | null;
  inviteCode: string;
  joinMode: CommunityJoinMode;
  memberCount: number;
  messageCount: number;
  activityScore: number;
  lastActivityAt: string | null;
  createdBy: string | null;
  createdAt: string;
  updatedAt: string;
  /** Present when current user belongs to this server */
  myRoleId?: string | null;
  isMember?: boolean;
  canManage?: boolean;
  myJoinRequestStatus?: JoinRequestStatus | null;
  rules?: string | null;
  welcomeMessage?: string | null;
  verificationLevel?: VerificationLevel;
  explicitContentFilter?: ExplicitContentFilter;
  defaultNotifications?: DefaultNotifications;
  systemChannelId?: string | null;
  rulesChannelId?: string | null;
}

export interface CommunityJoinRequest {
  id: string;
  serverId: string;
  userId: string;
  status: JoinRequestStatus;
  message: string | null;
  reviewedBy: string | null;
  reviewedAt: string | null;
  createdAt: string;
  displayName?: string | null;
  email?: string | null;
}

export interface CommunityServerRole {
  id: string;
  serverId: string;
  name: string;
  position: number;
  color: string;
  iconUrl: string | null;
  canManageServer: boolean;
  canManageChannels: boolean;
  canModerate: boolean;
  canKickMembers: boolean;
  canBanMembers: boolean;
  canManageMessages: boolean;
  canInviteUsers: boolean;
  hoist: boolean;
  mentionable: boolean;
  isEveryone: boolean;
  createdAt: string;
  memberCount?: number;
}

export interface CommunityCategory {
  id: string;
  serverId: string | null;
  name: string;
  position: number;
  isOfficial: boolean;
  createdAt: string;
}

export interface CommunityGroup {
  id: string;
  serverId: string | null;
  name: string;
  description: string | null;
  topic: string | null;
  kind: CommunityGroupKind;
  categoryId: string | null;
  position: number;
  isOfficial: boolean;
  icon: string;
  createdBy: string;
  archivedAt: string | null;
  createdAt: string;
  updatedAt: string;
  myRole?: CommunityMemberRole | null;
  memberCount?: number;
}

export interface CommunityMember {
  userId: string;
  role: CommunityMemberRole;
  joinedAt: string;
  displayName: string | null;
  email: string | null;
}

export interface CommunityMessageReaction {
  emoji: string;
  count: number;
  reactedByMe: boolean;
}

export interface CommunityMessage {
  id: string;
  groupId: string;
  authorId: string | null;
  body: string;
  kind: CommunityMessageKind;
  suggestionStatus: SuggestionStatus | null;
  authorName: string | null;
  replyToId: string | null;
  replyPreview?: { authorName: string | null; body: string } | null;
  reactions: CommunityMessageReaction[];
  createdAt: string;
  editedAt?: string | null;
}

export interface CommunityServerMember {
  userId: string;
  roleId: string | null;
  roleName: string;
  roleColor: string;
  rolePosition: number;
  displayName: string | null;
  communityUsername: string | null;
  joinedAt: string;
}

export interface CommunityServerBan {
  userId: string;
  reason: string | null;
  bannedBy: string | null;
  createdAt: string;
  displayName: string | null;
  communityUsername: string | null;
}

export interface CommunityServerAuditEntry {
  id: string;
  serverId: string;
  actorId: string | null;
  action: string;
  targetUserId: string | null;
  targetLabel: string | null;
  details: Record<string, unknown> | null;
  createdAt: string;
  actorName?: string | null;
}

export const MEMBER_ROLE_LABELS: Record<CommunityMemberRole, string> = {
  admin: "Admin",
  moderator: "Moderator",
  member: "Member",
};

export const SUGGESTION_STATUS_LABELS: Record<SuggestionStatus, string> = {
  open: "Open",
  accepted: "Accepted",
  declined: "Declined",
  implemented: "Implemented",
};

export const KIND_LABELS: Record<CommunityGroupKind, string> = {
  text: "Text",
  forum: "Forum",
  voice: "Voice",
  announcement: "Announcement",
};

/** Map legacy channel kinds from older Pine builds to Discord-style kinds. */
export function normalizeGroupKind(kind: string): CommunityGroupKind {
  switch (kind) {
    case "text":
    case "forum":
    case "voice":
    case "announcement":
      return kind;
    case "suggestions":
      return "forum";
    case "chat":
    case "both":
    default:
      return "text";
  }
}

export function canManageMembers(role?: CommunityMemberRole | null, isAppOwner = false) {
  return isAppOwner || role === "admin";
}

export function canModerate(role?: CommunityMemberRole | null, isAppOwner = false) {
  return isAppOwner || role === "admin" || role === "moderator";
}

export function formatCommunityTime(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  const sameDay =
    d.getFullYear() === now.getFullYear() &&
    d.getMonth() === now.getMonth() &&
    d.getDate() === now.getDate();
  if (sameDay) {
    return d.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
  }
  return d.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export function formatPopularity(server: CommunityServer): string {
  if (server.memberCount >= 1000) return `${(server.memberCount / 1000).toFixed(1)}k members`;
  if (server.memberCount === 1) return "1 member";
  return `${server.memberCount} members`;
}
