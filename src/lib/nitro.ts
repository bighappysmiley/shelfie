export type ProfileRingId =
  | "holo"
  | "sparkle"
  | "ember"
  | "frost"
  | "aurora"
  | "pulse"
  | "nitro";

export type BoostLevel = 0 | 1 | 2 | 3;

export const BOOST_THRESHOLDS = [0, 2, 7, 14] as const;

export function getBoostLevel(boostCount: number): BoostLevel {
  if (boostCount >= 14) return 3;
  if (boostCount >= 7) return 2;
  if (boostCount >= 2) return 1;
  return 0;
}

export function boostsToNextLevel(boostCount: number): number | null {
  const level = getBoostLevel(boostCount);
  if (level >= 3) return null;
  const nextThreshold = BOOST_THRESHOLDS[level + 1]!;
  return Math.max(0, nextThreshold - boostCount);
}

export const PROFILE_RINGS: {
  id: ProfileRingId;
  label: string;
  description: string;
}[] = [
  { id: "nitro", label: "Nitro", description: "Classic pink-purple shimmer" },
  { id: "holo", label: "Holographic", description: "Iridescent rainbow spin" },
  { id: "sparkle", label: "Sparkle", description: "Twinkling star field" },
  { id: "ember", label: "Ember", description: "Warm glowing ring" },
  { id: "frost", label: "Frost", description: "Cool icy pulse" },
  { id: "aurora", label: "Aurora", description: "Northern lights sweep" },
  { id: "pulse", label: "Pulse", description: "Soft breathing glow" },
];

export const NITRO_PERKS = [
  "Animated profile rings",
  "Holographic role colors",
  "Larger uploads in chat",
  "Custom emoji anywhere",
  "Profile banner effects (test)",
] as const;

export const BOOST_PERKS_BY_LEVEL: Record<BoostLevel, string[]> = {
  0: ["Base server features"],
  1: [
    "Animated rings for boosters",
    "50% more custom emoji slots",
    "128 Kbps voice quality (test)",
  ],
  2: [
    "Holographic role colors for everyone",
    "Server banner slot",
    "100 emoji slots",
    "Invite splash background",
  ],
  3: [
    "Vanity invite URL (test)",
    "250 emoji slots",
    "Banner GIF support (test)",
    "Max boost perks unlocked",
  ],
};

export function canUseHoloRoles(opts: {
  nitroEnabled?: boolean;
  boostLevel?: number;
}): boolean {
  return Boolean(opts.nitroEnabled) || getBoostLevel(opts.boostLevel ?? 0) >= 2;
}

export function canShowProfileRing(opts: {
  nitroEnabled?: boolean;
  profileRing?: string | null;
  isServerBooster?: boolean;
}): boolean {
  if (!opts.profileRing) return false;
  return Boolean(opts.nitroEnabled) || Boolean(opts.isServerBooster);
}

export function profileRingClass(ring: string | null | undefined): string | null {
  if (!ring) return null;
  const valid = PROFILE_RINGS.some((r) => r.id === ring);
  return valid ? `profile-ring profile-ring--${ring}` : null;
}
