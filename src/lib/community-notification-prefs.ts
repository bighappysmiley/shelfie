export type ChannelNotificationLevel = "all" | "mentions" | "mute";

const STORAGE_KEY = "shelfie:channel-notification-prefs";

type PrefsStore = Record<string, ChannelNotificationLevel>;

function readStore(): PrefsStore {
  if (typeof window === "undefined") return {};
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    return JSON.parse(raw) as PrefsStore;
  } catch {
    return {};
  }
}

function writeStore(store: PrefsStore) {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
}

function prefKey(userId: string, channelId: string) {
  return `${userId}:${channelId}`;
}

export function getChannelNotificationLevel(
  userId: string,
  channelId: string,
): ChannelNotificationLevel {
  return readStore()[prefKey(userId, channelId)] ?? "all";
}

export async function syncChannelNotificationLevel(
  userId: string,
  channelId: string,
  level: ChannelNotificationLevel,
): Promise<void> {
  const store = readStore();
  const key = prefKey(userId, channelId);
  if (level === "all") {
    delete store[key];
  } else {
    store[key] = level;
  }
  writeStore(store);

  try {
    const { supabase } = await import("./supabase");
    if (level === "all") {
      await supabase
        .from("community_channel_notification_prefs")
        .delete()
        .eq("user_id", userId)
        .eq("channel_id", channelId);
    } else {
      await supabase.from("community_channel_notification_prefs").upsert(
        {
          user_id: userId,
          channel_id: channelId,
          level,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "user_id,channel_id" },
      );
    }
  } catch {
    /* localStorage remains source of truth offline */
  }
}

export function setChannelNotificationLevel(
  userId: string,
  channelId: string,
  level: ChannelNotificationLevel,
): void {
  void syncChannelNotificationLevel(userId, channelId, level);
}

export async function loadChannelNotificationPrefsFromServer(
  userId: string,
): Promise<void> {
  try {
    const { supabase } = await import("./supabase");
    const { data, error } = await supabase
      .from("community_channel_notification_prefs")
      .select("channel_id, level")
      .eq("user_id", userId);
    if (error) {
      if (error.code === "42P01") return;
      throw error;
    }
    const store = readStore();
    for (const row of data ?? []) {
      const level = row.level as ChannelNotificationLevel;
      if (level !== "all") {
        store[prefKey(userId, row.channel_id as string)] = level;
      }
    }
    writeStore(store);
  } catch {
    /* ignore */
  }
}

/** Seed per-channel notification prefs from a server's default for channels without a saved pref. */
export function ensureChannelNotificationsForServer(
  userId: string,
  channelIds: string[],
  defaultNotifications: "all" | "mentions",
): void {
  if (defaultNotifications === "all") return;
  const store = readStore();
  for (const channelId of channelIds) {
    const key = prefKey(userId, channelId);
    if (store[key]) continue;
    store[key] = defaultNotifications;
  }
  writeStore(store);
}

export function shouldNotifyForMessage(
  userId: string,
  channelId: string,
  body: string,
  authorId: string | null,
): boolean {
  if (authorId === userId) return false;
  const level = getChannelNotificationLevel(userId, channelId);
  if (level === "mute") return false;
  if (level === "mentions") {
    return new RegExp(`@${userId}|@everyone|@here`, "i").test(body);
  }
  return true;
}

export const CHANNEL_NOTIFICATION_LABELS: Record<ChannelNotificationLevel, string> = {
  all: "All messages",
  mentions: "Only @mentions",
  mute: "Mute channel",
};
