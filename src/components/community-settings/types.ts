export type SettingsTab =
  | "overview"
  | "members"
  | "roles"
  | "channels"
  | "invites"
  | "requests"
  | "safety"
  | "moderation"
  | "danger";

export type SettingsNavGroup = {
  label: string;
  items: { id: SettingsTab; label: string; badge?: number }[];
};
