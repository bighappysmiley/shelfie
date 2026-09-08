import type { CommunityGroupKind } from "@/lib/community-types";
import { ChannelKindGlyph } from "@/components/community/ChannelKind";

export const CHANNEL_ICON_SLUGS = [
  "hash",
  "megaphone",
  "forum",
  "voice",
  "book",
  "chat",
  "star",
  "pin",
  "rules",
  "spark",
  "shelf",
  "people",
  "image",
  "link",
  "bell",
  "game",
] as const;

export type ChannelIconSlug = (typeof CHANNEL_ICON_SLUGS)[number];

export function defaultIconForKind(kind: CommunityGroupKind): ChannelIconSlug {
  switch (kind) {
    case "forum":
      return "forum";
    case "voice":
      return "voice";
    case "announcement":
      return "megaphone";
    case "text":
    default:
      return "hash";
  }
}

export function isChannelIconSlug(value: string | null | undefined): value is ChannelIconSlug {
  return Boolean(value && (CHANNEL_ICON_SLUGS as readonly string[]).includes(value));
}

function Glyph({
  d,
  className,
  fill = false,
}: {
  d: string;
  className?: string;
  fill?: boolean;
}) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden>
      <path
        d={d}
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill={fill ? "currentColor" : "none"}
      />
    </svg>
  );
}

/** Render a channel icon slug (falls back to kind glyph). Color inherits from parent. */
export function ChannelIcon({
  icon,
  kind = "text",
  className = "h-5 w-5",
}: {
  icon?: string | null;
  kind?: CommunityGroupKind;
  className?: string;
}) {
  const slug = isChannelIconSlug(icon) ? icon : defaultIconForKind(kind);
  const cls = `${className} shrink-0`;

  switch (slug) {
    case "hash":
      return (
        <span
          className={`inline-flex items-center justify-center leading-none ${cls}`}
          style={{ fontSize: "1.15em" }}
        >
          #
        </span>
      );
    case "megaphone":
    case "forum":
    case "voice":
      return (
        <ChannelKindGlyph
          kind={slug === "megaphone" ? "announcement" : slug}
          className={cls}
        />
      );
    case "book":
      return (
        <Glyph
          className={cls}
          d="M5 5.5A2.5 2.5 0 0 1 7.5 3H19v16H7.5A2.5 2.5 0 0 0 5 21.5V5.5ZM9 7h6M9 11h6"
        />
      );
    case "chat":
      return (
        <Glyph
          className={cls}
          d="M5 6.5A2.5 2.5 0 0 1 7.5 4H17a2 2 0 0 1 2 2v7a2 2 0 0 1-2 2H10l-3.5 3v-3H7.5A2.5 2.5 0 0 1 5 14.5v-8Z"
        />
      );
    case "star":
      return (
        <Glyph
          className={cls}
          d="m12 4 2.1 4.3 4.7.7-3.4 3.3.8 4.7L12 15.8 7.8 17l.8-4.7-3.4-3.3 4.7-.7L12 4Z"
        />
      );
    case "pin":
      return (
        <Glyph
          className={cls}
          d="m15 4 5 5-3.5 1.5L12 15l-3 3-1-1 3-3-4.5-4.5L8 6l7-2Z"
        />
      );
    case "rules":
      return (
        <Glyph
          className={cls}
          d="M7 4h10a2 2 0 0 1 2 2v13l-3-1.5L13 19l-3-1.5L7 19V6a2 2 0 0 1 2-2Zm2 5h6M9 12h6M9 15h4"
        />
      );
    case "spark":
      return (
        <Glyph
          className={cls}
          d="M12 3v4M12 17v4M4.9 4.9l2.8 2.8M16.3 16.3l2.8 2.8M3 12h4M17 12h4M4.9 19.1l2.8-2.8M16.3 7.7l2.8-2.8"
        />
      );
    case "shelf":
      return (
        <Glyph
          className={cls}
          d="M4 6h16M4 12h16M4 18h16M7 6v12M12 6v12M17 6v12"
        />
      );
    case "people":
      return (
        <Glyph
          className={cls}
          d="M9 11a3 3 0 1 0 0-6 3 3 0 0 0 0 6Zm6.5-1a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5ZM3.5 19a5.5 5.5 0 0 1 11 0M14 14.5a4.5 4.5 0 0 1 6.5 4"
        />
      );
    case "image":
      return (
        <Glyph
          className={cls}
          d="M5 6a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6Zm3 3.5a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3ZM5.5 17l4-4 2.5 2.5L16 11l3 3"
        />
      );
    case "link":
      return (
        <Glyph
          className={cls}
          d="M9.5 14.5 14.5 9.5M8 12H6.5A3.5 3.5 0 0 1 6.5 5H10a3.5 3.5 0 0 1 3.3 2.3M16 12h1.5a3.5 3.5 0 1 1 0 7H14a3.5 3.5 0 0 1-3.3-2.3"
        />
      );
    case "bell":
      return (
        <Glyph
          className={cls}
          d="M6 16h12l-1.2-1.5A5.5 5.5 0 0 1 15.5 11V9a3.5 3.5 0 1 0-7 0v2c0 1.3-.4 2.5-1.3 3.5L6 16Zm4.2 2a2 2 0 0 0 3.6 0"
        />
      );
    case "game":
      return (
        <Glyph
          className={cls}
          d="M7 15.5A4.5 4.5 0 0 1 7 6.5h10a4.5 4.5 0 1 1 0 9H7Zm2-6.5v4M7 11h4M16 9.5h.01M17.5 12h.01"
        />
      );
    default:
      return <ChannelKindGlyph kind={kind} className={cls} />;
  }
}

export function ChannelIconPicker({
  value,
  kind,
  onChange,
}: {
  value: string;
  kind: CommunityGroupKind;
  onChange: (icon: ChannelIconSlug) => void;
}) {
  const selected = isChannelIconSlug(value) ? value : defaultIconForKind(kind);

  return (
    <fieldset>
      <legend className="mb-2 text-[0.8125rem] font-medium text-muted">Channel icon</legend>
      <div className="grid grid-cols-8 gap-1.5 sm:grid-cols-8">
        {CHANNEL_ICON_SLUGS.map((slug) => {
          const active = selected === slug;
          return (
            <button
              key={slug}
              type="button"
              title={slug}
              aria-label={`Icon ${slug}`}
              aria-pressed={active}
              onClick={() => onChange(slug)}
              className={`flex h-10 w-full items-center justify-center rounded-lg transition ${
                active
                  ? "bg-accent text-accent-contrast ring-2 ring-accent"
                  : "bg-[var(--community-input)] text-muted ring-1 ring-[var(--community-border)] hover:bg-[var(--community-hover)] hover:text-foreground"
              }`}
            >
              <ChannelIcon icon={slug} kind={kind} className="h-5 w-5" />
            </button>
          );
        })}
      </div>
      <p className="mt-1.5 text-[0.75rem] text-muted">
        Shown next to the channel name. Changing channel type updates the default icon unless you pick another.
      </p>
    </fieldset>
  );
}
