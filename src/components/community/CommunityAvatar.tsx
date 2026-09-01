import { AuthedImage } from "@/components/AuthedImage";
import { communityProfileLabel } from "@/lib/community-profile";
import { canShowProfileRing, profileRingClass } from "@/lib/nitro";
import type { CommunityProfile } from "@/lib/community-types";

const SIZE_CLASSES = {
  xs: "h-6 w-6 text-[0.625rem]",
  sm: "h-8 w-8 text-[0.6875rem]",
  md: "h-10 w-10 text-sm",
  lg: "h-16 w-16 text-xl",
  xl: "h-24 w-24 text-3xl",
} as const;

const RING_PADDING: Record<keyof typeof SIZE_CLASSES, string> = {
  xs: "p-[2px]",
  sm: "p-[2.5px]",
  md: "p-[3px]",
  lg: "p-[3.5px]",
  xl: "p-1",
};

type ProfilePick = Pick<
  CommunityProfile,
  | "avatarUrl"
  | "communityDisplayName"
  | "displayName"
  | "communityUsername"
  | "nitroEnabled"
  | "profileRing"
>;

export function CommunityAvatar({
  profile,
  fallbackName,
  size = "md",
  className = "",
  style,
  isServerBooster = false,
  previewRing = false,
}: {
  profile?: ProfilePick | null;
  fallbackName?: string | null;
  size?: keyof typeof SIZE_CLASSES;
  className?: string;
  style?: React.CSSProperties;
  /** Show animated ring when user boosted this server */
  isServerBooster?: boolean;
  /** Force ring on for picker previews */
  previewRing?: boolean;
}) {
  const label =
    profile
      ? communityProfileLabel(profile as CommunityProfile)
      : fallbackName?.trim() || "Member";
  const initial = label[0]?.toUpperCase() ?? "?";
  const sizeClass = SIZE_CLASSES[size];

  const showRing =
    previewRing ||
    canShowProfileRing({
      nitroEnabled: profile?.nitroEnabled,
      profileRing: profile?.profileRing,
      isServerBooster,
    });
  const ringClass = showRing ? profileRingClass(profile?.profileRing) : null;

  const inner = profile?.avatarUrl ? (
    <AuthedImage
      src={profile.avatarUrl}
      alt=""
      className={`rounded-full object-cover ${sizeClass} ${className}`}
    />
  ) : (
    <div
      className={`flex items-center justify-center rounded-full bg-accent/20 font-semibold text-accent ${sizeClass} ${className}`}
      style={style}
      aria-hidden
    >
      {initial}
    </div>
  );

  if (!ringClass) return <div className="inline-flex shrink-0">{inner}</div>;

  return (
    <div className={`inline-flex shrink-0 rounded-full ${ringClass} ${RING_PADDING[size]}`}>
      <div className="rounded-full bg-[var(--community-chat,#2a3436)]">{inner}</div>
    </div>
  );
}

export function NitroBadge({ className = "" }: { className?: string }) {
  return (
    <span
      className={`inline-flex items-center rounded px-1 py-0.5 text-[0.5625rem] font-bold uppercase tracking-wide profile-ring profile-ring--nitro ${className}`}
      title="Pine Nitro"
    >
      Nitro
    </span>
  );
}
