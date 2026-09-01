import { supabase } from "./supabase";
import { uploadCommunityImage } from "./community";
import type { CommunityProfile } from "./community-types";

type ProfileRow = {
  user_id: string;
  display_name: string | null;
  community_username: string | null;
  community_display_name: string | null;
  community_bio: string | null;
  community_avatar_url: string | null;
  community_banner_url: string | null;
  community_status_emoji: string | null;
  community_status_text: string | null;
  books_read_count: number | null;
  current_reading_title: string | null;
  current_reading_author: string | null;
  nitro_enabled: boolean | null;
  profile_ring: string | null;
};

const PROFILE_SELECT =
  "user_id, display_name, community_username, community_display_name, community_bio, community_avatar_url, community_banner_url, community_status_emoji, community_status_text, books_read_count, current_reading_title, current_reading_author, nitro_enabled, profile_ring";

function mapProfile(row: ProfileRow): CommunityProfile {
  return {
    userId: row.user_id,
    displayName: row.display_name,
    communityUsername: row.community_username,
    communityDisplayName: row.community_display_name,
    bio: row.community_bio,
    avatarUrl: row.community_avatar_url,
    bannerUrl: row.community_banner_url,
    statusEmoji: row.community_status_emoji,
    statusText: row.community_status_text,
    booksReadCount: row.books_read_count ?? 0,
    currentReadingTitle: row.current_reading_title,
    currentReadingAuthor: row.current_reading_author,
    nitroEnabled: Boolean(row.nitro_enabled),
    profileRing: row.profile_ring,
  };
}

export function communityProfileLabel(profile: CommunityProfile | null | undefined): string {
  return (
    profile?.communityDisplayName?.trim() ||
    profile?.displayName?.trim() ||
    (profile?.communityUsername ? `@${profile.communityUsername}` : null) ||
    "Member"
  );
}

export async function getCommunityProfile(userId: string): Promise<CommunityProfile | null> {
  const { data, error } = await supabase
    .from("user_profiles")
    .select(PROFILE_SELECT)
    .eq("user_id", userId)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;
  return mapProfile(data as ProfileRow);
}

export async function getCommunityProfileByUsername(username: string): Promise<CommunityProfile | null> {
  const handle = username.trim().replace(/^@+/, "").toLowerCase();
  const { data, error } = await supabase
    .from("user_profiles")
    .select(PROFILE_SELECT)
    .ilike("community_username", handle)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;
  return mapProfile(data as ProfileRow);
}

export async function listCommunityProfiles(userIds: string[]): Promise<Map<string, CommunityProfile>> {
  const unique = [...new Set(userIds.filter(Boolean))];
  const map = new Map<string, CommunityProfile>();
  if (unique.length === 0) return map;

  const { data, error } = await supabase.from("user_profiles").select(PROFILE_SELECT).in("user_id", unique);
  if (error) throw error;
  for (const row of (data ?? []) as ProfileRow[]) {
    map.set(row.user_id, mapProfile(row));
  }
  return map;
}

export async function updateCommunityProfile(
  userId: string,
  patch: {
    bio?: string | null;
    avatarUrl?: string | null;
    bannerUrl?: string | null;
    statusEmoji?: string | null;
    statusText?: string | null;
    booksReadCount?: number;
    currentReadingTitle?: string | null;
    currentReadingAuthor?: string | null;
    nitroEnabled?: boolean;
    profileRing?: string | null;
  },
): Promise<void> {
  const row: Record<string, unknown> = { user_id: userId, updated_at: new Date().toISOString() };
  if (patch.bio !== undefined) row.community_bio = patch.bio?.trim().slice(0, 500) || null;
  if (patch.avatarUrl !== undefined) row.community_avatar_url = patch.avatarUrl || null;
  if (patch.bannerUrl !== undefined) row.community_banner_url = patch.bannerUrl || null;
  if (patch.statusEmoji !== undefined) row.community_status_emoji = patch.statusEmoji?.trim().slice(0, 8) || null;
  if (patch.statusText !== undefined) row.community_status_text = patch.statusText?.trim().slice(0, 128) || null;
  if (patch.booksReadCount !== undefined) row.books_read_count = Math.max(0, patch.booksReadCount);
  if (patch.currentReadingTitle !== undefined) {
    row.current_reading_title = patch.currentReadingTitle?.trim() || null;
  }
  if (patch.currentReadingAuthor !== undefined) {
    row.current_reading_author = patch.currentReadingAuthor?.trim() || null;
  }
  if (patch.nitroEnabled !== undefined) row.nitro_enabled = patch.nitroEnabled;
  if (patch.profileRing !== undefined) row.profile_ring = patch.profileRing || null;

  const { error } = await supabase.from("user_profiles").upsert(row);
  if (error) throw error;
}

export async function uploadCommunityProfileImage(file: File): Promise<string> {
  return uploadCommunityImage(file);
}
