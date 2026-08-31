import { NavLink } from "react-router-dom";
import { Container } from "./layout";
import {
  IconHome,
  IconLibrary,
  IconPlus,
  IconLoan,
  IconPeople,
  IconShelf,
  IconSettings,
} from "./Icons";

const desktopLinks = [
  { to: "/library", label: "Library" },
  { to: "/locations", label: "Locations" },
  { to: "/loaned", label: "Loaned" },
  { to: "/borrowers", label: "Borrowers" },
  { to: "/stats", label: "Stats" },
];

export function Navbar() {
  return (
    <header className="sticky top-0 z-50 border-b border-black/8 bg-surface/95 backdrop-blur-sm safe-top dark:border-white/10">
      <Container>
        <div className="flex h-14 items-center gap-4">
          <NavLink
            to="/"
            className="shrink-0 text-[1.05rem] font-semibold tracking-tight"
          >
            Shelfie
          </NavLink>
          <nav className="hidden flex-1 items-center gap-1 md:flex">
            {desktopLinks.map((l) => (
              <NavLink
                key={l.to}
                to={l.to}
                className={({ isActive }) =>
                  `rounded-lg px-3 py-1.5 text-[0.9rem] transition-colors ${
                    isActive
                      ? "bg-accent-soft font-medium text-foreground"
                      : "text-muted hover:bg-black/[0.03] hover:text-foreground dark:hover:bg-white/[0.04]"
                  }`
                }
              >
                {l.label}
              </NavLink>
            ))}
          </nav>
          <div className="ml-auto flex items-center gap-2">
            <NavLink
              to="/settings"
              className={({ isActive }) =>
                `inline-flex rounded-lg p-2 text-muted transition-colors hover:bg-black/[0.03] hover:text-foreground dark:hover:bg-white/[0.04] ${
                  isActive ? "text-foreground" : ""
                }`
              }
              aria-label="Settings"
            >
              <IconSettings size={18} />
            </NavLink>
            <NavLink
              to="/add"
              className="inline-flex items-center gap-1.5 rounded-lg bg-accent px-3 py-1.5 text-[0.9rem] font-medium text-white hover:bg-accent-hover dark:text-background"
            >
              <IconPlus size={16} />
              <span className="hidden sm:inline">Add book</span>
              <span className="sm:hidden">Add</span>
            </NavLink>
          </div>
        </div>
      </Container>
    </header>
  );
}

const mobileItems = [
  { to: "/", label: "Home", icon: IconHome, end: true },
  { to: "/library", label: "Library", icon: IconLibrary },
  { to: "/add", label: "Add", icon: IconPlus, emphasize: true },
  { to: "/loaned", label: "Loaned", icon: IconLoan },
  { to: "/locations", label: "Places", icon: IconShelf },
  { to: "/borrowers", label: "People", icon: IconPeople },
];

export function MobileNav() {
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-black/8 bg-surface/95 backdrop-blur-sm safe-bottom md:hidden dark:border-white/10">
      <div className="flex justify-around px-1 py-1.5">
        {mobileItems.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                `flex min-w-0 flex-1 flex-col items-center gap-0.5 rounded-lg px-1 py-1.5 text-[0.65rem] transition-colors ${
                  item.emphasize
                    ? isActive
                      ? "text-foreground"
                      : "text-foreground"
                    : isActive
                      ? "font-medium text-foreground"
                      : "text-muted"
                }`
              }
            >
              {({ isActive }) => (
                <>
                  <span
                    className={`flex h-8 w-8 items-center justify-center rounded-lg ${
                      item.emphasize
                        ? "bg-accent text-white dark:text-background"
                        : isActive
                          ? "bg-accent-soft"
                          : ""
                    }`}
                  >
                    <Icon size={item.emphasize ? 18 : 20} />
                  </span>
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
