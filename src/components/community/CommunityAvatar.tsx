import { AuthedImage } from "@/components/AuthedImage";
import { communityProfileLabel } from "@/lib/community-profile";
import type { CommunityProfile } from "@/lib/community-types";

const SIZE_CLASSES = {
  xs: "h-6 w-6 text-[0.625rem]",
  sm: "h-8 w-8 text-[0.6875rem]",
  md: "h-10 w-10 text-sm",
  lg: "h-16 w-16 text-xl",
  xl: "h-24 w-24 text-3xl",
} as const;

export function CommunityAvatar({
  profile,
  fallbackName,
  size = "md",
  className = "",
  style,
}: {
  profile?: Pick<CommunityProfile, "avatarUrl" | "communityDisplayName" | "displayName" | "communityUsername"> | null;
  fallbackName?: string | null;
  size?: keyof typeof SIZE_CLASSES;
  className?: string;
  style?: React.CSSProperties;
}) {
  const label =
    profile
      ? communityProfileLabel(profile as CommunityProfile)
      : fallbackName?.trim() || "Member";
  const initial = label[0]?.toUpperCase() ?? "?";
  const sizeClass = SIZE_CLASSES[size];

  if (profile?.avatarUrl) {
    return (
      <AuthedImage
        src={profile.avatarUrl}
        alt=""
        className={`shrink-0 rounded-full object-cover ${sizeClass} ${className}`}
      />
    );
  }

  return (
    <div
      className={`flex shrink-0 items-center justify-center rounded-full bg-accent/20 font-semibold text-accent ${sizeClass} ${className}`}
      style={style}
      aria-hidden
    >
      {initial}
    </div>
  );
}
