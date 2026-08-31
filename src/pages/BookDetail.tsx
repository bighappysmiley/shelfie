import { useEffect, useState } from "react";
import { Link, useParams, useNavigate } from "react-router-dom";
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
  const [copied, setCopied] = useState(false);

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

  const copyIsbn = async () => {
    if (!book.isbn) return;
    await navigator.clipboard.writeText(book.isbn);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  if (editing) {
    return (
      <div>
        <PageHeader title="Edit book" />
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

  const location = [book.locationRoom, book.locationShelf].filter(Boolean).join(" / ");

  return (
    <div>
      <div className="mb-6">
        <Link to="/library" className="text-[0.9375rem] text-accent">
          Library
        </Link>
      </div>

      <PageHeader
        title={book.title}
        subtitle={book.authors || "Author not listed"}
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

        <div className="space-y-5">
          <div className="flex flex-wrap gap-2">
            {book.activeLoan ? (
              <Badge variant="warning">On loan</Badge>
            ) : (
              <Badge>{STATUS_LABELS[normalizeLibraryStatus(book.readingStatus)]}</Badge>
            )}
            <Badge>{FORMAT_LABELS[book.format]}</Badge>
            {book.personalRating && <Badge>★ {book.personalRating}</Badge>}
            {book.condition && <Badge>{book.condition}</Badge>}
          </div>

          <dl className="grid gap-x-6 gap-y-3 text-sm sm:grid-cols-[8rem_1fr]">
            {book.isbn && (
              <>
                <dt className="text-muted">ISBN</dt>
                <dd className="flex flex-wrap items-center gap-2 font-mono text-[0.9rem]">
                  {book.isbn}
                  <button
                    type="button"
                    onClick={copyIsbn}
                    className="text-xs text-muted hover:text-foreground"
                  >
                    {copied ? "Copied" : "Copy"}
                  </button>
                </dd>
              </>
            )}
            {book.seriesName && (
              <>
                <dt className="text-muted">Series</dt>
                <dd>
                  <Link
                    to={`/library?q=${encodeURIComponent(book.seriesName)}`}
                    className="hover:underline"
                  >
                    {book.seriesName}
                    {book.seriesNumber ? ` #${book.seriesNumber}` : ""}
                  </Link>
                </dd>
              </>
            )}
            {location && (
              <>
                <dt className="text-muted">Location</dt>
                <dd>
                  <Link
                    to={
                      book.locationRoom
                        ? `/library?room=${encodeURIComponent(book.locationRoom)}`
                        : "/locations"
                    }
                    className="hover:underline"
                  >
                    {location}
                  </Link>
                </dd>
              </>
            )}
            {book.publisher && (
              <>
                <dt className="text-muted">Publisher</dt>
                <dd>
                  {book.publisher}
                  {book.publishYear ? ` (${book.publishYear})` : ""}
                </dd>
              </>
            )}
            {book.pageCount != null && (
              <>
                <dt className="text-muted">Pages</dt>
                <dd>{book.pageCount}</dd>
              </>
            )}
            {book.purchasePrice && (
              <>
                <dt className="text-muted">Purchase price</dt>
                <dd>${book.purchasePrice}</dd>
              </>
            )}
            {book.copyNumber > 1 && (
              <>
                <dt className="text-muted">Copy</dt>
                <dd>#{book.copyNumber}</dd>
              </>
            )}
          </dl>

          {book.tags && book.tags.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {book.tags.map((t) => (
                <Link
                  key={t}
                  to={`/library?tag=${encodeURIComponent(t)}`}
                  className="rounded-md bg-accent-soft px-2 py-0.5 text-xs hover:bg-black/[0.06] dark:hover:bg-white/[0.08]"
                >
                  {t}
                </Link>
              ))}
            </div>
          )}

          {book.description && (
            <div>
              <p className="text-sm text-muted">Description</p>
              <p className="mt-1 text-sm leading-relaxed">{book.description}</p>
            </div>
          )}

          {book.notes && (
            <Card className="!p-4">
              <p className="text-sm text-muted">Notes</p>
              <p className="mt-1">{book.notes}</p>
            </Card>
          )}

          {book.activeLoan ? (
            <Card className="!p-4">
              <p className="font-medium">
                Loaned to{" "}
                <Link
                  to={`/borrowers/${book.activeLoan.borrower.id}`}
                  className="hover:underline"
                >
                  {book.activeLoan.borrower.name}
                </Link>
              </p>
              <p className="mt-1 text-sm text-muted">
                Since {book.activeLoan.loan.dateLoaned}
                {book.activeLoan.loan.dueDate && ` · Due ${book.activeLoan.loan.dueDate}`}
              </p>
              <Button className="mt-4" onClick={handleReturn}>
                Mark returned
              </Button>
            </Card>
          ) : loaning ? (
            <Card className="!p-4">
              <h3 className="font-medium">Record loan</h3>
              <div className="mt-4 space-y-4">
                <SelectField
                  label="Borrower"
                  value={borrowerId}
                  onChange={(e) => setBorrowerId(e.target.value)}
                >
                  <option value="">Select…</option>
                  {borrowers.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.name}
                    </option>
                  ))}
                </SelectField>
                <TextField
                  label="New borrower"
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
                  <Button onClick={handleLoan}>Record loan</Button>
                  <Button variant="secondary" onClick={() => setLoaning(false)}>
                    Cancel
                  </Button>
                </div>
              </div>
            </Card>
          ) : book.readingStatus !== "wishlist" ? (
            <Button variant="secondary" onClick={() => setLoaning(true)}>
              Record loan
            </Button>
          ) : null}
        </div>
      </div>
    </div>
  );
}
