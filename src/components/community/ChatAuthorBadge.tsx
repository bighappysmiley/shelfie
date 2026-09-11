import { AuthedImage } from "@/components/AuthedImage";

/**
 * Labels beside chat usernames only:
 * - Bots (Pine / Suggestions / Support) → BOT pill
 * - App owners → OWNER pill
 * - Server role icon when the member's assigned role has `icon_url`
 *
 * Global profile badges are profile-only — never render next to names here.
 */
export function ChatAuthorBadge({
  isBot = false,
  isAppOwner = false,
  roleIconUrl,
}: {
  isBot?: boolean;
  isAppOwner?: boolean;
  /** From the member's server role only — not Nitro, not profile. */
  roleIconUrl?: string | null;
  /** @deprecated Ignored — profile badges belong on profiles, not chat names. */
  badges?: unknown;
}) {
  return (
    <span className="inline-flex shrink-0 items-center gap-1">
      {isBot && (
        <span
          className="inline-flex items-center rounded-[3px] bg-[#5865F2] px-1 py-px text-[0.625rem] font-bold uppercase leading-none tracking-wide text-white"
          title="Bot"
        >
          Bot
        </span>
      )}
      {isAppOwner && !isBot && (
        <span
          className="inline-flex items-center rounded-[3px] bg-accent px-1 py-px text-[0.625rem] font-bold uppercase leading-none tracking-wide text-accent-contrast"
          title="App owner"
        >
          Owner
        </span>
      )}
      {!isBot && roleIconUrl ? (
        <span title="Server role" className="inline-flex">
          <AuthedImage
            src={roleIconUrl}
            alt=""
            className="h-4 w-4 shrink-0 rounded-full object-cover"
          />
        </span>
      ) : null}
    </span>
  );
}
