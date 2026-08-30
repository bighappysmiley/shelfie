import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "@/lib/api";
import type { LoanWithDetails } from "@/lib/types";
import { bookCoverUrl } from "@/lib/cover";
import { PageHeader, Card, Badge, EmptyState } from "@/components/layout";
import { Button } from "@/components/Button";

export function LoanedOutPage() {
  const [loans, setLoans] = useState<LoanWithDetails[]>([]);
  const [loading, setLoading] = useState(true);

  const load = () => {
    setLoading(true);
    api.loans.list(true).then(setLoans).finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const today = new Date().toISOString().slice(0, 10);

  const handleReturn = async (loanId: string) => {
    await api.loans.return(loanId);
    load();
  };

  const sorted = [...loans].sort((a, b) => {
    const aDue = a.loan.dueDate ?? "9999";
    const bDue = b.loan.dueDate ?? "9999";
    return aDue.localeCompare(bDue);
  });

  return (
    <div>
      <PageHeader
        title="Loaned Out"
        subtitle="Who has your books"
      />

      {loading ? (
        <p className="text-muted">Loading…</p>
      ) : sorted.length === 0 ? (
        <EmptyState title="All books accounted for" description="Nothing is on loan right now." />
      ) : (
        <div className="space-y-3">
          {sorted.map(({ loan, book, borrower }) => {
            const overdue = loan.dueDate && loan.dueDate < today;
            return (
              <Card key={loan.id}>
                <div className="flex gap-4">
                  <img
                    src={bookCoverUrl(book)}
                    alt=""
                    className="h-20 w-14 shrink-0 rounded-md object-cover"
                  />
                  <div className="min-w-0 flex-1">
                    <Link to={`/book/${book.id}`} className="font-medium hover:underline">
                      {book.title}
                    </Link>
                    <p className="text-sm text-muted">
                      Loaned to{" "}
                      <Link to={`/borrowers/${borrower.id}`} className="hover:underline">
                        {borrower.name}
                      </Link>
                    </p>
                    <div className="mt-2 flex flex-wrap items-center gap-2 text-sm">
                      <span className="text-muted">Since {loan.dateLoaned}</span>
                      {loan.dueDate && (
                        <Badge variant={overdue ? "warning" : "default"}>
                          {overdue ? "Overdue" : `Due ${loan.dueDate}`}
                        </Badge>
                      )}
                    </div>
                  </div>
                  <Button variant="secondary" onClick={() => handleReturn(loan.id)}>
                    Return
                  </Button>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
