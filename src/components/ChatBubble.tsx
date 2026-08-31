import type { TicketMessage } from "@/lib/support-types";
import { formatDateTime, messageAuthorLabel } from "@/lib/support-types";

export function ChatBubble({
  message,
  viewerId,
  viewerIsStaff,
  visitorLabel,
}: {
  message: TicketMessage;
  viewerId?: string;
  viewerIsStaff: boolean;
  visitorLabel: string;
}) {
  const name = messageAuthorLabel(message, viewerId, visitorLabel);
  const time = formatDateTime(message.created_at);

  if (message.kind === "system") {
    return (
      <li className="text-center text-xs text-muted">
        {message.body}
      </li>
    );
  }

  const isStaffMessage = message.kind === "staff";
  const isMine =
    (viewerIsStaff && isStaffMessage && message.author_id === viewerId) ||
    (!viewerIsStaff && message.kind === "user" && message.author_id === viewerId);

  return (
    <li className="border-b border-black/8 pb-4 last:border-0 dark:border-white/10">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <p className="text-sm font-medium">{isMine ? "You" : name}</p>
        <p className="text-xs text-muted">{time}</p>
      </div>
      <p className="mt-1.5 whitespace-pre-wrap text-[0.95rem] leading-relaxed">{message.body}</p>
    </li>
  );
}
