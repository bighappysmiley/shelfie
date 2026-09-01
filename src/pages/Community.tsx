import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/lib/auth";
import { useLibrary } from "@/lib/library";
import {
  ensureLibraryServer,
  joinServer,
  listMyServers,
  listOfficialServers,
  listPublicServers,
  reorderOfficialServers,
} from "@/lib/community";
import { formatPopularity, type CommunityServer } from "@/lib/community-types";
import { Button } from "@/components/Button";
import { FormError } from "@/components/form";
import { EmptyState, PageHeader, Banner } from "@/components/layout";
import { IconCommunity, IconPlus, IconSettings } from "@/components/Icons";
import { AuthedImage } from "@/components/AuthedImage";

function ServerIcon({ server, size = "md" }: { server: CommunityServer; size?: "sm" | "md" | "lg" }) {
  const dims = size === "lg" ? "h-14 w-14 text-lg" : size === "sm" ? "h-9 w-9 text-xs" : "h-11 w-11 text-sm";
  if (server.iconUrl) {
    return (
      <AuthedImage
        src={server.iconUrl}
        alt=""
        className={`${dims} shrink-0 rounded-2xl object-cover bg-fill`}
      />
    );
  }
  return (
    <div
      className={`${dims} flex shrink-0 items-center justify-center rounded-2xl bg-accent/15 font-semibold text-accent`}
    >
      {server.name.slice(0, 2).toUpperCase()}
    </div>
  );
}

function ServerCard({
  server,
  trailing,
  onOpen,
}: {
  server: CommunityServer;
  trailing?: ReactNode;
  onOpen: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onOpen}
      className="flex w-full items-center gap-3 rounded-[var(--radius-group)] bg-surface px-3 py-3 text-left shadow-sm ring-1 ring-black/[0.04] transition hover:bg-fill/40 dark:ring-white/[0.06]"
    >
      <ServerIcon server={server} />
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <p className="truncate font-semibold">{server.name}</p>
          {server.isOfficial && (
            <span className="rounded bg-accent/15 px-1.5 py-0.5 text-[0.625rem] font-semibold uppercase tracking-wide text-accent">
              Official
            </span>
          )}
          {server.isPublic && !server.isOfficial && (
            <span className="rounded bg-fill px-1.5 py-0.5 text-[0.625rem] font-medium text-muted">
              Public
            </span>
          )}
        </div>
        <p className="mt-0.5 truncate text-[0.8125rem] text-muted">
          {server.description || formatPopularity(server)}
        </p>
        {server.description && (
          <p className="mt-0.5 text-[0.75rem] text-muted">{formatPopularity(server)}</p>
        )}
      </div>
      {trailing}
    </button>
  );
}

