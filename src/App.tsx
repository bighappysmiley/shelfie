import { useEffect } from "react";
import { Link, Navigate, Outlet, useLocation, BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider, useAuth } from "@/lib/auth";
import { useLibrary } from "@/lib/library";
import { Navbar, MobileNav } from "@/components/Navbar";
import { AppSidebar } from "@/components/AppSidebar";
import { DesktopSidebar } from "@/components/DesktopSidebar";
import { Container } from "@/components/layout";
import { RequireAuth } from "@/components/RequireAuth";
import { SidebarProvider } from "@/lib/sidebar";
import { initTheme } from "@/lib/theme";
import { syncPending } from "@/lib/offline";
import { FullPageLoading } from "@/components/LoadingTree";
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
import { CommunityLayout } from "@/components/CommunityLayout";
import { CommunityPage } from "@/pages/Community";
import { CommunityServerPage } from "@/pages/CommunityServer";
import { CommunityServerSettingsPage } from "@/pages/CommunityServerSettings";
import { CommunityProfilePage } from "@/pages/CommunityProfile";
import { CommunityDMsPage } from "@/pages/CommunityDMs";
import { SetupPage, needsSetup } from "@/pages/Setup";
import { Logo } from "@/components/Logo";
import { ButtonLink } from "@/components/Button";
import { UpdateBanner } from "@/components/UpdateBanner";

function PublicShell() {
  return (
    <div className="min-h-dvh bg-background">
      <a href="#main" className="skip-link">
        Skip to content
      </a>
      <header className="nav-material hairline-b safe-top">
        <Container size="desktop">
          <div className="flex h-14 items-center justify-between">
            <Link to="/" className="rounded-[var(--radius-control)] outline-offset-2">
              <Logo size="sm" />
            </Link>
            <div className="flex items-center gap-3">
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
  const { user, userProfile } = useAuth();
  const { loading: libraryLoading, activeLibrary } = useLibrary();
  const location = useLocation();
  const isCommunity = location.pathname.startsWith("/community");

  useEffect(() => {
    initTheme();

    const handleOnline = () => {
      if (user) syncPending();
    };
    window.addEventListener("online", handleOnline);
    return () => window.removeEventListener("online", handleOnline);
  }, [user]);

  if (libraryLoading) {
    return <FullPageLoading label="Loading library" />;
  }

  if (!activeLibrary) {
    return <Navigate to="/setup" replace state={{ from: location.pathname }} />;
  }

  if (
    user &&
    needsSetup({
      displayName: userProfile?.displayName,
      libraryCount: 1,
    })
  ) {
    return <Navigate to="/setup" replace />;
  }

  return (
    <div
      className={
        isCommunity
          ? "min-h-dvh bg-[var(--community-rail)]"
          : "min-h-dvh bg-background pb-[calc(3.25rem+env(safe-area-inset-bottom,0px))] md:pb-0"
      }
    >
      <a href="#main" className="skip-link">
        Skip to content
      </a>
      {!isCommunity && <DesktopSidebar />}
      <div className={isCommunity ? "" : "lg:pl-[15.5rem]"}>
        {!isCommunity && (
          <div className="lg:hidden">
            <Navbar />
          </div>
        )}
        {!isCommunity && <AppSidebar />}
        <main
          id="main"
          className={isCommunity ? "h-dvh min-h-0 overflow-hidden" : "py-4 sm:py-5 lg:py-7"}
        >
          {isCommunity ? (
            <Outlet />
          ) : (
            <Container size="desktop">
              <Outlet />
            </Container>
          )}
        </main>
        {!isCommunity && <MobileNav />}
      </div>
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
        <Route path="/setup" element={<SetupPage />} />
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
          <Route element={<CommunityLayout />}>
            <Route path="/community" element={<CommunityPage />} />
            <Route path="/community/join/:vanitySlug" element={<CommunityPage />} />
            <Route path="/community/s/:serverId" element={<CommunityServerPage />} />
            <Route path="/community/s/:serverId/:channelId" element={<CommunityServerPage />} />
            <Route path="/community/s/:serverId/settings" element={<CommunityServerSettingsPage />} />
            <Route path="/community/u/:username" element={<CommunityProfilePage />} />
            <Route path="/community/dm/:threadId?" element={<CommunityDMsPage />} />
          </Route>
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
          <UpdateBanner />
          <AppRoutes />
        </SidebarProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}
