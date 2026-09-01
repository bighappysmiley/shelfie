import { useEffect, useState, type ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/lib/auth";
import { listMyServers, listServerUnreadTotals } from "@/lib/community";
import type { CommunityServer } from "@/lib/community-types";
import { AuthedImage } from "@/components/AuthedImage";
import { IconCompass, IconHome, IconList, IconPlus } from "@/components/Icons";

export type CommunityPane = "list" | "discover" | "server";

function ServerGlyph({
  server,
  active,
  unread = 0,
  onClick,
}: {
  server: CommunityServer;
  active: boolean;
  unread?: number;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={server.name}
      aria-label={server.name}
      aria-current={active ? "page" : undefined}
      className="group relative mx-auto flex w-[4.5rem] items-center justify-center py-0.5"
    >
      <span
        className={`absolute -left-3 w-1 rounded-r-full bg-[var(--community-rail-pill)] transition-all duration-200 ${
          active ? "h-10 opacity-100" : unread > 0 ? "h-2 opacity-100" : "h-5 opacity-0 group-hover:opacity-100"
        }`}
      />
      {unread > 0 && (
        <span className="absolute bottom-0 right-3 z-10 flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[0.625rem] font-bold text-white">
          {unread > 9 ? "9+" : unread}
        </span>
      )}
      {server.iconUrl ? (
        <AuthedImage
          src={server.iconUrl}
          alt=""
          className={`h-12 w-12 object-cover transition-all duration-200 ${
            active ? "rounded-2xl" : "rounded-full group-hover:rounded-2xl"
          }`}
        />
      ) : (
        <span
          className={`flex h-12 w-12 items-center justify-center bg-accent text-[0.75rem] font-semibold text-accent-contrast transition-all duration-200 ${
            active ? "rounded-2xl" : "rounded-full group-hover:rounded-2xl"
          }`}
        >
          {server.name.slice(0, 2).toUpperCase()}
        </span>
      )}
    </button>
  );
}

function RailButton({
  active,
  label,
  onClick,
  tone = "default",
  children,
}: {
  active?: boolean;
  label: string;
  onClick: () => void;
  tone?: "default" | "add" | "discover";
  children: ReactNode;
}) {
  const toneClass =
    tone === "add"
      ? active
        ? "rounded-2xl bg-success text-white"
        : "rounded-full bg-[var(--community-panel)] text-success hover:rounded-2xl hover:bg-success hover:text-white"
      : tone === "discover"
        ? active
          ? "rounded-2xl bg-accent text-accent-contrast"
          : "rounded-full bg-[var(--community-panel)] text-success hover:rounded-2xl hover:bg-accent hover:text-accent-contrast"
        : active
          ? "rounded-2xl bg-accent text-accent-contrast"
          : "rounded-full bg-[var(--community-panel)] text-muted hover:rounded-2xl hover:bg-accent hover:text-accent-contrast";

  return (
    <button
      type="button"
      onClick={onClick}
      title={label}
      aria-label={label}
      aria-current={active ? "page" : undefined}
      className="group relative mx-auto flex w-[4.5rem] items-center justify-center py-0.5"
    >
      <span
        className={`absolute -left-3 w-1 rounded-r-full bg-[var(--community-rail-pill)] transition-all duration-200 ${
          active ? "h-10 opacity-100" : "h-5 opacity-0 group-hover:opacity-100"
        }`}
      />
      <span className={`flex h-12 w-12 items-center justify-center transition-all duration-200 ${toneClass}`}>
        {children}
      </span>
    </button>
  );
}

export function CommunityDiscordShell({
  pane,
  activeServerId,
  onAdd,
  children,
}: {
  pane: CommunityPane;
  activeServerId?: string | null;
  onAdd: () => void;
  children: ReactNode;
}) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [servers, setServers] = useState<CommunityServer[]>([]);
  const [unreadByServer, setUnreadByServer] = useState<Map<string, number>>(new Map());
  const [railTick, setRailTick] = useState(0);

  useEffect(() => {
    const onRefresh = () => setRailTick((n) => n + 1);
    window.addEventListener("community-rail-refresh", onRefresh);
    return () => window.removeEventListener("community-rail-refresh", onRefresh);
  }, []);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    void listMyServers(user.id)
      .then(async (list) => {
        if (cancelled) return;
        setServers(list);
        const totals = await listServerUnreadTotals(
          user.id,
          list.map((s) => s.id),
        );
        if (!cancelled) setUnreadByServer(totals);
      })
      .catch(() => {
        if (!cancelled) setServers([]);
      });
    return () => {
      cancelled = true;
    };
  }, [user, railTick, pane, activeServerId]);

  return (
    <div className="community-discord-shell flex h-full min-h-0 flex-1 overflow-hidden bg-[var(--community-rail)] text-foreground">
      <nav
        aria-label="Servers"
        className="community-scroll community-rail-nav hidden w-[4.5rem] shrink-0 flex-col overflow-y-auto bg-[var(--community-rail)] py-3 md:flex"
      >
        <RailButton label="Home" onClick={() => navigate("/home")}>
          <IconHome size={24} />
        </RailButton>

        <div className="mx-auto my-2 h-0.5 w-8 rounded-full bg-[var(--community-border)]" />

        <RailButton label="Server list" active={pane === "list"} onClick={() => navigate("/community")}>
          <IconList size={24} />
        </RailButton>

        <div className="mx-auto my-2 h-0.5 w-8 rounded-full bg-[var(--community-border)]" />

        {servers.map((s) => (
          <ServerGlyph
            key={s.id}
            server={s}
            active={pane === "server" && activeServerId === s.id}
            unread={unreadByServer.get(s.id) ?? 0}
            onClick={() => navigate(`/community/s/${s.id}`)}
          />
        ))}

        <div className="mt-auto flex flex-col gap-0.5 pt-2">
          <RailButton label="Add a Server" tone="add" onClick={onAdd}>
            <IconPlus size={24} />
          </RailButton>
          <RailButton
            label="Discover"
            tone="discover"
            active={pane === "discover"}
            onClick={() => navigate("/community?tab=discover")}
          >
            <IconCompass size={24} />
          </RailButton>
        </div>
      </nav>

      <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden bg-[var(--community-panel)]">
        {children}
        <nav
          aria-label="Community navigation"
          className="flex shrink-0 border-t border-[var(--community-border)] bg-[var(--community-panel)] pb-[env(safe-area-inset-bottom,0px)] md:hidden"
        >
          <button
            type="button"
            onClick={() => navigate("/community")}
            className={`flex flex-1 flex-col items-center gap-0.5 py-2.5 text-[0.625rem] font-medium ${
              pane === "list" ? "text-[var(--accent)]" : "text-muted"
            }`}
          >
            <IconList size={20} />
            Servers
          </button>
          <button
            type="button"
            onClick={() => navigate("/community?tab=discover")}
            className={`flex flex-1 flex-col items-center gap-0.5 py-2.5 text-[0.625rem] font-medium ${
              pane === "discover" ? "text-[var(--accent)]" : "text-muted"
            }`}
          >
            <IconCompass size={20} />
            Discover
          </button>
          <button
            type="button"
            onClick={onAdd}
            className="flex flex-1 flex-col items-center gap-0.5 py-2.5 text-[0.625rem] font-medium text-muted"
          >
            <IconPlus size={20} />
            Add
          </button>
        </nav>
      </div>
    </div>
  );
}

export function CommunityPanelHeader({
  title,
  subtitle,
  trailing,
}: {
  title: string;
  subtitle?: string;
  trailing?: ReactNode;
}) {
  return (
    <header className="flex h-12 shrink-0 items-center gap-3 border-b border-[var(--community-border)] px-4 shadow-[0_1px_0_0_var(--community-border)]">
      <div className="min-w-0 flex-1">
        <h1 className="truncate text-base font-semibold text-foreground">{title}</h1>
        {subtitle && <p className="truncate text-xs text-muted">{subtitle}</p>}
      </div>
      {trailing}
    </header>
  );
}

export function CommunityScrollBody({
  children,
  className = "",
  onScroll,
}: {
  children: ReactNode;
  className?: string;
  onScroll?: (e: React.UIEvent<HTMLDivElement>) => void;
}) {
  return (
    <div
      className={`community-scroll min-h-0 flex-1 overflow-y-auto ${className}`}
      onScroll={onScroll}
    >
      {children}
    </div>
  );
}
