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
  view = "list",
}: {
  book: Book;
  selected?: boolean;
  onSelect?: (id: string) => void;
  showStatus?: boolean;
  view?: "list" | "covers";
}) {
  const statusBadges = (
    <div className="mt-2 flex flex-wrap gap-1.5">
      {book.activeLoan ? (
        <Badge variant="warning">On loan</Badge>
      ) : (
        showStatus &&
        book.readingStatus !== "available" && (
          <Badge>{STATUS_LABELS[book.readingStatus] ?? book.readingStatus}</Badge>
        )
      )}
      {book.personalRating && (
        <span className="text-xs text-muted">★ {book.personalRating}</span>
      )}
    </div>
  );

  if (view === "covers") {
    const coverInner = (
      <>
        <div className="aspect-[2/3] overflow-hidden rounded-lg bg-accent-soft">
          <CoverImage book={book} className="h-full w-full object-cover" />
        </div>
        <div className="mt-2 min-w-0">
          <h3 className="line-clamp-2 text-sm font-medium leading-snug">{book.title}</h3>
          <p className="mt-0.5 truncate text-xs text-muted">
            {book.authors || "Unknown author"}
          </p>
          {book.activeLoan && (
            <div className="mt-1">
              <Badge variant="warning">On loan</Badge>
            </div>
          )}
        </div>
      </>
    );

    if (onSelect) {
      return (
        <button
          type="button"
          onClick={() => onSelect(book.id)}
          className={`w-full text-left transition-opacity ${selected ? "opacity-100 ring-2 ring-foreground rounded-lg p-1" : "hover:opacity-90"}`}
        >
          {coverInner}
        </button>
      );
    }

    return (
      <Link to={`/book/${book.id}`} className="block transition-opacity hover:opacity-90">
        {coverInner}
      </Link>
    );
  }

  const location =
    [book.locationRoom, book.locationShelf].filter(Boolean).join(" · ") || null;

  const content = (
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
        {location && <p className="mt-1 text-xs text-muted">{location}</p>}
        {statusBadges}
      </div>
    </div>
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
