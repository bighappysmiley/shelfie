import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "@/lib/api";
import type { LoanWithDetails } from "@/lib/types";
import { CoverImage } from "@/components/CoverImage";
import { PageHeader, Card, Badge, EmptyState } from "@/components/layout";
import { Button } from "@/components/Button";
import { TextField } from "@/components/form";

export function LoanedOutPage() {
  const [loans, setLoans] = useState<LoanWithDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "overdue" | "due_soon">("all");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [dueDate, setDueDate] = useState("");

  const load = () => {
    setLoading(true);
    api.loans.list(true).then(setLoans).finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
  }, []);

  const today = new Date().toISOString().slice(0, 10);
  const soon = new Date();
  soon.setDate(soon.getDate() + 7);
  const soonStr = soon.toISOString().slice(0, 10);

  const handleReturn = async (loanId: string) => {
    await api.loans.return(loanId);
    load();
  };

  const handleSaveDue = async (loanId: string) => {
    await api.loans.update(loanId, { dueDate: dueDate || null });
    setEditingId(null);
    load();
  };

  const sorted = [...loans].sort((a, b) => {
    const aDue = a.loan.dueDate ?? "9999";
    const bDue = b.loan.dueDate ?? "9999";
    return aDue.localeCompare(bDue);
  });

  const filtered = sorted.filter(({ loan }) => {
    if (filter === "overdue") return Boolean(loan.dueDate && loan.dueDate < today);
    if (filter === "due_soon")
      return Boolean(loan.dueDate && loan.dueDate >= today && loan.dueDate <= soonStr);
    return true;
  });

  const overdueCount = loans.filter((l) => l.loan.dueDate && l.loan.dueDate < today).length;

  return (
    <div>
      <PageHeader
        title="Active loans"
        subtitle={`${loans.length} active · ${overdueCount} overdue`}
      />

      <div className="mb-5 flex gap-2 overflow-x-auto pb-1">
        {(
          [
            { value: "all", label: "All" },
            { value: "overdue", label: "Overdue" },
            { value: "due_soon", label: "Due soon" },
          ] as const
        ).map((chip) => (
          <button
            key={chip.value}
            type="button"
            onClick={() => setFilter(chip.value)}
            className={`shrink-0 rounded-lg px-3 py-1.5 text-sm transition-colors ${
              filter === chip.value
                ? "bg-accent font-medium text-white dark:text-background"
                : "bg-accent-soft text-foreground hover:bg-black/[0.06] dark:hover:bg-white/[0.08]"
            }`}
          >
            {chip.label}
          </button>
        ))}
      </div>

      {loading ? (
        <p className="text-muted">Loading…</p>
      ) : filtered.length === 0 ? (
        <EmptyState
          title={filter === "all" ? "No active loans" : "No matching loans"}
          description={
            filter === "all"
              ? "Loans will appear here when books are checked out to borrowers."
              : "Adjust the filter to view other loans."
          }
        />
      ) : (
        <div className="space-y-3">
          {filtered.map(({ loan, book, borrower }) => {
            const overdue = loan.dueDate && loan.dueDate < today;
            return (
              <Card key={loan.id} className="!p-4">
                <div className="flex gap-4">
                  <CoverImage
                    book={book}
                    className="h-20 w-14 shrink-0 rounded-md object-cover bg-accent-soft"
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

                    {editingId === loan.id ? (
                      <div className="mt-3 flex flex-wrap items-end gap-2">
                        <TextField
                          label="Due date"
                          type="date"
                          value={dueDate}
                          onChange={(e) => setDueDate(e.target.value)}
                        />
                        <Button onClick={() => handleSaveDue(loan.id)}>Save</Button>
                        <Button variant="ghost" onClick={() => setEditingId(null)}>
                          Cancel
                        </Button>
                      </div>
                    ) : (
                      <div className="mt-3 flex flex-wrap gap-2">
                        <Button variant="secondary" onClick={() => handleReturn(loan.id)}>
                          Return
                        </Button>
                        <Button
                          variant="ghost"
                          onClick={() => {
                            setEditingId(loan.id);
                            setDueDate(loan.dueDate ?? "");
                          }}
                        >
                          Change due date
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
