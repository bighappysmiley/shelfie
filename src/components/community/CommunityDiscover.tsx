import { useState, type ReactNode } from "react";
import { EmptyState } from "@/components/layout";
import { DiscoverServerCard } from "@/components/community/DiscoverServerCard";
import type { CommunityServer } from "@/lib/community-types";

export function CommunityDiscover({
  officialServers,
  publicServers,
  loading,
  query,
  isOwner,
  joinBtn,
  onOpen,
  onMoveOfficial,
}: {
  officialServers: CommunityServer[];
  publicServers: CommunityServer[];
  loading: boolean;
  query: string;
  isOwner: boolean;
  joinBtn: (s: CommunityServer, opts?: { showLeave?: boolean }) => ReactNode;
  onOpen: (s: CommunityServer) => void;
  onMoveOfficial: (index: number, dir: -1 | 1) => void;
}) {
  const [reorderMode, setReorderMode] = useState(false);

  if (loading) {
    return <p className="text-white/50">Loading communities…</p>;
  }

  const hero = officialServers[0];
  const restOfficial = officialServers.slice(1);

  return (
    <div className="space-y-6">
      <section>
        <div className="mb-3 flex items-center justify-between gap-2 px-1">
          <div>
            <p className="text-[0.6875rem] font-bold uppercase tracking-wider text-white/40">Official</p>
            <p className="text-[0.75rem] text-white/35">Curated by Pine</p>
          </div>
          {isOwner && officialServers.length > 1 && (
            <button
              type="button"
              className="text-[0.75rem] text-accent"
              onClick={() => setReorderMode((v) => !v)}
            >
              {reorderMode ? "Done" : "Reorder"}
            </button>
          )}
        </div>

        {officialServers.length === 0 ? (
          <EmptyState
            title={query ? "No official matches" : "No official servers yet"}
            description="Official servers appear here once marked by the Pine Owner."
          />
        ) : (
          <div className="space-y-3">
            {hero && (
              <DiscoverServerCard
                server={hero}
                variant="hero"
                onOpen={() => onOpen(hero)}
                trailing={
                  reorderMode && isOwner ? (
                    <div className="flex justify-end gap-1">
                      <button
                        type="button"
                        className="rounded px-2 py-1 text-xs text-white/50 hover:bg-white/10"
                        disabled
                      >
                        ↑
                      </button>
                      <button
                        type="button"
                        className="rounded px-2 py-1 text-xs text-white/50 hover:bg-white/10"
                        disabled={officialServers.length < 2}
                        onClick={() => onMoveOfficial(0, 1)}
                      >
                        ↓
                      </button>
                    </div>
                  ) : (
                    joinBtn(hero)
                  )
                }
              />
            )}
            {restOfficial.length > 0 && (
              <div className="community-scroll -mx-1 flex gap-3 overflow-x-auto px-1 pb-1">
                {restOfficial.map((s, i) => {
                  const index = i + 1;
                  return (
                    <DiscoverServerCard
                      key={s.id}
                      server={s}
                      variant="featured"
                      onOpen={() => onOpen(s)}
                      trailing={
                        reorderMode && isOwner ? (
                          <div className="flex justify-end gap-1">
                            <button
                              type="button"
                              className="rounded px-2 py-1 text-xs text-white/50 hover:bg-white/10"
                              disabled={index === 0}
                              onClick={() => onMoveOfficial(index, -1)}
                            >
                              ↑
                            </button>
                            <button
                              type="button"
                              className="rounded px-2 py-1 text-xs text-white/50 hover:bg-white/10"
                              disabled={index === officialServers.length - 1}
                              onClick={() => onMoveOfficial(index, 1)}
                            >
                              ↓
                            </button>
                          </div>
                        ) : (
                          joinBtn(s)
                        )
                      }
                    />
                  );
                })}
              </div>
            )}
          </div>
        )}
      </section>

      <section>
        <p className="mb-3 px-1 text-[0.6875rem] font-bold uppercase tracking-wider text-white/40">
          Popular communities
        </p>
        {publicServers.length === 0 ? (
          <EmptyState
            title={query ? "No matches" : "No public servers yet"}
            description="Create a server and turn on Public in settings to appear here."
          />
        ) : (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {publicServers.map((s, i) => (
              <DiscoverServerCard
                key={s.id}
                server={s}
                variant="grid"
                rank={i + 1}
                onOpen={() => onOpen(s)}
                trailing={joinBtn(s)}
              />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
