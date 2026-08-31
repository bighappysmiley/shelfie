import type { TicketMessage } from "@/lib/support-types";
import { formatDateTime, messageAuthorLabel } from "@/lib/support-types";

type Side = "mine" | "theirs" | "system";

function sideFor(message: TicketMessage, viewerIsStaff: boolean): Side {
  if (message.kind === "system") return "system";
  if (viewerIsStaff) {
    return message.kind === "staff" ? "mine" : "theirs";
  }
  return message.kind === "user" ? "mine" : "theirs";
}

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
  const side = sideFor(message, viewerIsStaff);
  const name = messageAuthorLabel(message, viewerId, visitorLabel);
  const time = formatDateTime(message.created_at);

  if (side === "system") {
    return (
      <li className="flex justify-center px-2">
        <p className="max-w-[90%] text-center text-xs leading-relaxed text-muted">
          {message.body}
        </p>
      </li>
    );
  }

  const mine = side === "mine";

  return (
    <li className={`flex ${mine ? "justify-end" : "justify-start"}`}>
      <div className={`flex max-w-[85%] flex-col ${mine ? "items-end" : "items-start"}`}>
        <p className={`px-1 text-[0.7rem] text-muted ${mine ? "text-right" : "text-left"}`}>
          {name} · {time}
        </p>
        <p
          className={`mt-0.5 whitespace-pre-wrap px-3.5 py-2 text-sm leading-relaxed ${
            mine
              ? "rounded-[1.15rem] rounded-br-md bg-chat-mine text-white"
              : "rounded-[1.15rem] rounded-bl-md bg-chat-theirs text-foreground"
          }`}
        >
          {message.body}
        </p>
      </div>
    </li>
  );
}
