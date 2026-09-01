import type { CommunityGroup } from "@/lib/community-types";
import { DiscordHashIcon } from "@/components/community/DiscordIcons";

export function ChannelWelcome({ group }: { group: CommunityGroup }) {
  return (
    <li className="mb-6 border-b border-[var(--community-border)] pb-6">
      <DiscordHashIcon className="h-[4.5rem] w-[4.5rem] text-foreground" />
      <h3 className="mt-2 text-[2rem] font-bold leading-tight text-foreground">
        Welcome to #{group.name}!
      </h3>
      <p className="mt-2 max-w-[42rem] text-base text-muted">
        {group.topic || group.description || "This is the start of the channel."}
      </p>
    </li>
  );
}
