import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "@/lib/api";
import type { Borrower, LoanWithDetails } from "@/lib/types";
import { PageHeader, Group, EmptyState, Badge } from "@/components/layout";
import { Button } from "@/components/Button";
import { SearchInput, TextField } from "@/components/form";

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
        action={
          <Button size="sm" onClick={() => setShowAdd(true)}>
            Add
          </Button>
        }
      />

      <div className="mb-4">
        <SearchInput value={q} onChange={setQ} placeholder="Search borrowers" />
      </div>

      {showAdd && (
        <Group className="mb-4">
          <form onSubmit={handleAdd}>
            <TextField label="Name" grouped required value={name} onChange={(e) => setName(e.target.value)} />
            <TextField label="Phone" grouped value={phone} onChange={(e) => setPhone(e.target.value)} type="tel" />
            <TextField label="Email" grouped value={email} onChange={(e) => setEmail(e.target.value)} type="email" />
            <div className="flex gap-2 px-4 py-4">
              <Button type="submit" size="sm">Save</Button>
              <Button variant="tinted" size="sm" type="button" onClick={() => setShowAdd(false)}>
                Cancel
              </Button>
            </div>
          </form>
        </Group>
      )}

      {filtered.length === 0 ? (
        <EmptyState
          title={borrowers.length === 0 ? "No Borrowers" : "No Results"}
          description={
            borrowers.length === 0
              ? "Add a borrower when recording a loan."
              : "No borrowers match your search."
          }
        />
      ) : (
        <Group>
          {filtered.map((b) => {
            const active = activeByBorrower[b.id] ?? 0;
            return (
              <Link
                key={b.id}
                to={`/borrowers/${b.id}`}
                className="flex min-h-[44px] items-center justify-between gap-3 px-4 py-3 hairline-b last:border-b-0 active:bg-fill-secondary"
              >
                <div className="min-w-0">
                  <p className="truncate text-[1.0625rem]">{b.name}</p>
                  {(b.phone || b.email) && (
                    <p className="truncate text-[0.9375rem] text-muted">
                      {[b.phone, b.email].filter(Boolean).join(" · ")}
                    </p>
                  )}
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  {active > 0 ? (
                    <Badge variant="warning">{active} on loan</Badge>
                  ) : (
                    <span className="text-[0.8125rem] text-muted">No loans</span>
                  )}
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none" className="text-tertiary" aria-hidden>
                    <path d="M5 3.5L8.5 7L5 10.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </div>
              </Link>
            );
          })}
        </Group>
      )}
    </div>
  );
}
