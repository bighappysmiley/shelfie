import { Link } from "react-router-dom";
import { CommunityAvatar } from "@/components/community/CommunityAvatar";
import type { CommunityProfile } from "@/lib/community-types";
import { communityProfileLabel } from "@/lib/community-profile";
import { IconSettings } from "@/components/Icons";

export function CommunityUserPanel({
  profile,
  fallbackName,
}: {
  profile?: CommunityProfile | null;
  fallbackName: string;
}) {
  const label = communityProfileLabel(profile) || fallbackName;

  return (
    <div className="flex h-[3.25rem] shrink-0 items-center gap-1 bg-[var(--community-user-bar)] px-2">
      <Link
        to="/account"
        className="flex min-w-0 flex-1 items-center gap-2 rounded px-1 py-1 hover:bg-[var(--community-hover)]"
      >
        <CommunityAvatar profile={profile} fallbackName={fallbackName} size="sm" />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-foreground">{label}</p>
          <p className="truncate text-xs text-muted">
            {profile?.statusEmoji && <span className="mr-0.5">{profile.statusEmoji}</span>}
            {profile?.statusText?.trim() || "Online"}
          </p>
        </div>
      </Link>
      <div className="flex shrink-0 items-center gap-0.5">
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
