import type { ReactNode } from "react";
import { AuthedImage } from "@/components/AuthedImage";
import { formatPopularity, type CommunityServer } from "@/lib/community-types";

function ServerIcon({ server, className }: { server: CommunityServer; className: string }) {
  if (server.iconUrl) {
    return <AuthedImage src={server.iconUrl} alt="" className={`object-cover ${className}`} />;
  }
  return (
    <div className={`flex items-center justify-center bg-accent/25 font-bold text-accent ${className}`}>
      {server.name.slice(0, 2).toUpperCase()}
    </div>
  );
}

export function DiscoverServerCard({
  server,
  variant = "grid",
  rank,
  trailing,
  onOpen,
}: {
  server: CommunityServer;
  variant?: "hero" | "featured" | "grid";
  rank?: number;
  trailing?: ReactNode;
  onOpen: () => void;
}) {
  const isHero = variant === "hero";
  const isFeatured = variant === "featured" || isHero;

  return (
    <article
      className={`community-discover-card flex flex-col overflow-hidden rounded-2xl bg-[var(--community-panel)] ring-1 ring-[var(--community-border)] ${
        isHero ? "min-w-[min(100%,20rem)]" : isFeatured ? "min-w-[11rem] shrink-0" : ""
      }`}
    >
      <button type="button" onClick={onOpen} className="flex flex-1 flex-col text-left">
        <div
          className={`relative bg-gradient-to-br from-emerald-600/40 via-accent/20 to-[var(--community-rail)] ${
            isHero ? "h-28" : isFeatured ? "h-20" : "h-16"
          }`}
        >
          <div className={`absolute ${isHero ? "bottom-3 left-3" : "bottom-2 left-2"}`}>
            <ServerIcon
              server={server}
              className={`rounded-xl ring-2 ring-[var(--community-panel)] ${
                isHero ? "h-14 w-14 text-lg" : isFeatured ? "h-11 w-11 text-sm" : "h-10 w-10 text-xs"
              }`}
            />
          </div>
          {server.isOfficial && (
            <span className="absolute right-2 top-2 rounded-full bg-accent/25 px-2 py-0.5 text-[0.625rem] font-bold uppercase tracking-wide text-accent">
              Official
            </span>
          )}
          {rank != null && !server.isOfficial && (
            <span className="absolute right-2 top-2 flex h-6 w-6 items-center justify-center rounded-full bg-foreground/15 text-[0.6875rem] font-bold text-foreground">
              #{rank}
            </span>
          )}
        </div>
        <div className={`flex flex-1 flex-col ${isHero ? "gap-2 p-4" : "gap-1 p-3"}`}>
          <h3 className={`truncate font-semibold text-foreground ${isHero ? "text-[1.0625rem]" : "text-[0.9375rem]"}`}>
            {server.name}
          </h3>
          <p className={`text-muted ${isHero ? "line-clamp-2 text-[0.8125rem]" : "line-clamp-2 text-[0.75rem]"}`}>
            {server.description || formatPopularity(server)}
          </p>
          <p className="mt-auto text-[0.6875rem] text-muted/80">{formatPopularity(server)}</p>
        </div>
      </button>
      {trailing && <div className="border-t border-[var(--community-border)] px-3 py-2">{trailing}</div>}
    </article>
  );
}
