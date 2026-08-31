export type TicketStatus = "open" | "closed";

export type MessageKind = "user" | "staff" | "system";

export interface Ticket {
  id: string;
  owner_id: string;
  contact_email: string;
  subject: string;
  status: TicketStatus;
  created_at: string;
}

export interface TicketMessage {
  id: string;
  ticket_id: string;
  author_id: string | null;
  body: string;
  kind: MessageKind;
  author_name: string | null;
  created_at: string;
}

export interface StaffMember {
  email: string;
  display_name: string;
  title: string | null;
  role: "admin" | "staff";
}

export function formatWhen(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  const sameDay =
    d.getFullYear() === now.getFullYear() &&
    d.getMonth() === now.getMonth() &&
    d.getDate() === now.getDate();
  if (sameDay) {
    return d.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
  }
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

export function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export function messageAuthorLabel(
  message: TicketMessage,
  viewerId: string | undefined,
  visitorLabel: string,
): string {
  if (message.kind === "system") return "Shelfie";
  if (message.kind === "staff") return message.author_name || "Support";
  if (message.author_id && message.author_id === viewerId) return "You";
  return visitorLabel;
}
