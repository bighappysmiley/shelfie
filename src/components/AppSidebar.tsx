import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/lib/auth";
import { useLibrary } from "@/lib/library";
import { useSidebar } from "@/lib/sidebar";
import {
  getThemePreference,
  isDarkMode,
  setThemePreference,
  type ThemePreference,
} from "@/lib/theme";
import { Logo } from "@/components/Logo";
import { LibrarySwitcher } from "@/components/LibrarySwitcher";
import { UserAvatar, userDisplayName } from "@/components/UserAvatar";
import { SegmentedControl } from "@/components/layout";
import {
  IconApps,
  IconBell,
  IconChat,
  IconCommunity,
  IconHome,
  IconLibrary,
  IconLoan,
  IconPeople,
  IconPlus,
  IconSettings,
  IconShelf,
  IconStats,
  IconUser,
  IconX,
} from "@/components/Icons";

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

const browseLinks = [
  { to: "/home", label: "Overview", icon: IconHome },
  { to: "/library", label: "Library", icon: IconLibrary },
  { to: "/locations", label: "Locations", icon: IconShelf },
  { to: "/loaned", label: "Loans", icon: IconLoan },
  { to: "/borrowers", label: "Borrowers", icon: IconPeople },
  { to: "/community", label: "Community", icon: IconCommunity },
  { to: "/stats", label: "Reports", icon: IconStats },
] as const;

export function AppSidebar() {
  const { open, closeSidebar } = useSidebar();
  const { user, isStaff, userProfile } = useAuth();
  const { pendingInvites } = useLibrary();
  const navigate = useNavigate();
  const [themePref, setThemePref] = useState<ThemePreference>(getThemePreference);
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

  useEffect(() => {
    const sync = () => {
      setThemePref(getThemePreference());
      setIsDark(isDarkMode());
    };
    sync();
    window.addEventListener("pine-theme-change", sync);
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    mq.addEventListener("change", sync);
    return () => {
      window.removeEventListener("pine-theme-change", sync);
      mq.removeEventListener("change", sync);
    };
  }, []);

  const displayName = userDisplayName(userProfile?.displayName, user?.email, user?.phone);
  const avatarLabel = userProfile?.displayName || user?.email || user?.phone || displayName;
  const subtitle = user?.email ?? user?.phone ?? "";
  const tabIndex = open ? 0 : -1;

  const closeAndGo = () => closeSidebar();

  const goAccount = () => {
    closeSidebar();
    navigate("/account");
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
        <div className="flex items-center justify-between gap-2 px-3 pt-3 pb-1">
          <Logo size="sm" showText={false} />
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

        <div className="px-3 pb-2 pt-1">
          <LibrarySwitcher />
        </div>

        <div className="px-3 pb-3">
          <Link
            to="/add"
            onClick={closeAndGo}
            tabIndex={tabIndex}
            className="flex min-h-[44px] items-center justify-center gap-1.5 rounded-[var(--radius-pill)] bg-accent px-3 text-[0.9375rem] font-medium text-accent-contrast hover:bg-accent-hover"
          >
            <IconPlus size={16} />
            Add Book
          </Link>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-3 pb-3">
          <button
            type="button"
            onClick={goAccount}
            className="mb-3 flex w-full items-center gap-3 rounded-[var(--radius-group)] bg-fill-secondary px-3 py-3 text-left transition-colors hover:bg-fill active:opacity-90"
            tabIndex={tabIndex}
          >
            <UserAvatar label={avatarLabel} size={40} />
            <div className="min-w-0 flex-1">
              <p className="truncate text-[1rem] font-semibold">{displayName}</p>
              <p className="truncate text-[0.8125rem] text-muted">{subtitle}</p>
            </div>
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" className="shrink-0 text-tertiary" aria-hidden>
              <path d="M5 3.5L8.5 7L5 10.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
          </button>

          <nav className="mb-3 overflow-hidden rounded-[var(--radius-group)] bg-surface ring-1 ring-black/[0.04] dark:ring-white/[0.06]">
            {browseLinks.map((item) => (
              <SidebarButton
                key={item.to}
                to={item.to}
                label={item.label}
                icon={item.icon}
                onNavigate={closeAndGo}
                tabIndex={tabIndex}
              />
            ))}
          </nav>

          <nav className="overflow-hidden rounded-[var(--radius-group)] bg-surface ring-1 ring-black/[0.04] dark:ring-white/[0.06]">
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
                label="Admin"
                icon={IconApps}
                onNavigate={closeAndGo}
                tabIndex={tabIndex}
              />
            )}
            <SidebarButton
              to="/settings"
              label="Library Settings"
              icon={IconSettings}
              onNavigate={closeAndGo}
              tabIndex={tabIndex}
            />
            <SidebarButton
              to="/account"
              label="Account & Security"
              icon={IconUser}
              onNavigate={closeAndGo}
              tabIndex={tabIndex}
            />
          </nav>
        </div>

        <div className="hairline-t px-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-3">
          <p className="mb-1.5 text-[0.75rem] text-muted">
            Appearance{themePref === "system" ? (isDark ? " · Dark" : " · Light") : ""}
          </p>
          <SegmentedControl
            value={themePref}
            onChange={(v) => {
              setThemePreference(v);
              setThemePref(v);
              setIsDark(isDarkMode());
            }}
            options={[
              { value: "light", label: "Light" },
              { value: "system", label: "Auto" },
              { value: "dark", label: "Dark" },
            ]}
          />
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
