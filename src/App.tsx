import { Link } from "react-router-dom";
import { BrowserRouter, Routes, Route, Outlet } from "react-router-dom";
import { AuthProvider, useAuth } from "@/lib/auth";
import { Navbar, MobileNav } from "@/components/Navbar";
import { Container } from "@/components/layout";
import { RequireAuth } from "@/components/RequireAuth";
import { syncPending } from "@/lib/offline";
import { LandingPage, LoginPage, SignupPage } from "@/pages/Auth";
import { HomePage } from "@/pages/Home";
import { LibraryPage } from "@/pages/Library";
import { LocationsPage } from "@/pages/Locations";
import { AddBookPage } from "@/pages/AddBook";
import { BookDetailPage } from "@/pages/BookDetail";
import { LoanedOutPage } from "@/pages/LoanedOut";
import { BorrowersPage } from "@/pages/Borrowers";
import { BorrowerDetailPage } from "@/pages/BorrowerDetail";
import { StatsPage } from "@/pages/Stats";
import { SettingsPage } from "@/pages/Settings";
import { SupportPage } from "@/pages/Support";
import { SupportTicketPage } from "@/pages/SupportTicket";
import { AdminPage } from "@/pages/Admin";
import { useEffect } from "react";

function PublicShell() {
  return (
    <div className="min-h-full">
      <a href="#main" className="skip-link">
        Skip to content
      </a>
      <header className="border-b border-black/10 bg-surface safe-top dark:border-white/10">
        <Container>
          <div className="flex h-12 items-center justify-between">
            <Link to="/" className="text-base font-semibold tracking-tight text-foreground">
              Shelfie
            </Link>
            <div className="flex items-center gap-2">
              <Link
                to="/login"
                className="rounded-md px-2.5 py-1 text-[0.875rem] text-muted hover:text-foreground"
              >
                Sign in
              </Link>
              <Link
                to="/signup"
                className="rounded-md bg-accent px-2.5 py-1 text-[0.875rem] font-medium text-accent-contrast hover:bg-accent-hover"
              >
                Create account
              </Link>
            </div>
          </div>
        </Container>
      </header>
      <main id="main">
        <Outlet />
      </main>
    </div>
  );
}

function AppShell() {
  const { user } = useAuth();

  useEffect(() => {
    const theme = localStorage.getItem("shelfie-theme");
    if (theme === "dark") {
      document.documentElement.classList.add("dark");
    }

    const handleOnline = () => {
      if (user) syncPending();
    };
    window.addEventListener("online", handleOnline);
    return () => window.removeEventListener("online", handleOnline);
  }, [user]);

  return (
    <div className="min-h-full pb-20 md:pb-0">
      <a href="#main" className="skip-link">
        Skip to content
      </a>
      <Navbar />
      <main id="main" className="py-4 sm:py-5">
        <Container>
          <Outlet />
        </Container>
      </main>
      <MobileNav />
    </div>
  );
}

function AppRoutes() {
  return (
    <Routes>
      <Route element={<PublicShell />}>
        <Route path="/" element={<LandingPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/signup" element={<SignupPage />} />
      </Route>

      <Route element={<RequireAuth />}>
        <Route element={<AppShell />}>
          <Route path="/home" element={<HomePage />} />
          <Route path="/library" element={<LibraryPage />} />
          <Route path="/locations" element={<LocationsPage />} />
          <Route path="/add" element={<AddBookPage />} />
          <Route path="/book/:id" element={<BookDetailPage />} />
          <Route path="/loaned" element={<LoanedOutPage />} />
          <Route path="/borrowers" element={<BorrowersPage />} />
          <Route path="/borrowers/:id" element={<BorrowerDetailPage />} />
          <Route path="/stats" element={<StatsPage />} />
          <Route path="/support" element={<SupportPage />} />
          <Route path="/support/:id" element={<SupportTicketPage />} />
          <Route path="/admin" element={<AdminPage />} />
          <Route path="/settings" element={<SettingsPage />} />
        </Route>
      </Route>
    </Routes>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </BrowserRouter>
  );
}
