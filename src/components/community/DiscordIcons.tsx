import type { CommunityGroupKind } from "@/lib/community-types";
import { ChannelKindGlyph } from "@/components/community/ChannelKind";

/** Large # icon for channel welcome (Discord-style). */
export function DiscordHashIcon({ className = "h-12 w-12" }: { className?: string }) {
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

/** Sidebar channel icon — # for text channels, glyph for voice/forum. */
export function DiscordChannelIcon({
  kind,
  className = "h-5 w-5",
}: {
  kind: CommunityGroupKind;
  className?: string;
}) {
  if (kind === "text" || kind === "announcement") {
    return (
      <span className={`inline-flex w-5 shrink-0 items-center justify-center text-[1.25rem] leading-none text-muted ${className}`}>
        #
      </span>
    );
  }
  return <ChannelKindGlyph kind={kind} className={`${className} shrink-0 text-muted`} />;
}
