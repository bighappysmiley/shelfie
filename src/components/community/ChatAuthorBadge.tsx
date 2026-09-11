import { AuthedImage } from "@/components/AuthedImage";
import type { CommunityServerTag } from "@/lib/community-types";
import { TagIcon } from "@/components/community-settings/TagsPanel";

/**
 * Badges beside chat usernames (Discord-style):
 * - App owners → OWNER pill
 * - Profile tags (decorative badges)
 * - Otherwise → server role icon when the member's assigned role has `icon_url`
 */
export function ChatAuthorBadge({
  isAppOwner = false,
  roleIconUrl,
  tags = [],
}: {
  isAppOwner?: boolean;
  /** From the member's server role only — not Nitro, not profile. */
  roleIconUrl?: string | null;
  tags?: CommunityServerTag[];
}) {
  return (
    <span className="inline-flex shrink-0 items-center gap-1">
      {isAppOwner && (
        <span
          className="inline-flex items-center rounded-[3px] bg-accent px-1 py-px text-[0.625rem] font-bold uppercase leading-none tracking-wide text-accent-contrast"
          title="App owner"
        >
          Owner
        </span>
      )}
      {tags.slice(0, 3).map((tag) => (
        <span key={tag.id} title={tag.name} className="inline-flex">
          <TagIcon tag={tag} />
        </span>
      ))}
      {!isAppOwner && tags.length === 0 && roleIconUrl ? (
        <AuthedImage
          src={roleIconUrl}
          alt=""
          className="h-4 w-4 shrink-0 rounded-full object-cover"
        />
      ) : null}
    </span>
  );
}
