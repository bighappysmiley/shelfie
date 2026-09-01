import { CommunityAvatar } from "@/components/community/CommunityAvatar";
import type { CommunityProfile } from "@/lib/community-types";
import { communityAuthorLabel } from "@/lib/community-identity";

export function ReactionTooltip({
  emoji,
  userIds,
  memberProfiles,
  memberNames,
}: {
  emoji: string;
  userIds: string[];
  memberProfiles?: Map<string, CommunityProfile>;
  memberNames?: Map<string, string>;
}) {
  if (userIds.length === 0) return null;

  const labels = userIds.map((id) => {
    const profile = memberProfiles?.get(id);
    const fallback = memberNames?.get(id) ?? "Member";
    return communityAuthorLabel(
      profile ? { displayName: profile.displayName, communityUsername: profile.communityUsername } : null,
      fallback,
    );
  });

  let text: string;
  if (labels.length === 1) {
    text = `${labels[0]} reacted with ${emoji}`;
  } else if (labels.length === 2) {
    text = `${labels[0]} and ${labels[1]} reacted with ${emoji}`;
  } else if (labels.length <= 5) {
    text = `${labels.slice(0, -1).join(", ")}, and ${labels[labels.length - 1]} reacted with ${emoji}`;
  } else {
    text = `${labels.slice(0, 3).join(", ")} and ${labels.length - 3} others reacted with ${emoji}`;
  }

  return (
    <div className="pointer-events-none absolute bottom-full left-1/2 z-20 mb-1 hidden -translate-x-1/2 whitespace-nowrap rounded-md bg-[var(--community-panel)] px-2 py-1 text-xs text-foreground shadow-lg ring-1 ring-[var(--community-border)] group-hover/reaction:flex">
      <span className="flex items-center gap-1">
        {userIds.slice(0, 3).map((id) => (
          <CommunityAvatar
            key={id}
            profile={memberProfiles?.get(id)}
            fallbackName={memberNames?.get(id) ?? "?"}
            size="xs"
          />
        ))}
        {text}
      </span>
    </div>
  );
}
