import { useState } from "react";
import type { CommunityMessage, CommunityServerEmoji, CommunityServerSticker } from "@/lib/community-types";
import type { MentionMember } from "@/lib/community-mentions";
import { plainTextFromMarkdown } from "@/lib/community-markdown";
import { CommunityModal } from "@/components/CommunityModal";
import { CommunityMessageContent } from "@/components/community/CommunityMessageContent";
import { MessageTimestamp } from "@/components/community/MessageTimestamp";
import { Button } from "@/components/Button";

export function PinnedMessagesBar({
  pins,
  canManage,
  onJump,
  onUnpin,
  mentionMembers = [],
  channels = [],
  serverEmoji = [],
  serverStickers = [],
}: {
  pins: CommunityMessage[];
  canManage: boolean;
  onJump: (messageId: string) => void;
  onUnpin: (messageId: string) => Promise<void>;
  mentionMembers?: MentionMember[];
  channels?: { name: string }[];
  serverEmoji?: CommunityServerEmoji[];
  serverStickers?: CommunityServerSticker[];
}) {
  const [open, setOpen] = useState(false);
  if (pins.length === 0) return null;

  const preview = pins[0]!;

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="w-full shrink-0 border-b border-[var(--community-border)] bg-fill/40 px-4 py-2 text-left hover:bg-fill/60"
      >
        <p className="text-[0.6875rem] font-semibold uppercase tracking-wide text-accent">
          {pins.length} pinned message{pins.length === 1 ? "" : "s"}
        </p>
        <p className="truncate text-[0.8125rem] text-muted">
          {preview.authorName ? `${preview.authorName}: ` : ""}
          {plainTextFromMarkdown(preview.body)}
        </p>
      </button>

      <CommunityModal open={open} onClose={() => setOpen(false)} title="Pinned messages" tone="community">
        <ul className="max-h-[60vh] space-y-2 overflow-y-auto">
          {pins.map((pin) => (
            <li
              key={pin.id}
              className="rounded-lg border border-[var(--community-border)] bg-fill/40 p-3"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-[0.8125rem] font-semibold">
                    {pin.authorName || "Member"}
                    <span className="ml-2 font-normal">
                      <MessageTimestamp iso={pin.createdAt} />
                    </span>
                  </p>
                  <div className="mt-1">
                    <CommunityMessageContent
                      body={pin.body}
                      mentionMembers={mentionMembers}
                      channels={channels}
                      serverEmoji={serverEmoji}
                      serverStickers={serverStickers}
                    />
                  </div>
                </div>
              </div>
              <div className="mt-2 flex gap-2">
                <Button size="sm" variant="secondary" onClick={() => { onJump(pin.id); setOpen(false); }}>
                  Jump
                </Button>
                {canManage && (
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => void onUnpin(pin.id).then(() => setOpen(false))}
                  >
                    Unpin
                  </Button>
                )}
              </div>
            </li>
          ))}
        </ul>
      </CommunityModal>
    </>
  );
}
