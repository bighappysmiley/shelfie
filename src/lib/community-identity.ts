/** Validate a community @username (without the @). */
export function normalizeCommunityUsername(raw: string): string {
  return raw.trim().replace(/^@+/, "").toLowerCase();
}

export function isValidCommunityUsername(raw: string): boolean {
  const u = normalizeCommunityUsername(raw);
  return /^[a-z0-9_]{3,24}$/.test(u);
}

export function communityAuthorLabel(profile: {
  communityDisplayName?: string | null;
  communityUsername?: string | null;
  displayName?: string | null;
} | null | undefined, emailFallback?: string | null): string {
  const display =
    profile?.communityDisplayName?.trim() ||
    profile?.displayName?.trim() ||
    emailFallback?.split("@")[0] ||
    "Member";
  const handle = profile?.communityUsername?.trim();
  if (handle) return `${display} (@${handle})`;
  return display;
}

export function communityShortName(profile: {
  communityDisplayName?: string | null;
  displayName?: string | null;
} | null | undefined, emailFallback?: string | null): string {
  return (
    profile?.communityDisplayName?.trim() ||
    profile?.displayName?.trim() ||
    emailFallback?.split("@")[0] ||
    "Member"
  );
}
