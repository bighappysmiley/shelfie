import type { CommunityGroup } from "@/lib/community-types";
import { ChannelKindGlyph } from "@/components/community/ChannelKind";

export function ChannelWelcome({ group }: { group: CommunityGroup }) {
  return (
    <li className="mb-6 border-b border-[var(--community-border)] px-4 pb-6 pt-4">
      <div className="flex h-[4.25rem] w-[4.25rem] items-center justify-center rounded-full bg-[var(--community-channel-hover)] text-foreground">
        {group.kind === "text" ? (
          <span className="text-[2.5rem] leading-none text-foreground">#</span>
        ) : (
          <ChannelKindGlyph kind={group.kind} className="h-10 w-10" />
        )}
      </div>
      <h3 className="mt-4 text-[2rem] font-bold leading-tight text-foreground">
        Welcome to {group.kind === "text" ? "#" : ""}
        {group.name}!
      </h3>
      <p className="mt-2 max-w-[42rem] text-base text-muted">
        {group.topic || group.description || "This is the start of the channel."}
      </p>
    </li>
  );
}
