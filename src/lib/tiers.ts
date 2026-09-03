/** Subscription tiers and library usage limits */

export type SubscriptionTier = "free" | "pro" | "pro_plus" | "premium" | "enterprise";

export type SubscriptionTierAlias = SubscriptionTier;

export interface TierLimits {
  maxBooks: number;
  maxShelfScansPerMonth: number;
  maxLibraries: number;
  maxMembersPerLibrary: number;
  label: string;
  priceMonthlyUsd: number | null;
  description: string;
}

export const TIER_LIMITS: Record<SubscriptionTier, TierLimits> = {
  free: {
    label: "Free",
    priceMonthlyUsd: 0,
    description: "Catalog your collection and track loans.",
    maxBooks: 150,
    maxShelfScansPerMonth: 2,
    maxLibraries: 1,
    maxMembersPerLibrary: 3,
  },
  pro: {
    label: "Pro",
    priceMonthlyUsd: 8,
    description: "More books, more shelf scans, Pro profile perks.",
    maxBooks: 500,
    maxShelfScansPerMonth: 10,
    maxLibraries: 3,
    maxMembersPerLibrary: 10,
  },
  pro_plus: {
    label: "Pro Plus",
    priceMonthlyUsd: 15,
    description: "Higher limits for serious collectors and small teams.",
    maxBooks: 2000,
    maxShelfScansPerMonth: 30,
    maxLibraries: 5,
    maxMembersPerLibrary: 25,
  },
  premium: {
    label: "Premium",
    priceMonthlyUsd: 29,
    description: "Large collections, frequent scanning, bigger teams.",
    maxBooks: 10000,
    maxShelfScansPerMonth: 100,
    maxLibraries: 15,
    maxMembersPerLibrary: 50,
  },
  enterprise: {
    label: "Enterprise",
    priceMonthlyUsd: null,
    description: "Custom limits, SSO, and dedicated support. Contact us.",
    maxBooks: 100000,
    maxShelfScansPerMonth: 1000,
    maxLibraries: 100,
    maxMembersPerLibrary: 500,
  },
};

export const TIER_ORDER: SubscriptionTier[] = [
  "free",
  "pro",
  "pro_plus",
  "premium",
  "enterprise",
];

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

export function isPaidTier(tier: string | null | undefined): boolean {
  return normalizeTier(tier) !== "free";
}
