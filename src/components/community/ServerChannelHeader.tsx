import { useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ChevronDown, CommunityPopover, PopoverItem } from "@/components/community/discord-ui";
import { IconPlus, IconSettings, IconUserPlus } from "@/components/Icons";

export function ServerChannelHeader({
  serverName,
  serverId,
  canConfigure,
  onCreateChannel,
  onInvite,
}: {
  serverName: string;
  serverId: string;
  canConfigure: boolean;
  onCreateChannel?: () => void;
  onInvite?: () => void;
}) {
  const [open, setOpen] = useState(false);
  const btnRef = useRef<HTMLButtonElement>(null);
  const navigate = useNavigate();

  return (
    <div className="shrink-0 shadow-[0_1px_0_0_var(--community-border)]">
      <button
        ref={btnRef}
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex h-12 w-full items-center justify-between gap-2 px-4 hover:bg-[var(--community-channel-hover)]"
      >
        <span className="truncate text-base font-semibold text-foreground">{serverName}</span>
        <ChevronDown className={`h-4 w-4 shrink-0 text-muted transition ${open ? "rotate-180" : ""}`} />
      </button>
      <CommunityPopover open={open} onClose={() => setOpen(false)} anchorRef={btnRef}>
        {onInvite && (
          <PopoverItem
            onClick={() => {
              onInvite();
              setOpen(false);
            }}
          >
            <IconUserPlus size={16} className="inline mr-2" />
            Invite People
          </PopoverItem>
        )}
        {canConfigure && onCreateChannel && (
          <PopoverItem
            onClick={() => {
              onCreateChannel();
              setOpen(false);
            }}
          >
            <IconPlus size={16} className="inline mr-2" />
            Create Channel
          </PopoverItem>
        )}
        {canConfigure && (
          <PopoverItem
            onClick={() => {
              navigate(`/community/s/${serverId}/settings`);
              setOpen(false);
            }}
          >
            <IconSettings size={16} className="inline mr-2" />
            Server Settings
          </PopoverItem>
        )}
      </CommunityPopover>
      {onInvite && (
        <button
          type="button"
          onClick={onInvite}
          className="mx-2 mb-2 flex w-[calc(100%-1rem)] items-center gap-2 rounded px-2 py-1.5 text-sm text-muted hover:bg-[var(--community-channel-hover)] hover:text-foreground"
        >
          <IconUserPlus size={18} />
          Invite People
        </button>
      )}
    </div>
  );
}
