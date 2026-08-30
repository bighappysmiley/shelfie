import type { Config } from "@netlify/functions";
import { json, error, handleOptions } from "./utils";

export const config: Config = {
  path: "/api/isbn-lookup",
};

interface BookMetadata {
  title: string;
  authors: string;
  isbn?: string;
  coverUrl?: string;
  pageCount?: number;
  publisher?: string;
  publishYear?: number;
  description?: string;
  seriesName?: string;
  seriesNumber?: string;
}

async function lookupOpenLibrary(isbn: string): Promise<BookMetadata | null> {
  try {
    const res = await fetch(
      `https://openlibrary.org/api/books?bibkeys=ISBN:${isbn}&format=json&jscmd=data`,
    );
    const data = await res.json();
    const key = `ISBN:${isbn}`;
    const book = data[key];
    if (!book) return null;

    const authors = (book.authors ?? []).map((a: { name: string }) => a.name).join(", ");
    const coverUrl = book.cover?.large ?? book.cover?.medium ?? book.cover?.small;

    return {
      title: book.title ?? "",
      authors,
      isbn,
      coverUrl,
      pageCount: book.number_of_pages,
      publisher: book.publishers?.[0],
      publishYear: book.publish_date ? parseInt(book.publish_date.slice(-4), 10) : undefined,
      description: typeof book.notes === "string" ? book.notes : undefined,
    };
  } catch {
    return null;
  }
}

async function lookupGoogleBooks(isbn: string): Promise<BookMetadata | null> {
  try {
    const res = await fetch(
      `https://www.googleapis.com/books/v1/volumes?q=isbn:${isbn}`,
    );
    const data = await res.json();
    const item = data.items?.[0]?.volumeInfo;
    if (!item) return null;

    const seriesInfo = item.seriesInfo?.bookDisplayNumber;

    return {
      title: item.title ?? "",
      authors: (item.authors ?? []).join(", "),
      isbn,
      coverUrl: item.imageLinks?.thumbnail?.replace("http:", "https:"),
      pageCount: item.pageCount,
      publisher: item.publisher,
      publishYear: item.publishedDate ? parseInt(item.publishedDate.slice(0, 4), 10) : undefined,
      description: item.description,
      seriesName: item.seriesInfo?.seriesTitle,
      seriesNumber: seriesInfo,
    };
  } catch {
    return null;
  }
}

export default async (request: Request) => {
  if (request.method === "OPTIONS") return handleOptions();
  if (request.method !== "GET") return error("Method not allowed", 405);

  const url = new URL(request.url);
  const isbn = url.searchParams.get("isbn")?.replace(/[-\s]/g, "");
  const title = url.searchParams.get("title");
  const authors = url.searchParams.get("authors");

  if (!isbn && !title) return error("isbn or title required");

  if (isbn) {
    const ol = await lookupOpenLibrary(isbn);
    if (ol?.title) return json({ source: "openlibrary", ...ol });

    const gb = await lookupGoogleBooks(isbn);
    if (gb?.title) return json({ source: "googlebooks", ...gb });

    return json({ found: false, isbn });
  }

  if (title) {
    try {
      const q = encodeURIComponent(`${title} ${authors ?? ""}`.trim());
      const res = await fetch(`https://www.googleapis.com/books/v1/volumes?q=${q}&maxResults=1`);
      const data = await res.json();
      const item = data.items?.[0]?.volumeInfo;
      if (!item) return json({ found: false });

      const isbn13 = item.industryIdentifiers?.find(
        (i: { type: string }) => i.type === "ISBN_13",
      )?.identifier;
      const isbn10 = item.industryIdentifiers?.find(
        (i: { type: string }) => i.type === "ISBN_10",
      )?.identifier;

      return json({
        source: "googlebooks",
        title: item.title ?? title,
        authors: (item.authors ?? [authors]).filter(Boolean).join(", "),
        isbn: isbn13 ?? isbn10,
        coverUrl: item.imageLinks?.thumbnail?.replace("http:", "https:"),
        pageCount: item.pageCount,
        publisher: item.publisher,
        publishYear: item.publishedDate ? parseInt(item.publishedDate.slice(0, 4), 10) : undefined,
        description: item.description,
        seriesName: item.seriesInfo?.seriesTitle,
        seriesNumber: item.seriesInfo?.bookDisplayNumber,
      });
    } catch {
      return json({ found: false });
    }
  }

  return error("Lookup failed");
};
