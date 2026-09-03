import type { SupabaseClient } from "@supabase/supabase-js";
import { currentPeriodYm, getTierLimits, normalizeTier } from "./tiers";

export async function loadUserEntitlements(
  supabase: SupabaseClient,
  userId: string,
) {
  const { data } = await supabase
    .from("user_profiles")
    .select(
      "subscription_tier, pro_enabled, book_limit_override, shelf_scan_limit_override, banned_at",
    )
    .eq("user_id", userId)
    .maybeSingle();

  if (data?.banned_at) {
    throw Object.assign(new Error("Your account is suspended. Contact support."), {
      status: 403,
    });
  }

  const tier = normalizeTier(
    (data?.subscription_tier as string | null) ??
      (data?.pro_enabled ? "pro" : "free"),
  );
  const limits = getTierLimits(tier, {
    bookLimitOverride: (data?.book_limit_override as number | null) ?? null,
    shelfScanLimitOverride: (data?.shelf_scan_limit_override as number | null) ?? null,
  });

  return { tier, limits };
}

export async function assertBookLimit(
  supabase: SupabaseClient,
  userId: string,
  currentBookCount: number,
) {
  const { limits } = await loadUserEntitlements(supabase, userId);
  if (currentBookCount >= limits.maxBooks) {
    throw Object.assign(
      new Error(
        `Book limit reached (${limits.maxBooks}). Upgrade your plan to add more books.`,
      ),
      { status: 402 },
    );
  }
}

export async function assertAndIncrementShelfScan(
  supabase: SupabaseClient,
  userId: string,
) {
  const { limits } = await loadUserEntitlements(supabase, userId);
  const periodYm = currentPeriodYm();

  const { data } = await supabase
    .from("user_usage_counters")
    .select("count")
    .eq("user_id", userId)
    .eq("metric", "shelf_scans")
    .eq("period_ym", periodYm)
    .maybeSingle();

  const count = Number(data?.count ?? 0);
  if (count >= limits.maxShelfScansPerMonth) {
    throw Object.assign(
      new Error(
        `Monthly shelf scan limit reached (${limits.maxShelfScansPerMonth}). Upgrade for more scans.`,
      ),
      { status: 402 },
    );
  }

  await supabase.from("user_usage_counters").upsert(
    {
      user_id: userId,
      metric: "shelf_scans",
      period_ym: periodYm,
      count: count + 1,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id,metric,period_ym" },
  );

  return { used: count + 1, limit: limits.maxShelfScansPerMonth };
}

export async function staffCanEditLibrary(
  supabase: SupabaseClient,
  libraryId: string,
): Promise<boolean> {
  const { data, error } = await supabase.rpc("staff_has_library_edit_access", {
    p_library_id: libraryId,
  });
  if (error) return false;
  return Boolean(data);
}
