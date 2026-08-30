import { getStore } from "@netlify/blobs";
import { randomUUID } from "node:crypto";

export type LibraryStatus = "available" | "wishlist" | "missing";

export type BookFormat = "hardcover" | "paperback" | "ebook" | "audiobook";

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
  condition: string | null;
  notes: string | null;
  pageCount: number | null;
  publisher: string | null;
  publishYear: number | null;
  description: string | null;
  copyNumber: number;
  tags: string[];
  createdAt: string;
  updatedAt: string;
}

export function normalizeLibraryStatus(raw: string | null | undefined): LibraryStatus {
  if (raw === "wishlist" || raw === "to-read" || raw === "to_read") return "wishlist";
  if (raw === "missing") return "missing";
  return "available";
}

export interface Borrower {
  id: string;
  name: string;
  phone: string | null;
  email: string | null;
  avatarUrl: string | null;
  createdAt: string;
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

interface ShelfieData {
  books: Book[];
  borrowers: Borrower[];
  loans: Loan[];
}

const EMPTY: ShelfieData = { books: [], borrowers: [], loans: [] };
const DATA_KEY = "library";

function store() {
  return getStore({ name: "shelfie", consistency: "strong" });
}

export async function loadData(): Promise<ShelfieData> {
  const data = await store().get(DATA_KEY, { type: "json" });
  if (!data) return structuredClone(EMPTY);
  return {
    books: Array.isArray(data.books) ? data.books : [],
    borrowers: Array.isArray(data.borrowers) ? data.borrowers : [],
    loans: Array.isArray(data.loans) ? data.loans : [],
  };
}

export async function saveData(data: ShelfieData): Promise<void> {
  await store().setJSON(DATA_KEY, data);
}

export function newId(): string {
  return randomUUID();
}

export function nowIso(): string {
  return new Date().toISOString();
}

export function todayDate(): string {
  return new Date().toISOString().slice(0, 10);
}
