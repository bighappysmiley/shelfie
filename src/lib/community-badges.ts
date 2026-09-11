import { supabase } from "./supabase";
import type { ProfileBadge } from "./community-types";

function mapBadge(row: Record<string, unknown>): ProfileBadge {
  return {
    id: row.id as string,
    name: row.name as string,
    color: (row.color as string) || "#5865F2",
    iconUrl: (row.icon_url as string | null) ?? null,
    position: (row.position as number) ?? 0,
    createdAt: row.created_at as string,
  };
}

function badgeError(error: { code?: string; message?: string; details?: string } | null): Error {
  if (!error) return new Error("Something went wrong with badges");
  const code = error.code ?? "";
  const msg = (error.message ?? "").toLowerCase();
  if (code === "42P01" || code === "PGRST205" || msg.includes("schema cache")) {
    return new Error(
      "Profile badges are not set up yet (missing tables). Apply the global profile badges migration, then try again.",
    );
  }
  if (code === "42501" || msg.includes("only staff") || msg.includes("row-level security")) {
    return new Error("Only staff can manage badges. Sign in with a staff account and try again.");
  }
  if (code === "23505" || msg.includes("duplicate") || msg.includes("unique")) {
    return new Error("A badge with that name already exists.");
  }
  return new Error(error.message || error.details || "Badge request failed");
}

export async function listProfileBadges(): Promise<ProfileBadge[]> {
  const { data, error } = await supabase
    .from("profile_badges")
    .select("id, name, color, icon_url, position, created_at")
    .order("position")
    .order("name");
  if (error) throw badgeError(error);
  return (data ?? []).map((r) => mapBadge(r as Record<string, unknown>));
}

export async function createProfileBadge(input: {
  name: string;
  color?: string;
  iconUrl?: string | null;
}): Promise<ProfileBadge> {
  const name = input.name.trim();
  if (!name) throw new Error("Enter a badge name");

  const { data, error } = await supabase.rpc("staff_create_profile_badge", {
    p_name: name,
    p_color: input.color ?? "#5865F2",
    p_icon_url: input.iconUrl ?? null,
  });
  if (error) throw badgeError(error);
  return mapBadge(data as Record<string, unknown>);
}

export async function updateProfileBadge(
  badgeId: string,
  patch: { name?: string; color?: string; iconUrl?: string | null; position?: number },
): Promise<ProfileBadge> {
  const clearIcon = patch.iconUrl === null;
  const { data, error } = await supabase.rpc("staff_update_profile_badge", {
    p_id: badgeId,
    p_name: patch.name ?? null,
    p_color: patch.color ?? null,
    p_icon_url: clearIcon ? null : (patch.iconUrl ?? null),
    p_clear_icon: clearIcon,
  });
  if (error) {
    // Fallback for environments that only have table RLS (no RPC yet).
    if (error.code === "PGRST202" || /function .* does not exist/i.test(error.message ?? "")) {
      const row: Record<string, unknown> = { updated_at: new Date().toISOString() };
      if (patch.name !== undefined) row.name = patch.name.trim();
      if (patch.color !== undefined) row.color = patch.color;
      if (patch.iconUrl !== undefined) row.icon_url = patch.iconUrl;
      if (patch.position !== undefined) row.position = patch.position;
      const { data: updated, error: updErr } = await supabase
        .from("profile_badges")
        .update(row)
        .eq("id", badgeId)
        .select("id, name, color, icon_url, position, created_at")
        .single();
      if (updErr) throw badgeError(updErr);
      return mapBadge(updated as Record<string, unknown>);
    }
    throw badgeError(error);
  }
  return mapBadge(data as Record<string, unknown>);
}

export async function deleteProfileBadge(badgeId: string): Promise<void> {
  const { error } = await supabase.rpc("staff_delete_profile_badge", { p_id: badgeId });
  if (error) {
    if (error.code === "PGRST202" || /function .* does not exist/i.test(error.message ?? "")) {
      const { error: delErr } = await supabase.from("profile_badges").delete().eq("id", badgeId);
      if (delErr) throw badgeError(delErr);
      return;
    }
    throw badgeError(error);
  }
}

/** Map of userId → assigned profile badges. */
export async function listBadgesByUserIds(
  userIds: string[],
): Promise<Map<string, ProfileBadge[]>> {
  const unique = [...new Set(userIds.filter(Boolean))];
  if (unique.length === 0) return new Map();

  const badges = await listProfileBadges().catch((err) => {
    if (err instanceof Error && /not set up yet/i.test(err.message)) return [] as ProfileBadge[];
    throw err;
  });
  const byId = new Map(badges.map((b) => [b.id, b]));

  const { data, error } = await supabase
    .from("user_profile_badges")
    .select("user_id, badge_id")
    .in("user_id", unique);
  if (error) {
    if (error.code === "42P01" || error.code === "PGRST205") return new Map();
    throw badgeError(error);
  }

  const map = new Map<string, ProfileBadge[]>();
  for (const row of data ?? []) {
    const badge = byId.get(row.badge_id as string);
    if (!badge) continue;
    const userId = row.user_id as string;
    const list = map.get(userId) ?? [];
    list.push(badge);
    map.set(userId, list);
  }
  for (const [userId, list] of map) {
    list.sort((a, b) => a.position - b.position || a.name.localeCompare(b.name));
    map.set(userId, list);
  }
  return map;
}

export async function listUserProfileBadges(userId: string): Promise<ProfileBadge[]> {
  const map = await listBadgesByUserIds([userId]);
  return map.get(userId) ?? [];
}

export async function setUserProfileBadges(userId: string, badgeIds: string[]): Promise<void> {
  const unique = [...new Set(badgeIds)];
  const { error } = await supabase.rpc("staff_set_user_profile_badges", {
    p_user_id: userId,
    p_badge_ids: unique,
  });
  if (error) {
    if (error.code === "PGRST202" || /function .* does not exist/i.test(error.message ?? "")) {
      const { error: delErr } = await supabase
        .from("user_profile_badges")
        .delete()
        .eq("user_id", userId);
      if (delErr) throw badgeError(delErr);
      if (unique.length === 0) return;
      const { data: session } = await supabase.auth.getSession();
      const { error: insErr } = await supabase.from("user_profile_badges").insert(
        unique.map((badgeId) => ({
          user_id: userId,
          badge_id: badgeId,
          assigned_by: session.session?.user?.id ?? null,
        })),
      );
      if (insErr) throw badgeError(insErr);
      return;
    }
    throw badgeError(error);
  }
}
