const STORAGE_KEY = "pine:notification-retention-hours";

/** Hours to keep app notifications. `null` means never auto-delete. Default: 24. */
export type NotificationRetentionHours = 12 | 24 | 72 | 168 | null;

export const NOTIFICATION_RETENTION_OPTIONS: {
  value: NotificationRetentionHours;
  label: string;
}[] = [
  { value: 12, label: "12 hours" },
  { value: 24, label: "24 hours" },
  { value: 72, label: "3 days" },
  { value: 168, label: "7 days" },
  { value: null, label: "Never" },
];

const DEFAULT: NotificationRetentionHours = 24;

function parseStored(raw: string | null): NotificationRetentionHours {
  if (raw === "never" || raw === "null") return null;
  if (raw == null || raw === "") return DEFAULT;
  const n = Number(raw);
  if (n === 12 || n === 24 || n === 72 || n === 168) return n;
  return DEFAULT;
}

export function getNotificationRetentionHours(): NotificationRetentionHours {
  if (typeof window === "undefined") return DEFAULT;
  try {
    return parseStored(localStorage.getItem(STORAGE_KEY));
  } catch {
    return DEFAULT;
  }
}

export function setNotificationRetentionHours(hours: NotificationRetentionHours): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, hours == null ? "never" : String(hours));
}

export function notificationRetentionLabel(hours: NotificationRetentionHours): string {
  return (
    NOTIFICATION_RETENTION_OPTIONS.find((o) => o.value === hours)?.label ?? "24 hours"
  );
}
