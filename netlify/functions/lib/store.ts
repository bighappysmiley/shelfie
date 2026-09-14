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

export interface ShelfieData {
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

function score(data: ShelfieData): number {
  return data.books.length * 1000 + data.borrowers.length * 10 + data.loans.length;
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

async function readKey(key: string): Promise<ShelfieData | null> {
  const raw = await store().get(key, { type: "json" });
  if (!raw) return null;
  return normalizeData(raw);
}

/**
 * Load a library blob by id only.
 * Legacy per-user migration happens in recoverLibraryData for owned libraries —
 * never on read, so one account cannot seed another user's/team library.
 */
export async function loadData(libraryId: string): Promise<ShelfieData> {
  const key = dataKey(libraryId);
  const raw = await store().get(key, { type: "json" });
  return normalizeData(raw);
}

export async function saveData(libraryId: string, data: ShelfieData): Promise<void> {
  await store().setJSON(dataKey(libraryId), data);
}

/**
 * Find the richest catalog among a user's OWNED libraries + legacy keys and
 * copy it onto that user's owned primary library.
 * Callers must pass only library ids this user owns — never shared/team libs.
 */
export async function recoverLibraryData(opts: {
  primaryLibraryId: string;
  candidateLibraryIds: string[];
  legacyUserId: string;
}): Promise<{ recovered: boolean; bookCount: number; source?: string }> {
  const candidates: { source: string; data: ShelfieData }[] = [];

  for (const id of opts.candidateLibraryIds) {
    const data = await readKey(dataKey(id));
    if (data && score(data) > 0) candidates.push({ source: `library:${id}`, data });
  }

  // Per-user legacy keys only — never the global "library" key.
  for (const key of [dataKey(opts.legacyUserId), opts.legacyUserId]) {
    const data = await readKey(key);
    if (data && score(data) > 0) candidates.push({ source: key, data });
  }

  if (candidates.length === 0) {
    return { recovered: false, bookCount: 0 };
  }

  candidates.sort((a, b) => score(b.data) - score(a.data));
  const best = candidates[0];
  const primary = await readKey(dataKey(opts.primaryLibraryId));

  if (primary && score(primary) >= score(best.data)) {
    return { recovered: false, bookCount: primary.books.length, source: dataKey(opts.primaryLibraryId) };
  }

  await saveData(opts.primaryLibraryId, best.data);
  return {
    recovered: true,
    bookCount: best.data.books.length,
    source: best.source,
  };
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
