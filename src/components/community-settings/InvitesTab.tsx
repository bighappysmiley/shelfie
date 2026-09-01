import type { CommunityJoinMode } from "@/lib/community-types";
import { Button } from "@/components/Button";
import { ToggleRow } from "@/components/layout";

export function InvitesTab({
  inviteCode,
  joinMode,
  isPublic,
  vanitySlug = "",
  onVanitySlugChange,
  regenBusy,
  busy,
  onJoinModeChange,
  onPublicChange,
  onRegenerate,
  onSave,
}: {
  inviteCode: string;
  joinMode: CommunityJoinMode;
  isPublic: boolean;
  vanitySlug?: string;
  onVanitySlugChange?: (slug: string) => void;
  regenBusy: boolean;
  busy: boolean;
  onJoinModeChange: (mode: CommunityJoinMode) => void;
  onPublicChange: (v: boolean) => void;
  onRegenerate: () => void;
  onSave: () => void;
}) {
  const inviteLink =
    typeof window !== "undefined" && inviteCode
      ? vanitySlug?.trim()
        ? `${window.location.origin}/community/join/${encodeURIComponent(vanitySlug.trim())}`
        : `${window.location.origin}/community?invite=${encodeURIComponent(inviteCode)}`
      : "";

  return (
    <div className="max-w-lg space-y-5">
      <div className="rounded-[var(--radius-group)] bg-fill px-4 py-3">
        <p className="text-[0.8125rem] font-medium">Invite link</p>
        <p className="mt-1 break-all font-mono text-[0.875rem]">{inviteLink || "—"}</p>
        <p className="mt-1 text-[0.75rem] text-muted">
          Share this link or the code below. People can join via Community → + → Join a Server.
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          <Button
            type="button"
            size="sm"
            variant="secondary"
            disabled={!inviteLink}
            onClick={() => void navigator.clipboard.writeText(inviteLink)}
          >
            Copy link
          </Button>
          <Button
            type="button"
            size="sm"
            variant="secondary"
            disabled={!inviteCode}
            onClick={() => void navigator.clipboard.writeText(inviteCode)}
          >
            Copy code
          </Button>
          <Button type="button" size="sm" variant="ghost" disabled={regenBusy} onClick={onRegenerate}>
            {regenBusy ? "…" : "Regenerate"}
          </Button>
        </div>
      </div>

      {onVanitySlugChange && (
        <div>
          <label className="mb-1 block text-[0.8125rem] font-medium">Vanity invite URL</label>
          <div className="flex items-center gap-1 rounded-[var(--radius-control)] bg-fill px-3 py-2 text-[0.875rem]">
            <span className="text-muted">/community/join/</span>
            <input
              value={vanitySlug}
              onChange={(e) => onVanitySlugChange(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""))}
              placeholder="my-server"
              className="min-w-0 flex-1 bg-transparent outline-none"
            />
          </div>
          <p className="mt-1 text-[0.75rem] text-muted">Boost Level 2+ perk. Save to apply.</p>
        </div>
      )}

      <ToggleRow
        label="Public server"
        hint="Show in Discover (ranked by popularity)"
        checked={isPublic}
        onChange={onPublicChange}
      />

      <div>
        <p className="mb-2 text-[0.8125rem] font-medium text-muted">Who can join</p>
        <div className="space-y-2">
          {(
            [
              ["open", "Open", "Anyone can join instantly from Discover"],
              ["request", "Join requests", "People request access; approve in Requests"],
              ["invite", "Invite only", "Only invite codes work"],
            ] as const
          ).map(([value, label, hint]) => (
            <button
              key={value}
              type="button"
              onClick={() => onJoinModeChange(value)}
              className={`flex w-full flex-col rounded-[var(--radius-group)] px-3 py-2.5 text-left ring-1 transition ${
                joinMode === value
                  ? "bg-accent/10 ring-accent"
                  : "bg-surface ring-black/[0.04] hover:bg-fill/50 dark:ring-white/[0.06]"
              }`}
            >
              <span className="font-medium">{label}</span>
              <span className="text-[0.75rem] text-muted">{hint}</span>
            </button>
          ))}
        </div>
      </div>

      <Button disabled={busy} onClick={onSave}>
        {busy ? "Saving…" : "Save invite settings"}
      </Button>
    </div>
  );
}
