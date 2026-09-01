import { useCallback, useEffect, useMemo, useState, type FormEvent, type ReactNode } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/lib/auth";
import { useLibrary } from "@/lib/library";
import {
  createLibraryServer,
  getServerForLibrary,
  joinServer,
  leaveServer,
  listMyServers,
  listOfficialServers,
  listPublicServers,
  reorderOfficialServers,
} from "@/lib/community";
import { formatPopularity, type CommunityServer } from "@/lib/community-types";
import { Button } from "@/components/Button";
import { TextField, TextArea, FormError } from "@/components/form";
import { EmptyState, PageHeader, Banner, ToggleRow } from "@/components/layout";
import { IconCommunity, IconPlus, IconSettings, IconSearch, IconX } from "@/components/Icons";
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
    <div className="flex w-full items-center gap-3 rounded-[var(--radius-group)] bg-surface px-3 py-3 shadow-sm ring-1 ring-black/[0.04] dark:ring-white/[0.06]">
      <button type="button" onClick={onOpen} className="flex min-w-0 flex-1 items-center gap-3 text-left">
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
            {server.isMember && (
              <span className="rounded bg-fill px-1.5 py-0.5 text-[0.625rem] font-medium text-muted">
                Joined
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
  const { user, isOwner } = useAuth();
  const { activeLibrary, libraries } = useLibrary();

  const [tab, setTab] = useState<"discover" | "official" | "mine">("discover");
  const [publicServers, setPublicServers] = useState<CommunityServer[]>([]);
  const [officialServers, setOfficialServers] = useState<CommunityServer[]>([]);
  const [myServers, setMyServers] = useState<CommunityServer[]>([]);
  const [libraryServerId, setLibraryServerId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);
  const [reorderMode, setReorderMode] = useState(false);
  const [query, setQuery] = useState("");
  const [showCreate, setShowCreate] = useState(false);

  const refresh = useCallback(async () => {
    if (!user) return;
    setError("");
    try {
      const [pub, official, mine, existing] = await Promise.all([
        listPublicServers(user.id),
        listOfficialServers(user.id),
        listMyServers(user.id),
        activeLibrary ? getServerForLibrary(activeLibrary.id) : Promise.resolve(null),
      ]);
      setPublicServers(pub);
      setOfficialServers(official);
      setMyServers(mine);
      setLibraryServerId(existing?.id ?? null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load servers");
    } finally {
      setLoading(false);
    }
  }, [user, activeLibrary]);

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
      await joinServer(server.id, user.id);
      await refresh();
      navigate(`/community/s/${server.id}`);
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
    [next[index], next[j]] = [next[j], next[index]];
    setOfficialServers(next);
    try {
      await reorderOfficialServers(next.map((s) => s.id));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not reorder");
      void refresh();
    }
  };

  const actionButtons = (s: CommunityServer, opts?: { showLeave?: boolean }) => (
    <div className="flex shrink-0 flex-col gap-1 sm:flex-row sm:items-center" onClick={(e) => e.stopPropagation()}>
      {s.isMember ? (
        <>
          <Button size="sm" onClick={() => openServer(s)}>
            Open
          </Button>
          {opts?.showLeave && (
            <Button
              size="sm"
              variant="ghost"
              disabled={busyId === s.id}
              onClick={() => void handleLeave(s)}
            >
              Leave
            </Button>
          )}
        </>
      ) : (
        <Button size="sm" disabled={busyId === s.id} onClick={() => void handleJoin(s)}>
          {busyId === s.id ? "…" : "Join"}
        </Button>
      )}
    </div>
  );

  return (
    <div>
      <PageHeader
        title="Community"
        subtitle="Each library can create its own server. Nothing is added until you create or join one."
        action={
          activeLibrary?.role === "owner" ? (
            libraryServerId ? (
              <Button size="sm" variant="secondary" onClick={() => navigate(`/community/s/${libraryServerId}`)}>
                Open my server
              </Button>
            ) : (
              <Button size="sm" onClick={() => setShowCreate(true)}>
                <IconPlus size={16} />
                Create server
              </Button>
            )
          ) : undefined
        }
      />

      {error && (
        <div className="mb-4">
          <FormError message={error} />
        </div>
      )}

      <div className="mb-4">
        <label className="relative block">
          <IconSearch
            size={16}
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted"
          />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search servers…"
            className="w-full rounded-[var(--radius-control)] bg-fill py-2.5 pl-9 pr-3 text-[0.9375rem] outline-none ring-accent focus:ring-2"
          />
        </label>
      </div>

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
            <p className="font-semibold">Official</p>
            <p className={`text-[0.75rem] ${tab === "official" ? "opacity-80" : "text-muted"}`}>
              {officialServers.length} curated
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
          <p className="text-[0.75rem] text-muted">Public · by popularity</p>
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
          <p className="font-semibold">Joined</p>
          <p className="text-[0.75rem] text-muted">{myServers.length} servers</p>
        </button>
      </div>

      {loading ? (
        <p className="text-muted">Loading servers…</p>
      ) : tab === "official" ? (
        <div className="space-y-3">
          <div className="flex items-center justify-between gap-3">
            <p className="text-[0.875rem] text-muted">
              Official servers are chosen by the Pine Owner — nothing is listed until marked Official.
            </p>
            {isOwner && officialServers.length > 0 && (
              <Button size="sm" variant="secondary" onClick={() => setReorderMode((v) => !v)}>
                {reorderMode ? "Done" : "Reorder"}
              </Button>
            )}
          </div>
          {filteredOfficial.length === 0 ? (
            <EmptyState
              title={query ? "No matches" : "No official servers"}
              description={
                isOwner
                  ? "When a library creates a public server, open its settings and mark it Official. Then reorder here."
                  : "Official servers will show up here once Pine curates them."
              }
            />
          ) : (
            filteredOfficial.map((s, i) => (
              <ServerCard
                key={s.id}
                server={s}
                onOpen={() => openServer(s)}
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
                  ) : (
                    actionButtons(s)
                  )
                }
              />
            ))
          )}
          {isOwner && (
            <Banner>
              <p className="text-[0.875rem]">
                Tip: Discover a public server → Open → Settings → Official. No servers are auto-added.
              </p>
            </Banner>
          )}
        </div>
      ) : tab === "mine" ? (
        <div className="space-y-3">
          {filteredMine.length === 0 ? (
            <EmptyState
              title={query ? "No matches" : "You haven’t joined any servers"}
              description={
                activeLibrary?.role === "owner" && !libraryServerId
                  ? "Create a server for your library, or join a public one from Discover."
                  : "Join a public or Official server from Discover — nothing is added automatically."
              }
              action={
                activeLibrary?.role === "owner" && !libraryServerId ? (
                  <Button onClick={() => setShowCreate(true)}>
                    <IconPlus size={16} />
                    Create server for {activeLibrary.name}
                  </Button>
                ) : (
                  <Button variant="secondary" onClick={() => setTab("discover")}>
                    Browse Discover
                  </Button>
                )
              }
            />
          ) : (
            filteredMine.map((s) => (
              <ServerCard
                key={s.id}
                server={s}
                onOpen={() => openServer(s)}
                trailing={
                  <div className="flex items-center gap-1">
                    {s.canManage && (
                      <Link
                        to={`/community/s/${s.id}/settings`}
                        className="rounded-lg p-2 text-muted hover:bg-fill hover:text-foreground"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <IconSettings size={18} />
                      </Link>
                    )}
                    {actionButtons(s, { showLeave: !s.canManage })}
                  </div>
                }
              />
            ))
          )}
          {libraries.length > 1 && (
            <p className="pt-2 text-[0.8125rem] text-muted">
              Creating a server uses your active library ({activeLibrary?.name}). Switch libraries to
              create another.
            </p>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          <p className="text-[0.875rem] text-muted">
            Public servers ranked by popularity (members, messages, and recent activity). Join
            explicitly — browsing does not add you.
          </p>
          {filteredPublic.length === 0 ? (
            <EmptyState
              title={query ? "No matches" : "No public servers yet"}
              description="Library owners can create a server and turn on Public in Server Settings."
              action={
                activeLibrary?.role === "owner" && !libraryServerId ? (
                  <Button onClick={() => setShowCreate(true)}>Create your server</Button>
                ) : undefined
              }
            />
          ) : (
            filteredPublic.map((s, i) => (
              <div key={s.id} className="relative pl-4">
                <span className="absolute left-0 top-3 flex h-6 w-6 items-center justify-center rounded-full bg-fill text-[0.6875rem] font-bold text-muted">
                  {i + 1}
                </span>
                <ServerCard server={s} onOpen={() => openServer(s)} trailing={actionButtons(s)} />
              </div>
            ))
          )}
        </div>
      )}

      {showCreate && user && activeLibrary && (
        <CreateServerModal
          libraryName={activeLibrary.name}
          onClose={() => setShowCreate(false)}
          onCreate={async (values) => {
            const server = await createLibraryServer({
              libraryId: activeLibrary.id,
              name: values.name,
              description: values.description,
              isPublic: values.isPublic,
              userId: user.id,
              isLibraryOwner: activeLibrary.role === "owner",
            });
            setShowCreate(false);
            await refresh();
            navigate(`/community/s/${server.id}`);
          }}
        />
      )}
    </div>
  );
}

function CreateServerModal({
  libraryName,
  onClose,
  onCreate,
}: {
  libraryName: string;
  onClose: () => void;
  onCreate: (values: { name: string; description: string; isPublic: boolean }) => Promise<void>;
}) {
  const [name, setName] = useState(libraryName);
  const [description, setDescription] = useState("");
  const [isPublic, setIsPublic] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    setBusy(true);
    setError("");
    try {
      await onCreate({ name: name.trim(), description: description.trim(), isPublic });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not create");
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <form
        onClick={(e) => e.stopPropagation()}
        onSubmit={submit}
        className="w-full max-w-md rounded-[1.25rem] bg-surface p-5 shadow-xl ring-1 ring-black/[0.06] dark:ring-white/[0.08]"
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-[1.125rem] font-semibold">Create server</h2>
          <button type="button" onClick={onClose} className="text-muted">
            <IconX size={18} />
          </button>
        </div>
        <p className="mb-4 text-[0.875rem] text-muted">
          For library <strong>{libraryName}</strong>. Starts empty — no Official listing unless you
          (or Pine Owner) mark it later.
        </p>
        <div className="space-y-3">
          <TextField
            label="Server name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            autoFocus
          />
          <TextArea
            label="Description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={2}
            hint="Optional — shown in Discover"
          />
          <ToggleRow
            label="Make public"
            hint="Appear in Discover. You can change this anytime in settings."
            checked={isPublic}
            onChange={setIsPublic}
          />
        </div>
        {error && (
          <div className="mt-3">
            <FormError message={error} />
          </div>
        )}
        <div className="mt-4 flex justify-end gap-2">
          <Button type="button" variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" disabled={busy || !name.trim()}>
            {busy ? "Creating…" : "Create server"}
          </Button>
        </div>
      </form>
    </div>
  );
}
