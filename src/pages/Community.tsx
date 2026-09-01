import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "@/lib/auth";
import { useLibrary } from "@/lib/library";
import {
  joinServer,
  joinServerByInviteCode,
  leaveServer,
  listMyServers,
  listOfficialServers,
  listPublicServers,
  reorderOfficialServers,
  requestJoinServer,
} from "@/lib/community";
import type { CommunityServer } from "@/lib/community-types";
import { Button } from "@/components/Button";
import { FormError } from "@/components/form";
import { EmptyState } from "@/components/layout";
import { IconPlus, IconSearch, IconSettings, IconCommunity, IconCompass } from "@/components/Icons";
import { CommunityDiscordShell, CommunityPanelHeader, CommunityScrollBody } from "@/components/CommunityRail";
import { CommunityDiscover } from "@/components/community/CommunityDiscover";
import { DiscoverServerCard } from "@/components/community/DiscoverServerCard";
import { AddServerModal } from "@/components/AddServerModal";

const PENDING_INVITE_KEY = "community-pending-invite";

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
  const [searchParams, setSearchParams] = useSearchParams();
  const tab = searchParams.get("tab") === "discover" ? "discover" : "list";

  const { user, userProfile, isOwner } = useAuth();
  const { activeLibrary, libraries } = useLibrary();

  const [publicServers, setPublicServers] = useState<CommunityServer[]>([]);
  const [officialServers, setOfficialServers] = useState<CommunityServer[]>([]);
  const [myServers, setMyServers] = useState<CommunityServer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);
  const [query, setQuery] = useState(searchParams.get("q") ?? "");
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

  useEffect(() => {
    const invite = searchParams.get("invite") ?? sessionStorage.getItem(PENDING_INVITE_KEY);
    if (!invite || !user) {
      if (invite && !user) sessionStorage.setItem(PENDING_INVITE_KEY, invite);
      return;
    }
    sessionStorage.removeItem(PENDING_INVITE_KEY);
    setAddOpen(true);
    void (async () => {
      try {
        const result = await joinServerByInviteCode(user.id, invite);
        await refresh();
        if (result.status === "requested") {
          setNotice(`Join request sent to “${result.server.name}”.`);
        } else {
          navigate(`/community/s/${result.server.id}`);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Invalid invite code");
        setAddOpen(true);
      } finally {
        const next = new URLSearchParams(searchParams);
        next.delete("invite");
        setSearchParams(next, { replace: true });
      }
    })();
  }, [user, searchParams, setSearchParams, navigate, refresh]);

  const filteredPublic = useMemo(() => filterServers(publicServers, query), [publicServers, query]);
  const filteredOfficial = useMemo(() => filterServers(officialServers, query), [officialServers, query]);
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
        setError("This server is invite-only. Use Add and enter an invite code.");
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
    if (!confirm(`Leave “${server.name}”? You can join again later if it's public.`)) return;
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

  const usernameNotice = user && !userProfile?.communityUsername && (
    <div className="mb-3 rounded-xl bg-fill px-3 py-3 text-[0.8125rem] text-white/70">
      Set your Community @username in{" "}
      <Link to="/account" className="text-accent underline">
        Account
      </Link>
      .
    </div>
  );

  return (
    <CommunityDiscordShell pane={tab === "discover" ? "discover" : "list"} onAdd={() => setAddOpen(true)}>
      {tab === "discover" ? (
        <>
          <CommunityPanelHeader
            title="Discover"
            subtitle="Explore communities"
            trailing={<IconCompass size={18} className="text-white/40" />}
          />
          <CommunityScrollBody className="px-3 py-3 text-foreground [&_h2]:text-foreground [&_.text-muted]:!text-muted">
            {usernameNotice}
            {error && (
              <div className="mb-3">
                <FormError message={error} />
              </div>
            )}
            {notice && (
              <p className="mb-3 rounded-xl bg-emerald-500/15 px-3 py-2 text-[0.8125rem] text-emerald-300">{notice}</p>
            )}
            <label className="relative mb-4 block">
              <IconSearch
                size={16}
                className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-white/40"
              />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search communities…"
                className="w-full rounded-xl bg-fill py-2.5 pl-9 pr-3 text-[0.9375rem] text-white outline-none ring-accent placeholder:text-white/35 focus:ring-2"
              />
            </label>
            <CommunityDiscover
              officialServers={filteredOfficial}
              publicServers={filteredPublic}
              loading={loading}
              query={query}
              isOwner={Boolean(isOwner)}
              joinBtn={joinBtn}
              onOpen={openServer}
              onMoveOfficial={(i, dir) => void moveOfficial(i, dir)}
            />
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
            {usernameNotice}
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
                className="w-full rounded-xl bg-fill py-2.5 pl-9 pr-3 text-[0.9375rem] text-white outline-none ring-accent placeholder:text-white/35 focus:ring-2"
              />
            </label>
            {loading ? (
              <p className="text-white/50">Loading…</p>
            ) : filteredMine.length === 0 ? (
              <EmptyState
                title={query ? "No matches" : "No servers yet"}
                description="Tap Add to create a server or enter an invite code — or open Discover."
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
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                {filteredMine.map((s) => (
                  <DiscoverServerCard
                    key={s.id}
                    server={s}
                    variant="grid"
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
                New servers are created under your active library ({activeLibrary?.name}).
              </p>
            )}
          </CommunityScrollBody>
        </>
      )}

      <AddServerModal open={addOpen} onClose={() => setAddOpen(false)} onDone={() => void refresh()} />
    </CommunityDiscordShell>
  );
}
