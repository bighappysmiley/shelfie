import { Link } from "react-router-dom";
import { IconPeople, IconSettings } from "@/components/Icons";

function HashGlyph({ className = "h-3.5 w-3.5" }: { className?: string }) {
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

export function CommunityChatHeader({
  serverName,
  channelName,
  serverId,
  canConfigure,
  memberCount,
  onOpenChannels,
  onOpenMembers,
}: {
  serverName: string;
  channelName: string;
  serverId: string;
  canConfigure: boolean;
  memberCount: number;
  onOpenChannels: () => void;
  onOpenMembers: () => void;
}) {
  return (
    <header className="flex h-12 shrink-0 items-center gap-2 border-b border-[var(--community-border)] px-3 md:hidden">
      <button
        type="button"
        onClick={onOpenChannels}
        className="flex min-w-0 flex-1 flex-col items-start rounded-lg px-1 py-0.5 text-left hover:bg-white/[0.06]"
      >
        <span className="flex items-center gap-1 truncate text-[0.9375rem] font-semibold text-white">
          <HashGlyph className="text-white/45" />
          {channelName}
        </span>
        <span className="truncate text-[0.6875rem] text-white/45">{serverName}</span>
      </button>
      {canConfigure && (
        <Link
          to={`/community/s/${serverId}/settings`}
          className="rounded-lg p-2 text-white/45 hover:bg-white/10 hover:text-white"
          title="Server settings"
        >
          <IconSettings size={18} />
        </Link>
      )}
      {memberCount > 0 && (
        <button
          type="button"
          onClick={onOpenMembers}
          className="rounded-lg p-2 text-white/45 hover:bg-white/10 hover:text-white"
          title="Members"
        >
          <IconPeople size={18} />
        </button>
      )}
    </header>
  );
}
