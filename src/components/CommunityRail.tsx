import { useEffect, useState, type ReactNode } from "react";
import { Link, useNavigate } from "react-router-dom";
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
      className="group relative flex w-full items-center justify-center py-1"
    >
      <span
        className={`absolute left-0 w-1 rounded-r-full bg-accent transition-all duration-200 ${
          active ? "h-9 opacity-100" : "h-2 opacity-0 group-hover:h-5 group-hover:opacity-70"
        }`}
      />
      {unread > 0 && (
        <span className="absolute right-2 top-1 z-10 flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[0.625rem] font-bold text-white">
          {unread > 9 ? "9+" : unread}
        </span>
      )}
      {server.iconUrl ? (
        <AuthedImage
          src={server.iconUrl}
          alt=""
          className={`h-11 w-11 object-cover transition-all duration-200 ${
            active ? "rounded-[0.9rem]" : "rounded-full group-hover:rounded-[0.9rem]"
          }`}
        />
      ) : (
        <span
          className={`flex h-11 w-11 items-center justify-center bg-accent/25 text-[0.75rem] font-bold text-accent transition-all duration-200 ${
            active ? "rounded-[0.9rem]" : "rounded-full group-hover:rounded-[0.9rem]"
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
        ? "rounded-[0.9rem] bg-[#23a559] text-white"
        : "rounded-full bg-[var(--community-panel)] text-[#23a559] hover:rounded-[0.9rem] hover:bg-[#23a559] hover:text-white"
      : tone === "discover"
        ? active
          ? "rounded-[0.9rem] bg-accent text-accent-contrast"
          : "rounded-full bg-[var(--community-panel)] text-muted hover:rounded-[0.9rem] hover:bg-accent/20 hover:text-accent"
        : active
          ? "rounded-[0.9rem] bg-accent text-accent-contrast"
          : "rounded-full bg-[var(--community-panel)] text-muted hover:rounded-[0.9rem] hover:bg-accent/15 hover:text-accent";

  return (
    <button
      type="button"
      onClick={onClick}
      title={label}
      aria-label={label}
      aria-current={active ? "page" : undefined}
      className="group relative flex w-full items-center justify-center py-1"
    >
      <span
        className={`absolute left-0 w-1 rounded-r-full bg-accent transition-all duration-200 ${
          active ? "h-9 opacity-100" : "h-2 opacity-0 group-hover:h-5 group-hover:opacity-70"
        }`}
      />
      <span className={`flex h-11 w-11 items-center justify-center transition-all duration-200 ${toneClass}`}>
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
    <div className="community-discord-shell flex h-full min-h-0 flex-1 overflow-hidden rounded-none bg-[var(--community-rail)] text-foreground md:rounded-[var(--radius-group)]">
      <nav
        aria-label="Servers"
        className="community-scroll hidden w-[4.5rem] shrink-0 flex-col items-stretch gap-0.5 overflow-y-auto bg-[var(--community-rail)] py-3 md:flex"
      >
        <RailButton label="Pine Bookkeeping home" onClick={() => navigate("/home")}>
          <IconHome size={22} />
        </RailButton>

        <div className="mx-auto my-1.5 h-0.5 w-8 rounded-full bg-[var(--community-border)]" />

        <RailButton label="Server list" active={pane === "list"} onClick={() => navigate("/community")}>
          <IconList size={22} />
        </RailButton>

        <div className="mx-auto my-1.5 h-0.5 w-8 rounded-full bg-[var(--community-border)]" />

        {servers.map((s) => (
          <ServerGlyph
            key={s.id}
            server={s}
            active={pane === "server" && activeServerId === s.id}
            unread={unreadByServer.get(s.id) ?? 0}
            onClick={() => navigate(`/community/s/${s.id}`)}
          />
        ))}

        <RailButton label="Add a Server" tone="add" onClick={onAdd}>
          <IconPlus size={22} />
        </RailButton>

        <RailButton
          label="Discover"
          tone="discover"
          active={pane === "discover"}
          onClick={() => navigate("/community?tab=discover")}
        >
          <IconCompass size={22} />
        </RailButton>

        <div className="mt-auto px-2 pt-3">
          <Link
            to="/account"
            className="block truncate text-center text-[0.625rem] text-muted hover:text-foreground"
          >
            Profile
          </Link>
        </div>
      </nav>

      <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden rounded-none bg-[var(--community-panel)] md:rounded-tl-2xl md:shadow-inner">
        {children}
        <nav
          aria-label="Community navigation"
          className="flex shrink-0 border-t border-[var(--community-border)] bg-[var(--community-panel)] pb-[env(safe-area-inset-bottom,0px)] md:hidden"
        >
          <button
            type="button"
            onClick={() => navigate("/home")}
            className="flex flex-1 flex-col items-center gap-0.5 py-2.5 text-[0.625rem] font-medium text-muted"
          >
            <IconHome size={20} />
            Home
          </button>
          <button
            type="button"
            onClick={() => navigate("/community")}
            className={`flex flex-1 flex-col items-center gap-0.5 py-2.5 text-[0.625rem] font-medium ${
              pane === "list" ? "text-accent" : "text-muted"
            }`}
          >
            <IconList size={20} />
            Servers
          </button>
          <button
            type="button"
            onClick={() => navigate("/community?tab=discover")}
            className={`flex flex-1 flex-col items-center gap-0.5 py-2.5 text-[0.625rem] font-medium ${
              pane === "discover" ? "text-accent" : "text-muted"
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
    <header className="flex h-12 shrink-0 items-center gap-3 border-b border-[var(--community-border)] px-4">
      <div className="min-w-0 flex-1">
        <h1 className="truncate text-[1rem] font-semibold tracking-tight text-foreground">{title}</h1>
        {subtitle && <p className="truncate text-[0.75rem] text-muted">{subtitle}</p>}
      </div>
      {trailing}
    </header>
  );
}

export function CommunityScrollBody({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <div className={`community-scroll min-h-0 flex-1 overflow-y-auto ${className}`}>{children}</div>
  );
}
