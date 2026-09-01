export type SettingsTab =
  | "overview"
  | "members"
  | "roles"
  | "invites"
  | "requests"
  | "channels"
  | "emoji"
  | "stickers"
  | "widget"
  | "onboarding"
  | "verification"
  | "notifications"
  | "moderation"
  | "integrations"
  | "automod"
  | "leave"
  | "danger";

export type SettingsNavGroup = {
  label: string;
  items: { id: SettingsTab; label: string; badge?: number }[];
};

export const SETTINGS_TAB_LABELS: Record<SettingsTab, string> = {
  overview: "Overview",
  members: "Members",
  roles: "Roles",
  invites: "Invites",
  requests: "Join requests",
  channels: "Channels",
  emoji: "Emoji",
  stickers: "Stickers",
  widget: "Widget",
  onboarding: "Onboarding",
  verification: "Verification",
  notifications: "Notifications",
  moderation: "Bans & audit",
  integrations: "Integrations",
  automod: "AutoMod",
  leave: "Leave server",
  danger: "Delete server",
};

export function parseSettingsTab(value: string | null): SettingsTab {
  const tabs = Object.keys(SETTINGS_TAB_LABELS) as SettingsTab[];
  return tabs.includes(value as SettingsTab) ? (value as SettingsTab) : "overview";
}
