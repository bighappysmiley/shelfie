import { useEffect } from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { Navbar, MobileNav } from "@/components/Navbar";
import { Container } from "@/components/layout";
import { syncPending } from "@/lib/offline";
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

function AppShell({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    const theme = localStorage.getItem("shelfie-theme");
    if (theme === "dark") {
      document.documentElement.classList.add("dark");
    }

    const handleOnline = () => syncPending();
    window.addEventListener("online", handleOnline);
    return () => window.removeEventListener("online", handleOnline);
  }, []);

  return (
    <div className="min-h-full pb-24 md:pb-0">
      <a href="#main" className="skip-link">Skip to content</a>
      <Navbar />
      <main id="main" className="py-6">
        <Container>{children}</Container>
      </main>
      <MobileNav />
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AppShell>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/library" element={<LibraryPage />} />
          <Route path="/locations" element={<LocationsPage />} />
          <Route path="/add" element={<AddBookPage />} />
          <Route path="/book/:id" element={<BookDetailPage />} />
          <Route path="/loaned" element={<LoanedOutPage />} />
          <Route path="/borrowers" element={<BorrowersPage />} />
          <Route path="/borrowers/:id" element={<BorrowerDetailPage />} />
          <Route path="/stats" element={<StatsPage />} />
          <Route path="/settings" element={<SettingsPage />} />
        </Routes>
      </AppShell>
    </BrowserRouter>
  );
}
