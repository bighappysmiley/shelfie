import type { Config } from "@netlify/functions";
import {
  loadData,
  saveData,
  newId,
  nowIso,
  normalizeLibraryStatus,
  type Book,
} from "./lib/store";
import { isbnVariants, normalizeIsbn } from "./lib/isbn";
import { json, error, handleOptions, parseBody } from "./utils";

export const config: Config = {
  path: "/api/books",
};

function withActiveLoan(
  book: Book,
  loans: { bookId: string; dateReturned: string | null; borrowerId: string }[],
  borrowers: { id: string }[],
) {
  const activeLoan = loans.find((l) => l.bookId === book.id && !l.dateReturned);
  const borrower = activeLoan
    ? borrowers.find((b) => b.id === activeLoan.borrowerId)
    : null;
  return {
    ...book,
    readingStatus: normalizeLibraryStatus(book.readingStatus),
    activeLoan:
      activeLoan && borrower
        ? { loan: activeLoan, borrower }
        : null,
  };
}

export default async (request: Request) => {
  if (request.method === "OPTIONS") return handleOptions();

  const url = new URL(request.url);
  const id = url.searchParams.get("id");

  try {
    const data = await loadData();

    if (request.method === "GET") {
      if (id) {
        const book = data.books.find((b) => b.id === id);
        if (!book) return error("Book not found", 404);
        return json(withActiveLoan(book, data.loans, data.borrowers));
      }

      const q = (url.searchParams.get("q") ?? "").toLowerCase();
      const status = url.searchParams.get("status");
      const format = url.searchParams.get("format");
      const room = url.searchParams.get("room");
      const tag = (url.searchParams.get("tag") ?? "").toLowerCase();
      const sort = url.searchParams.get("sort") ?? "title";
      const order = url.searchParams.get("order") === "desc" ? -1 : 1;

      let books = data.books.map((b) => withActiveLoan(b, data.loans, data.borrowers));

      if (q) {
        books = books.filter((b) =>
          [
            b.title,
            b.authors,
            b.isbn,
            b.seriesName,
            b.locationRoom,
            b.locationShelf,
            ...(b.tags ?? []),
          ]
            .filter(Boolean)
            .some((v) => String(v).toLowerCase().includes(q)),
        );
      }
      if (status === "on_loan") {
        books = books.filter((b) => b.activeLoan);
      } else if (status === "available") {
        books = books.filter(
          (b) => normalizeLibraryStatus(b.readingStatus) === "available" && !b.activeLoan,
        );
      } else if (status) {
        books = books.filter(
          (b) => normalizeLibraryStatus(b.readingStatus) === status,
        );
      }
      if (format) {
        books = books.filter((b) => b.format === format);
      }
      if (room) {
        books = books.filter((b) => (b.locationRoom ?? "") === room);
      }
      if (tag) {
        books = books.filter((b) =>
          (b.tags ?? []).some((t) => t.toLowerCase() === tag),
        );
      }

      books.sort((a, b) => {
        const pick = (book: Book) => {
          switch (sort) {
            case "author":
              return book.authors ?? "";
            case "added":
              return book.createdAt;
            case "published":
              return String(book.publishYear ?? 0);
            case "rating":
              return String(book.personalRating ?? 0);
            default:
              return book.title ?? "";
          }
        };
        return pick(a).localeCompare(pick(b), undefined, { sensitivity: "base" }) * order;
      });

      return json(books);
    }

    if (request.method === "POST") {
      const body = await parseBody<{
        title: string;
        authors?: string;
        isbn?: string;
        coverUrl?: string;
        format?: Book["format"];
        locationRoom?: string;
        locationShelf?: string;
        readingStatus?: string;
        personalRating?: number;
        seriesName?: string;
        seriesNumber?: string;
        purchaseDate?: string;
        purchasePrice?: string;
        condition?: string;
        notes?: string;
        pageCount?: number;
        publisher?: string;
        publishYear?: number;
        description?: string;
        copyNumber?: number;
        tags?: string[];
        allowDuplicate?: boolean;
      }>(request);

      if (!body.title?.trim()) return error("Title is required");

      if (body.isbn && !body.allowDuplicate) {
        const variants = new Set(isbnVariants(body.isbn));
        const existing = data.books.find((b) => {
          if (!b.isbn) return false;
          return isbnVariants(b.isbn).some((v) => variants.has(v));
        });
        if (existing) {
          return json(
            {
              duplicate: true,
              existing,
              message: "A book with this ISBN already exists",
            },
            409,
          );
        }
      }

      const now = nowIso();
      const book: Book = {
        id: newId(),
        title: body.title.trim(),
        authors: body.authors?.trim() ?? "",
        isbn: body.isbn ? normalizeIsbn(body.isbn) : null,
        coverUrl: body.coverUrl || null,
        format: body.format ?? "paperback",
        locationRoom: body.locationRoom || null,
        locationShelf: body.locationShelf || null,
        readingStatus: normalizeLibraryStatus(body.readingStatus ?? "available"),
        personalRating: body.personalRating ?? null,
        seriesName: body.seriesName || null,
        seriesNumber: body.seriesNumber || null,
        purchaseDate: body.purchaseDate || null,
        purchasePrice: body.purchasePrice || null,
        condition: body.condition || null,
        notes: body.notes || null,
        pageCount: body.pageCount ?? null,
        publisher: body.publisher || null,
        publishYear: body.publishYear ?? null,
        description: body.description || null,
        copyNumber: body.copyNumber ?? 1,
        tags: (body.tags ?? []).map((t) => t.trim().toLowerCase()).filter(Boolean),
        createdAt: now,
        updatedAt: now,
      };

      data.books.push(book);
      await saveData(data);
      return json(book, 201);
    }

    if (request.method === "PUT" || request.method === "PATCH") {
      if (!id) return error("Book id required");
      const idx = data.books.findIndex((b) => b.id === id);
      if (idx < 0) return error("Book not found", 404);

      const body = await parseBody<Record<string, unknown>>(request);
      const book = { ...data.books[idx] };
      const fields: (keyof Book)[] = [
        "title", "authors", "isbn", "coverUrl", "format", "locationRoom",
        "locationShelf", "readingStatus", "personalRating", "seriesName",
        "seriesNumber", "purchaseDate", "purchasePrice", "condition", "notes",
        "pageCount", "publisher", "publishYear", "description", "copyNumber",
      ];

      for (const f of fields) {
        if (body[f] !== undefined) {
          (book as Record<string, unknown>)[f] = body[f];
        }
      }
      if (typeof body.isbn === "string") {
        book.isbn = body.isbn ? normalizeIsbn(body.isbn) : null;
      }
      if (typeof body.readingStatus === "string") {
        book.readingStatus = normalizeLibraryStatus(body.readingStatus);
      }
      if (Array.isArray(body.tags)) {
        book.tags = (body.tags as string[]).map((t) => t.trim().toLowerCase()).filter(Boolean);
      }
      book.updatedAt = nowIso();

      data.books[idx] = book;
      await saveData(data);
      return json(book);
    }

    if (request.method === "DELETE") {
      if (!id) return error("Book id required");
      data.books = data.books.filter((b) => b.id !== id);
      data.loans = data.loans.filter((l) => l.bookId !== id);
      await saveData(data);
      return json({ ok: true });
    }

    return error("Method not allowed", 405);
  } catch (e) {
    console.error(e);
    return error(e instanceof Error ? e.message : "Server error", 500);
  }
};
