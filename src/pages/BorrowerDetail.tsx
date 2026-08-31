import { useEffect, useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { api } from "@/lib/api";
import type { Borrower } from "@/lib/types";
import { PageHeader, Card } from "@/components/layout";
import { Button } from "@/components/Button";
import { TextField } from "@/components/form";

export function BorrowerDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [borrower, setBorrower] = useState<Borrower | null>(null);
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");

  const load = () => {
    if (!id) return;
    api.borrowers.get(id).then((b) => {
      setBorrower(b);
      setName(b.name);
      setPhone(b.phone ?? "");
      setEmail(b.email ?? "");
    });
  };

  useEffect(() => {
    load();
  }, [id]);

  if (!borrower) return <p className="text-muted">Loading…</p>;

  const loans = borrower.loans ?? [];
  const active = loans.filter((l) => !l.loan.dateReturned);
  const past = loans.filter((l) => l.loan.dateReturned);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    await api.borrowers.update(borrower.id, {
      name: name.trim(),
      phone: phone || null,
      email: email || null,
    });
    setEditing(false);
    load();
  };

  const handleDelete = async () => {
    if (active.length > 0) {
      alert("Return all books before deleting this borrower.");
      return;
    }
    if (!confirm(`Delete ${borrower.name}?`)) return;
    await api.borrowers.delete(borrower.id);
    navigate("/borrowers");
  };

  return (
    <div>
      <div className="mb-6">
        <Link to="/borrowers" className="text-sm text-muted hover:text-foreground">
          ← Borrowers
        </Link>
      </div>

      <PageHeader
        title={borrower.name}
        subtitle="Loan history"
        action={
          <div className="flex gap-2">
            <Button variant="secondary" onClick={() => setEditing((v) => !v)}>
              {editing ? "Cancel" : "Edit"}
            </Button>
            <Button variant="ghost" onClick={handleDelete}>
              Delete
            </Button>
          </div>
        }
      />

      {editing ? (
        <Card className="mb-8">
          <form onSubmit={handleSave} className="space-y-4">
            <TextField label="Name" value={name} onChange={(e) => setName(e.target.value)} required />
            <TextField label="Phone" value={phone} onChange={(e) => setPhone(e.target.value)} type="tel" />
            <TextField label="Email" value={email} onChange={(e) => setEmail(e.target.value)} type="email" />
            <Button type="submit">Save</Button>
          </form>
        </Card>
      ) : (
        (borrower.phone || borrower.email) && (
          <p className="mb-6 text-muted">
            {[borrower.phone, borrower.email].filter(Boolean).join(" · ")}
          </p>
        )
      )}

      <h2 className="mb-4 text-lg font-semibold">Currently has ({active.length})</h2>
      {active.length === 0 ? (
        <p className="mb-8 text-sm text-muted">Nothing on loan</p>
      ) : (
        <div className="mb-8 space-y-2">
          {active.map(({ loan, book }) => (
            <Card key={loan.id} className="!p-4">
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
            <div
              key={loan.id}
              className="flex items-center justify-between rounded-lg border border-black/8 px-4 py-3 dark:border-white/10"
            >
              <Link to={`/book/${book.id}`} className="text-sm hover:underline">
                {book.title}
              </Link>
              <span className="text-xs text-muted">Returned {loan.dateReturned}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
