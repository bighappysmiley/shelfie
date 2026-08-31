import { NavLink } from "react-router-dom";
import { Container } from "./layout";
import { useAuth } from "@/lib/auth";
import {
  IconHome,
  IconLibrary,
  IconPlus,
  IconLoan,
  IconChat,
  IconSettings,
} from "./Icons";

const desktopLinks = [
  { to: "/library", label: "Library" },
  { to: "/locations", label: "Locations" },
  { to: "/loaned", label: "Loans" },
  { to: "/borrowers", label: "Borrowers" },
  { to: "/stats", label: "Reports" },
  { to: "/support", label: "Support" },
];

export function Navbar() {
  const { isStaff } = useAuth();

  return (
    <header className="sticky top-0 z-50 nav-material hairline-b safe-top">
      <Container>
        <div className="flex h-11 items-center gap-2">
          <NavLink
            to="/home"
            className="shrink-0 text-[1.0625rem] font-semibold tracking-tight text-foreground"
          >
            Shelfie
          </NavLink>
          <nav className="hidden flex-1 items-center gap-0.5 md:flex">
            {desktopLinks.map((l) => (
              <NavLink
                key={l.to}
                to={l.to}
                className={({ isActive }) =>
                  `rounded-[var(--radius-control)] px-2.5 py-1 text-[0.9375rem] transition-colors ${
                    isActive
                      ? "font-semibold text-foreground"
                      : "text-muted hover:text-foreground"
                  }`
                }
              >
                {l.label}
              </NavLink>
            ))}
            {isStaff && (
              <NavLink
                to="/admin"
                className={({ isActive }) =>
                  `rounded-[var(--radius-control)] px-2.5 py-1 text-[0.9375rem] transition-colors ${
                    isActive
                      ? "font-semibold text-foreground"
                      : "text-muted hover:text-foreground"
                  }`
                }
              >
                Inbox
              </NavLink>
            )}
          </nav>
          <div className="ml-auto flex items-center gap-1">
            <NavLink
              to="/settings"
              className={({ isActive }) =>
                `inline-flex min-h-[44px] min-w-[44px] items-center justify-center rounded-full text-muted transition-colors hover:text-foreground ${
                  isActive ? "text-foreground" : ""
                }`
              }
              aria-label="Settings"
            >
              <IconSettings size={22} />
            </NavLink>
            <NavLink
              to="/add"
              className="inline-flex min-h-[32px] items-center gap-1 rounded-[var(--radius-pill)] bg-accent px-3.5 text-[0.9375rem] font-medium text-accent-contrast hover:bg-accent-hover"
            >
              <IconPlus size={16} />
              <span className="hidden sm:inline">Add</span>
            </NavLink>
          </div>
        </div>
      </Container>
    </header>
  );
}

const mobileItems = [
  { to: "/home", label: "Home", icon: IconHome, end: true },
  { to: "/library", label: "Library", icon: IconLibrary },
  { to: "/add", label: "Add", icon: IconPlus, emphasize: true },
  { to: "/support", label: "Chat", icon: IconChat },
  { to: "/loaned", label: "Loans", icon: IconLoan },
];

export function MobileNav() {
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 nav-material hairline-t safe-bottom md:hidden">
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
