import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { api } from "@/lib/api";
import type { Book, Borrower } from "@/lib/types";
import { STATUS_LABELS, FORMAT_LABELS, emptyBookForm, normalizeLibraryStatus } from "@/lib/types";
import { CoverImage } from "@/components/CoverImage";
import { BookForm, formToPayload } from "@/components/BookForm";
import { PageHeader, Card, Badge } from "@/components/layout";
import { Button } from "@/components/Button";
import { TextField, SelectField } from "@/components/form";

export function BookDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [book, setBook] = useState<Book | null>(null);
  const [editing, setEditing] = useState(false);
  const [loaning, setLoaning] = useState(false);
  const [borrowers, setBorrowers] = useState<Borrower[]>([]);
  const [borrowerId, setBorrowerId] = useState("");
  const [newBorrower, setNewBorrower] = useState("");
  const [dueDate, setDueDate] = useState("");

  useEffect(() => {
    if (!id) return;
    api.books.get(id).then(setBook).catch(() => navigate("/library"));
    api.borrowers.list().then(setBorrowers).catch(() => {});
  }, [id, navigate]);

  if (!book) return <p className="text-muted">Loading…</p>;

  const handleUpdate = async (form: ReturnType<typeof emptyBookForm>) => {
    const updated = await api.books.update(book.id, formToPayload(form));
    setBook({ ...book, ...updated });
    setEditing(false);
  };

  const handleDelete = async () => {
    if (!confirm("Delete this book from your library?")) return;
    await api.books.delete(book.id);
    navigate("/library");
  };

  const handleLoan = async () => {
    let bId = borrowerId;
    if (newBorrower.trim()) {
      const b = await api.borrowers.create({ name: newBorrower.trim() });
      bId = b.id;
    }
    if (!bId) return;
    await api.loans.create({ bookId: book.id, borrowerId: bId, dueDate: dueDate || undefined });
    const refreshed = await api.books.get(book.id);
    setBook(refreshed);
    setLoaning(false);
  };

  const handleReturn = async () => {
    if (!book.activeLoan) return;
    await api.loans.return(book.activeLoan.loan.id);
    const refreshed = await api.books.get(book.id);
    setBook(refreshed);
  };

  if (editing) {
    return (
      <div>
        <PageHeader title="Edit Book" />
        <Card>
          <BookForm
            initial={{
              ...emptyBookForm(),
              title: book.title,
              authors: book.authors,
              isbn: book.isbn ?? "",
              coverUrl: book.coverUrl ?? "",
              format: book.format,
              locationRoom: book.locationRoom ?? "",
              locationShelf: book.locationShelf ?? "",
              readingStatus: normalizeLibraryStatus(book.readingStatus),
              personalRating: book.personalRating ?? "",
              seriesName: book.seriesName ?? "",
              seriesNumber: book.seriesNumber ?? "",
              purchaseDate: book.purchaseDate ?? "",
              purchasePrice: book.purchasePrice ?? "",
              condition: book.condition ?? "",
              notes: book.notes ?? "",
              pageCount: book.pageCount ?? "",
              publisher: book.publisher ?? "",
              publishYear: book.publishYear ?? "",
              description: book.description ?? "",
              copyNumber: book.copyNumber,
              tags: book.tags?.join(", ") ?? "",
            }}
            onSubmit={handleUpdate}
            submitLabel="Save changes"
          />
        </Card>
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        title={book.title}
        subtitle={book.authors}
        action={
          <div className="flex gap-2">
            <Button variant="secondary" onClick={() => setEditing(true)}>Edit</Button>
            <Button variant="ghost" onClick={handleDelete}>Delete</Button>
          </div>
        }
      />

      <div className="grid gap-6 lg:grid-cols-[200px_1fr]">
        <CoverImage
          book={book}
          className="w-full max-w-[200px] rounded-lg bg-accent-soft"
        />

        <div className="space-y-4">
          <div className="flex flex-wrap gap-2">
            {book.activeLoan ? (
              <Badge variant="warning">On loan</Badge>
            ) : (
              <Badge>{STATUS_LABELS[normalizeLibraryStatus(book.readingStatus)]}</Badge>
            )}
            <Badge>{FORMAT_LABELS[book.format]}</Badge>
            {book.personalRating && <Badge>★ {book.personalRating}</Badge>}
          </div>

          <dl className="grid gap-3 text-sm sm:grid-cols-2">
            {book.isbn && (
              <>
                <dt className="text-muted">ISBN</dt>
                <dd>{book.isbn}</dd>
              </>
            )}
            {book.seriesName && (
              <>
                <dt className="text-muted">Series</dt>
                <dd>{book.seriesName} {book.seriesNumber && `#${book.seriesNumber}`}</dd>
              </>
            )}
            {(book.locationRoom || book.locationShelf) && (
              <>
                <dt className="text-muted">Location</dt>
                <dd>{[book.locationRoom, book.locationShelf].filter(Boolean).join(" / ")}</dd>
              </>
            )}
            {book.publisher && (
              <>
                <dt className="text-muted">Publisher</dt>
                <dd>{book.publisher} {book.publishYear && `(${book.publishYear})`}</dd>
              </>
            )}
            {book.purchasePrice && (
              <>
                <dt className="text-muted">Purchase price</dt>
                <dd>${book.purchasePrice}</dd>
              </>
            )}
          </dl>

          {book.notes && (
            <Card>
              <p className="text-sm text-muted">Notes</p>
              <p className="mt-1">{book.notes}</p>
            </Card>
          )}

          {book.activeLoan ? (
            <Card>
              <p className="font-medium">Loaned to {book.activeLoan.borrower.name}</p>
              <p className="mt-1 text-sm text-muted">
                Since {book.activeLoan.loan.dateLoaned}
                {book.activeLoan.loan.dueDate && ` · Due ${book.activeLoan.loan.dueDate}`}
              </p>
              <Button className="mt-4" onClick={handleReturn}>Mark Returned</Button>
            </Card>
          ) : loaning ? (
            <Card>
              <h3 className="font-medium">Loan this book</h3>
              <div className="mt-4 space-y-4">
                <SelectField
                  label="Borrower"
                  value={borrowerId}
                  onChange={(e) => setBorrowerId(e.target.value)}
                >
                  <option value="">Select…</option>
                  {borrowers.map((b) => (
                    <option key={b.id} value={b.id}>{b.name}</option>
                  ))}
                </SelectField>
                <TextField
                  label="Or add new borrower"
                  value={newBorrower}
                  onChange={(e) => setNewBorrower(e.target.value)}
                />
                <TextField
                  label="Due date"
                  type="date"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                />
                <div className="flex gap-2">
                  <Button onClick={handleLoan}>Loan out</Button>
                  <Button variant="secondary" onClick={() => setLoaning(false)}>Cancel</Button>
                </div>
              </div>
            </Card>
          ) : (
            <Button variant="secondary" onClick={() => setLoaning(true)}>
              Loan out
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
