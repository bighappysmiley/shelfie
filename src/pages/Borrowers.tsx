import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "@/lib/api";
import type { Borrower, LoanWithDetails } from "@/lib/types";
import { PageHeader, Card, EmptyState, Badge } from "@/components/layout";
import { Button } from "@/components/Button";
import { TextField } from "@/components/form";

export function BorrowersPage() {
  const [borrowers, setBorrowers] = useState<Borrower[]>([]);
  const [loans, setLoans] = useState<LoanWithDetails[]>([]);
  const [showAdd, setShowAdd] = useState(false);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [q, setQ] = useState("");

  const load = async () => {
    const [b, l] = await Promise.all([api.borrowers.list(), api.loans.list(true)]);
    setBorrowers(b);
    setLoans(l);
  };

  useEffect(() => {
    load();
  }, []);

  const activeByBorrower = loans.reduce<Record<string, number>>((acc, row) => {
    acc[row.borrower.id] = (acc[row.borrower.id] ?? 0) + 1;
    return acc;
  }, {});

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    await api.borrowers.create({
      name: name.trim(),
      phone: phone || undefined,
      email: email || undefined,
    });
    setName("");
    setPhone("");
    setEmail("");
    setShowAdd(false);
    load();
  };

  const filtered = borrowers.filter((b) => {
    if (!q.trim()) return true;
    const needle = q.toLowerCase();
    return [b.name, b.phone, b.email]
      .filter(Boolean)
      .some((v) => String(v).toLowerCase().includes(needle));
  });

  return (
    <div>
      <PageHeader
        title="Borrowers"
        subtitle="Contacts who borrow from your collection"
        action={<Button onClick={() => setShowAdd(true)}>Add borrower</Button>}
      />

      <div className="mb-5">
        <input
          type="search"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search borrowers…"
          className="w-full rounded-lg border border-black/10 bg-surface px-3.5 py-2.5 text-base placeholder:text-muted/70 dark:border-white/10"
        />
      </div>

      {showAdd && (
        <Card className="mb-6">
          <form onSubmit={handleAdd} className="space-y-4">
            <TextField label="Name" value={name} onChange={(e) => setName(e.target.value)} required />
            <TextField label="Phone" value={phone} onChange={(e) => setPhone(e.target.value)} type="tel" />
            <TextField label="Email" value={email} onChange={(e) => setEmail(e.target.value)} type="email" />
            <div className="flex gap-2">
              <Button type="submit">Save</Button>
              <Button variant="secondary" type="button" onClick={() => setShowAdd(false)}>
                Cancel
              </Button>
            </div>
          </form>
        </Card>
      )}

      {filtered.length === 0 ? (
        <EmptyState
          title={borrowers.length === 0 ? "No borrowers" : "No results"}
          description={
            borrowers.length === 0
              ? "Add a borrower when recording a loan."
              : "No borrowers match your search criteria."
          }
        />
      ) : (
        <div className="space-y-2">
          {filtered.map((b) => {
            const active = activeByBorrower[b.id] ?? 0;
            return (
              <Link
                key={b.id}
                to={`/borrowers/${b.id}`}
                className="flex items-center justify-between gap-3 rounded-md border border-black/10 bg-surface p-4 shadow-sm transition-colors hover:border-black/20 dark:border-white/10"
              >
                <div className="min-w-0">
                  <p className="font-medium">{b.name}</p>
                  {(b.phone || b.email) && (
                    <p className="mt-0.5 truncate text-sm text-muted">
                      {[b.phone, b.email].filter(Boolean).join(" · ")}
                    </p>
                  )}
                </div>
                {active > 0 ? (
                  <Badge variant="warning">
                    {active} on loan
                  </Badge>
                ) : (
                  <span className="text-xs text-muted">No active loans</span>
                )}
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
