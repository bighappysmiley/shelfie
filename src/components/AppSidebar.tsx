import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/lib/auth";
import { useLibrary } from "@/lib/library";
import { useSidebar } from "@/lib/sidebar";
import { isDarkMode, setDarkMode } from "@/lib/theme";
import { UserAvatar, userDisplayName } from "@/components/UserAvatar";
import { ToggleRow } from "@/components/layout";
import { IconBell, IconChat, IconUser, IconX } from "@/components/Icons";

function SidebarButton({
  to,
  label,
  icon: Icon,
  badge,
  onNavigate,
  tabIndex,
}: {
  to: string;
  label: string;
  icon: typeof IconBell;
  badge?: number;
  onNavigate: () => void;
  tabIndex: number;
}) {
  return (
    <Link
      to={to}
      onClick={onNavigate}
      tabIndex={tabIndex}
      className="flex min-h-[48px] items-center gap-3 px-4 py-3 text-[1.0625rem] text-foreground transition-colors hover:bg-fill-secondary active:bg-fill hairline-b last:border-b-0"
    >
      <Icon size={20} className="shrink-0 text-muted" strokeWidth={1.75} />
      <span className="min-w-0 flex-1">{label}</span>
      {badge != null && badge > 0 && (
        <span className="flex h-5 min-w-[1.25rem] shrink-0 items-center justify-center rounded-full bg-accent px-1.5 text-[0.6875rem] font-semibold text-accent-contrast">
          {badge > 99 ? "99+" : badge}
        </span>
      )}
      <svg width="14" height="14" viewBox="0 0 14 14" fill="none" className="shrink-0 text-tertiary" aria-hidden>
        <path d="M5 3.5L8.5 7L5 10.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      </svg>
    </Link>
  );
}

export function AppSidebar() {
  const { open, closeSidebar } = useSidebar();
  const { user, isStaff } = useAuth();
  const { pendingInvites } = useLibrary();
  const navigate = useNavigate();
  const [isDark, setIsDark] = useState(isDarkMode);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeSidebar();
    };
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open, closeSidebar]);

  const displayName = userDisplayName(user?.email, user?.phone);
  const subtitle = user?.email ?? user?.phone ?? "";
  const tabIndex = open ? 0 : -1;

  const closeAndGo = () => closeSidebar();

  const goAccount = () => {
    closeSidebar();
    navigate("/account");
  };

  const toggleDark = (on: boolean) => {
    setDarkMode(on);
    setIsDark(on);
  };

  return (
    <div
      className={`fixed inset-0 z-[100] transition-opacity duration-200 ${
        open ? "pointer-events-auto opacity-100" : "pointer-events-none opacity-0"
      }`}
      role="dialog"
      aria-modal="true"
      aria-label="Menu"
      aria-hidden={!open}
    >
      <button
        type="button"
        className="absolute inset-0 bg-black/40 backdrop-blur-[2px]"
        aria-label="Close menu"
        tabIndex={tabIndex}
        onClick={closeSidebar}
      />

      <aside
        className={`absolute left-0 top-0 flex h-full w-[min(18.5rem,88vw)] flex-col bg-surface shadow-xl transition-transform duration-200 ease-out safe-top safe-bottom ${
          open ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex items-center justify-between px-3 pt-3 pb-1">
          <p className="text-[0.8125rem] font-medium text-muted">Menu</p>
          <button
            type="button"
            onClick={closeSidebar}
            className="inline-flex min-h-[44px] min-w-[44px] items-center justify-center rounded-full text-muted hover:bg-fill-secondary hover:text-foreground"
            aria-label="Close menu"
            tabIndex={tabIndex}
          >
            <IconX size={20} />
          </button>
        </div>

        <button
          type="button"
          onClick={goAccount}
          className="mx-3 mt-1 flex items-center gap-3 rounded-[var(--radius-group)] bg-fill-secondary px-3 py-3 text-left transition-colors hover:bg-fill active:opacity-90"
          tabIndex={tabIndex}
        >
          <UserAvatar label={subtitle || displayName} size={44} />
          <div className="min-w-0 flex-1">
            <p className="truncate text-[1.0625rem] font-semibold">{displayName}</p>
            <p className="truncate text-[0.8125rem] text-muted">{subtitle}</p>
          </div>
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" className="shrink-0 text-tertiary" aria-hidden>
            <path d="M5 3.5L8.5 7L5 10.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
        </button>

        <nav className="mx-3 mt-4 overflow-hidden rounded-[var(--radius-group)] bg-surface ring-1 ring-black/[0.04] dark:ring-white/[0.06]">
          <SidebarButton
            to="/notifications"
            label="Notifications"
            icon={IconBell}
            badge={pendingInvites.length}
            onNavigate={closeAndGo}
            tabIndex={tabIndex}
          />
          <SidebarButton
            to="/support"
            label="Support"
            icon={IconChat}
            onNavigate={closeAndGo}
            tabIndex={tabIndex}
          />
          {isStaff && (
            <SidebarButton
              to="/admin"
              label="Support Inbox"
              icon={IconChat}
              onNavigate={closeAndGo}
              tabIndex={tabIndex}
            />
          )}
          <SidebarButton
            to="/account"
            label="Account & Security"
            icon={IconUser}
            onNavigate={closeAndGo}
            tabIndex={tabIndex}
          />
        </nav>

        <div className="flex-1" />

        <div className="hairline-t px-1 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-1">
          <ToggleRow label="Dark Mode" checked={isDark} onChange={toggleDark} />
        </div>
      </aside>
    </div>
  );
}

export function SidebarMenuButton({
  badge,
  className = "",
}: {
  badge?: number;
  className?: string;
}) {
  const { toggleSidebar, open } = useSidebar();

  return (
    <button
      type="button"
      onClick={toggleSidebar}
      aria-expanded={open}
      className={`relative inline-flex min-h-[44px] min-w-[44px] items-center justify-center rounded-full text-muted transition-colors hover:bg-fill-secondary hover:text-foreground ${className}`}
      aria-label="Open menu"
    >
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden>
        <path d="M4 7h16M4 12h16M4 17h16" strokeLinecap="round" />
      </svg>
      {badge != null && badge > 0 && (
        <span className="absolute right-0.5 top-0.5 flex h-4 min-w-[1rem] items-center justify-center rounded-full bg-accent px-1 text-[0.625rem] font-bold text-accent-contrast">
          {badge > 9 ? "9+" : badge}
        </span>
      )}
    </button>
  );
}
