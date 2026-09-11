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

export async function listProfileBadges(): Promise<ProfileBadge[]> {
  const { data, error } = await supabase
    .from("profile_badges")
    .select("id, name, color, icon_url, position, created_at")
    .order("position")
    .order("name");
  if (error) {
    if (error.code === "42P01") return [];
    throw error;
  }
  return (data ?? []).map((r) => mapBadge(r as Record<string, unknown>));
}

export async function createProfileBadge(input: {
  name: string;
  color?: string;
  iconUrl?: string | null;
}): Promise<ProfileBadge> {
  const { data: existing } = await supabase
    .from("profile_badges")
    .select("position")
    .order("position", { ascending: false })
    .limit(1);
  const nextPos = ((existing?.[0]?.position as number | undefined) ?? -1) + 1;

  const { data, error } = await supabase
    .from("profile_badges")
    .insert({
      name: input.name.trim(),
      color: input.color ?? "#5865F2",
      icon_url: input.iconUrl ?? null,
      position: nextPos,
    })
    .select("id, name, color, icon_url, position, created_at")
    .single();
  if (error) throw error;
  return mapBadge(data as Record<string, unknown>);
}

export async function updateProfileBadge(
  badgeId: string,
  patch: { name?: string; color?: string; iconUrl?: string | null; position?: number },
): Promise<void> {
  const row: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (patch.name !== undefined) row.name = patch.name.trim();
  if (patch.color !== undefined) row.color = patch.color;
  if (patch.iconUrl !== undefined) row.icon_url = patch.iconUrl;
  if (patch.position !== undefined) row.position = patch.position;
  const { error } = await supabase.from("profile_badges").update(row).eq("id", badgeId);
  if (error) throw error;
}

export async function deleteProfileBadge(badgeId: string): Promise<void> {
  const { error } = await supabase.from("profile_badges").delete().eq("id", badgeId);
  if (error) throw error;
}

/** Map of userId → assigned profile badges. */
export async function listBadgesByUserIds(
  userIds: string[],
): Promise<Map<string, ProfileBadge[]>> {
  const unique = [...new Set(userIds.filter(Boolean))];
  if (unique.length === 0) return new Map();

  const badges = await listProfileBadges();
  const byId = new Map(badges.map((b) => [b.id, b]));

  const { data, error } = await supabase
    .from("user_profile_badges")
    .select("user_id, badge_id")
    .in("user_id", unique);
  if (error) {
    if (error.code === "42P01") return new Map();
    throw error;
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
  const { error: delErr } = await supabase
    .from("user_profile_badges")
    .delete()
    .eq("user_id", userId);
  if (delErr) throw delErr;

  if (unique.length === 0) return;

  const { data: session } = await supabase.auth.getSession();
  const { error } = await supabase.from("user_profile_badges").insert(
    unique.map((badgeId) => ({
      user_id: userId,
      badge_id: badgeId,
      assigned_by: session.session?.user?.id ?? null,
    })),
  );
  if (error) throw error;
}
