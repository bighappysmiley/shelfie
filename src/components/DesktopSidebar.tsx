import { NavLink } from "react-router-dom";
import { useAuth } from "@/lib/auth";
import { useLibrary } from "@/lib/library";
import { isDarkMode, setDarkMode } from "@/lib/theme";
import { useEffect, useState } from "react";
import { Logo } from "./Logo";
import { LibrarySwitcher } from "./LibrarySwitcher";
import { UserAvatar, userDisplayName } from "./UserAvatar";
import {
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
} from "./Icons";

const primaryNav = [
  { to: "/home", label: "Overview", icon: IconHome, end: true },
  { to: "/library", label: "Library", icon: IconLibrary },
  { to: "/locations", label: "Locations", icon: IconShelf },
  { to: "/loaned", label: "Loans", icon: IconLoan },
  { to: "/borrowers", label: "Borrowers", icon: IconPeople },
  { to: "/community", label: "Community", icon: IconCommunity },
  { to: "/stats", label: "Reports", icon: IconStats },
  { to: "/settings", label: "Library Settings", icon: IconSettings },
];

const secondaryNav = [
  { to: "/notifications", label: "Notifications", icon: IconBell },
  { to: "/support", label: "Support", icon: IconChat },
  { to: "/account", label: "Account", icon: IconUser },
];

function NavItem({
  to,
  label,
  icon: Icon,
  end,
  badge,
}: {
  to: string;
  label: string;
  icon: typeof IconHome;
  end?: boolean;
  badge?: number;
}) {
  return (
    <NavLink
      to={to}
      end={end}
      className={({ isActive }) =>
        `flex items-center gap-3 rounded-[var(--radius-control)] px-3 py-2 text-[0.9375rem] transition-colors ${
          isActive
            ? "bg-accent-soft font-semibold text-foreground"
            : "text-muted hover:bg-fill-secondary hover:text-foreground"
        }`
      }
    >
      <Icon size={18} className="shrink-0" strokeWidth={1.75} />
      <span className="min-w-0 flex-1 truncate">{label}</span>
      {badge != null && badge > 0 && (
        <span className="flex h-5 min-w-[1.25rem] items-center justify-center rounded-full bg-accent px-1.5 text-[0.6875rem] font-semibold text-accent-contrast">
          {badge > 99 ? "99+" : badge}
        </span>
      )}
    </NavLink>
  );
}

export function DesktopSidebar() {
  const { user, userProfile, isStaff } = useAuth();
  const { pendingInvites } = useLibrary();
  const [isDark, setIsDark] = useState(isDarkMode);

  useEffect(() => {
    setIsDark(isDarkMode());
  }, []);

  const displayName = userDisplayName(userProfile?.displayName, user?.email, user?.phone);
  const avatarLabel = userProfile?.displayName || user?.email || user?.phone || displayName;

  return (
    <aside className="fixed inset-y-0 left-0 z-40 hidden w-[15.5rem] flex-col border-r border-hairline bg-surface lg:flex">
      <div className="flex items-center gap-2 px-4 pt-5 pb-4">
        <NavLink to="/home" className="rounded-[var(--radius-control)] outline-offset-2">
          <Logo size="sm" />
        </NavLink>
      </div>

      <div className="px-3 pb-3">
        <LibrarySwitcher />
      </div>

      <div className="px-3 pb-3">
        <NavLink
          to="/add"
          className="flex items-center justify-center gap-1.5 rounded-[var(--radius-pill)] bg-accent px-3 py-2.5 text-[0.9375rem] font-medium text-accent-contrast hover:bg-accent-hover"
        >
          <IconPlus size={16} />
          Add Book
        </NavLink>
      </div>

      <nav className="flex-1 space-y-0.5 overflow-y-auto px-2 pb-3">
        {primaryNav.map((item) => (
          <NavItem key={item.to} {...item} />
        ))}
        <div className="my-3 mx-2 hairline-t" />
        {secondaryNav.map((item) => (
          <NavItem
            key={item.to}
            {...item}
            badge={item.to === "/notifications" ? pendingInvites.length : undefined}
          />
        ))}
        {isStaff && (
          <NavItem to="/admin" label="Support Inbox" icon={IconChat} />
        )}
      </nav>

      <div className="hairline-t px-3 py-3">
        <NavLink
          to="/account"
          className="mb-2 flex items-center gap-3 rounded-[var(--radius-control)] px-2 py-2 transition-colors hover:bg-fill-secondary"
        >
          <UserAvatar label={avatarLabel} size={36} />
          <div className="min-w-0 flex-1">
            <p className="truncate text-[0.9375rem] font-medium">{displayName}</p>
            <p className="truncate text-[0.75rem] text-muted">
              {user?.email ?? user?.phone ?? "Account"}
            </p>
          </div>
        </NavLink>
        <label className="flex cursor-pointer items-center justify-between gap-3 rounded-[var(--radius-control)] px-2 py-2 text-[0.875rem] text-muted hover:bg-fill-secondary">
          <span>Dark mode</span>
          <input
            type="checkbox"
            className="h-4 w-4 accent-[var(--accent)]"
            checked={isDark}
            onChange={(e) => {
              setDarkMode(e.target.checked);
              setIsDark(e.target.checked);
            }}
          />
        </label>
      </div>
    </aside>
  );
}
