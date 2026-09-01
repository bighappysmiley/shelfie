import { supabase } from "./supabase";

let cachedOwnerIds: Set<string> | null = null;
let cacheAt = 0;
const CACHE_MS = 5 * 60 * 1000;

/** User IDs of Pine app owners (staff title Owner). */
export async function listAppOwnerUserIds(): Promise<Set<string>> {
  const now = Date.now();
  if (cachedOwnerIds && now - cacheAt < CACHE_MS) return cachedOwnerIds;

  const { data, error } = await supabase.rpc("list_app_owner_user_ids");
  if (error) throw error;

  cachedOwnerIds = new Set((data as string[] | null) ?? []);
  cacheAt = now;
  return cachedOwnerIds;
}

export function isAppOwnerUser(userId: string | null | undefined, ownerIds: Set<string>): boolean {
  return Boolean(userId && ownerIds.has(userId));
}
