import { supabase } from "./supabase";
import { uploadCommunityImage } from "./community";
import { moderateTextContent } from "./content-moderation";
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
  pro_enabled?: boolean | null;
  profile_ring?: string | null;
};

const PROFILE_SELECT_BASE =
  "user_id, display_name, community_username, community_display_name, community_bio, community_avatar_url, community_banner_url, community_status_emoji, community_status_text, books_read_count, current_reading_title, current_reading_author";

const PROFILE_SELECT_WITH_NITRO = `${PROFILE_SELECT_BASE}, nitro_enabled, profile_ring`;

const PROFILE_SELECT_FULL = `${PROFILE_SELECT_WITH_NITRO}, pro_enabled`;

function isMissingColumnError(error: { code?: string; message?: string }): boolean {
  return error.code === "42703" || /column .+ does not exist/i.test(error.message ?? "");
}

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
    nitroEnabled: Boolean(row.pro_enabled ?? row.nitro_enabled),
    proEnabled: Boolean(row.pro_enabled ?? row.nitro_enabled),
    profileRing: row.profile_ring ?? null,
  };
}

async function selectProfileRows(
  build: (select: string) => PromiseLike<{ data: unknown; error: { code?: string; message?: string } | null }>,
): Promise<ProfileRow[]> {
  const attempts = [PROFILE_SELECT_FULL, PROFILE_SELECT_WITH_NITRO, PROFILE_SELECT_BASE];
  let lastError: { code?: string; message?: string } | null = null;

  for (const select of attempts) {
    const { data, error } = await build(select);
    if (!error) {
      if (!data) return [];
      return Array.isArray(data) ? (data as ProfileRow[]) : [data as ProfileRow];
    }
    if (!isMissingColumnError(error)) throw error;
    lastError = error;
  }

  if (lastError) throw lastError;
  return [];
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
  const rows = await selectProfileRows((select) =>
    supabase.from("user_profiles").select(select).eq("user_id", userId).maybeSingle(),
  );
  const row = rows[0];
  if (!row) return null;
  return mapProfile(row);
}

export async function getCommunityProfileByUsername(username: string): Promise<CommunityProfile | null> {
  const handle = username.trim().replace(/^@+/, "").toLowerCase();
  const rows = await selectProfileRows((select) =>
    supabase
      .from("user_profiles")
      .select(select)
      .ilike("community_username", handle)
      .maybeSingle(),
  );
  const row = rows[0];
  if (!row) return null;
  return mapProfile(row);
}

export async function listCommunityProfiles(userIds: string[]): Promise<Map<string, CommunityProfile>> {
  const unique = [...new Set(userIds.filter(Boolean))];
  const map = new Map<string, CommunityProfile>();
  if (unique.length === 0) return map;

  const rows = await selectProfileRows((select) =>
    supabase.from("user_profiles").select(select).in("user_id", unique),
  );
  for (const row of rows) {
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
    proEnabled?: boolean;
    profileRing?: string | null;
  },
): Promise<void> {
  const moderated = moderateTextContent(
    [patch.bio, patch.statusText].filter(Boolean).join(" "),
  );
  if (!moderated.allowed && (patch.bio !== undefined || patch.statusText !== undefined)) {
    throw new Error(moderated.reason);
  }

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
  if (patch.nitroEnabled !== undefined) {
    row.nitro_enabled = patch.nitroEnabled;
    row.pro_enabled = patch.nitroEnabled;
  }
  if (patch.proEnabled !== undefined) {
    row.pro_enabled = patch.proEnabled;
    row.nitro_enabled = patch.proEnabled;
  }
  if (patch.profileRing !== undefined) {
    const ring = patch.profileRing === "nitro" ? "pro" : patch.profileRing;
    row.profile_ring = ring || null;
  }

  let { error } = await supabase.from("user_profiles").upsert(row);
  if (error && isMissingColumnError(error)) {
    const legacyRow = { ...row };
    delete legacyRow.pro_enabled;
    if (legacyRow.profile_ring !== undefined) delete legacyRow.profile_ring;
    if (patch.nitroEnabled !== undefined || patch.proEnabled !== undefined) {
      legacyRow.nitro_enabled = patch.proEnabled ?? patch.nitroEnabled;
    }
    ({ error } = await supabase.from("user_profiles").upsert(legacyRow));
  }
  if (error) throw error;
}

export async function uploadCommunityProfileImage(file: File): Promise<string> {
  return uploadCommunityImage(file);
}
