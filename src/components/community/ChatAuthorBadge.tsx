import { AuthedImage } from "@/components/AuthedImage";
import type { ProfileBadge } from "@/lib/community-types";
import { BadgeIcon } from "@/components/community/ProfileBadges";

/**
 * Badges beside chat usernames:
 * - App owners → OWNER pill
 * - Global profile badges (admin-managed)
 * - Server role icon when the member's assigned role has `icon_url`
 */
export function ChatAuthorBadge({
  isAppOwner = false,
  roleIconUrl,
  badges = [],
}: {
  isAppOwner?: boolean;
  /** From the member's server role only — not Nitro, not profile. */
  roleIconUrl?: string | null;
  badges?: ProfileBadge[];
}) {
  return (
    <span className="inline-flex shrink-0 items-center gap-1">
      {isAppOwner && (
        <span
          className="inline-flex items-center rounded-[3px] bg-accent px-1 py-px text-[0.625rem] font-bold uppercase leading-none tracking-wide text-accent-contrast"
          title="App owner"
        >
          Owner
        </span>
      )}
      {badges.slice(0, 3).map((badge) => (
        <span key={badge.id} title={badge.name} className="inline-flex">
          <BadgeIcon badge={badge} />
        </span>
      ))}
      {roleIconUrl ? (
        <span title="Server role" className="inline-flex">
          <AuthedImage
            src={roleIconUrl}
            alt=""
            className="h-4 w-4 shrink-0 rounded-full object-cover"
          />
        </span>
      ) : null}
    </span>
  );
}
