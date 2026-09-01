import { useEffect, useState, type ReactNode } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/lib/auth";
import { listMyServers } from "@/lib/community";
import type { CommunityServer } from "@/lib/community-types";
import { AuthedImage } from "@/components/AuthedImage";
import { IconCompass, IconList, IconPlus } from "@/components/Icons";

export type CommunityPane = "list" | "discover" | "server";

function ServerGlyph({
  server,
  active,
  onClick,
}: {
  server: CommunityServer;
  active: boolean;
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
        className={`absolute left-0 w-1 rounded-r-full bg-white transition-all duration-200 ${
          active ? "h-9 opacity-100" : "h-2 opacity-0 group-hover:h-5 group-hover:opacity-60"
        }`}
      />
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
          className={`flex h-11 w-11 items-center justify-center bg-[#5865f2]/35 text-[0.75rem] font-bold text-[#c9cdfb] transition-all duration-200 ${
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
        ? "rounded-[0.9rem] bg-emerald-500 text-white"
        : "rounded-full bg-[#313338] text-emerald-400 hover:rounded-[0.9rem] hover:bg-emerald-500 hover:text-white"
      : tone === "discover"
        ? active
          ? "rounded-[0.9rem] bg-[#5865f2] text-white"
          : "rounded-full bg-[#313338] text-[#949ba4] hover:rounded-[0.9rem] hover:bg-[#5865f2] hover:text-white"
        : active
          ? "rounded-[0.9rem] bg-[#5865f2] text-white"
          : "rounded-full bg-[#313338] text-[#949ba4] hover:rounded-[0.9rem] hover:bg-[#404249] hover:text-white";

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
        className={`absolute left-0 w-1 rounded-r-full bg-white transition-all duration-200 ${
          active ? "h-9 opacity-100" : "h-2 opacity-0 group-hover:h-5 group-hover:opacity-60"
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
      .then((list) => {
        if (!cancelled) setServers(list);
      })
      .catch(() => {
        if (!cancelled) setServers([]);
      });
    return () => {
      cancelled = true;
    };
  }, [user, railTick, pane, activeServerId]);

  return (
    <div className="community-discord-shell -mx-4 -my-4 flex min-h-[calc(100dvh-4.5rem)] overflow-hidden bg-[#1e1f22] text-[#f2f3f5] sm:-mx-5 sm:-my-5 lg:-mx-8 lg:-my-7 lg:min-h-[calc(100dvh-3.5rem)] lg:rounded-[var(--radius-group)]">
      <nav
        aria-label="Servers"
        className="flex w-[4.5rem] shrink-0 flex-col items-stretch gap-0.5 overflow-y-auto bg-[#1e1f22] py-3"
      >
        <RailButton label="Server list" active={pane === "list"} onClick={() => navigate("/community")}>
          <IconList size={22} />
        </RailButton>

        <div className="mx-auto my-1.5 h-0.5 w-8 rounded-full bg-white/10" />

        {servers.map((s) => (
          <ServerGlyph
            key={s.id}
            server={s}
            active={pane === "server" && activeServerId === s.id}
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
            className="block truncate text-center text-[0.625rem] text-white/40 hover:text-white/70"
          >
            Profile
          </Link>
        </div>
      </nav>

      <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden rounded-tl-2xl bg-[#2b2d31] text-[#f2f3f5] shadow-inner">
        {children}
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
    <header className="flex h-12 shrink-0 items-center gap-3 border-b border-black/20 px-4">
      <div className="min-w-0 flex-1">
        <h1 className="truncate text-[1rem] font-semibold tracking-tight text-white">{title}</h1>
        {subtitle && <p className="truncate text-[0.75rem] text-white/50">{subtitle}</p>}
      </div>
      {trailing}
    </header>
  );
}
