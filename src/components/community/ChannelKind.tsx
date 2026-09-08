import type { CommunityGroupKind } from "@/lib/community-types";
import { KIND_LABELS } from "@/lib/community-types";

export const CHANNEL_KIND_ORDER: CommunityGroupKind[] = [
  "text",
  "announcement",
  "forum",
  "voice",
];

export const CHANNEL_KIND_DESCRIPTIONS: Record<CommunityGroupKind, string> = {
  text: "Send messages, images, emoji, and formatted text",
  announcement: "Important updates — only people with permission can post",
  forum: "Create posts and threads for organized discussions",
  voice: "Voice chat with live audio",
};

export function canPostInChannelKind(
  kind: CommunityGroupKind,
  opts: { isMember: boolean; canConfigure: boolean; canModerate: boolean; canManage: boolean; isAppOwner: boolean },
): boolean {
  if (!opts.isMember && !opts.isAppOwner && !opts.canConfigure) return false;
  if (kind === "voice") return false;
  if (kind === "announcement") {
    return opts.isAppOwner || opts.canConfigure || opts.canModerate || opts.canManage;
  }
  return true;
}

export function ChannelKindGlyph({
  kind,
  className = "h-4 w-4",
}: {
  kind: CommunityGroupKind;
  className?: string;
}) {
  switch (kind) {
    case "forum":
      return (
        <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden>
          <path
            d="M4 6.5A2.5 2.5 0 0 1 6.5 4H18a2 2 0 0 1 2 2v7.5a2.5 2.5 0 0 1-2.5 2.5H9l-3.5 3v-3H6.5A2.5 2.5 0 0 1 4 16V6.5Z"
            stroke="currentColor"
            strokeWidth="1.75"
          />
          <path d="M8 9h8M8 12h5" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
        </svg>
      );
    case "announcement":
      return (
        <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden>
          <path
            d="M5 10.5 10 7v10L5 13.5M12 8h5a2 2 0 0 1 2 2v4a2 2 0 0 1-2 2h-5"
            stroke="currentColor"
            strokeWidth="1.75"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path d="M17 10v4" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
        </svg>
      );
    case "voice":
      return (
        <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden>
          <path
            d="M12 14a3 3 0 0 0 3-3V6a3 3 0 1 0-6 0v5a3 3 0 0 0 3 3Z"
            stroke="currentColor"
            strokeWidth="1.75"
          />
          <path
            d="M6 11a6 6 0 0 0 12 0M12 17v3"
            stroke="currentColor"
            strokeWidth="1.75"
            strokeLinecap="round"
          />
        </svg>
      );
    case "text":
    default:
      return (
        <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden>
          <path
            d="M10 4 8 20M16 4l-2 16M5 9h14M4 15h14"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
          />
        </svg>
      );
  }
}

export function ChannelTypeSelect({
  value,
  onChange,
  id = "channel-type",
}: {
  value: CommunityGroupKind;
  onChange: (kind: CommunityGroupKind) => void;
  id?: string;
}) {
  return (
    <fieldset className="block">
      <legend className="mb-2 text-[0.8125rem] font-medium text-muted">Channel type</legend>
      <div id={id} className="grid gap-2" role="radiogroup" aria-label="Channel type">
        {CHANNEL_KIND_ORDER.map((kind) => {
          const selected = value === kind;
          return (
            <button
              key={kind}
              type="button"
              role="radio"
              aria-checked={selected}
              onClick={() => onChange(kind)}
              className={`flex w-full items-start gap-3 rounded-xl px-3 py-3 text-left transition ${
                selected
                  ? "bg-accent/15 ring-2 ring-accent"
                  : "bg-[var(--community-input)] ring-1 ring-[var(--community-border)] hover:bg-[var(--community-hover)]"
              }`}
            >
              <span
                className={`mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${
                  selected ? "bg-accent text-accent-contrast" : "bg-[var(--community-panel)] text-muted"
                }`}
              >
                <ChannelKindGlyph kind={kind} className="h-5 w-5" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-[0.9375rem] font-semibold text-foreground">
                  {KIND_LABELS[kind]}
                </span>
                <span className="mt-0.5 block text-[0.75rem] leading-snug text-muted">
                  {CHANNEL_KIND_DESCRIPTIONS[kind]}
                </span>
              </span>
            </button>
          );
        })}
      </div>
    </fieldset>
  );
}

export function channelKindBanner(kind: CommunityGroupKind): string | null {
  if (kind === "announcement") {
    return "Announcement channel — only moderators and admins can post updates here.";
  }
  return null;
}
