import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent, type ReactNode } from "react";
import { AuthedImage } from "@/components/AuthedImage";
import { CommunityActionSheet } from "@/components/CommunityActionSheet";
import { AppsLauncher, type AppLauncherItem } from "@/components/community/AppsLauncher";
import { CommunityPopover, PopoverItem } from "@/components/community/discord-ui";
import { AttachmentPreviewBar, type StagedAttachment } from "@/components/community/AttachmentPreviewBar";
import { EmojiPicker } from "@/components/community/EmojiPicker";
import { TimestampBuilderModal } from "@/components/community/TimestampBuilderModal";
import { IconApps, IconPlus, IconSend, IconSmile, IconSticker, IconX } from "@/components/Icons";
import type { CommunityServerEmoji, CommunityServerSticker, CommunityServerWebhook } from "@/lib/community-types";

const DEFAULT_EMOJIS = ["😀", "😂", "❤️", "👍", "🔥", "🎉", "👀", "📚", "✨", "🙌", "😮", "💯"];

const SLASH_TIMESTAMP_RE = /(^|\s)\/timestamp$/;

function ComposerIconButton({
  label,
  onClick,
  children,
  active = false,
  buttonRef,
}: {
  label: string;
  onClick?: () => void;
  children: ReactNode;
  active?: boolean;
  buttonRef?: React.RefObject<HTMLButtonElement | null>;
}) {
  return (
    <button
      ref={buttonRef}
      type="button"
      onClick={onClick}
      aria-label={label}
      title={label}
      className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-muted transition hover:bg-[var(--community-hover)] hover:text-foreground ${
        active ? "bg-[var(--community-hover)] text-foreground" : ""
      }`}
    >
      {children}
    </button>
  );
}

export function ChannelMessageComposer({
  channelName,
  draft,
  onDraftChange,
  onSend,
  onTypingChange,
  sending,
  disabled = false,
  placeholder,
  serverEmoji = [],
  serverStickers = [],
  serverWebhooks = [],
  onUploadImage,
  replyPreview,
  onClearReply,
  hint,
  slowModeRemaining = 0,
}: {
  channelName: string;
  draft: string;
  onDraftChange: (value: string, cursor?: number) => void;
  onSend: (e: FormEvent) => void | Promise<void>;
  onTypingChange?: (typing: boolean) => void;
  sending?: boolean;
  disabled?: boolean;
  placeholder?: string;
  serverEmoji?: CommunityServerEmoji[];
  serverStickers?: CommunityServerSticker[];
  serverWebhooks?: CommunityServerWebhook[];
  onUploadImage?: (file: File) => Promise<void>;
  replyPreview?: { authorName: string; body: string } | null;
  onClearReply?: () => void;
  hint?: string;
  slowModeRemaining?: number;
}) {
  const [plusOpen, setPlusOpen] = useState(false);
  const [appsOpen, setAppsOpen] = useState(false);
  const [emojiOpen, setEmojiOpen] = useState(false);
  const [stickerOpen, setStickerOpen] = useState(false);
  const [timestampOpen, setTimestampOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [isDesktop, setIsDesktop] = useState(() =>
    typeof window !== "undefined" ? window.matchMedia("(min-width: 768px)").matches : true,
  );
  const fileRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const plusRef = useRef<HTMLButtonElement>(null);
  const appsRef = useRef<HTMLButtonElement>(null);
  const emojiBtnRef = useRef<HTMLButtonElement>(null);
  const [staged, setStaged] = useState<StagedAttachment[]>([]);
  const [dragOver, setDragOver] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia("(min-width: 768px)");
    const onChange = () => setIsDesktop(mq.matches);
    onChange();
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 200)}px`;
  }, [draft]);

  const insertAtCursor = (text: string) => {
    const el = textareaRef.current;
    const start = el?.selectionStart ?? draft.length;
    const end = el?.selectionEnd ?? draft.length;
    const next = draft.slice(0, start) + text + draft.slice(end);
    onDraftChange(next);
    requestAnimationFrame(() => {
      el?.focus();
      const pos = start + text.length;
      el?.setSelectionRange(pos, pos);
    });
  };

  const openTimestampBuilder = useCallback(() => setTimestampOpen(true), []);

  const handleDraftChange = (value: string, cursor?: number) => {
    const pos = cursor ?? value.length;
    const before = value.slice(0, pos);
    if (SLASH_TIMESTAMP_RE.test(before)) {
      const stripped = before.replace(/\/timestamp$/, "");
      const next = stripped + value.slice(pos);
      onDraftChange(next, stripped.length);
      openTimestampBuilder();
      return;
    }
    onDraftChange(value, cursor);
    onTypingChange?.(value.length > 0);
  };

  const handleUpload = async (file: File) => {
    if (!onUploadImage) return;
    const id = crypto.randomUUID();
    const previewUrl = URL.createObjectURL(file);
    setStaged((prev) => [...prev, { id, file, previewUrl, uploading: true }]);
    setUploading(true);
    try {
      await onUploadImage(file);
      setStaged((prev) => prev.filter((a) => a.id !== id));
    } finally {
      URL.revokeObjectURL(previewUrl);
      setUploading(false);
    }
  };

  const canSend = draft.trim().length > 0 && !sending && !disabled && slowModeRemaining <= 0;

  const appItems = useMemo<AppLauncherItem[]>(() => {
    const items: AppLauncherItem[] = [
      {
        id: "timestamp",
        name: "Timestamp",
        description: "Insert a formatted date or time",
        icon: "timestamp",
        onClick: openTimestampBuilder,
      },
    ];
    for (const hook of serverWebhooks.slice(0, 5)) {
      items.push({
        id: hook.id,
        name: hook.name,
        icon: "webhook",
        onClick: () => insertAtCursor(`@${hook.name} `),
      });
    }
    return items;
  }, [serverWebhooks]);

  const plusActions = [
    ...(onUploadImage
      ? [
          {
            label: uploading ? "Uploading…" : "Upload image",
            onClick: () => fileRef.current?.click(),
          },
        ]
      : []),
    {
      label: "Mention someone",
      onClick: () => insertAtCursor("@"),
    },
    {
      label: "Insert timestamp",
      onClick: openTimestampBuilder,
    },
    {
      label: "Add emoji",
      onClick: () => setEmojiOpen(true),
    },
  ];

  return (
    <form
      onSubmit={onSend}
      className={`shrink-0 px-4 pb-4 pt-2 ${dragOver ? "ring-2 ring-accent/30 rounded-lg" : ""}`}
      onDragOver={(e) => {
        e.preventDefault();
        setDragOver(true);
      }}
      onDragLeave={() => setDragOver(false)}
      onDrop={(e) => {
        e.preventDefault();
        setDragOver(false);
        const file = e.dataTransfer.files?.[0];
        if (file?.type.startsWith("image/")) void handleUpload(file);
      }}
    >
      {replyPreview && (
        <div className="mb-2 flex items-center gap-2 rounded border-l-4 border-accent bg-[var(--community-input)] px-3 py-2">
          <div className="min-w-0 flex-1">
            <p className="text-xs font-medium text-muted">Replying to {replyPreview.authorName}</p>
            <p className="truncate text-[0.75rem] text-muted">{replyPreview.body}</p>
          </div>
          <button
            type="button"
            onClick={onClearReply}
            className="shrink-0 rounded p-1 text-muted hover:text-foreground"
            aria-label="Cancel reply"
          >
            <IconX size={14} />
          </button>
        </div>
      )}

      {hint && <p className="mb-2 text-[0.75rem] text-muted">{hint}</p>}

      <AttachmentPreviewBar
        attachments={staged}
        onRemove={(id) => {
          setStaged((prev) => {
            const item = prev.find((a) => a.id === id);
            if (item) URL.revokeObjectURL(item.previewUrl);
            return prev.filter((a) => a.id !== id);
          });
        }}
      />

      {slowModeRemaining > 0 && (
        <p className="mb-2 text-xs text-muted">
          Slow mode is enabled. You can send again in {slowModeRemaining}s.
        </p>
      )}

      <div className="flex min-h-[2.75rem] items-end gap-2 rounded-lg bg-[var(--community-input)] px-3 py-2">
        <ComposerIconButton
          label="More actions"
          buttonRef={plusRef}
          onClick={() => setPlusOpen(true)}
          active={plusOpen}
        >
          <IconPlus size={20} />
        </ComposerIconButton>

        <textarea
          ref={textareaRef}
          value={draft}
          disabled={disabled || uploading}
          rows={1}
          placeholder={placeholder ?? `Message #${channelName}`}
          onChange={(e) => {
            const value = e.target.value;
            const cursor = e.target.selectionStart ?? value.length;
            handleDraftChange(value, cursor);
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              if (draft.trim() === "/timestamp") {
                openTimestampBuilder();
                onDraftChange("");
                return;
              }
              if (canSend) void onSend(e);
            }
          }}
          className="max-h-[12.5rem] min-h-[1.375rem] flex-1 resize-none bg-transparent py-2 text-[0.9375rem] leading-snug text-foreground outline-none placeholder:text-muted/70"
        />

        <div className="flex shrink-0 items-center gap-0.5 self-end pb-0.5">
          <ComposerIconButton
            label="Apps"
            buttonRef={appsRef}
            onClick={() => setAppsOpen((v) => !v)}
            active={appsOpen}
          >
            <IconApps size={20} />
          </ComposerIconButton>

          {serverStickers.length > 0 && (
            <ComposerIconButton
              label="Stickers"
              onClick={() => setStickerOpen((v) => !v)}
              active={stickerOpen}
            >
              <IconSticker size={20} />
            </ComposerIconButton>
          )}

          <ComposerIconButton
            label="Emoji"
            buttonRef={emojiBtnRef}
            onClick={() => setEmojiOpen((v) => !v)}
            active={emojiOpen}
          >
            <IconSmile size={20} />
          </ComposerIconButton>

          {canSend && (
            <button
              type="submit"
              disabled={!canSend}
              aria-label="Send message"
              className="flex h-8 w-8 items-center justify-center rounded-full bg-accent text-accent-contrast transition hover:bg-accent-hover disabled:opacity-40 md:hidden"
            >
              <IconSend size={16} />
            </button>
          )}
        </div>
      </div>

      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) void handleUpload(f);
          e.target.value = "";
        }}
      />

      <AppsLauncher
        open={appsOpen}
        onClose={() => setAppsOpen(false)}
        anchorRef={appsRef}
        items={appItems}
      />

      <TimestampBuilderModal
        open={timestampOpen}
        onClose={() => setTimestampOpen(false)}
        onInsert={(token) => insertAtCursor(`${token} `)}
      />

      {isDesktop ? (
        <EmojiPicker
          open={emojiOpen}
          onClose={() => setEmojiOpen(false)}
          anchorRef={emojiBtnRef}
          serverEmoji={serverEmoji}
          onPick={(emoji) => insertAtCursor(emoji.startsWith(":") ? `${emoji} ` : `${emoji} `)}
        />
      ) : (
        emojiOpen && (
          <div className="mt-2 rounded-lg border border-[var(--community-border)] bg-[var(--community-panel)] p-2 shadow-lg">
            <p className="mb-2 px-1 text-[0.6875rem] font-semibold uppercase tracking-wider text-muted">
              Emoji
            </p>
            <div className="flex flex-wrap gap-1">
              {[...DEFAULT_EMOJIS, ...serverEmoji.map((e) => `:${e.name}:`)].map((item) => {
                const custom = serverEmoji.find((e) => `:${e.name}:` === item);
                return (
                  <button
                    key={item}
                    type="button"
                    onClick={() => insertAtCursor(custom ? `:${custom.name}: ` : `${item} `)}
                    className="flex h-9 w-9 items-center justify-center rounded hover:bg-[var(--community-hover)]"
                  >
                    {custom ? (
                      <AuthedImage src={custom.imageUrl} alt="" className="h-6 w-6 object-contain" />
                    ) : (
                      <span className="text-xl">{item}</span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        )
      )}

      {stickerOpen && serverStickers.length > 0 && (
        <div className="mt-2 rounded-lg border border-[var(--community-border)] bg-[var(--community-panel)] p-2 shadow-lg">
          <p className="mb-2 px-1 text-[0.6875rem] font-semibold uppercase tracking-wider text-muted">
            Stickers
          </p>
          <div className="grid grid-cols-4 gap-2 sm:grid-cols-6">
            {serverStickers.map((sticker) => (
              <button
                key={sticker.id}
                type="button"
                onClick={() => insertAtCursor(`:${sticker.name}: `)}
                className="rounded-lg p-1 hover:bg-[var(--community-hover)]"
                title={sticker.name}
              >
                <AuthedImage src={sticker.imageUrl} alt="" className="mx-auto h-16 w-16 object-contain" />
              </button>
            ))}
          </div>
        </div>
      )}

      {isDesktop ? (
        <CommunityPopover open={plusOpen} onClose={() => setPlusOpen(false)} anchorRef={plusRef}>
          {plusActions.map((action) => (
            <PopoverItem
              key={action.label}
              onClick={() => {
                action.onClick();
                setPlusOpen(false);
              }}
            >
              {action.label}
            </PopoverItem>
          ))}
        </CommunityPopover>
      ) : (
        <CommunityActionSheet
          open={plusOpen}
          onClose={() => setPlusOpen(false)}
          title={`#${channelName}`}
          actions={plusActions}
        />
      )}
    </form>
  );
}
