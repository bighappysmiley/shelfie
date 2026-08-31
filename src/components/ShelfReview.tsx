import { useState } from "react";
import { Button } from "./Button";
import { TextField } from "./form";

interface DetectedBook {
  title: string;
  author: string;
  confidence: number;
  confirmed?: boolean;
  discarded?: boolean;
}

export function ShelfReview({
  books: initial,
  onConfirmAll,
  onDone,
}: {
  books: DetectedBook[];
  onConfirmAll: (books: DetectedBook[]) => Promise<void>;
  onDone: () => void;
}) {
  const [books, setBooks] = useState(
    initial.map((b) => ({ ...b, confirmed: false, discarded: false })),
  );
  const [saving, setSaving] = useState(false);
  const [current, setCurrent] = useState(0);

  const active = books.filter((b) => !b.discarded);
  const pending = active.filter((b) => !b.confirmed);
  const book = pending[0] ?? active[current];

  const update = (idx: number, field: "title" | "author", value: string) => {
    setBooks((prev) => prev.map((b, i) => (i === idx ? { ...b, [field]: value } : b)));
  };

  const confirm = (idx: number) => {
    setBooks((prev) => prev.map((b, i) => (i === idx ? { ...b, confirmed: true } : b)));
    setCurrent((c) => c + 1);
  };

  const discard = (idx: number) => {
    setBooks((prev) => prev.map((b, i) => (i === idx ? { ...b, discarded: true } : b)));
  };

  const handleConfirmAll = async () => {
    setSaving(true);
    const toAdd = books.filter((b) => !b.discarded);
    await onConfirmAll(toAdd);
    setSaving(false);
    onDone();
  };

  if (pending.length === 0 && active.length > 0) {
    return (
      <div className="space-y-4 text-center">
        <p className="text-lg font-medium">All {active.length} books reviewed</p>
        <Button onClick={handleConfirmAll} disabled={saving}>
          {saving ? "Adding…" : `Add ${active.length} books`}
        </Button>
      </div>
    );
  }

  if (!book) {
    return (
      <div className="text-center">
        <p className="text-muted">No books detected</p>
        <Button variant="secondary" onClick={onDone} className="mt-4">
          Back
        </Button>
      </div>
    );
  }

  const idx = books.indexOf(book);

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between text-sm text-muted">
        <span>{pending.length} remaining</span>
        <span>{Math.round(book.confidence * 100)}% confidence</span>
      </div>

      <TextField
        label="Title"
        value={book.title}
        onChange={(e) => update(idx, "title", e.target.value)}
      />
      <TextField
        label="Author"
        value={book.author}
        onChange={(e) => update(idx, "author", e.target.value)}
      />

      <div className="flex gap-3">
        <Button className="flex-1" onClick={() => confirm(idx)}>
          Confirm
        </Button>
        <Button variant="secondary" onClick={() => discard(idx)}>
          Skip
        </Button>
      </div>

      <Button variant="ghost" className="w-full" onClick={handleConfirmAll} disabled={saving}>
        Confirm all remaining ({pending.length})
      </Button>
    </div>
  );
}
