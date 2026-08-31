import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "@/lib/api";
import { ButtonLink } from "@/components/Button";
import { BookCard } from "@/components/BookCard";
import {
  Group,
  GroupHeader,
  ListRow,
  PageHeader,
  Banner,
} from "@/components/layout";
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
        action={<ButtonLink to="/add" size="sm">Add Book</ButtonLink>}
      />

      {(overdue.length > 0 || dueSoon.length > 0) && (
        <div className="mb-5 space-y-2">
          {overdue.length > 0 && (
            <Banner variant="warning">
              <p className="font-medium">
                {overdue.length} overdue loan{overdue.length > 1 ? "s" : ""}
              </p>
              <Link to="/loaned" className="mt-1 inline-block text-[0.9375rem] underline">
                View active loans
              </Link>
            </Banner>
          )}
          {dueSoon.length > 0 && overdue.length === 0 && (
            <Banner>
              <p className="font-medium">
                {dueSoon.length} due within 7 days
              </p>
              <Link to="/loaned" className="mt-1 inline-block text-[0.9375rem] text-accent">
                View due dates
              </Link>
            </Banner>
          )}
        </div>
      )}

      <Group className="mb-6">
        <ListRow
          title="Total volumes"
          trailing={stats?.totalBooks ?? "—"}
          to="/library"
          chevron
        />
        <ListRow
          title="On loan"
          trailing={stats?.activeLoans ?? loans.length}
          to="/library?status=on_loan"
          chevron
        />
        <ListRow
          title="Wishlist"
          trailing={stats?.byStatus?.wishlist ?? "—"}
          to="/library?status=wishlist"
          chevron
        />
        <ListRow
          title="Overdue"
          trailing={
            <span className="text-warning">{stats?.overdueCount ?? overdue.length}</span>
          }
          to="/loaned"
          chevron
        />
      </Group>

      <section className="mb-6">
        <GroupHeader>Add to catalog</GroupHeader>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          <ButtonLink to="/add" variant="secondary" size="sm" className="w-full justify-center">
            Manual
          </ButtonLink>
          <ButtonLink to="/add?mode=camera" variant="secondary" size="sm" className="w-full justify-center">
            Barcode
          </ButtonLink>
          <ButtonLink to="/add?mode=cover" variant="secondary" size="sm" className="w-full justify-center">
            Cover
          </ButtonLink>
          <ButtonLink to="/add?mode=shelf" variant="secondary" size="sm" className="w-full justify-center">
            Shelf
          </ButtonLink>
        </div>
      </section>

      {topRooms.length > 0 && (
        <section className="mb-6">
          <GroupHeader
            action={
              <Link to="/locations" className="text-accent">
                All
              </Link>
            }
          >
            Locations
          </GroupHeader>
          <Group>
            {topRooms.map(([name, count]) => (
              <ListRow
                key={name}
                title={name}
                trailing={count}
                to={`/library?room=${encodeURIComponent(name)}`}
                chevron
              />
            ))}
          </Group>
        </section>
      )}

      <section className="mb-6">
        <GroupHeader
          action={
            <Link to="/library?sort=added" className="text-accent">
              See All
            </Link>
          }
        >
          Recently added
        </GroupHeader>
        {recent.length === 0 ? (
          <p className="px-1 text-[0.9375rem] text-muted">No books in your catalog yet.</p>
        ) : (
          <div className="grid grid-cols-3 gap-3 sm:grid-cols-6">
            {recent.map((book) => (
              <BookCard key={book.id} book={book} view="covers" showStatus={false} />
            ))}
          </div>
        )}
      </section>

      <section>
        <GroupHeader
          action={
            <Link to="/loaned" className="text-accent">
              See All
            </Link>
          }
        >
          Active loans
        </GroupHeader>
        {loans.length === 0 ? (
          <p className="px-1 text-[0.9375rem] text-muted">No active loans.</p>
        ) : (
          <Group>
            {loans.slice(0, 5).map((l) => {
              const isOverdue = l.loan.dueDate && l.loan.dueDate < today;
              return (
                <ListRow
                  key={l.loan.id}
                  title={l.book.title}
                  subtitle={l.borrower.name}
                  trailing={
                    <span className={isOverdue ? "text-warning" : ""}>
                      {isOverdue
                        ? "Overdue"
                        : l.loan.dueDate
                          ? `Due ${l.loan.dueDate}`
                          : "No date"}
                    </span>
                  }
                  to={`/book/${l.book.id}`}
                  chevron
                />
              );
            })}
          </Group>
        )}
      </section>
    </div>
  );
}
