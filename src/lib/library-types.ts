export type LibraryRole = "owner" | "member";

export interface Library {
  id: string;
  name: string;
  ownerId: string;
  role: LibraryRole;
  createdAt: string;
  updatedAt: string;
}

export interface LibraryMember {
  userId: string;
  displayName: string | null;
  role: LibraryRole;
  joinedAt: string;
}

export interface LibraryInvite {
  id: string;
  libraryId: string;
  libraryName?: string;
  email: string | null;
  phone: string | null;
  status: "pending" | "accepted" | "revoked";
  createdAt: string;
  emailSent?: boolean;
}

export type PreferredAuth = "email" | "phone" | "both";

export interface UserProfile {
  userId: string;
  displayName: string | null;
  /** Community @handle (unique). Separate from library team name. */
  communityUsername: string | null;
  /** Name shown in Community chats. Falls back to displayName when unset. */
  communityDisplayName: string | null;
  phone: string | null;
  require2fa: boolean;
  preferredAuth: PreferredAuth;
}