export function CommunityPage() {
  const navigate = useNavigate();
  const { user, isOwner } = useAuth();
  const { activeLibrary, libraries } = useLibrary();

  const [tab, setTab] = useState<"discover" | "official" | "mine">("discover");
  const [publicServers, setPublicServers] = useState<CommunityServer[]>([]);
  const [officialServers, setOfficialServers] = useState<CommunityServer[]>([]);
  const [myServers, setMyServers] = useState<CommunityServer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [reorderMode, setReorderMode] = useState(false);

  const refresh = useCallback(async () => {
    if (!user) return;
    setError("");
    try {
      const [pub, official, mine] = await Promise.all([
        listPublicServers(),
        listOfficialServers(),
        listMyServers(user.id),
      ]);
      setPublicServers(pub);
      setOfficialServers(official);
      setMyServers(mine);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load servers");
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const myLibraryServer = useMemo(
    () => (activeLibrary ? myServers.find((s) => s.libraryId === activeLibrary.id) : null),
    [myServers, activeLibrary],
  );

  const openServer = async (server: CommunityServer) => {
    if (!user) return;
    try {
      await joinServer(server.id, user.id);
    } catch {
      /* may already be a member / public browse */
    }
    navigate(`/community/s/${server.id}`);
  };

  const createOrOpenMine = async () => {
    if (!user || !activeLibrary) return;
    setBusy(true);
    setError("");
    try {
      const server = await ensureLibraryServer({
        libraryId: activeLibrary.id,
        libraryName: activeLibrary.name,
        userId: user.id,
        isLibraryOwner: activeLibrary.role === "owner",
      });
      await refresh();
      navigate(`/community/s/${server.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not open your server");
    } finally {
      setBusy(false);
    }
  };

  const moveOfficial = async (index: number, dir: -1 | 1) => {
    const next = [...officialServers];
    const j = index + dir;
    if (j < 0 || j >= next.length) return;
    [next[index], next[j]] = [next[j], next[index]];
    setOfficialServers(next);
    try {
      await reorderOfficialServers(next.map((s) => s.id));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not reorder");
      void refresh();
    }
  };

  return (
    <div>
      <PageHeader
        title="Community"
        subtitle="Browse library servers — each library has its own server with channels"
        action={
          activeLibrary?.role === "owner" ? (
            <Button size="sm" onClick={() => void createOrOpenMine()} disabled={busy}>
              <IconPlus size={16} />
              {myLibraryServer ? "Open my server" : "Create server"}
            </Button>
          ) : undefined
        }
      />

      {error && (
        <div className="mb-4">
          <FormError message={error} />
        </div>
      )}

      <div className="mb-5 grid gap-2 sm:grid-cols-3">
        <button
          type="button"
          onClick={() => setTab("official")}
          className={`flex items-center gap-3 rounded-[var(--radius-group)] px-4 py-3 text-left ring-1 transition ${
            tab === "official"
              ? "bg-accent text-accent-contrast ring-accent"
              : "bg-surface ring-black/[0.04] hover:bg-fill/50 dark:ring-white/[0.06]"
          }`}
        >
          <div
            className={`flex h-10 w-10 items-center justify-center rounded-xl ${
              tab === "official" ? "bg-white/20" : "bg-accent/15 text-accent"
            }`}
          >
            <IconCommunity size={20} />
          </div>
          <div>
            <p className="font-semibold">Official servers</p>
            <p className={`text-[0.75rem] ${tab === "official" ? "opacity-80" : "text-muted"}`}>
              {officialServers.length} curated by Pine
            </p>
          </div>
        </button>
        <button
          type="button"
          onClick={() => setTab("discover")}
          className={`rounded-[var(--radius-group)] px-4 py-3 text-left ring-1 transition ${
            tab === "discover"
              ? "bg-fill-secondary ring-black/10 dark:ring-white/15"
              : "bg-surface ring-black/[0.04] hover:bg-fill/50 dark:ring-white/[0.06]"
          }`}
        >
          <p className="font-semibold">Discover</p>
          <p className="text-[0.75rem] text-muted">Public servers by popularity</p>
        </button>
        <button
          type="button"
          onClick={() => setTab("mine")}
          className={`rounded-[var(--radius-group)] px-4 py-3 text-left ring-1 transition ${
            tab === "mine"
              ? "bg-fill-secondary ring-black/10 dark:ring-white/15"
              : "bg-surface ring-black/[0.04] hover:bg-fill/50 dark:ring-white/[0.06]"
          }`}
        >
          <p className="font-semibold">Your servers</p>
          <p className="text-[0.75rem] text-muted">{myServers.length} from your libraries</p>
        </button>
      </div>

      {loading ? (
        <p className="text-muted">Loading servers…</p>
      ) : tab === "official" ? (
        <div className="space-y-3">
          <div className="flex items-center justify-between gap-3">
            <p className="text-[0.875rem] text-muted">
              Official servers stay pinned at the top of Community.
            </p>
            {isOwner && (
              <Button size="sm" variant="secondary" onClick={() => setReorderMode((v) => !v)}>
                {reorderMode ? "Done" : "Reorder"}
              </Button>
            )}
          </div>
          {officialServers.length === 0 ? (
            <EmptyState
              title="No official servers yet"
              description={
                isOwner
                  ? "Open a public server’s settings and mark it Official, then reorder here."
                  : "Check back soon for curated Pine servers."
              }
            />
          ) : (
            officialServers.map((s, i) => (
              <ServerCard
                key={s.id}
                server={s}
                onOpen={() => void openServer(s)}
                trailing={
                  reorderMode && isOwner ? (
                    <div className="flex flex-col gap-1" onClick={(e) => e.stopPropagation()}>
                      <button
                        type="button"
                        className="rounded px-2 py-0.5 text-xs text-muted hover:bg-fill"
                        disabled={i === 0}
                        onClick={() => void moveOfficial(i, -1)}
                      >
                        ↑
                      </button>
                      <button
                        type="button"
                        className="rounded px-2 py-0.5 text-xs text-muted hover:bg-fill"
                        disabled={i === officialServers.length - 1}
                        onClick={() => void moveOfficial(i, 1)}
                      >
                        ↓
                      </button>
                    </div>
                  ) : undefined
                }
              />
            ))
          )}
          {isOwner && publicServers.length > 0 && (
            <Banner>
              <p className="text-[0.875rem]">
                To add an official server, open it → Settings → mark as Official.
              </p>
            </Banner>
          )}
        </div>
      ) : tab === "mine" ? (
        <div className="space-y-3">
          {myServers.length === 0 ? (
            <EmptyState
              title="No servers yet"
              description={
                activeLibrary?.role === "owner"
                  ? "Create a server for your library to add channels and invite people."
                  : "Join a public server from Discover, or ask your library owner to open theirs."
              }
              action={
                activeLibrary?.role === "owner" ? (
                  <Button onClick={() => void createOrOpenMine()} disabled={busy}>
                    Create server for {activeLibrary.name}
                  </Button>
                ) : undefined
              }
            />
          ) : (
            myServers.map((s) => (
              <ServerCard
                key={s.id}
                server={s}
                onOpen={() => void openServer(s)}
                trailing={
                  s.canManage ? (
                    <Link
                      to={`/community/s/${s.id}/settings`}
                      onClick={(e) => e.stopPropagation()}
                      className="rounded-lg p-2 text-muted hover:bg-fill hover:text-foreground"
                    >
                      <IconSettings size={18} />
                    </Link>
                  ) : undefined
                }
              />
            ))
          )}
          {libraries.length > 1 && (
            <p className="pt-2 text-[0.8125rem] text-muted">
              Servers are tied to libraries. Switch libraries in the sidebar to manage another.
            </p>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          <p className="text-[0.875rem] text-muted">
            Public library servers, ranked by popularity (members, activity, and recent chatter).
          </p>
          {publicServers.length === 0 ? (
            <EmptyState
              title="No public servers yet"
              description="Library owners can make their server public in Server Settings."
            />
          ) : (
            publicServers.map((s, i) => (
              <div key={s.id} className="relative">
                <span className="absolute -left-1 top-3 z-10 flex h-6 w-6 items-center justify-center rounded-full bg-fill text-[0.6875rem] font-bold text-muted">
                  {i + 1}
                </span>
                <div className="pl-4">
                  <ServerCard server={s} onOpen={() => void openServer(s)} />
                </div>
              </div>
            ))
          )}
          {isOwner &&
            publicServers.map((s) => (
              <span key={`admin-${s.id}`} className="sr-only">
                {/* keep map simple; official toggle lives in settings */}
              </span>
            ))}
        </div>
      )}
    </div>
  );
}
