import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "@/lib/api";
import type { Borrower } from "@/lib/types";
import { PageHeader, Card, EmptyState } from "@/components/layout";
import { Button } from "@/components/Button";
import { TextField } from "@/components/form";

export function BorrowersPage() {
  const [borrowers, setBorrowers] = useState<Borrower[]>([]);
  const [showAdd, setShowAdd] = useState(false);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");

  const load = () => api.borrowers.list().then(setBorrowers);

  useEffect(() => { load(); }, []);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    await api.borrowers.create({ name: name.trim(), phone: phone || undefined, email: email || undefined });
    setName("");
    setPhone("");
    setEmail("");
    setShowAdd(false);
    load();
  };

  return (
    <div>
      <PageHeader
        title="Borrowers"
        subtitle="People who borrow your books"
        action={<Button onClick={() => setShowAdd(true)}>Add borrower</Button>}
      />

      {showAdd && (
        <Card className="mb-6">
          <form onSubmit={handleAdd} className="space-y-4">
            <TextField label="Name" value={name} onChange={(e) => setName(e.target.value)} required />
            <TextField label="Phone" value={phone} onChange={(e) => setPhone(e.target.value)} type="tel" />
            <TextField label="Email" value={email} onChange={(e) => setEmail(e.target.value)} type="email" />
            <div className="flex gap-2">
              <Button type="submit">Save</Button>
              <Button variant="secondary" type="button" onClick={() => setShowAdd(false)}>Cancel</Button>
            </div>
          </form>
        </Card>
      )}

      {borrowers.length === 0 ? (
        <EmptyState title="No borrowers yet" description="Add someone when you loan out a book." />
      ) : (
        <div className="space-y-2">
          {borrowers.map((b) => (
            <Link
              key={b.id}
              to={`/borrowers/${b.id}`}
              className="block rounded-xl border border-black/8 bg-surface p-4 transition-colors hover:border-black/20 dark:border-white/10"
            >
              <p className="font-medium">{b.name}</p>
              {(b.phone || b.email) && (
                <p className="mt-0.5 text-sm text-muted">{[b.phone, b.email].filter(Boolean).join(" · ")}</p>
              )}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
