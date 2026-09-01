import type { CommunityServerRole } from "./community-types";

/**
 * Discord-style chat role icon: only when the member's assigned server role has an icon.
 * Nitro / boost status is never used for this — only `community_server_roles.icon_url`.
 */
export function getChatRoleIconUrl(role: CommunityServerRole | undefined | null): string | null {
  if (!role?.iconUrl?.trim()) return null;
  if (role.isEveryone) return null;
  return role.iconUrl;
}
