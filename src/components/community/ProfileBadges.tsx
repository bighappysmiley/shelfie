import { AuthedImage } from "@/components/AuthedImage";
import type { ProfileBadge } from "@/lib/community-types";

/** Small Discord-style badge icon (profile-only; no role colors). */
export function BadgeIcon({
  badge,
  size = "sm",
}: {
  badge: Pick<ProfileBadge, "name" | "iconUrl">;
  size?: "sm" | "md" | "lg";
}) {
  const dim = size === "lg" ? "h-10 w-10" : size === "md" ? "h-6 w-6" : "h-5 w-5";
  if (badge.iconUrl) {
    return (
      <AuthedImage
        src={badge.iconUrl}
        alt=""
        className={`${dim} shrink-0 bg-transparent object-contain`}
        title={badge.name}
      />
    );
  }
  return (
    <span
      className={`${dim} inline-flex shrink-0 items-center justify-center rounded-md bg-fill text-[0.625rem] font-bold text-muted`}
      title={badge.name}
    >
      {badge.name.slice(0, 1).toUpperCase()}
    </span>
  );
}

/**
 * Discord-style profile badges: icon row with name on hover.
 * No colored role pills — badges are decorative and profile-only.
 */
export function ProfileBadgeChips({
  badges,
  size = "md",
}: {
  badges: ProfileBadge[];
  size?: "sm" | "md" | "lg";
}) {
  if (!badges.length) return null;
  return (
    <div className="flex flex-wrap items-center gap-1.5" role="list" aria-label="Profile badges">
      {badges.map((badge) => (
        <span key={badge.id} role="listitem" className="inline-flex" title={badge.name}>
          <BadgeIcon badge={badge} size={size} />
          <span className="sr-only">{badge.name}</span>
        </span>
      ))}
    </div>
  );
}
