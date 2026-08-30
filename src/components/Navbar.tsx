import { NavLink } from "react-router-dom";
import { Container } from "./layout";

const links = [
  { to: "/", label: "Home" },
  { to: "/library", label: "Library" },
  { to: "/loaned", label: "Loaned Out" },
  { to: "/borrowers", label: "Borrowers" },
  { to: "/stats", label: "Stats" },
];

export function Navbar() {
  return (
    <header className="sticky top-0 z-50 border-b border-black/8 bg-surface safe-top dark:border-white/10">
      <Container>
        <div className="flex h-14 items-center justify-between">
          <NavLink to="/" className="text-[1.05rem] font-semibold tracking-tight">
            Shelfie
          </NavLink>
          <nav className="hidden items-center gap-6 sm:flex">
            {links.map((l) => (
              <NavLink
                key={l.to}
                to={l.to}
                className={({ isActive }) =>
                  `text-[0.95rem] transition-colors ${
                    isActive ? "font-medium text-foreground" : "text-muted hover:text-foreground"
                  }`
                }
              >
                {l.label}
              </NavLink>
            ))}
          </nav>
          <NavLink
            to="/add"
            className="rounded-lg bg-accent px-3 py-1.5 text-[0.9rem] font-medium text-white hover:bg-accent-hover dark:text-background"
          >
            Add Book
          </NavLink>
        </div>
      </Container>
    </header>
  );
}

export function MobileNav() {
  const items = [
    { to: "/", label: "Home", icon: "⌂" },
    { to: "/library", label: "Library", icon: "☰" },
    { to: "/add", label: "Add", icon: "+" },
    { to: "/loaned", label: "Loaned", icon: "↗" },
    { to: "/stats", label: "Stats", icon: "◎" },
    { to: "/settings", label: "Settings", icon: "⚙" },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-black/8 bg-surface safe-bottom sm:hidden dark:border-white/10">
      <div className="flex justify-around py-2">
        {items.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) =>
              `flex flex-col items-center px-3 py-1 text-xs ${
                isActive ? "font-medium text-foreground" : "text-muted"
              }`
            }
          >
            <span className="text-lg">{item.icon}</span>
            {item.label}
          </NavLink>
        ))}
      </div>
    </nav>
  );
}
