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

export function setChannelNotificationLevel(
  userId: string,
  channelId: string,
  level: ChannelNotificationLevel,
): void {
  const store = readStore();
  const key = prefKey(userId, channelId);
  if (level === "all") {
    delete store[key];
  } else {
    store[key] = level;
  }
  writeStore(store);
}

export const CHANNEL_NOTIFICATION_LABELS: Record<ChannelNotificationLevel, string> = {
  all: "All messages",
  mentions: "Only @mentions",
  mute: "Mute channel",
};
