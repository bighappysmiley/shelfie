import { AuthedImage } from "@/components/AuthedImage";
import { communityProfileLabel } from "@/lib/community-profile";
import { canShowProfileRing, profileRingClass } from "@/lib/pro";
import type { CommunityProfile } from "@/lib/community-types";

const SIZE_CLASSES = {
  xs: "h-6 w-6 text-[0.625rem]",
  sm: "h-8 w-8 text-[0.6875rem]",
  md: "h-10 w-10 text-sm",
  lg: "h-16 w-16 text-xl",
  xl: "h-24 w-24 text-3xl",
} as const;

const DECO_PAD: Record<keyof typeof SIZE_CLASSES, string> = {
  xs: "p-[3px]",
  sm: "p-[4px]",
  md: "p-[5px]",
  lg: "p-[6px]",
  xl: "p-[8px]",
};

type ProfilePick = Pick<
  CommunityProfile,
  | "avatarUrl"
  | "communityDisplayName"
  | "displayName"
  | "communityUsername"
  | "nitroEnabled"
  | "proEnabled"
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
  isServerBooster?: boolean;
  /** Force-show decoration in pickers when a ring id is set on profile. */
  previewRing?: boolean;
}) {
  const label =
    profile
      ? communityProfileLabel(profile as CommunityProfile)
      : fallbackName?.trim() || "Member";
  const initial = label[0]?.toUpperCase() ?? "?";
  const sizeClass = SIZE_CLASSES[size];

  const showDeco =
    (previewRing && Boolean(profile?.profileRing)) ||
    canShowProfileRing({
      proEnabled: profile?.proEnabled,
      nitroEnabled: profile?.nitroEnabled,
      profileRing: profile?.profileRing,
      isServerBooster,
    });
  const decoClass = showDeco ? profileRingClass(profile?.profileRing) : null;

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

  if (!decoClass) return <div className="inline-flex shrink-0">{inner}</div>;

  return (
    <div className={`profile-deco-wrap inline-flex shrink-0 ${DECO_PAD[size]} ${decoClass}`}>
      <span className="profile-deco__aura" aria-hidden />
      <span className="profile-deco__fx profile-deco__fx--a" aria-hidden />
      <span className="profile-deco__fx profile-deco__fx--b" aria-hidden />
      <div className="profile-deco__avatar relative z-[1] rounded-full bg-[var(--community-chat,#f5f6f1)]">
        {inner}
      </div>
    </div>
  );
}

export function ProBadge({ className = "" }: { className?: string }) {
  return (
    <span
      className={`inline-flex items-center rounded px-1 py-0.5 text-[0.5625rem] font-bold uppercase tracking-wide bg-gradient-to-r from-[#3d8f6e] to-[#5bb88a] text-white ${className}`}
      title="Pine Pro"
    >
      Pro
    </span>
  );
}

/** @deprecated Use ProBadge */
export const NitroBadge = ProBadge;
