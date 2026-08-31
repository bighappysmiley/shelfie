import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "@/lib/api";
import { ButtonLink } from "@/components/Button";
import { BookCard } from "@/components/BookCard";
import { Card, PageHeader, SectionHeading } from "@/components/layout";
import type { Book, LoanWithDetails } from "@/lib/types";

export function HomePage() {
  const [stats, setStats] = useState<{
    totalBooks?: number;
    activeLoans?: number;
    totalValue?: number;
    overdueCount?: number;
    byLocation?: Record<string, number>;
    byStatus?: Record<string, number>;
  } | null>(null);
  const [loans, setLoans] = useState<LoanWithDetails[]>([]);
  const [recent, setRecent] = useState<Book[]>([]);

  useEffect(() => {
    api.data.stats().then((s) => setStats(s as NonNullable<typeof stats>)).catch(() => {});
    api.loans.list(true).then(setLoans).catch(() => {});
    api.books
      .list({ sort: "added", order: "desc" })
      .then((books) => setRecent(books.slice(0, 6)))
      .catch(() => {});
  }, []);

  const today = new Date().toISOString().slice(0, 10);
  const soon = new Date();
  soon.setDate(soon.getDate() + 7);
  const soonStr = soon.toISOString().slice(0, 10);

  const overdue = loans.filter((l) => l.loan.dueDate && l.loan.dueDate < today);
  const dueSoon = loans.filter(
    (l) =>
      l.loan.dueDate &&
      l.loan.dueDate >= today &&
      l.loan.dueDate <= soonStr,
  );

  const topRooms = useMemo(() => {
    const entries = Object.entries(stats?.byLocation ?? {})
      .filter(([k]) => k && k !== "Unassigned")
      .sort((a, b) => b[1] - a[1])
      .slice(0, 6);
    return entries;
  }, [stats]);

  return (
    <div>
      <PageHeader
        title="Overview"
        subtitle="Summary of your collection and active loans"
        action={<ButtonLink to="/add">Add book</ButtonLink>}
      />

      {(overdue.length > 0 || dueSoon.length > 0) && (
        <div className="mb-6 space-y-2">
          {overdue.length > 0 && (
            <div className="rounded-md border border-warning/30 bg-warning-bg px-4 py-3">
              <p className="text-sm font-medium text-warning">
                {overdue.length} overdue loan{overdue.length > 1 ? "s" : ""} require attention
              </p>
              <Link to="/loaned" className="mt-1 inline-block text-sm text-warning underline">
                View active loans
              </Link>
            </div>
          )}
          {dueSoon.length > 0 && overdue.length === 0 && (
            <div className="rounded-md border border-black/10 bg-surface px-4 py-3 dark:border-white/10">
              <p className="text-sm font-medium">
                {dueSoon.length} loan{dueSoon.length > 1 ? "s" : ""} due within 7 days
              </p>
              <Link to="/loaned" className="mt-1 inline-block text-sm text-muted hover:text-foreground">
                View due dates
              </Link>
            </div>
          )}
        </div>
      )}

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Link
          to="/library"
          className="rounded-md border border-black/10 bg-surface p-4 shadow-sm transition-colors hover:border-black/20 dark:border-white/10"
        >
          <p className="text-xs font-medium uppercase tracking-wide text-muted">Total volumes</p>
          <p className="mt-1 text-2xl font-semibold tabular-nums">
            {stats?.totalBooks ?? "—"}
          </p>
        </Link>
        <Link
          to="/library?status=on_loan"
          className="rounded-md border border-black/10 bg-surface p-4 shadow-sm transition-colors hover:border-black/20 dark:border-white/10"
        >
          <p className="text-xs font-medium uppercase tracking-wide text-muted">On loan</p>
          <p className="mt-1 text-2xl font-semibold tabular-nums">
            {stats?.activeLoans ?? loans.length}
          </p>
        </Link>
        <Link
          to="/library?status=wishlist"
          className="rounded-md border border-black/10 bg-surface p-4 shadow-sm transition-colors hover:border-black/20 dark:border-white/10"
        >
          <p className="text-xs font-medium uppercase tracking-wide text-muted">Wishlist</p>
          <p className="mt-1 text-2xl font-semibold tabular-nums">
            {stats?.byStatus?.wishlist ?? "—"}
          </p>
        </Link>
        <Link
          to="/loaned"
          className="rounded-md border border-black/10 bg-surface p-4 shadow-sm transition-colors hover:border-black/20 dark:border-white/10"
        >
          <p className="text-xs font-medium uppercase tracking-wide text-muted">Overdue</p>
          <p className="mt-1 text-2xl font-semibold tabular-nums text-warning">
            {stats?.overdueCount ?? overdue.length}
          </p>
        </Link>
      </div>

      <section className="mt-8">
        <SectionHeading title="Add to catalog" />
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          <ButtonLink to="/add" variant="secondary" className="w-full justify-center">
            Manual entry
          </ButtonLink>
          <ButtonLink to="/add?mode=camera" variant="secondary" className="w-full justify-center">
            Barcode scan
          </ButtonLink>
          <ButtonLink to="/add?mode=cover" variant="secondary" className="w-full justify-center">
            Cover image
          </ButtonLink>
          <ButtonLink to="/add?mode=shelf" variant="secondary" className="w-full justify-center">
            Shelf image
          </ButtonLink>
        </div>
      </section>

      {topRooms.length > 0 && (
        <section className="mt-8">
          <SectionHeading
            title="By location"
            action={
              <Link to="/locations" className="text-xs text-muted hover:text-foreground">
                View all
              </Link>
            }
          />
          <div className="flex flex-wrap gap-2">
            {topRooms.map(([name, count]) => (
              <Link
                key={name}
                to={`/library?room=${encodeURIComponent(name)}`}
                className="rounded-md border border-black/10 bg-surface px-3 py-2 text-sm shadow-sm transition-colors hover:border-black/20 dark:border-white/10"
              >
                <span className="font-medium">{name}</span>
                <span className="ml-2 text-muted">{count}</span>
              </Link>
            ))}
          </div>
        </section>
      )}

      <section className="mt-8">
        <SectionHeading
          title="Recently added"
          action={
            <Link to="/library?sort=added" className="text-xs text-muted hover:text-foreground">
              Full catalog
            </Link>
          }
        />
        {recent.length === 0 ? (
          <p className="text-sm text-muted">No volumes in the catalog. Add a book to begin.</p>
        ) : (
          <div className="grid grid-cols-3 gap-3 sm:grid-cols-6">
            {recent.map((book) => (
              <BookCard key={book.id} book={book} view="covers" showStatus={false} />
            ))}
          </div>
        )}
      </section>

      <section className="mt-8">
        <SectionHeading
          title="Active loans"
          action={
            <Link to="/loaned" className="text-xs text-muted hover:text-foreground">
              View all
            </Link>
          }
        />
        {loans.length === 0 ? (
          <p className="text-sm text-muted">No active loans.</p>
        ) : (
          <Card className="!p-0 overflow-hidden">
            <ul className="divide-y divide-black/8 dark:divide-white/10">
              {loans.slice(0, 5).map((l) => {
                const isOverdue = l.loan.dueDate && l.loan.dueDate < today;
                return (
                  <li key={l.loan.id}>
                    <Link
                      to={`/book/${l.book.id}`}
                      className="flex items-center justify-between gap-3 px-4 py-3 transition-colors hover:bg-black/[0.02] dark:hover:bg-white/[0.03]"
                    >
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium">{l.book.title}</p>
                        <p className="truncate text-xs text-muted">{l.borrower.name}</p>
                      </div>
                      <span
                        className={`shrink-0 text-xs ${isOverdue ? "font-medium text-warning" : "text-muted"}`}
                      >
                        {isOverdue
                          ? "Overdue"
                          : l.loan.dueDate
                            ? `Due ${l.loan.dueDate}`
                            : "No due date"}
                      </span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </Card>
        )}
      </section>
      <section className="mt-8 flex flex-wrap gap-4 border-t border-black/10 pt-5 text-sm dark:border-white/10">
        <Link to="/stats" className="text-muted hover:text-foreground">
          Reports
        </Link>
        <Link to="/settings" className="text-muted hover:text-foreground">
          Settings
        </Link>
        <Link to="/support" className="text-muted hover:text-foreground">
          Support
        </Link>
      </section>
    </div>
  );
}
