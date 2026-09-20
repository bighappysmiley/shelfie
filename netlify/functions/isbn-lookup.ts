import type { Config } from "@netlify/functions";
import { json, error } from "./utils";
import { withAuth } from "./lib/auth";
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

const OL_UA = "PineBooks/1.0 (personal library catalog; https://shelfielibrary.netlify.app)";

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

async function fetchJson(url: string, init?: RequestInit): Promise<unknown | null> {
  try {
    const res = await fetch(url, {
      ...init,
      headers: {
        Accept: "application/json",
        "User-Agent": OL_UA,
        ...(init?.headers ?? {}),
      },
    });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

/** Open Library books API (often flaky / 503). */
async function lookupOpenLibraryBooksApi(isbn: string): Promise<BookMetadata | null> {
  const data = (await fetchJson(
    `https://openlibrary.org/api/books?bibkeys=ISBN:${isbn}&format=json&jscmd=data`,
  )) as Record<string, unknown> | null;
  if (!data) return null;

  const book = data[`ISBN:${isbn}`] as
    | {
        title?: string;
        authors?: { name: string }[];
        cover?: { large?: string; medium?: string; small?: string };
        number_of_pages?: number;
        publishers?: ({ name?: string } | string)[];
        publish_date?: string;
        notes?: string | { value?: string };
      }
    | undefined;
  if (!book?.title) return null;

  const authors = (book.authors ?? []).map((a) => a.name).join(", ");
  const coverUrl = preferHttps(book.cover?.large ?? book.cover?.medium ?? book.cover?.small);
  const publisher =
    typeof book.publishers?.[0] === "string"
      ? book.publishers[0]
      : book.publishers?.[0]?.name;

  return {
    title: book.title,
    authors,
    isbn,
    coverUrl,
    pageCount: book.number_of_pages,
    publisher,
    publishYear: book.publish_date ? parseInt(String(book.publish_date).slice(-4), 10) : undefined,
    description: typeof book.notes === "string" ? book.notes : book.notes?.value,
  };
}

/** Open Library brief volumes API — more reliable than bibkeys. */
async function lookupOpenLibraryBrief(isbn: string): Promise<BookMetadata | null> {
  const data = (await fetchJson(
    `https://openlibrary.org/api/volumes/brief/isbn/${encodeURIComponent(isbn)}.json`,
  )) as {
    records?: Record<
      string,
      {
        data?: {
          title?: string;
          authors?: { name: string }[];
          number_of_pages?: number;
          publishers?: { name: string }[];
          publish_date?: string;
          cover?: { large?: string; medium?: string; small?: string };
          identifiers?: { isbn_13?: string[]; isbn_10?: string[] };
        };
      }
    >;
  } | null;

  const records = data?.records ? Object.values(data.records) : [];
  const book = records[0]?.data;
  if (!book?.title) return null;

  const resolvedIsbn =
    book.identifiers?.isbn_13?.[0] ?? book.identifiers?.isbn_10?.[0] ?? isbn;

  return {
    title: book.title,
    authors: (book.authors ?? []).map((a) => a.name).join(", "),
    isbn: resolvedIsbn,
    coverUrl: preferHttps(book.cover?.large ?? book.cover?.medium ?? book.cover?.small),
    pageCount: book.number_of_pages,
    publisher: book.publishers?.[0]?.name,
    publishYear: book.publish_date
      ? parseInt(String(book.publish_date).slice(-4), 10)
      : undefined,
  };
}

/** Open Library search API — most reliable free endpoint right now. */
async function lookupOpenLibrarySearch(isbn: string): Promise<BookMetadata | null> {
  const data = (await fetchJson(
    `https://openlibrary.org/search.json?isbn=${encodeURIComponent(isbn)}&limit=1`,
  )) as {
    docs?: {
      title?: string;
      author_name?: string[];
      publisher?: string[];
      first_publish_year?: number;
      publish_year?: number[];
      number_of_pages_median?: number;
      cover_i?: number;
      isbn?: string[];
    }[];
  } | null;

  const doc = data?.docs?.[0];
  if (!doc?.title) return null;

  const coverUrl =
    typeof doc.cover_i === "number"
      ? `https://covers.openlibrary.org/b/id/${doc.cover_i}-L.jpg`
      : undefined;

  const matchedIsbn =
    doc.isbn?.find((v) => normalizeIsbn(v) === isbn) ??
    doc.isbn?.find((v) => isIsbn13(normalizeIsbn(v)) || isIsbn10(normalizeIsbn(v))) ??
    isbn;

  return {
    title: doc.title,
    authors: (doc.author_name ?? []).join(", "),
    isbn: matchedIsbn,
    coverUrl,
    pageCount: doc.number_of_pages_median,
    publisher: doc.publisher?.[0],
    publishYear: doc.first_publish_year ?? doc.publish_year?.[0],
  };
}

async function lookupOpenLibrary(isbn: string): Promise<BookMetadata | null> {
  // Prefer endpoints that are currently healthy; fall back to the classic books API.
  return (
    (await lookupOpenLibraryBrief(isbn)) ??
    (await lookupOpenLibrarySearch(isbn)) ??
    (await lookupOpenLibraryBooksApi(isbn))
  );
}

function googleBooksApiKey(): string | null {
  // Prefer Netlify.env when available; fall back to process.env for local/tests.
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const netlifyEnv = (globalThis as any).Netlify?.env?.get?.("GOOGLE_BOOKS_API_KEY");
    if (typeof netlifyEnv === "string" && netlifyEnv.trim()) return netlifyEnv.trim();
  } catch {
    /* ignore */
  }
  return process.env.GOOGLE_BOOKS_API_KEY?.trim() || null;
}

async function lookupGoogleBooks(isbn: string): Promise<BookMetadata | null> {
  const key = googleBooksApiKey();
  const qs = new URLSearchParams({ q: `isbn:${isbn}` });
  if (key) qs.set("key", key);

  const data = (await fetchJson(
    `https://www.googleapis.com/books/v1/volumes?${qs.toString()}`,
  )) as {
    error?: { code?: number; message?: string };
    items?: {
      volumeInfo?: {
        title?: string;
        authors?: string[];
        industryIdentifiers?: { type: string; identifier: string }[];
        imageLinks?: { thumbnail?: string; smallThumbnail?: string };
        pageCount?: number;
        publisher?: string;
        publishedDate?: string;
        description?: string;
        seriesInfo?: { seriesTitle?: string; bookDisplayNumber?: string };
      };
    }[];
  } | null;

  if (!data || data.error) return null;

  const item = data.items?.[0]?.volumeInfo;
  if (!item?.title) return null;

  const isbn13 = item.industryIdentifiers?.find((i) => i.type === "ISBN_13")?.identifier;
  const isbn10 = item.industryIdentifiers?.find((i) => i.type === "ISBN_10")?.identifier;
  const resolvedIsbn = isbn13 ?? isbn10 ?? isbn;
  const coverUrl =
    enlargeGoogleCover(item.imageLinks?.thumbnail) ||
    enlargeGoogleCover(item.imageLinks?.smallThumbnail);

  return {
    title: item.title,
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
}

async function lookupByIsbn(isbn: string): Promise<BookMetadata | null> {
  for (const variant of isbnVariants(isbn)) {
    const ol = await lookupOpenLibrary(variant);
    if (ol?.title) return withCover(ol, variant);

    const gb = await lookupGoogleBooks(variant);
    if (gb?.title) return withCover(gb, variant);
  }
  return null;
}

async function lookupByTitle(
  title: string,
  authors: string | null,
): Promise<(BookMetadata & { source: string }) | { found: false }> {
  // Prefer Open Library search first — Google Books quota is often exhausted without a key.
  const olQ = encodeURIComponent(`${title} ${authors ?? ""}`.trim());
  const olData = (await fetchJson(
    `https://openlibrary.org/search.json?q=${olQ}&limit=1`,
  )) as {
    docs?: {
      title?: string;
      author_name?: string[];
      publisher?: string[];
      first_publish_year?: number;
      number_of_pages_median?: number;
      cover_i?: number;
      isbn?: string[];
    }[];
  } | null;

  const olDoc = olData?.docs?.[0];
  if (olDoc?.title) {
    const resolvedIsbn = olDoc.isbn?.find((v) => {
      const n = normalizeIsbn(v);
      return isIsbn13(n) || isIsbn10(n);
    });
    const coverUrl =
      typeof olDoc.cover_i === "number"
        ? `https://covers.openlibrary.org/b/id/${olDoc.cover_i}-L.jpg`
        : undefined;
    return {
      source: "openlibrary",
      title: olDoc.title,
      authors: (olDoc.author_name ?? [authors]).filter(Boolean).join(", "),
      isbn: resolvedIsbn,
      coverUrl: resolvedIsbn
        ? proxiedCover(resolvedIsbn, coverUrl)
        : coverUrl
          ? `/api/cover-proxy?url=${encodeURIComponent(coverUrl)}`
          : undefined,
      pageCount: olDoc.number_of_pages_median,
      publisher: olDoc.publisher?.[0],
      publishYear: olDoc.first_publish_year,
    };
  }

  const key = googleBooksApiKey();
  const qs = new URLSearchParams({
    q: `${title} ${authors ?? ""}`.trim(),
    maxResults: "1",
  });
  if (key) qs.set("key", key);

  const data = (await fetchJson(
    `https://www.googleapis.com/books/v1/volumes?${qs.toString()}`,
  )) as {
    items?: {
      volumeInfo?: {
        title?: string;
        authors?: string[];
        industryIdentifiers?: { type: string; identifier: string }[];
        imageLinks?: { thumbnail?: string; smallThumbnail?: string };
        pageCount?: number;
        publisher?: string;
        publishedDate?: string;
        description?: string;
        seriesInfo?: { seriesTitle?: string; bookDisplayNumber?: string };
      };
    }[];
  } | null;

  const item = data?.items?.[0]?.volumeInfo;
  if (!item?.title) return { found: false };

  const isbn13 = item.industryIdentifiers?.find((i) => i.type === "ISBN_13")?.identifier;
  const isbn10 = item.industryIdentifiers?.find((i) => i.type === "ISBN_10")?.identifier;
  const resolvedIsbn = isbn13 ?? isbn10;
  const remote =
    enlargeGoogleCover(item.imageLinks?.thumbnail) ||
    enlargeGoogleCover(item.imageLinks?.smallThumbnail);

  return {
    source: "googlebooks",
    title: item.title,
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
  };
}

export default withAuth(async (request) => {
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

    const meta = await lookupByIsbn(isbn);
    if (meta?.title) {
      return json({ found: true, source: "catalog", ...meta });
    }

    // No metadata — still return cover URL so the UI can show it
    return json({ found: false, isbn, coverUrl: coverFromIsbn(isbn) });
  }

  if (title) {
    try {
      const result = await lookupByTitle(title, authors);
      return json(result);
    } catch {
      return json({ found: false });
    }
  }

  return error("Lookup failed");
});
