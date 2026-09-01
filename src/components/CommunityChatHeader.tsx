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
  canManageChannel = false,
  memberCount,
  onOpenChannels,
  onOpenMembers,
  onOpenChannelSettings,
}: {
  serverName: string;
  channelName?: string;
  canManageChannel?: boolean;
  memberCount: number;
  onOpenChannels: () => void;
  onOpenMembers: () => void;
  onOpenChannelSettings?: () => void;
}) {
  const inChannel = Boolean(channelName);

  return (
    <header className="flex h-12 shrink-0 items-center gap-1 border-b border-[var(--community-border)] px-2 md:hidden">
      <button
        type="button"
        onClick={onOpenChannels}
        className="flex min-w-0 flex-1 items-center gap-2 rounded-lg px-1.5 py-1 text-left hover:bg-white/[0.06]"
        aria-label="Open channels"
      >
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white/[0.06] text-white/70">
          <HashGlyph className="h-4 w-4" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="flex items-center gap-1 truncate text-[0.9375rem] font-semibold text-white">
            {inChannel ? (
              <>
                <span className="text-white/45">#</span>
                {channelName}
              </>
            ) : (
              serverName
            )}
          </span>
          <span className="truncate text-[0.6875rem] text-white/45">
            {inChannel ? serverName : "Tap to browse channels"}
          </span>
        </span>
      </button>
      {inChannel && canManageChannel && onOpenChannelSettings && (
        <button
          type="button"
          onClick={onOpenChannelSettings}
          className="rounded-lg p-2 text-white/45 hover:bg-white/10 hover:text-white"
          title="Channel settings"
          aria-label="Channel settings"
        >
          <IconSettings size={18} />
        </button>
      )}
      {memberCount > 0 && (
        <button
          type="button"
          onClick={onOpenMembers}
          className="rounded-lg p-2 text-white/45 hover:bg-white/10 hover:text-white"
          title="Members"
          aria-label="Members"
        >
          <IconPeople size={18} />
        </button>
      )}
    </header>
  );
}
