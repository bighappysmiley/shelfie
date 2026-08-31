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
import { ButtonLink } from "@/components/Button";
import { APP_NAME } from "@/lib/brand";

function PublicShell() {
  return (
    <div className="min-h-dvh bg-background">
      <a href="#main" className="skip-link">
        Skip to content
      </a>
      <header className="nav-material hairline-b safe-top">
        <Container>
          <div className="flex h-11 items-center justify-between">
            <Link to="/" className="text-[1.0625rem] font-semibold tracking-tight text-foreground">
              {APP_NAME}
            </Link>
            <div className="flex items-center gap-2">
              <Link to="/login" className="text-[0.9375rem] text-link">
                Sign In
              </Link>
              <ButtonLink to="/signup" size="sm">
                Sign Up
              </ButtonLink>
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
    const theme =
      localStorage.getItem("pine-bookkeeping-theme") ??
      localStorage.getItem("pine-books-theme") ??
      localStorage.getItem("bracken-theme") ??
      localStorage.getItem("understory-theme") ??
      localStorage.getItem("shelfie-theme");
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
    <div className="min-h-dvh bg-background pb-[calc(3.25rem+env(safe-area-inset-bottom,0px))] md:pb-0">
      <a href="#main" className="skip-link">
        Skip to content
      </a>
      <Navbar />
      <main id="main" className="py-3 sm:py-4">
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
