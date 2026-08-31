import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/lib/auth";
import { useLibrary } from "@/lib/library";
import { useSidebar } from "@/lib/sidebar";
import { isDarkMode, setDarkMode } from "@/lib/theme";
import { api } from "@/lib/api";
import { UserAvatar, userDisplayName } from "@/components/UserAvatar";
import { ToggleRow } from "@/components/layout";
import { IconBell, IconChat, IconX } from "@/components/Icons";
import type { LoanWithDetails } from "@/lib/types";

function SidebarNavItem({
  to,
  icon: Icon,
  label,
  badge,
  onClick,
}: {
  to: string;
  icon: typeof IconBell;
  label: string;
  badge?: number;
  onClick?: () => void;
}) {
  return (
    <Link
      to={to}
      onClick={onClick}
      className="flex min-h-[44px] items-center gap-3 rounded-[var(--radius-control)] px-3 py-2.5 text-[1rem] text-foreground transition-colors hover:bg-fill-secondary active:bg-fill"
    >
      <Icon size={20} className="shrink-0 text-muted" />
      <span className="flex-1">{label}</span>
      {badge != null && badge > 0 && (
        <span className="flex h-5 min-w-[1.25rem] items-center justify-center rounded-full bg-accent px-1.5 text-[0.6875rem] font-semibold text-accent-contrast">
          {badge > 99 ? "99+" : badge}
        </span>
      )}
    </Link>
  );
}

export function AppSidebar() {
  const { open, closeSidebar } = useSidebar();
  const { user, isStaff } = useAuth();
  const { pendingInvites, refreshLibraries } = useLibrary();
  const navigate = useNavigate();
  const [isDark, setIsDark] = useState(isDarkMode);
  const [overdueCount, setOverdueCount] = useState(0);
  const [dueSoonCount, setDueSoonCount] = useState(0);

  useEffect(() => {
    if (!open) return;

    const today = new Date().toISOString().slice(0, 10);
    const soon = new Date();
    soon.setDate(soon.getDate() + 7);
    const soonStr = soon.toISOString().slice(0, 10);

    api.loans
      .list(true)
      .then((loans: LoanWithDetails[]) => {
        setOverdueCount(loans.filter((l) => l.loan.dueDate && l.loan.dueDate < today).length);
        setDueSoonCount(
          loans.filter(
            (l) =>
              l.loan.dueDate &&
              l.loan.dueDate >= today &&
              l.loan.dueDate <= soonStr,
          ).length,
        );
      })
      .catch(() => {
        setOverdueCount(0);
        setDueSoonCount(0);
      });

    refreshLibraries().catch(() => {});
  }, [open, refreshLibraries]);

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

  const notificationCount =
    pendingInvites.length + overdueCount + dueSoonCount;

  const displayName = userDisplayName(user?.email, user?.phone);
  const subtitle = user?.email ?? user?.phone ?? "";

  const go = (path: string) => {
    closeSidebar();
    navigate(path);
  };

  const toggleDark = (on: boolean) => {
    setDarkMode(on);
    setIsDark(on);
  };

  const acceptInvite = async (inviteId: string) => {
    try {
      await api.libraries.acceptInvite(inviteId);
      await refreshLibraries();
    } catch {
      /* ignore */
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[100]" role="dialog" aria-modal="true" aria-label="Menu">
      <button
        type="button"
        className="absolute inset-0 bg-black/40 backdrop-blur-[2px] transition-opacity"
        aria-label="Close menu"
        onClick={closeSidebar}
      />

      <aside
        className="absolute left-0 top-0 flex h-full w-[min(18.5rem,88vw)] flex-col bg-surface shadow-xl safe-top safe-bottom"
        style={{ animation: "sidebar-in 0.22s ease-out" }}
      >
        <div className="flex items-center justify-between px-3 pt-3 pb-1">
          <p className="text-[0.8125rem] font-medium text-muted">Menu</p>
          <button
            type="button"
            onClick={closeSidebar}
            className="inline-flex min-h-[44px] min-w-[44px] items-center justify-center rounded-full text-muted hover:bg-fill-secondary hover:text-foreground"
            aria-label="Close menu"
          >
            <IconX size={20} />
          </button>
        </div>

        <button
          type="button"
          onClick={() => go("/account")}
          className="mx-3 mt-1 flex items-center gap-3 rounded-[var(--radius-group)] bg-fill-secondary px-3 py-3 text-left transition-colors hover:bg-fill active:opacity-90"
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

        <nav className="flex-1 overflow-y-auto px-3 py-4">
          <p className="mb-2 px-3 text-[0.6875rem] font-semibold uppercase tracking-wide text-tertiary">
            App
          </p>
          <div className="space-y-0.5">
            <SidebarNavItem
              to="/notifications"
              icon={IconBell}
              label="Notifications"
              badge={notificationCount}
              onClick={closeSidebar}
            />
            <SidebarNavItem
              to="/support"
              icon={IconChat}
              label="Support"
              onClick={closeSidebar}
            />
            {isStaff && (
              <SidebarNavItem
                to="/admin"
                icon={IconChat}
                label="Support Inbox"
                onClick={closeSidebar}
              />
            )}
          </div>

          {notificationCount > 0 && (
            <div className="mt-5">
              <p className="mb-2 px-3 text-[0.6875rem] font-semibold uppercase tracking-wide text-tertiary">
                Recent
              </p>
              <div className="space-y-1">
                {pendingInvites.slice(0, 3).map((inv) => (
                  <div
                    key={inv.id}
                    className="rounded-[var(--radius-control)] bg-fill-secondary px-3 py-2.5"
                  >
                    <p className="text-[0.9375rem] font-medium">
                      Invite to {inv.libraryName ?? "library"}
                    </p>
                    <button
                      type="button"
                      onClick={() => acceptInvite(inv.id)}
                      className="mt-1 text-[0.8125rem] text-link"
                    >
                      Accept invitation
                    </button>
                  </div>
                ))}
                {overdueCount > 0 && (
                  <button
                    type="button"
                    onClick={() => go("/notifications")}
                    className="w-full rounded-[var(--radius-control)] bg-destructive-bg px-3 py-2.5 text-left text-[0.9375rem] text-destructive"
                  >
                    {overdueCount} overdue loan{overdueCount === 1 ? "" : "s"}
                  </button>
                )}
                {dueSoonCount > 0 && overdueCount === 0 && (
                  <button
                    type="button"
                    onClick={() => go("/notifications")}
                    className="w-full rounded-[var(--radius-control)] bg-warning-bg px-3 py-2.5 text-left text-[0.9375rem] text-warning"
                  >
                    {dueSoonCount} loan{dueSoonCount === 1 ? "" : "s"} due soon
                  </button>
                )}
              </div>
            </div>
          )}
        </nav>

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
  const { toggleSidebar } = useSidebar();

  return (
    <button
      type="button"
      onClick={toggleSidebar}
      className={`relative inline-flex min-h-[44px] min-w-[44px] items-center justify-center rounded-full text-muted transition-colors hover:bg-fill-secondary hover:text-foreground ${className}`}
      aria-label="Open menu"
    >
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden>
        <path d="M4 7h16M4 12h16M4 17h16" strokeLinecap="round" />
      </svg>
      {badge != null && badge > 0 && (
        <span className="absolute right-1 top-1 flex h-4 min-w-[1rem] items-center justify-center rounded-full bg-accent px-1 text-[0.625rem] font-bold text-accent-contrast">
          {badge > 9 ? "9+" : badge}
        </span>
      )}
    </button>
  );
}
