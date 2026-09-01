import { IconHeadphones } from "@/components/Icons";

export function VoiceConnectedBar({
  channelName,
  onDisconnect,
  onReturn,
}: {
  channelName: string;
  onDisconnect: () => void;
  onReturn?: () => void;
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
        </span>
      </div>
      <button
        type="button"
        onClick={onDisconnect}
        className="shrink-0 rounded px-2 py-1 text-xs font-medium text-destructive hover:bg-destructive/10"
      >
        Disconnect
      </button>
    </div>
  );
}
