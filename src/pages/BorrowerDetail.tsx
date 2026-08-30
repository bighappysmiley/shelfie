import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { api } from "@/lib/api";
import type { Borrower } from "@/lib/types";
import { PageHeader, Card } from "@/components/layout";

export function BorrowerDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [borrower, setBorrower] = useState<Borrower | null>(null);

  useEffect(() => {
    if (!id) return;
    api.borrowers.get(id).then(setBorrower);
  }, [id]);

  if (!borrower) return <p className="text-muted">Loading…</p>;

  const loans = borrower.loans ?? [];
  const active = loans.filter((l) => !l.loan.dateReturned);
  const past = loans.filter((l) => l.loan.dateReturned);

  return (
    <div>
      <PageHeader title={borrower.name} subtitle="Loan history" />

      {(borrower.phone || borrower.email) && (
        <p className="mb-6 text-muted">
          {[borrower.phone, borrower.email].filter(Boolean).join(" · ")}
        </p>
      )}

      <h2 className="mb-4 text-lg font-semibold">Currently has ({active.length})</h2>
      {active.length === 0 ? (
        <p className="mb-8 text-sm text-muted">Nothing on loan</p>
      ) : (
        <div className="mb-8 space-y-2">
          {active.map(({ loan, book }) => (
            <Card key={loan.id}>
              <Link to={`/book/${book.id}`} className="font-medium hover:underline">
                {book.title}
              </Link>
              <p className="text-sm text-muted">
                Since {loan.dateLoaned}
                {loan.dueDate && ` · Due ${loan.dueDate}`}
              </p>
            </Card>
          ))}
        </div>
      )}

      <h2 className="mb-4 text-lg font-semibold">Past loans ({past.length})</h2>
      {past.length === 0 ? (
        <p className="text-sm text-muted">No past loans</p>
      ) : (
        <div className="space-y-2">
          {past.map(({ loan, book }) => (
            <div key={loan.id} className="flex items-center justify-between rounded-lg border border-black/8 px-4 py-3 dark:border-white/10">
              <Link to={`/book/${book.id}`} className="text-sm hover:underline">{book.title}</Link>
              <span className="text-xs text-muted">Returned {loan.dateReturned}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
