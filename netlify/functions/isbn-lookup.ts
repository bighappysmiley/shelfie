import type { Config } from "@netlify/functions";
import { json, error, handleOptions } from "./utils";
import { isbnVariants, normalizeIsbn, isIsbn10, isIsbn13 } from "./lib/isbn";

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

/** Reliable free cover via our same-origin proxy (avoids blank hotlinked images). */
function coverFromIsbn(isbn: string): string {
  return `/api/cover-proxy?isbn=${encodeURIComponent(normalizeIsbn(isbn))}`;
}

function preferHttps(url?: string): string | undefined {
  if (!url) return undefined;
  return url.replace(/^http:/, "https:");
}

/** Prefer a larger Google Books image when we only got a tiny thumbnail. */
function enlargeGoogleCover(url?: string): string | undefined {
  if (!url) return undefined;
  return preferHttps(url)
    ?.replace("zoom=5", "zoom=1")
    .replace("zoom=1", "zoom=0")
    .replace("&edge=curl", "");
}

/** Proxy remote covers through our API so the browser always gets a same-origin image. */
function proxiedCover(isbn: string, remoteUrl?: string): string {
  if (remoteUrl && !remoteUrl.startsWith("/api/")) {
    return `/api/cover-proxy?isbn=${encodeURIComponent(normalizeIsbn(isbn))}&url=${encodeURIComponent(remoteUrl)}`;
  }
  return coverFromIsbn(isbn);
}

function withCover(meta: BookMetadata, isbn: string): BookMetadata {
  const remote = enlargeGoogleCover(meta.coverUrl) || preferHttps(meta.coverUrl);
  return {
    ...meta,
    coverUrl: proxiedCover(isbn, remote),
    isbn: meta.isbn || isbn,
  };
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
    const coverUrl = preferHttps(book.cover?.large ?? book.cover?.medium ?? book.cover?.small);

    return {
      title: book.title ?? "",
      authors,
      isbn,
      coverUrl,
      pageCount: book.number_of_pages,
      publisher: book.publishers?.[0]?.name ?? book.publishers?.[0],
      publishYear: book.publish_date ? parseInt(String(book.publish_date).slice(-4), 10) : undefined,
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

    const isbn13 = item.industryIdentifiers?.find(
      (i: { type: string }) => i.type === "ISBN_13",
    )?.identifier;
    const isbn10 = item.industryIdentifiers?.find(
      (i: { type: string }) => i.type === "ISBN_10",
    )?.identifier;

    const resolvedIsbn = isbn13 ?? isbn10 ?? isbn;
    const coverUrl =
      enlargeGoogleCover(item.imageLinks?.thumbnail) ||
      enlargeGoogleCover(item.imageLinks?.smallThumbnail);

    return {
      title: item.title ?? "",
      authors: (item.authors ?? []).join(", "),
      isbn: resolvedIsbn,
      coverUrl,
      pageCount: item.pageCount,
      publisher: item.publisher,
      publishYear: item.publishedDate ? parseInt(item.publishedDate.slice(0, 4), 10) : undefined,
      description: item.description,
      seriesName: item.seriesInfo?.seriesTitle,
      seriesNumber: item.seriesInfo?.bookDisplayNumber,
    };
  } catch {
    return null;
  }
}

export default async (request: Request) => {
  if (request.method === "OPTIONS") return handleOptions();
  if (request.method !== "GET") return error("Method not allowed", 405);

  const url = new URL(request.url);
  const rawIsbn = url.searchParams.get("isbn");
  const title = url.searchParams.get("title");
  const authors = url.searchParams.get("authors");

  if (!rawIsbn && !title) return error("isbn or title required");

  if (rawIsbn) {
    const isbn = normalizeIsbn(rawIsbn);
    if (!isIsbn10(isbn) && !isIsbn13(isbn)) {
      return error("Invalid ISBN — use ISBN-10 or ISBN-13");
    }

    for (const variant of isbnVariants(isbn)) {
      const ol = await lookupOpenLibrary(variant);
      if (ol?.title) return json({ source: "openlibrary", ...withCover(ol, variant) });

      const gb = await lookupGoogleBooks(variant);
      if (gb?.title) return json({ source: "googlebooks", ...withCover(gb, variant) });
    }

    // No metadata — still return cover URL so the UI can show it
    return json({ found: false, isbn, coverUrl: coverFromIsbn(isbn) });
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
      const resolvedIsbn = isbn13 ?? isbn10;

      const remote =
        enlargeGoogleCover(item.imageLinks?.thumbnail) ||
        enlargeGoogleCover(item.imageLinks?.smallThumbnail);

      return json({
        source: "googlebooks",
        title: item.title ?? title,
        authors: (item.authors ?? [authors]).filter(Boolean).join(", "),
        isbn: resolvedIsbn,
        coverUrl: resolvedIsbn
          ? proxiedCover(resolvedIsbn, remote)
          : remote
            ? `/api/cover-proxy?url=${encodeURIComponent(remote)}`
            : undefined,
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
