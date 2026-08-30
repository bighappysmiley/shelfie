import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "@/lib/api";
import { ButtonLink } from "@/components/Button";
import { Card, PageHeader } from "@/components/layout";
import type { LoanWithDetails } from "@/lib/types";

export function HomePage() {
  const [stats, setStats] = useState<{
    totalBooks?: number;
    activeLoans?: number;
    totalValue?: number;
    overdueCount?: number;
  } | null>(null);
  const [loans, setLoans] = useState<LoanWithDetails[]>([]);

  useEffect(() => {
    api.data.stats().then((s) => setStats(s as NonNullable<typeof stats>)).catch(() => {});
    api.loans.list(true).then(setLoans).catch(() => {});
  }, []);

  const today = new Date().toISOString().slice(0, 10);
  const overdue = loans.filter((l) => l.loan.dueDate && l.loan.dueDate < today);

  return (
    <div>
      <PageHeader
        title="Shelfie"
        subtitle="Your personal library"
      />

      {overdue.length > 0 && (
        <Card className="mb-6 border-warning/30 bg-warning-bg">
          <p className="font-medium text-warning">
            {overdue.length} overdue loan{overdue.length > 1 ? "s" : ""}
          </p>
          <Link to="/loaned" className="mt-1 text-sm text-warning underline">
            View loaned books →
          </Link>
        </Card>
      )}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <p className="text-sm text-muted">Total books</p>
          <p className="mt-1 text-3xl font-semibold">{stats?.totalBooks ?? "—"}</p>
        </Card>
        <Card>
          <p className="text-sm text-muted">On loan</p>
          <p className="mt-1 text-3xl font-semibold">{stats?.activeLoans ?? loans.length}</p>
        </Card>
        <Card>
          <p className="text-sm text-muted">Collection value</p>
          <p className="mt-1 text-3xl font-semibold">
            {stats?.totalValue != null ? `$${stats.totalValue}` : "—"}
          </p>
        </Card>
        <Card>
          <p className="text-sm text-muted">Overdue</p>
          <p className="mt-1 text-3xl font-semibold text-warning">
            {stats?.overdueCount ?? overdue.length}
          </p>
        </Card>
      </div>

      <div className="mt-8 grid gap-4 sm:grid-cols-2">
        <Card>
          <h2 className="font-semibold">Quick actions</h2>
          <div className="mt-4 flex flex-col gap-2">
            <ButtonLink to="/add" className="w-full">Add a book</ButtonLink>
            <ButtonLink to="/add?mode=scan" variant="secondary" className="w-full">
              Scan with barcode scanner
            </ButtonLink>
            <ButtonLink to="/loaned" variant="ghost" className="w-full">
              Who has my books?
            </ButtonLink>
          </div>
        </Card>

        <Card>
          <div className="flex items-center justify-between">
            <h2 className="font-semibold">Currently loaned</h2>
            <Link to="/loaned" className="text-sm text-muted hover:text-foreground">
              View all
            </Link>
          </div>
          {loans.length === 0 ? (
            <p className="mt-4 text-sm text-muted">No books on loan</p>
          ) : (
            <ul className="mt-4 space-y-3">
              {loans.slice(0, 5).map((l) => (
                <li key={l.loan.id} className="flex items-center justify-between text-sm">
                  <span className="truncate font-medium">{l.book.title}</span>
                  <span className="shrink-0 text-muted">→ {l.borrower.name}</span>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </div>
  );
}
