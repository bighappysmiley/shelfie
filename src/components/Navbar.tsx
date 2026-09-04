import { NavLink } from "react-router-dom";
import { useLibrary } from "@/lib/library";
import { Logo } from "./Logo";
import { LibrarySwitcher } from "./LibrarySwitcher";
import { SidebarMenuButton } from "./AppSidebar";
import {
  IconHome,
  IconLibrary,
  IconPlus,
  IconLoan,
  IconSettings,
} from "./Icons";

export function Navbar() {
  const { pendingInvites, libraries } = useLibrary();
  const showSwitcher = libraries.length > 1;

  return (
    <header className="sticky top-0 z-50 nav-material hairline-b safe-top lg:hidden">
      <div className="flex h-12 items-center gap-1 px-2 sm:px-3">
        <SidebarMenuButton badge={pendingInvites.length} />
        <NavLink
          to="/home"
          className="shrink-0 rounded-[var(--radius-control)] outline-offset-2"
          aria-label="Home"
        >
          <Logo size="sm" showText={false} />
        </NavLink>
        {showSwitcher && (
          <div className="min-w-0 flex-1 px-1">
            <LibrarySwitcher compact />
          </div>
        )}
        {!showSwitcher && <div className="flex-1" />}
      </div>
    </header>
  );
}

const mobileItems = [
  { to: "/home", label: "Home", icon: IconHome, end: true },
  { to: "/library", label: "Library", icon: IconLibrary },
  { to: "/add", label: "Add", icon: IconPlus, emphasize: true },
  { to: "/loaned", label: "Loans", icon: IconLoan },
  { to: "/settings", label: "Settings", icon: IconSettings },
];

export function MobileNav() {
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 nav-material hairline-t safe-bottom lg:hidden">
      <div className="flex justify-around px-1 pt-1 pb-1">
        {mobileItems.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                `flex min-w-0 flex-1 flex-col items-center gap-0.5 px-1 py-0.5 text-[0.625rem] font-medium transition-colors ${
                  isActive ? "font-semibold text-foreground" : "text-muted"
                }`
              }
            >
              {({ isActive }) => (
                <>
                  <Icon size={item.emphasize ? 26 : 24} strokeWidth={isActive ? 2 : 1.75} />
                  <span className="truncate">{item.label}</span>
                </>
              )}
            </NavLink>
          );
        })}
      </div>
    </nav>
  );
}
