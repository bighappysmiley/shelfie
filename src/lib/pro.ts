export type ProfileRingId =
  | "holo"
  | "sparkle"
  | "ember"
  | "frost"
  | "aurora"
  | "pulse"
  | "pro"
  | "tide"
  | "mist"
  | "flare";

/** @deprecated Use ProfileRingId with `pro` */
export type LegacyProfileRingId = ProfileRingId | "nitro";

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
  { id: "tide", label: "Tide", description: "Green glow with rolling waves" },
  { id: "mist", label: "Mist", description: "Soft clouds drifting over your avatar" },
  { id: "flare", label: "Flare", description: "Radiant light bursting from the edges" },
  { id: "pro", label: "Prism", description: "Shifting pink–violet aura" },
  { id: "holo", label: "Holographic", description: "Iridescent rainbow wash" },
  { id: "sparkle", label: "Sparkle", description: "Twinkling star field" },
  { id: "ember", label: "Ember", description: "Warm firelight glow" },
  { id: "frost", label: "Frost", description: "Cool icy shimmer" },
  { id: "aurora", label: "Aurora", description: "Northern lights sweep" },
  { id: "pulse", label: "Pulse", description: "Soft breathing glow" },
];

export const PRO_PERKS = [
  "Optional animated avatar decorations",
  "Holographic role colors",
  "Pro badge on your profile",
  "Higher book and shelf-scan limits",
] as const;

/** @deprecated Use PRO_PERKS */
export const NITRO_PERKS = PRO_PERKS;

export const BOOST_PERKS_BY_LEVEL: Record<BoostLevel, string[]> = {
  0: ["Base server features"],
  1: ["Extra custom emoji slots"],
  2: ["Holographic role colors for everyone", "100 emoji slots"],
  3: ["250 emoji slots", "Max boost perks unlocked"],
};

export function normalizeProfileRing(ring: string | null | undefined): ProfileRingId | null {
  if (!ring) return null;
  if (ring === "nitro") return "pro";
  return PROFILE_RINGS.some((r) => r.id === ring) ? (ring as ProfileRingId) : null;
}

export function isProEnabled(opts: { proEnabled?: boolean; nitroEnabled?: boolean }): boolean {
  return Boolean(opts.proEnabled ?? opts.nitroEnabled);
}

export function canUseHoloRoles(opts: {
  proEnabled?: boolean;
  nitroEnabled?: boolean;
  boostLevel?: number;
}): boolean {
  // Boosts are no longer a self-serve unlock path; Pro grants holo.
  return isProEnabled(opts) || getBoostLevel(opts.boostLevel ?? 0) >= 2;
}

export function canShowProfileRing(opts: {
  proEnabled?: boolean;
  nitroEnabled?: boolean;
  profileRing?: string | null;
  isServerBooster?: boolean;
}): boolean {
  // Decoration are opt-in: Pro alone does not force a frame.
  if (!normalizeProfileRing(opts.profileRing)) return false;
  return isProEnabled(opts) || Boolean(opts.isServerBooster);
}

export function getEmojiSlotLimit(boostLevel: number): number {
  const level = getBoostLevel(boostLevel);
  if (level >= 3) return 250;
  if (level >= 2) return 100;
  if (level >= 1) return 75;
  return 50;
}

export function profileRingClass(ring: string | null | undefined): string | null {
  const normalized = normalizeProfileRing(ring);
  if (!normalized) return null;
  return `profile-deco profile-deco--${normalized}`;
}
