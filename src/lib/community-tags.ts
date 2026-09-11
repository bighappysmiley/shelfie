import { supabase } from "./supabase";
import type { CommunityServerTag } from "./community-types";

function mapTag(row: Record<string, unknown>): CommunityServerTag {
  return {
    id: row.id as string,
    serverId: row.server_id as string,
    name: row.name as string,
    color: (row.color as string) || "#5865F2",
    iconUrl: (row.icon_url as string | null) ?? null,
    position: (row.position as number) ?? 0,
    createdAt: row.created_at as string,
  };
}

export async function listServerTags(serverId: string): Promise<CommunityServerTag[]> {
  const { data, error } = await supabase
    .from("community_server_tags")
    .select("id, server_id, name, color, icon_url, position, created_at")
    .eq("server_id", serverId)
    .order("position")
    .order("name");
  if (error) {
    if (error.code === "42P01") return [];
    throw error;
  }
  return (data ?? []).map((r) => mapTag(r as Record<string, unknown>));
}

export async function createServerTag(
  serverId: string,
  input: { name: string; color?: string; iconUrl?: string | null },
): Promise<CommunityServerTag> {
  const { data: existing } = await supabase
    .from("community_server_tags")
    .select("position")
    .eq("server_id", serverId)
    .order("position", { ascending: false })
    .limit(1);
  const nextPos = ((existing?.[0]?.position as number | undefined) ?? -1) + 1;

  const { data, error } = await supabase
    .from("community_server_tags")
    .insert({
      server_id: serverId,
      name: input.name.trim(),
      color: input.color ?? "#5865F2",
      icon_url: input.iconUrl ?? null,
      position: nextPos,
    })
    .select("id, server_id, name, color, icon_url, position, created_at")
    .single();
  if (error) throw error;
  return mapTag(data as Record<string, unknown>);
}

export async function updateServerTag(
  tagId: string,
  patch: { name?: string; color?: string; iconUrl?: string | null; position?: number },
): Promise<void> {
  const row: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (patch.name !== undefined) row.name = patch.name.trim();
  if (patch.color !== undefined) row.color = patch.color;
  if (patch.iconUrl !== undefined) row.icon_url = patch.iconUrl;
  if (patch.position !== undefined) row.position = patch.position;
  const { error } = await supabase.from("community_server_tags").update(row).eq("id", tagId);
  if (error) throw error;
}

export async function deleteServerTag(tagId: string): Promise<void> {
  const { error } = await supabase.from("community_server_tags").delete().eq("id", tagId);
  if (error) throw error;
}

/** Map of userId → assigned tags for a server. */
export async function listMemberTagsByServer(
  serverId: string,
): Promise<Map<string, CommunityServerTag[]>> {
  const tags = await listServerTags(serverId);
  const byId = new Map(tags.map((t) => [t.id, t]));
  const { data, error } = await supabase
    .from("community_member_tags")
    .select("user_id, tag_id")
    .eq("server_id", serverId);
  if (error) {
    if (error.code === "42P01") return new Map();
    throw error;
  }
  const map = new Map<string, CommunityServerTag[]>();
  for (const row of data ?? []) {
    const tag = byId.get(row.tag_id as string);
    if (!tag) continue;
    const userId = row.user_id as string;
    const list = map.get(userId) ?? [];
    list.push(tag);
    map.set(userId, list);
  }
  for (const [userId, list] of map) {
    list.sort((a, b) => a.position - b.position || a.name.localeCompare(b.name));
    map.set(userId, list);
  }
  return map;
}

export async function listUserTagsOnServer(
  serverId: string,
  userId: string,
): Promise<CommunityServerTag[]> {
  const map = await listMemberTagsByServer(serverId);
  return map.get(userId) ?? [];
}

export async function setMemberTags(
  serverId: string,
  userId: string,
  tagIds: string[],
): Promise<void> {
  const unique = [...new Set(tagIds)];
  const { error: delErr } = await supabase
    .from("community_member_tags")
    .delete()
    .eq("server_id", serverId)
    .eq("user_id", userId);
  if (delErr) throw delErr;

  if (unique.length === 0) return;

  const { data: session } = await supabase.auth.getSession();
  const { error } = await supabase.from("community_member_tags").insert(
    unique.map((tagId) => ({
      server_id: serverId,
      user_id: userId,
      tag_id: tagId,
      assigned_by: session.session?.user?.id ?? null,
    })),
  );
  if (error) throw error;
}

export async function listStaffLinkedAccounts(): Promise<
  { id: string; email: string; label: string; linkedUserId: string | null }[]
> {
  const { data, error } = await supabase
    .from("staff_linked_accounts")
    .select("id, linked_email, label, linked_user_id")
    .order("created_at");
  if (error) {
    if (error.code === "42P01") return [];
    throw error;
  }
  return (data ?? []).map((r) => ({
    id: r.id as string,
    email: r.linked_email as string,
    label: (r.label as string) || (r.linked_email as string),
    linkedUserId: (r.linked_user_id as string | null) ?? null,
  }));
}

export async function addStaffLinkedAccount(email: string, label: string): Promise<void> {
  const { data: session } = await supabase.auth.getSession();
  const ownerId = session.session?.user?.id;
  if (!ownerId) throw new Error("Sign in required");
  const normalized = email.trim().toLowerCase();
  if (!normalized.includes("@")) throw new Error("Enter a valid email");

  const { error } = await supabase.from("staff_linked_accounts").upsert(
    {
      owner_user_id: ownerId,
      linked_email: normalized,
      label: label.trim() || normalized,
    },
    { onConflict: "owner_user_id,linked_email" },
  );
  if (error) throw error;
}

export async function removeStaffLinkedAccount(id: string): Promise<void> {
  const { error } = await supabase.from("staff_linked_accounts").delete().eq("id", id);
  if (error) throw error;
}
