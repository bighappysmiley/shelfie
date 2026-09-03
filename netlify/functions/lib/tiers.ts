export type SubscriptionTier = "free" | "pro" | "pro_plus" | "premium" | "enterprise";

export interface TierLimits {
  maxBooks: number;
  maxShelfScansPerMonth: number;
  maxLibraries: number;
  maxMembersPerLibrary: number;
}

export const TIER_LIMITS: Record<SubscriptionTier, TierLimits> = {
  free: { maxBooks: 150, maxShelfScansPerMonth: 2, maxLibraries: 1, maxMembersPerLibrary: 3 },
  pro: { maxBooks: 500, maxShelfScansPerMonth: 10, maxLibraries: 3, maxMembersPerLibrary: 10 },
  pro_plus: {
    maxBooks: 2000,
    maxShelfScansPerMonth: 30,
    maxLibraries: 5,
    maxMembersPerLibrary: 25,
  },
  premium: {
    maxBooks: 10000,
    maxShelfScansPerMonth: 100,
    maxLibraries: 15,
    maxMembersPerLibrary: 50,
  },
  enterprise: {
    maxBooks: 100000,
    maxShelfScansPerMonth: 1000,
    maxLibraries: 100,
    maxMembersPerLibrary: 500,
  },
};

export function normalizeTier(tier: string | null | undefined): SubscriptionTier {
  if (
    tier === "pro" ||
    tier === "pro_plus" ||
    tier === "premium" ||
    tier === "enterprise"
  ) {
    return tier;
  }
  return "free";
}

export function getTierLimits(
  tier: string | null | undefined,
  overrides?: { bookLimitOverride?: number | null; shelfScanLimitOverride?: number | null },
): TierLimits {
  const base = TIER_LIMITS[normalizeTier(tier)];
  return {
    ...base,
    maxBooks: overrides?.bookLimitOverride ?? base.maxBooks,
    maxShelfScansPerMonth: overrides?.shelfScanLimitOverride ?? base.maxShelfScansPerMonth,
  };
}

export function currentPeriodYm(date = new Date()): string {
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}`;
}
