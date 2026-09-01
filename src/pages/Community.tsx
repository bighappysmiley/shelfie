import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "@/lib/auth";
import { useLibrary } from "@/lib/library";
import {
  joinServer,
  leaveServer,
  listMyServers,
  listOfficialServers,
  listPublicServers,
  reorderOfficialServers,
  requestJoinServer,
} from "@/lib/community";
import { formatPopularity, type CommunityServer } from "@/lib/community-types";
import { Button } from "@/components/Button";
import { FormError } from "@/components/form";
import { EmptyState } from "@/components/layout";
import {
  IconPlus,
  IconSearch,
  IconSettings,
  IconCommunity,
  IconCompass,
} from "@/components/Icons";
import { AuthedImage } from "@/components/AuthedImage";
import { CommunityDiscordShell, CommunityPanelHeader, CommunityScrollBody } from "@/components/CommunityRail";
import { AddServerModal } from "@/components/AddServerModal";

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
      className={`${dims} flex shrink-0 items-center justify-center rounded-2xl bg-accent/25 font-semibold text-accent`}
    >
      {server.name.slice(0, 2).toUpperCase()}
    </div>
  );
}

function ServerRow({
  server,
  trailing,
  onOpen,
}: {
  server: CommunityServer;
  trailing?: ReactNode;
  onOpen: () => void;
}) {
  return (
    <div className="flex w-full items-center gap-3 rounded-xl px-2 py-2.5 transition hover:bg-white/[0.04]">
      <button type="button" onClick={onOpen} className="flex min-w-0 flex-1 items-center gap-3 text-left">
        <ServerIcon server={server} />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="truncate font-semibold text-white">{server.name}</p>
            {server.isOfficial && (
              <span className="rounded bg-accent/25 px-1.5 py-0.5 text-[0.625rem] font-semibold uppercase tracking-wide text-accent">
                Official
              </span>
            )}
          </div>
          <p className="mt-0.5 truncate text-[0.8125rem] text-white/50">
            {server.description || formatPopularity(server)}
          </p>
        </div>
      </button>
      {trailing}
    </div>
  );
}

function filterServers(list: CommunityServer[], q: string) {
  const needle = q.trim().toLowerCase();
  if (!needle) return list;
  return list.filter(
    (s) =>
      s.name.toLowerCase().includes(needle) ||
      (s.description ?? "").toLowerCase().includes(needle),
  );
}

