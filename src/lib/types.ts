export type ReadingStatus =
  | "owned"
  | "reading"
  | "read"
  | "want_to_read"
  | "wishlist";

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
  readingStatus: ReadingStatus;
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
  readingStatus: ReadingStatus;
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

export const STATUS_LABELS: Record<ReadingStatus, string> = {
  owned: "Owned",
  reading: "Reading",
  read: "Read",
  want_to_read: "Want to Read",
  wishlist: "Wishlist",
};

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
    readingStatus: "owned",
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
