import { useEffect, useState } from "react";
import { Button } from "@/components/Button";
import { CommunityAvatar } from "@/components/community/CommunityAvatar";
import {
  boostServer,
  isServerBooster,
  listServerBoosts,
  unboostServer,
  type CommunityServerBoost,
} from "@/lib/community";
import type { CommunityServer } from "@/lib/community-types";
import {
  BOOST_PERKS_BY_LEVEL,
  boostsToNextLevel,
  getBoostLevel,
  type BoostLevel,
} from "@/lib/pro";

export function BoostTab({
  server,
  userId,
  onChanged,
  onError,
}: {
  server: CommunityServer;
  userId: string;
  onChanged: () => Promise<void>;
  onError: (msg: string) => void;
}) {
  const [boosts, setBoosts] = useState<CommunityServerBoost[]>([]);
  const [isBooster, setIsBooster] = useState(false);
  const [busy, setBusy] = useState(false);

  const boostCount = server.boostCount ?? boosts.length;
  const level = server.boostLevel ?? getBoostLevel(boostCount);
  const toNext = boostsToNextLevel(boostCount);

  const refresh = async () => {
    try {
      const [list, mine] = await Promise.all([
        listServerBoosts(server.id),
        isServerBooster(server.id, userId),
      ]);
      setBoosts(list);
      setIsBooster(mine);
    } catch (err) {
      onError(err instanceof Error ? err.message : "Could not load boosts");
    }
  };

  useEffect(() => {
    void refresh();
  }, [server.id, userId]);

  const toggleBoost = async () => {
    setBusy(true);
    onError("");
    try {
      if (isBooster) await unboostServer(server.id, userId);
      else await boostServer(server.id, userId);
      await refresh();
      await onChanged();
    } catch (err) {
      onError(err instanceof Error ? err.message : "Could not update boost");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="max-w-2xl space-y-6">
      <div className="rounded-[var(--radius-group)] border border-[var(--community-border)] bg-gradient-to-br from-[#5865f2]/20 to-[#f47fff]/10 p-5">
        <p className="text-[0.6875rem] font-bold uppercase tracking-wider text-[#b5bac1]">
          Server Boost Level {level}
        </p>
        <p className="mt-1 text-[1.5rem] font-bold text-foreground">{boostCount} boosts</p>
        {toNext !== null ? (
          <p className="mt-1 text-[0.875rem] text-muted">
            {toNext} more boost{toNext === 1 ? "" : "s"} until level {level + 1}
          </p>
        ) : (
          <p className="mt-1 text-[0.875rem] text-muted">Maximum level reached</p>
        )}
        <div className="mt-4 flex h-2 overflow-hidden rounded-full bg-black/20">
          {[1, 2, 3].map((tier) => (
            <div
              key={tier}
              className={`flex-1 ${tier <= level ? "bg-[#f47fff]" : "bg-transparent"} ${
                tier > 1 ? "border-l border-black/20" : ""
              }`}
            />
          ))}
        </div>
        <Button className="mt-4" disabled={busy} onClick={() => void toggleBoost()}>
          {busy ? "Updating…" : isBooster ? "Remove your boost" : "Boost this server (test)"}
        </Button>
        <p className="mt-2 text-[0.75rem] text-muted">
          No payment — boosts are for testing server perks and Pro-style features.
        </p>
      </div>

      <div>
        <p className="mb-2 text-[0.8125rem] font-semibold">Unlocked perks</p>
        <ul className="space-y-1.5">
          {(BOOST_PERKS_BY_LEVEL[level as BoostLevel] ?? []).map((perk: string) => (
            <li
              key={perk}
              className="flex items-center gap-2 rounded-lg bg-fill/50 px-3 py-2 text-[0.875rem]"
            >
              <span className="text-accent">✓</span>
              {perk}
            </li>
          ))}
        </ul>
        {level < 3 && (
          <p className="mt-3 text-[0.75rem] text-muted">
            Next at level {level + 1}: {BOOST_PERKS_BY_LEVEL[(level + 1) as 1 | 2 | 3].join(" · ")}
          </p>
        )}
      </div>

      <div>
        <p className="mb-2 text-[0.8125rem] font-semibold">Boosters ({boosts.length})</p>
        {boosts.length === 0 ? (
          <p className="text-[0.875rem] text-muted">No boosters yet. Be the first!</p>
        ) : (
          <ul className="space-y-1">
            {boosts.map((b) => (
              <li
                key={b.userId}
                className="flex items-center gap-2 rounded-lg px-2 py-1.5 hover:bg-fill/40"
              >
                <CommunityAvatar
                  fallbackName={b.displayName}
                  size="sm"
                  previewRing
                  profile={{
                    avatarUrl: null,
                    communityDisplayName: b.displayName ?? null,
                    displayName: b.displayName ?? null,
                    communityUsername: b.communityUsername ?? null,
                    proEnabled: false,
                    profileRing: "pro",
                  }}
                />
                <span className="text-[0.875rem]">
                  {b.displayName || b.communityUsername || "Member"}
                  {b.userId === userId ? " (you)" : ""}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
