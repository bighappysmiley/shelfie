import { Link } from "react-router-dom";
import { CommunityAvatar } from "@/components/community/CommunityAvatar";
import { PresenceDot } from "@/components/community/discord-ui";
import type { CommunityProfile } from "@/lib/community-types";
import { communityProfileLabel } from "@/lib/community-profile";
import { IconHeadphones, IconMic, IconSettings } from "@/components/Icons";

export function CommunityUserPanel({
  profile,
  fallbackName,
  muted,
  deafened,
  onToggleMute,
  onToggleDeafen,
}: {
  profile?: CommunityProfile | null;
  fallbackName: string;
  muted: boolean;
  deafened: boolean;
  onToggleMute: () => void;
  onToggleDeafen: () => void;
}) {
  const label = communityProfileLabel(profile) || fallbackName;
  const statusLabel = deafened
    ? "Deafened"
    : muted
      ? "Muted"
      : profile?.statusText?.trim() || "Online";

  return (
    <div className="flex h-[3.25rem] shrink-0 items-center gap-1 bg-[var(--community-user-bar)] px-2">
      <Link
        to="/account"
        className="relative flex min-w-0 flex-1 items-center gap-2 rounded px-1 py-1 hover:bg-[var(--community-hover)]"
      >
        <span className="relative shrink-0">
          <CommunityAvatar profile={profile} fallbackName={fallbackName} size="sm" />
          <PresenceDot status={deafened ? "dnd" : muted ? "idle" : "online"} />
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-foreground">{label}</p>
          <p className="truncate text-xs text-muted">
            {profile?.statusEmoji && !muted && !deafened && (
              <span className="mr-0.5">{profile.statusEmoji}</span>
            )}
            {statusLabel}
          </p>
        </div>
      </Link>
      <div className="flex shrink-0 items-center">
        <button
          type="button"
          onClick={onToggleMute}
          disabled={deafened}
          className={`rounded p-1.5 hover:bg-[var(--community-hover)] disabled:opacity-40 ${
            muted || deafened ? "text-destructive" : "text-muted hover:text-foreground"
          }`}
          title={muted || deafened ? "Unmute" : "Mute"}
          aria-label={muted || deafened ? "Unmute" : "Mute"}
        >
          <IconMic size={18} />
        </button>
        <button
          type="button"
          onClick={onToggleDeafen}
          className={`rounded p-1.5 hover:bg-[var(--community-hover)] ${
            deafened ? "text-destructive" : "text-muted hover:text-foreground"
          }`}
          title={deafened ? "Undeafen" : "Deafen"}
          aria-label={deafened ? "Undeafen" : "Deafen"}
        >
          <IconHeadphones size={18} />
        </button>
        <Link
          to="/account"
          className="rounded p-1.5 text-muted hover:bg-[var(--community-hover)] hover:text-foreground"
          title="User settings"
          aria-label="User settings"
        >
          <IconSettings size={18} />
        </Link>
      </div>
    </div>
  );
}
