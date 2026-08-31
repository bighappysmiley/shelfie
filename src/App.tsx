import { Link } from "react-router-dom";
import { BrowserRouter, Routes, Route, Outlet } from "react-router-dom";
import { AuthProvider, useAuth } from "@/lib/auth";
import { useLibrary } from "@/lib/library";
import { Navbar, MobileNav } from "@/components/Navbar";
import { Container } from "@/components/layout";
import { RequireAuth } from "@/components/RequireAuth";
import { SidebarProvider } from "@/lib/sidebar";
import { initTheme } from "@/lib/theme";
import { syncPending } from "@/lib/offline";
import { LandingPage, LoginPage, SignupPage, Verify2FAPage } from "@/pages/Auth";
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
import { AccountPage } from "@/pages/Account";
import { NotificationsPage } from "@/pages/Notifications";
import { SupportPage } from "@/pages/Support";
import { SupportTicketPage } from "@/pages/SupportTicket";
import { AdminPage } from "@/pages/Admin";
import { useEffect } from "react";
import { Logo } from "@/components/Logo";
import { ButtonLink } from "@/components/Button";

function PublicShell() {
  return (
    <div className="min-h-dvh bg-background">
      <a href="#main" className="skip-link">
        Skip to content
      </a>
      <header className="nav-material hairline-b safe-top">
        <Container>
          <div className="flex h-12 items-center justify-between">
            <Link to="/" className="rounded-[var(--radius-control)] outline-offset-2">
              <Logo size="sm" />
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
  const { loading: libraryLoading, activeLibrary } = useLibrary();

  useEffect(() => {
    initTheme();

    const handleOnline = () => {
      if (user) syncPending();
    };
    window.addEventListener("online", handleOnline);
    return () => window.removeEventListener("online", handleOnline);
  }, [user]);

  if (libraryLoading) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-background">
        <div
          className="h-8 w-8 animate-spin rounded-full border-2 border-fill border-t-accent"
          role="status"
          aria-label="Loading library"
        />
      </div>
    );
  }

  if (!activeLibrary) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-background px-4 text-center">
        <p className="text-muted">No library available. Check Settings to create one.</p>
      </div>
    );
  }

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
        <Route path="/verify-2fa" element={<Verify2FAPage />} />
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
          <Route path="/account" element={<AccountPage />} />
          <Route path="/notifications" element={<NotificationsPage />} />
        </Route>
      </Route>
    </Routes>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <SidebarProvider>
          <AppRoutes />
        </SidebarProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}
