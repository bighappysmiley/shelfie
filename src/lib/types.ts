export type LibraryStatus = "available" | "wishlist" | "missing";

/** @deprecated Use LibraryStatus — kept as alias during migration */
export type ReadingStatus = LibraryStatus;

export type BookFormat = "hardcover" | "paperback" | "ebook" | "audiobook";
export type BookCondition = "new" | "good" | "worn" | "damaged";

export interface Book {
  id: string;
  title: string;
  authors: string;
  isbn: string | null;
  coverUrl: string | null;
  format: BookFormat;
  locationRoom: string | null;
  locationShelf: string | null;
  readingStatus: LibraryStatus;
  personalRating: number | null;
  seriesName: string | null;
  seriesNumber: string | null;
  purchaseDate: string | null;
  purchasePrice: string | null;
  condition: BookCondition | null;
  notes: string | null;
  pageCount: number | null;
  publisher: string | null;
  publishYear: number | null;
  description: string | null;
  copyNumber: number;
  createdAt: string;
  updatedAt: string;
  tags?: string[];
  activeLoan?: {
    loan: Loan;
    borrower: Borrower;
  } | null;
}

export interface Borrower {
  id: string;
  name: string;
  phone: string | null;
  email: string | null;
  avatarUrl: string | null;
  createdAt: string;
  loans?: { loan: Loan; book: Book }[];
}

export interface Loan {
  id: string;
  bookId: string;
  borrowerId: string;
  dateLoaned: string;
  dueDate: string | null;
  dateReturned: string | null;
  notes: string | null;
  createdAt: string;
}

export interface LoanWithDetails {
  loan: Loan;
  book: Book;
  borrower: Borrower;
}

export interface BookFormData {
  title: string;
  authors: string;
  isbn: string;
  coverUrl: string;
  format: BookFormat;
  locationRoom: string;
  locationShelf: string;
  readingStatus: LibraryStatus;
  personalRating: number | "";
  seriesName: string;
  seriesNumber: string;
  purchaseDate: string;
  purchasePrice: string;
  condition: BookCondition | "";
  notes: string;
  pageCount: number | "";
  publisher: string;
  publishYear: number | "";
  description: string;
  copyNumber: number;
  tags: string;
  allowDuplicate?: boolean;
}

/** Catalog statuses only — "On loan" comes from the lending system. */
export const STATUS_LABELS: Record<LibraryStatus, string> = {
  available: "Available",
  wishlist: "Wishlist",
  missing: "Missing",
};

/** Map legacy reading-habit statuses to library statuses. */
export function normalizeLibraryStatus(raw: string | null | undefined): LibraryStatus {
  if (raw === "wishlist" || raw === "to-read" || raw === "to_read") return "wishlist";
  if (raw === "missing") return "missing";
  // owned, reading, read, want_to_read, and anything else → available
  return "available";
}

export const FORMAT_LABELS: Record<BookFormat, string> = {
  hardcover: "Hardcover",
  paperback: "Paperback",
  ebook: "E-book",
  audiobook: "Audiobook",
};

export function emptyBookForm(): BookFormData {
  return {
    title: "",
    authors: "",
    isbn: "",
    coverUrl: "",
    format: "paperback",
    locationRoom: "",
    locationShelf: "",
    readingStatus: "available",
    personalRating: "",
    seriesName: "",
    seriesNumber: "",
    purchaseDate: "",
    purchasePrice: "",
    condition: "",
    notes: "",
    pageCount: "",
    publisher: "",
    publishYear: "",
    description: "",
    copyNumber: 1,
    tags: "",
  };
}
