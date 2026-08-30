import { Link } from "react-router-dom";
import type { Book } from "@/lib/types";
import { CoverImage } from "./CoverImage";
import { Badge } from "./layout";
import { STATUS_LABELS } from "@/lib/types";

export function BookCard({
  book,
  selected,
  onSelect,
  showStatus = true,
}: {
  book: Book;
  selected?: boolean;
  onSelect?: (id: string) => void;
  showStatus?: boolean;
}) {
  const content = (
  <>
      <div className="flex gap-4">
        <CoverImage
          book={book}
          className="h-24 w-16 shrink-0 rounded-md object-cover bg-accent-soft"
        />
        <div className="min-w-0 flex-1">
          <h3 className="font-medium leading-snug">{book.title}</h3>
          <p className="mt-0.5 text-sm text-muted">{book.authors || "Unknown author"}</p>
          {book.seriesName && (
            <p className="mt-1 text-xs text-muted">
              {book.seriesName}
              {book.seriesNumber ? ` #${book.seriesNumber}` : ""}
            </p>
          )}
          <div className="mt-2 flex flex-wrap gap-1.5">
            {showStatus && book.readingStatus !== "owned" && (
              <Badge>{STATUS_LABELS[book.readingStatus]}</Badge>
            )}
            {book.activeLoan && <Badge variant="warning">On loan</Badge>}
            {book.personalRating && (
              <span className="text-xs text-muted">★ {book.personalRating}</span>
            )}
          </div>
        </div>
      </div>
    </>
  );

  if (onSelect) {
    return (
      <button
        type="button"
        onClick={() => onSelect(book.id)}
        className={`w-full rounded-xl border p-4 text-left transition-colors ${
          selected
            ? "border-foreground bg-black/[0.03] dark:bg-white/[0.05]"
            : "border-black/8 bg-surface hover:border-black/20 dark:border-white/10"
        }`}
      >
        {content}
      </button>
    );
  }

  return (
    <Link
      to={`/book/${book.id}`}
      className="block rounded-xl border border-black/8 bg-surface p-4 transition-colors hover:border-black/20 dark:border-white/10"
    >
      {content}
    </Link>
  );
}