export function CommunityPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const tab = searchParams.get("tab") === "discover" ? "discover" : "list";
  const discoverSection = (searchParams.get("section") as "popular" | "official") || "popular";

  const { user, userProfile, isOwner } = useAuth();
  const { activeLibrary, libraries } = useLibrary();

  const [publicServers, setPublicServers] = useState<CommunityServer[]>([]);
  const [officialServers, setOfficialServers] = useState<CommunityServer[]>([]);
  const [myServers, setMyServers] = useState<CommunityServer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);
  const [reorderMode, setReorderMode] = useState(false);
  const [query, setQuery] = useState("");
  const [addOpen, setAddOpen] = useState(false);
  const [notice, setNotice] = useState("");

  const canCreateServer = Boolean(activeLibrary) && (activeLibrary?.role === "owner" || isOwner);

  const refresh = useCallback(async () => {
    if (!user) return;
    setError("");
    try {
      const [pub, official, mine] = await Promise.all([
        listPublicServers(user.id),
        listOfficialServers(user.id),
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

  const filteredPublic = useMemo(
    () => filterServers(publicServers, query),
    [publicServers, query],
  );
  const filteredOfficial = useMemo(
    () => filterServers(officialServers, query),
    [officialServers, query],
  );
  const filteredMine = useMemo(() => filterServers(myServers, query), [myServers, query]);

  const openServer = (server: CommunityServer) => {
    navigate(`/community/s/${server.id}`);
  };

  const handleJoin = async (server: CommunityServer) => {
    if (!user) return;
    setBusyId(server.id);
    setError("");
    try {
      if (server.joinMode === "invite") {
        setAddOpen(true);
        setError("This server is invite-only. Use + and enter an invite code.");
        return;
      }
      if (server.joinMode === "request") {
        const result = await requestJoinServer(server.id);
        await refresh();
        if (result.status === "requested") {
          setNotice(`Join request sent to “${server.name}”.`);
        } else {
          navigate(`/community/s/${result.server.id}`);
        }
        return;
      }
      const result = await joinServer(server.id, user.id);
      await refresh();
      navigate(`/community/s/${result.server.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not join");
    } finally {
      setBusyId(null);
    }
  };

  const handleLeave = async (server: CommunityServer) => {
    if (!user) return;
    if (!confirm(`Leave “${server.name}”? You can join again later if it’s public.`)) return;
    setBusyId(server.id);
    setError("");
    try {
      await leaveServer(server.id, user.id);
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not leave");
    } finally {
      setBusyId(null);
    }
  };

  const moveOfficial = async (index: number, dir: -1 | 1) => {
    const next = [...officialServers];
    const j = index + dir;
    if (j < 0 || j >= next.length) return;
    [next[index], next[j]] = [next[j]!, next[index]!];
    setOfficialServers(next);
    try {
      await reorderOfficialServers(next.map((s) => s.id));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not reorder");
      void refresh();
    }
  };

  const joinBtn = (s: CommunityServer, opts?: { showLeave?: boolean }) => (
    <div className="flex shrink-0 items-center gap-1" onClick={(e) => e.stopPropagation()}>
      {s.isMember ? (
        <>
          <Button size="sm" onClick={() => openServer(s)}>
            Open
          </Button>
          {opts?.showLeave && (
            <Button size="sm" variant="ghost" disabled={busyId === s.id} onClick={() => void handleLeave(s)}>
              Leave
            </Button>
          )}
        </>
      ) : s.myJoinRequestStatus === "pending" ? (
        <Button size="sm" variant="secondary" disabled>
          Requested
        </Button>
      ) : s.joinMode === "invite" ? (
        <Button size="sm" variant="secondary" onClick={() => setAddOpen(true)}>
          Invite
        </Button>
      ) : (
        <Button size="sm" disabled={busyId === s.id} onClick={() => void handleJoin(s)}>
          {busyId === s.id ? "…" : s.joinMode === "request" ? "Request" : "Join"}
        </Button>
      )}
    </div>
  );

  return (
    <CommunityDiscordShell pane={tab === "discover" ? "discover" : "list"} onAdd={() => setAddOpen(true)}>
      {tab === "discover" ? (
        <>
          <CommunityPanelHeader
            title="Discover"
            subtitle="Find public & Official servers"
            trailing={<IconCompass size={18} className="text-white/40" />}
          />
          <CommunityScrollBody className="px-3 py-3 text-foreground [&_h2]:text-foreground [&_.text-muted]:!text-muted">
            {user && !userProfile?.communityUsername && (
              <div className="mb-3 rounded-xl bg-fill px-3 py-3 text-[0.8125rem] text-white/70">
                Set your Community @username in{" "}
                <Link to="/account" className="text-accent underline">
                  Account
                </Link>
                .
              </div>
            )}

            {error && (
              <div className="mb-3">
                <FormError message={error} />
              </div>
            )}
            {notice && (
              <p className="mb-3 rounded-xl bg-emerald-500/15 px-3 py-2 text-[0.8125rem] text-emerald-300">
                {notice}
              </p>
            )}

            <label className="relative mb-3 block">
              <IconSearch
                size={16}
                className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-white/40"
              />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Explore communities…"
                className="w-full rounded-lg bg-fill py-2.5 pl-9 pr-3 text-[0.9375rem] text-white outline-none ring-accent placeholder:text-white/35 focus:ring-2"
              />
            </label>

            <div className="mb-4 flex gap-2">
              <button
                type="button"
                onClick={() => navigate("/community?tab=discover&section=popular")}
                className={`rounded-full px-3 py-1.5 text-[0.8125rem] font-medium transition ${
                  discoverSection === "popular"
                    ? "bg-white/15 text-white"
                    : "bg-transparent text-white/50 hover:text-white"
                }`}
              >
                Popular
              </button>
              <button
                type="button"
                onClick={() => navigate("/community?tab=discover&section=official")}
                className={`rounded-full px-3 py-1.5 text-[0.8125rem] font-medium transition ${
                  discoverSection === "official"
                    ? "bg-white/15 text-white"
                    : "bg-transparent text-white/50 hover:text-white"
                }`}
              >
                Official
              </button>
            </div>

            {loading ? (
              <p className="text-white/50">Loading…</p>
            ) : discoverSection === "official" ? (
              <div className="space-y-1">
                <div className="mb-2 flex items-center justify-between gap-2 px-1">
                  <p className="text-[0.75rem] uppercase tracking-wide text-white/40">
                    Curated by Pine
                  </p>
                  {isOwner && officialServers.length > 0 && (
                    <button
                      type="button"
                      className="text-[0.75rem] text-accent"
                      onClick={() => setReorderMode((v) => !v)}
                    >
                      {reorderMode ? "Done" : "Reorder"}
                    </button>
                  )}
                </div>
                {filteredOfficial.length === 0 ? (
                  <EmptyState
                    title={query ? "No matches" : "No official servers"}
                    description="Official servers appear here once marked by the Pine Owner."
                  />
                ) : (
                  filteredOfficial.map((s, i) => (
                    <ServerRow
                      key={s.id}
                      server={s}
                      onOpen={() => openServer(s)}
                      trailing={
                        reorderMode && isOwner ? (
                          <div className="flex flex-col gap-1" onClick={(e) => e.stopPropagation()}>
                            <button
                              type="button"
                              className="rounded px-2 py-0.5 text-xs text-white/50 hover:bg-white/10"
                              disabled={i === 0}
                              onClick={() => void moveOfficial(i, -1)}
                            >
                              ↑
                            </button>
                            <button
                              type="button"
                              className="rounded px-2 py-0.5 text-xs text-white/50 hover:bg-white/10"
                              disabled={i === officialServers.length - 1}
                              onClick={() => void moveOfficial(i, 1)}
                            >
                              ↓
                            </button>
                          </div>
                        ) : (
                          joinBtn(s)
                        )
                      }
                    />
                  ))
                )}
              </div>
            ) : (
              <div className="space-y-1">
                <p className="mb-2 px-1 text-[0.75rem] uppercase tracking-wide text-white/40">
                  Featured · by popularity
                </p>
                {filteredPublic.length === 0 ? (
                  <EmptyState
                    title={query ? "No matches" : "No public servers yet"}
                    description="Create a server and turn on Public in settings to appear here."
                    action={
                      canCreateServer ? (
                        <Button onClick={() => setAddOpen(true)}>Create your server</Button>
                      ) : undefined
                    }
                  />
                ) : (
                  filteredPublic.map((s, i) => (
                    <div key={s.id} className="relative pl-7">
                      <span className="absolute left-1 top-4 flex h-5 w-5 items-center justify-center rounded-full bg-fill text-[0.625rem] font-bold text-white/45">
                        {i + 1}
                      </span>
                      <ServerRow server={s} onOpen={() => openServer(s)} trailing={joinBtn(s)} />
                    </div>
                  ))
                )}
              </div>
            )}
          </CommunityScrollBody>
        </>
      ) : (
        <>
          <CommunityPanelHeader
            title="Your servers"
            subtitle={`${myServers.length} joined`}
            trailing={<IconCommunity size={18} className="text-white/40" />}
          />
          <CommunityScrollBody className="px-3 py-3 text-foreground [&_h2]:text-foreground [&_.text-muted]:!text-muted">
            {user && !userProfile?.communityUsername && (
              <div className="mb-3 rounded-xl bg-fill px-3 py-3 text-[0.8125rem] text-white/70">
                Choose an @username for Community chat in{" "}
                <Link to="/account" className="text-accent underline">
                  Account
                </Link>
                .
              </div>
            )}

            {error && (
              <div className="mb-3">
                <FormError message={error} />
              </div>
            )}

            <label className="relative mb-3 block">
              <IconSearch
                size={16}
                className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-white/40"
              />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Find a server…"
                className="w-full rounded-lg bg-fill py-2.5 pl-9 pr-3 text-[0.9375rem] text-white outline-none ring-accent placeholder:text-white/35 focus:ring-2"
              />
            </label>

            {loading ? (
              <p className="text-white/50">Loading…</p>
            ) : filteredMine.length === 0 ? (
              <EmptyState
                title={query ? "No matches" : "No servers yet"}
                description="Tap + to create a server or enter an invite code — or open Discover."
                action={
                  <div className="flex flex-wrap justify-center gap-2">
                    <Button onClick={() => setAddOpen(true)}>
                      <IconPlus size={16} />
                      Add a Server
                    </Button>
                    <Button variant="secondary" onClick={() => navigate("/community?tab=discover")}>
                      Discover
                    </Button>
                  </div>
                }
              />
            ) : (
              <div className="space-y-1">
                {filteredMine.map((s) => (
                  <ServerRow
                    key={s.id}
                    server={s}
                    onOpen={() => openServer(s)}
                    trailing={
                      <div className="flex items-center gap-1">
                        {s.canManage && (
                          <Link
                            to={`/community/s/${s.id}/settings`}
                            className="rounded-lg p-2 text-white/45 hover:bg-white/10 hover:text-white"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <IconSettings size={18} />
                          </Link>
                        )}
                        {joinBtn(s, { showLeave: !s.canManage })}
                      </div>
                    }
                  />
                ))}
              </div>
            )}

            {libraries.length > 1 && canCreateServer && (
              <p className="mt-4 px-1 text-[0.75rem] text-white/40">
                New servers are created under your active library ({activeLibrary?.name}). Switch
                libraries if you want them attached elsewhere.
              </p>
            )}
            {canCreateServer && filteredMine.length > 0 && (
              <div className="mt-4 px-1">
                <Button size="sm" onClick={() => setAddOpen(true)}>
                  <IconPlus size={16} />
                  Create another server
                </Button>
              </div>
            )}
          </CommunityScrollBody>
        </>
      )}

      <AddServerModal open={addOpen} onClose={() => setAddOpen(false)} onDone={() => void refresh()} />
    </CommunityDiscordShell>
  );
}
