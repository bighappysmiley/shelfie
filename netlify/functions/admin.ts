import type { Config } from "@netlify/functions";
import { json, error, parseBody } from "./utils";
import { withAuth, getBearerToken } from "./lib/auth";
import { supabaseForToken } from "./lib/supabase";
import { normalizeTier } from "./lib/tiers";

export const config: Config = {
  path: "/api/admin/*",
};

async function assertStaff(token: string) {
  const supabase = supabaseForToken(token);
  const { data: userData } = await supabase.auth.getUser();
  const email = userData.user?.email;
  if (!email) throw new Error("Not authenticated");

  const { data: staff } = await supabase
    .from("staff")
    .select("email, role")
    .ilike("email", email)
    .maybeSingle();

  if (!staff) {
    const err = new Error("Staff only") as Error & { status?: number };
    err.status = 403;
    throw err;
  }
  return { supabase, userId: userData.user!.id, email };
}

export default withAuth(async (request) => {
  const token = getBearerToken(request)!;
  const url = new URL(request.url);
  const path = url.pathname.replace(/^\/api\/admin\/?/, "").replace(/\/$/, "");

  try {
    const { supabase } = await assertStaff(token);

    if (path === "users" && request.method === "GET") {
      const q = (url.searchParams.get("q") ?? "").trim();
      if (!q) return json({ users: [] });

      const pattern = `%${q}%`;
      const { data: profiles, error: pErr } = await supabase
        .from("user_profiles")
        .select(
          "user_id, display_name, community_username, community_display_name, subscription_tier, pro_enabled, book_limit_override, shelf_scan_limit_override, banned_at, ban_reason, created_at",
        )
        .or(
          `display_name.ilike.${pattern},community_username.ilike.${pattern},community_display_name.ilike.${pattern}`,
        )
        .limit(40);

      if (pErr) {
        // subscription_tier column may not exist yet — fall back
        const { data: fallback } = await supabase
          .from("user_profiles")
          .select(
            "user_id, display_name, community_username, community_display_name, pro_enabled, created_at",
          )
          .or(
            `display_name.ilike.${pattern},community_username.ilike.${pattern},community_display_name.ilike.${pattern}`,
          )
          .limit(40);

        return json({
          users: (fallback ?? []).map((r) => ({
            userId: r.user_id,
            email: null,
            displayName: r.display_name ?? r.community_display_name ?? null,
            communityUsername: r.community_username ?? null,
            subscriptionTier: r.pro_enabled ? "pro" : "free",
            proEnabled: Boolean(r.pro_enabled),
            bookLimitOverride: null,
            shelfScanLimitOverride: null,
            bannedAt: null,
            banReason: null,
            createdAt: r.created_at ?? null,
          })),
        });
      }

      // Try to match email via auth is not available with anon; return profile hits
      // Also search by email substring through a soft match on contact patterns
      const users = (profiles ?? []).map((r) => ({
        userId: r.user_id as string,
        email: null as string | null,
        displayName:
          (r.display_name as string | null) ||
          (r.community_display_name as string | null) ||
          null,
        communityUsername: (r.community_username as string | null) ?? null,
        subscriptionTier: normalizeTier(r.subscription_tier as string | null),
        proEnabled: Boolean(r.pro_enabled),
        bookLimitOverride: (r.book_limit_override as number | null) ?? null,
        shelfScanLimitOverride: (r.shelf_scan_limit_override as number | null) ?? null,
        bannedAt: (r.banned_at as string | null) ?? null,
        banReason: (r.ban_reason as string | null) ?? null,
        createdAt: (r.created_at as string | null) ?? null,
      }));

      // If query looks like email, also try staff ticket contacts / enterprise leads
      if (q.includes("@")) {
        const { data: tickets } = await supabase
          .from("tickets")
          .select("owner_id, contact_email")
          .ilike("contact_email", pattern)
          .limit(20);
        for (const t of tickets ?? []) {
          if (!users.some((u) => u.userId === t.owner_id)) {
            const { data: p } = await supabase
              .from("user_profiles")
              .select(
                "user_id, display_name, community_username, community_display_name, subscription_tier, pro_enabled, book_limit_override, shelf_scan_limit_override, banned_at, ban_reason, created_at",
              )
              .eq("user_id", t.owner_id)
              .maybeSingle();
            users.push({
              userId: t.owner_id as string,
              email: (t.contact_email as string) ?? null,
              displayName:
                (p?.display_name as string | null) ||
                (p?.community_display_name as string | null) ||
                null,
              communityUsername: (p?.community_username as string | null) ?? null,
              subscriptionTier: normalizeTier(p?.subscription_tier as string | null),
              proEnabled: Boolean(p?.pro_enabled),
              bookLimitOverride: (p?.book_limit_override as number | null) ?? null,
              shelfScanLimitOverride: (p?.shelf_scan_limit_override as number | null) ?? null,
              bannedAt: (p?.banned_at as string | null) ?? null,
              banReason: (p?.ban_reason as string | null) ?? null,
              createdAt: (p?.created_at as string | null) ?? null,
            });
          } else {
            const hit = users.find((u) => u.userId === t.owner_id);
            if (hit && !hit.email) hit.email = t.contact_email as string;
          }
        }
      }

      return json({ users });
    }

    if (path === "libraries" && request.method === "GET") {
      const q = (url.searchParams.get("q") ?? "").trim().toLowerCase();
      const { data: libs, error: lErr } = await supabase
        .from("libraries")
        .select("id, name, created_at")
        .order("created_at", { ascending: false })
        .limit(100);
      if (lErr) return error(lErr.message, 400);

      const filtered = (libs ?? []).filter((l) =>
        !q ? true : String(l.name).toLowerCase().includes(q),
      );

      const libraries = [];
      for (const lib of filtered.slice(0, 40)) {
        const { data: members } = await supabase
          .from("library_members")
          .select("user_id, role")
          .eq("library_id", lib.id);
        const owner = (members ?? []).find((m) => m.role === "owner");
        let ownerName: string | null = null;
        let ownerEmail: string | null = null;
        if (owner) {
          const { data: p } = await supabase
            .from("user_profiles")
            .select("display_name, community_display_name, community_username")
            .eq("user_id", owner.user_id)
            .maybeSingle();
          ownerName =
            (p?.display_name as string | null) ||
            (p?.community_display_name as string | null) ||
            (p?.community_username as string | null) ||
            null;
        }
        libraries.push({
          id: lib.id as string,
          name: lib.name as string,
          ownerUserId: (owner?.user_id as string) ?? null,
          ownerEmail,
          ownerName,
          memberCount: (members ?? []).length,
          createdAt: (lib.created_at as string | null) ?? null,
        });
      }
      return json({ libraries });
    }

    if (path === "usage" && request.method === "GET") {
      const userId = url.searchParams.get("userId");
      if (!userId) return error("userId required", 400);
      const period = new Date();
      const periodYm = `${period.getUTCFullYear()}-${String(period.getUTCMonth() + 1).padStart(2, "0")}`;
      const { data } = await supabase
        .from("user_usage_counters")
        .select("metric, count")
        .eq("user_id", userId)
        .eq("period_ym", periodYm);
      return json({ periodYm, counters: data ?? [] });
    }

    if (path === "notify" && request.method === "POST") {
      const body = await parseBody<{ userId: string; title: string; body: string }>(request);
      if (!body.userId || !body.title || !body.body) {
        return error("userId, title, and body are required", 400);
      }
      const { error: nErr } = await supabase.from("app_notifications").insert({
        user_id: body.userId,
        kind: "admin_message",
        title: body.title,
        body: body.body,
      });
      if (nErr) return error(nErr.message, 400);
      return json({ ok: true });
    }

    return error("Not found", 404);
  } catch (err) {
    const status = (err as { status?: number }).status ?? 500;
    const message = err instanceof Error ? err.message : "Admin error";
    return error(message, status);
  }
});
