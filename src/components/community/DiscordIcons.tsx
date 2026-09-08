import type { CommunityGroupKind } from "@/lib/community-types";
import { ChannelIcon } from "@/components/community/ChannelIcon";

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

/** Sidebar / header channel icon — prefers stored room icon, falls back to kind. */
export function DiscordChannelIcon({
  kind,
  icon,
  className = "h-5 w-5",
}: {
  kind: CommunityGroupKind;
  icon?: string | null;
  className?: string;
}) {
  return <ChannelIcon icon={icon} kind={kind} className={className} />;
}
