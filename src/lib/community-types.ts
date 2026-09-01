export type CommunityGroupKind = "chat" | "suggestions" | "both";
export type CommunityMemberRole = "admin" | "moderator" | "member";
export type CommunityMessageKind = "chat" | "suggestion" | "system";
export type SuggestionStatus = "open" | "accepted" | "declined" | "implemented";
export type CommunityJoinMode = "open" | "request" | "invite";
export type JoinRequestStatus = "pending" | "approved" | "rejected" | "cancelled";

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
  isEveryone: boolean;
  createdAt: string;
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

export interface CommunityMessage {
  id: string;
  groupId: string;
  authorId: string | null;
  body: string;
  kind: CommunityMessageKind;
  suggestionStatus: SuggestionStatus | null;
  authorName: string | null;
  createdAt: string;
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
  chat: "Chat",
  suggestions: "Suggestions",
  both: "Chat & suggestions",
};

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
