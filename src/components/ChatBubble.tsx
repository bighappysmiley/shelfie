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
      <li className="py-2 text-center text-[0.75rem] text-muted">
        {message.body}
      </li>
    );
  }

  const isStaffMessage = message.kind === "staff";
  const isMine =
    (viewerIsStaff && isStaffMessage && message.author_id === viewerId) ||
    (!viewerIsStaff && message.kind === "user" && message.author_id === viewerId);

  return (
    <li className={`flex flex-col ${isMine ? "items-end" : "items-start"}`}>
      <p className="mb-1 px-1 text-[0.75rem] text-muted">
        {isMine ? "You" : name} · {time}
      </p>
      <p
        className={`max-w-[85%] whitespace-pre-wrap rounded-[1.125rem] px-3.5 py-2 text-[1.0625rem] leading-snug ${
          isMine
            ? "rounded-br-[0.375rem] bg-chat-mine text-accent-contrast"
            : "rounded-bl-[0.375rem] bg-chat-theirs text-foreground"
        }`}
      >
        {message.body}
      </p>
    </li>
  );
}
