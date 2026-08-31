import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "@/lib/api";
import type { LoanWithDetails } from "@/lib/types";
import { CoverImage } from "@/components/CoverImage";
import {
  PageHeader,
  Group,
  EmptyState,
  Badge,
  SegmentedControl,
} from "@/components/layout";
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
        title="Loans"
        subtitle={`${loans.length} active · ${overdueCount} overdue`}
      />

      <div className="mb-4">
        <SegmentedControl
          value={filter}
          onChange={setFilter}
          options={[
            { value: "all", label: "All" },
            { value: "overdue", label: "Overdue" },
            { value: "due_soon", label: "Due Soon" },
          ]}
        />
      </div>

      {loading ? (
        <p className="px-1 text-muted">Loading…</p>
      ) : filtered.length === 0 ? (
        <EmptyState
          title={filter === "all" ? "No Active Loans" : "No Results"}
          description={
            filter === "all"
              ? "Loans appear here when books are checked out."
              : "Try a different filter."
          }
        />
      ) : (
        <div className="space-y-4">
          {filtered.map(({ loan, book, borrower }) => {
            const overdue = loan.dueDate && loan.dueDate < today;
            return (
              <Group key={loan.id}>
                <div className="flex gap-3 p-4">
                  <CoverImage
                    book={book}
                    className="h-16 w-11 shrink-0 rounded-[4px] object-cover bg-fill"
                  />
                  <div className="min-w-0 flex-1">
                    <Link to={`/book/${book.id}`} className="text-[1.0625rem] font-medium">
                      {book.title}
                    </Link>
                    <p className="text-[0.9375rem] text-muted">
                      <Link to={`/borrowers/${borrower.id}`} className="text-link">
                        {borrower.name}
                      </Link>
                    </p>
                    <div className="mt-2 flex flex-wrap items-center gap-2">
                      <span className="text-[0.8125rem] text-muted">Since {loan.dateLoaned}</span>
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
                        <Button size="sm" onClick={() => handleSaveDue(loan.id)}>Save</Button>
                        <Button variant="plain" size="sm" onClick={() => setEditingId(null)}>
                          Cancel
                        </Button>
                      </div>
                    ) : (
                      <div className="mt-3 flex flex-wrap gap-2">
                        <Button size="sm" onClick={() => handleReturn(loan.id)}>Return</Button>
                        <Button
                          variant="tinted"
                          size="sm"
                          onClick={() => {
                            setEditingId(loan.id);
                            setDueDate(loan.dueDate ?? "");
                          }}
                        >
                          Edit Due Date
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              </Group>
            );
          })}
        </div>
      )}
    </div>
  );
}
