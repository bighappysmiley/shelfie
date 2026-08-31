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
}

export type PreferredAuth = "email" | "phone" | "both";

export interface UserProfile {
  userId: string;
  phone: string | null;
  require2fa: boolean;
  preferredAuth: PreferredAuth;
}
