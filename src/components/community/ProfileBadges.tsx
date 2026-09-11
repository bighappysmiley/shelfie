import { AuthedImage } from "@/components/AuthedImage";
import { roleColorStyle } from "@/lib/role-color";
import type { ProfileBadge } from "@/lib/community-types";

export function BadgeIcon({
  badge,
  size = "sm",
}: {
  badge: Pick<ProfileBadge, "name" | "color" | "iconUrl">;
  size?: "sm" | "md" | "lg";
}) {
  const dim = size === "lg" ? "h-10 w-10" : size === "md" ? "h-6 w-6" : "h-4 w-4";
  if (badge.iconUrl) {
    return (
      <AuthedImage
        src={badge.iconUrl}
        alt=""
        className={`${dim} shrink-0 rounded-full object-cover`}
      />
    );
  }
  return (
    <span
      className={`${dim} inline-flex shrink-0 items-center justify-center rounded-full text-[0.625rem] font-bold text-white`}
      style={roleColorStyle(badge.color)}
      title={badge.name}
    >
      {badge.name.slice(0, 1).toUpperCase()}
    </span>
  );
}

export function ProfileBadgeChips({ badges }: { badges: ProfileBadge[] }) {
  if (!badges.length) return null;
  return (
    <div className="flex flex-wrap gap-1.5">
      {badges.map((badge) => (
        <span
          key={badge.id}
          className="inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[0.75rem] font-semibold text-white shadow-sm"
          style={roleColorStyle(badge.color, { animate: true })}
          title={badge.name}
        >
          {badge.iconUrl ? (
            <AuthedImage
              src={badge.iconUrl}
              alt=""
              className="h-3.5 w-3.5 rounded-full object-cover"
            />
          ) : null}
          {badge.name}
        </span>
      ))}
    </div>
  );
}
