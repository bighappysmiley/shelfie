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

function store() {
  return getStore({ name: "shelfie", consistency: "strong" });
}

function dataKey(libraryId: string): string {
  return `library:${libraryId}`;
}

function normalizeData(raw: unknown): ShelfieData {
  if (!raw || typeof raw !== "object") return structuredClone(EMPTY);
  const data = raw as Partial<ShelfieData>;
  return {
    books: Array.isArray(data.books) ? data.books : [],
    borrowers: Array.isArray(data.borrowers) ? data.borrowers : [],
    loans: Array.isArray(data.loans) ? data.loans : [],
  };
}

/** Load library blob, migrating from legacy per-user key when needed. */
export async function loadData(
  libraryId: string,
  legacyUserId?: string,
): Promise<ShelfieData> {
  const key = dataKey(libraryId);
  let raw = await store().get(key, { type: "json" });

  if (!raw && legacyUserId && legacyUserId !== libraryId) {
    const legacy = await store().get(dataKey(legacyUserId), { type: "json" });
    if (legacy) {
      await store().setJSON(key, legacy);
      raw = legacy;
    }
  }

  return normalizeData(raw);
}

export async function saveData(libraryId: string, data: ShelfieData): Promise<void> {
  await store().setJSON(dataKey(libraryId), data);
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
