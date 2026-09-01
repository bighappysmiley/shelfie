import { useMemo, useState } from "react";
import { AuthedImage } from "@/components/AuthedImage";
import { CommunityPopover } from "@/components/community/discord-ui";
import { IconSearch } from "@/components/Icons";
import type { CommunityServerEmoji } from "@/lib/community-types";

const UNICODE_EMOJI = [
  "😀", "😂", "😍", "🥰", "😊", "😭", "😮", "😡", "🤔", "👍", "👎", "👏", "🙌", "🔥", "💯",
  "❤️", "💔", "✨", "🎉", "👀", "🤝", "🙏", "💀", "🫡", "😎", "🤣", "😬", "🥺", "😴", "🤯",
  "📚", "✅", "❌", "⭐", "💡", "🎁", "🍕", "☕", "🌲", "🌙", "☀️", "🌈", "🐱", "🐶", "🦊",
];

const RECENT_KEY = "community-recent-emoji";

function loadRecent(): string[] {
  try {
    const raw = localStorage.getItem(RECENT_KEY);
    return raw ? (JSON.parse(raw) as string[]) : [];
  } catch {
    return [];
  }
}

function saveRecent(emoji: string) {
  const list = [emoji, ...loadRecent().filter((e) => e !== emoji)].slice(0, 24);
  localStorage.setItem(RECENT_KEY, JSON.stringify(list));
}

export function EmojiPicker({
  open,
  onClose,
  anchorRef,
  onPick,
  serverEmoji = [],
  align = "right",
}: {
  open: boolean;
  onClose: () => void;
  anchorRef: React.RefObject<HTMLElement | null>;
  onPick: (emoji: string) => void;
  serverEmoji?: CommunityServerEmoji[];
  align?: "left" | "right";
}) {
  const [query, setQuery] = useState("");
  const recent = useMemo(() => loadRecent(), [open]);

  const filteredUnicode = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return UNICODE_EMOJI;
    return UNICODE_EMOJI.filter((e) => e.includes(q));
  }, [query]);

  const filteredCustom = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return serverEmoji;
    return serverEmoji.filter((e) => e.name.toLowerCase().includes(q));
  }, [query, serverEmoji]);

  const pick = (emoji: string) => {
    saveRecent(emoji);
    onPick(emoji);
    onClose();
  };

  return (
    <CommunityPopover open={open} onClose={onClose} anchorRef={anchorRef} align={align}>
      <div className="w-72 p-2">
        <label className="relative mb-2 block">
          <IconSearch size={14} className="pointer-events-none absolute left-2 top-1/2 -translate-y-1/2 text-muted" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search emoji"
            className="w-full rounded bg-[var(--community-input)] py-1.5 pl-7 pr-2 text-sm outline-none"
            autoFocus
          />
        </label>

        {recent.length > 0 && !query && (
          <div className="mb-2">
            <p className="mb-1 px-1 text-[0.6875rem] font-semibold uppercase tracking-wide text-muted">
              Frequently used
            </p>
            <div className="flex flex-wrap gap-0.5">
              {recent.map((e) => (
                <button
                  key={e}
                  type="button"
                  onClick={() => pick(e)}
                  className="flex h-8 w-8 items-center justify-center rounded hover:bg-[var(--community-hover)]"
                >
                  {e.startsWith(":") ? (
                    <AuthedImage
                      src={serverEmoji.find((s) => `:${s.name}:` === e)?.imageUrl ?? ""}
                      alt=""
                      className="h-5 w-5 object-contain"
                    />
                  ) : (
                    <span className="text-lg">{e}</span>
                  )}
                </button>
              ))}
            </div>
          </div>
        )}

        {filteredCustom.length > 0 && (
          <div className="mb-2">
            <p className="mb-1 px-1 text-[0.6875rem] font-semibold uppercase tracking-wide text-muted">
              Server emoji
            </p>
            <div className="flex max-h-24 flex-wrap gap-0.5 overflow-y-auto">
              {filteredCustom.map((e) => (
                <button
                  key={e.id}
                  type="button"
                  title={`:${e.name}:`}
                  onClick={() => pick(`:${e.name}:`)}
                  className="flex h-8 w-8 items-center justify-center rounded hover:bg-[var(--community-hover)]"
                >
                  <AuthedImage src={e.imageUrl} alt="" className="h-5 w-5 object-contain" />
                </button>
              ))}
            </div>
          </div>
        )}

        <p className="mb-1 px-1 text-[0.6875rem] font-semibold uppercase tracking-wide text-muted">Emoji</p>
        <div className="flex max-h-40 flex-wrap gap-0.5 overflow-y-auto">
          {filteredUnicode.map((e) => (
            <button
              key={e}
              type="button"
              onClick={() => pick(e)}
              className="flex h-8 w-8 items-center justify-center rounded text-lg hover:bg-[var(--community-hover)]"
            >
              {e}
            </button>
          ))}
        </div>
      </div>
    </CommunityPopover>
  );
}
