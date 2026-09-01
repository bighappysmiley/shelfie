import type { CommunityGroup } from "@/lib/community-types";
import { ChannelKindGlyph } from "@/components/community/ChannelKind";

export function ChannelWelcome({ group }: { group: CommunityGroup }) {
  return (
    <li className="mb-4 border-b border-[var(--community-border)] pb-6">
      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-[var(--community-hover)]">
        <ChannelKindGlyph kind={group.kind} className="h-8 w-8 text-muted" />
      </div>
      <h3 className="mt-3 text-[1.75rem] font-bold text-foreground">Welcome to #{group.name}!</h3>
      <p className="mt-1 text-[0.9375rem] text-muted">
        {group.topic || group.description || "This is the start of the channel."}
      </p>
    </li>
  );
}
