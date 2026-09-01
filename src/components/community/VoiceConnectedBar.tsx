import { IconHeadphones, IconMic } from "@/components/Icons";

export function VoiceConnectedBar({
  channelName,
  muted = false,
  deafened = false,
  onDisconnect,
  onReturn,
  onToggleMute,
  onToggleDeafen,
}: {
  channelName: string;
  muted?: boolean;
  deafened?: boolean;
  onDisconnect: () => void;
  onReturn?: () => void;
  onToggleMute?: () => void;
  onToggleDeafen?: () => void;
}) {
  return (
    <div className="flex shrink-0 items-center justify-between gap-2 border-t border-[var(--community-border)] bg-success/15 px-4 py-2">
      <div className="flex min-w-0 items-center gap-2 text-sm text-success">
        <IconHeadphones size={18} />
        <span className="truncate">
          Voice connected ·{" "}
          {onReturn ? (
            <button
              type="button"
              onClick={onReturn}
              className="font-semibold underline-offset-2 hover:underline"
            >
              #{channelName}
            </button>
          ) : (
            <span className="font-semibold">#{channelName}</span>
          )}
          {(muted || deafened) && (
            <span className="ml-1 text-xs text-muted">
              {deafened ? "· Deafened" : "· Muted"}
            </span>
          )}
        </span>
      </div>
      <div className="flex shrink-0 items-center gap-1">
        {onToggleMute && (
          <button
            type="button"
            onClick={onToggleMute}
            disabled={deafened}
            className={`rounded p-1 ${muted || deafened ? "text-destructive" : "text-success hover:bg-success/10"}`}
            title={muted ? "Unmute" : "Mute"}
            aria-label={muted ? "Unmute" : "Mute"}
          >
            <IconMic size={16} />
          </button>
        )}
        {onToggleDeafen && (
          <button
            type="button"
            onClick={onToggleDeafen}
            className={`rounded p-1 ${deafened ? "text-destructive" : "text-success hover:bg-success/10"}`}
            title={deafened ? "Undeafen" : "Deafen"}
            aria-label={deafened ? "Undeafen" : "Deafen"}
          >
            <IconHeadphones size={16} />
          </button>
        )}
        <button
          type="button"
          onClick={onDisconnect}
          className="shrink-0 rounded px-2 py-1 text-xs font-medium text-destructive hover:bg-destructive/10"
        >
          Disconnect
        </button>
      </div>
    </div>
  );
}
