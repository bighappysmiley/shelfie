import { Link } from "react-router-dom";
import type { Book } from "@/lib/types";
import { CoverImage } from "./CoverImage";
import { Badge } from "./layout";
import { STATUS_LABELS } from "@/lib/types";

function Checkmark({ selected }: { selected: boolean }) {
  return (
    <span
      className={`flex h-[22px] w-[22px] shrink-0 items-center justify-center rounded-full border-2 transition-colors ${
        selected ? "border-accent bg-accent text-accent-contrast" : "border-tertiary"
      }`}
    >
      {selected && (
        <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden>
          <path
            d="M2.5 6L5 8.5L9.5 3.5"
            stroke="currentColor"
            strokeWidth="1.75"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      )}
    </span>
  );
}

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
  if (view === "covers") {
    const coverInner = (
      <>
        <div className="aspect-[2/3] overflow-hidden rounded-md bg-fill">
          <CoverImage book={book} className="h-full w-full object-cover" />
        </div>
        <div className="mt-2 min-w-0">
          <h3 className="line-clamp-2 text-[0.8125rem] font-medium leading-snug">{book.title}</h3>
          <p className="mt-0.5 truncate text-[0.75rem] text-muted">
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
          className="w-full text-left"
        >
          <div className="relative">
            {coverInner}
            <div className="absolute top-1 right-1">
              <Checkmark selected={!!selected} />
            </div>
          </div>
        </button>
      );
    }

    return (
      <Link to={`/book/${book.id}`} className="block active:opacity-70">
        {coverInner}
      </Link>
    );
  }

  const location =
    [book.locationRoom, book.locationShelf].filter(Boolean).join(" · ") || null;

  const trailing = (
    <div className="flex shrink-0 items-center gap-2">
      {book.activeLoan ? (
        <Badge variant="warning">On loan</Badge>
      ) : (
        showStatus &&
        book.readingStatus !== "available" && (
          <Badge>{STATUS_LABELS[book.readingStatus] ?? book.readingStatus}</Badge>
        )
      )}
      {!onSelect && (
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none" className="text-tertiary" aria-hidden>
          <path d="M5 3.5L8.5 7L5 10.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      )}
      {onSelect && <Checkmark selected={!!selected} />}
    </div>
  );

  const inner = (
    <div className="flex min-h-[64px] items-center gap-3 px-4 py-2.5 hairline-b last:border-b-0 active:bg-fill-secondary">
      <CoverImage
        book={book}
        className="h-12 w-9 shrink-0 rounded-[4px] object-cover bg-fill"
      />
      <div className="min-w-0 flex-1">
        <h3 className="truncate text-[1.0625rem] font-normal leading-snug">{book.title}</h3>
        <p className="truncate text-[0.9375rem] text-muted">{book.authors || "Unknown author"}</p>
        {(location || book.seriesName) && (
          <p className="truncate text-[0.8125rem] text-muted">
            {[book.seriesName && `${book.seriesName}${book.seriesNumber ? ` #${book.seriesNumber}` : ""}`, location]
              .filter(Boolean)
              .join(" · ")}
          </p>
        )}
      </div>
      {trailing}
    </div>
  );

  if (onSelect) {
    return (
      <button type="button" onClick={() => onSelect(book.id)} className="block w-full text-left">
        {inner}
      </button>
    );
  }

  return (
    <Link to={`/book/${book.id}`} className="block">
      {inner}
    </Link>
  );
}
