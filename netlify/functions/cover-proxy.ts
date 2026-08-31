import type { Config } from "@netlify/functions";
import { normalizeIsbn, isIsbn10, isIsbn13, isbnVariants } from "./lib/isbn";
import { error, handleOptions } from "./utils";

export const config: Config = {
  path: "/api/cover-proxy",
};

const MIN_BYTES = 2_000; // Open Library empty placeholder is ~43 bytes

async function fetchImage(url: string): Promise<{ bytes: ArrayBuffer; type: string } | null> {
  try {
    const res = await fetch(url, {
      headers: {
        // Some CDNs (esp. Google Books) blank-out hotlinked images
        "User-Agent": "Pine Books/1.0 (book catalog; cover fetch)",
        Accept: "image/*,*/*",
      },
      redirect: "follow",
    });
    if (!res.ok) return null;
    const type = res.headers.get("content-type") ?? "image/jpeg";
    if (!type.startsWith("image/")) return null;
    const bytes = await res.arrayBuffer();
    if (bytes.byteLength < MIN_BYTES) return null;
    return { bytes, type };
  } catch {
    return null;
  }
}

function openLibraryUrls(isbn: string): string[] {
  const variants = isbnVariants(isbn);
  const sizes = ["L", "M"] as const;
  const urls: string[] = [];
  for (const v of variants) {
    for (const size of sizes) {
      // default=false makes missing covers 404 instead of a blank GIF
      urls.push(`https://covers.openlibrary.org/b/isbn/${v}-${size}.jpg?default=false`);
    }
  }
  return urls;
}

export default async (request: Request) => {
  if (request.method === "OPTIONS") return handleOptions();
  if (request.method !== "GET") return error("Method not allowed", 405);

  const url = new URL(request.url);
  const isbnParam = url.searchParams.get("isbn");
  const remote = url.searchParams.get("url");

  const candidates: string[] = [];

  if (isbnParam) {
    const isbn = normalizeIsbn(isbnParam);
    if (!isIsbn10(isbn) && !isIsbn13(isbn)) {
      return error("Invalid ISBN", 400);
    }
    candidates.push(...openLibraryUrls(isbn));
  }

  if (remote) {
    try {
      const parsed = new URL(remote);
      if (parsed.protocol === "https:" || parsed.protocol === "http:") {
        // Rewrite Google Books thumbnails to larger zoom
        let u = remote.replace(/^http:/, "https:");
        u = u.replace("zoom=5", "zoom=0").replace("zoom=1", "zoom=0").replace("&edge=curl", "");
        candidates.push(u);
      }
    } catch {
      return error("Invalid url", 400);
    }
  }

  if (candidates.length === 0) return error("isbn or url required", 400);

  for (const candidate of candidates) {
    const img = await fetchImage(candidate);
    if (!img) continue;
    return new Response(img.bytes, {
      headers: {
        "Content-Type": img.type,
        "Cache-Control": "public, max-age=604800",
        "Access-Control-Allow-Origin": "*",
      },
    });
  }

  return new Response(null, { status: 404 });
};
