import { useEffect, useState } from "react";
import { bookCoverUrl, coverPlaceholder } from "@/lib/cover";
import { fetchAuthed } from "@/lib/api";

/**
 * Book cover image that:
 * - uses referrerPolicy so Google Books covers aren't blanked
 * - authenticates uploaded /api/covers assets
 * - falls back to a generated placeholder if the URL 404s / is blank
 */
export function CoverImage({
  book,
  className = "",
  alt = "",
}: {
  book: { coverUrl?: string | null; title: string; authors: string; isbn?: string | null };
  className?: string;
  alt?: string;
}) {
  const primary = bookCoverUrl(book);
  const fallback = coverPlaceholder(book.title, book.authors);
  const [src, setSrc] = useState(primary);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let revoked: string | null = null;
    let cancelled = false;

    setFailed(false);

    const load = async () => {
      if (primary.startsWith("/api/covers")) {
        try {
          const res = await fetchAuthed(primary);
          if (!res.ok) throw new Error("cover fetch failed");
          const blob = await res.blob();
          if (cancelled) return;
          revoked = URL.createObjectURL(blob);
          setSrc(revoked);
          return;
        } catch {
          if (!cancelled) setFailed(true);
          return;
        }
      }
      setSrc(primary);
    };

    load();

    return () => {
      cancelled = true;
      if (revoked) URL.revokeObjectURL(revoked);
    };
  }, [primary]);

  return (
    <img
      src={failed ? fallback : src}
      alt={alt}
      className={className}
      referrerPolicy="no-referrer"
      loading="lazy"
      onLoad={(e) => {
        const img = e.currentTarget;
        if (img.naturalWidth > 0 && img.naturalWidth < 10) {
          setFailed(true);
        }
      }}
      onError={() => {
        if (!failed) setFailed(true);
      }}
    />
  );
}
