import { useEffect, useState } from "react";
import { fetchAuthed } from "@/lib/api";

function isDirectImageSrc(src: string): boolean {
  return (
    src.startsWith("blob:") ||
    src.startsWith("data:") ||
    (!src.startsWith("/api/") && !src.startsWith("http"))
  );
}

/** Renders /api/covers (and similar) URLs with auth headers. */
export function AuthedImage({
  src,
  alt = "",
  className = "",
}: {
  src: string;
  alt?: string;
  className?: string;
}) {
  const [resolved, setResolved] = useState(() => (isDirectImageSrc(src) ? src : ""));

  useEffect(() => {
    let revoked: string | null = null;
    let cancelled = false;

    const run = async () => {
      if (isDirectImageSrc(src)) {
        setResolved(src);
        return;
      }
      try {
        const res = await fetchAuthed(src);
        if (!res.ok) throw new Error("failed");
        const blob = await res.blob();
        if (cancelled) return;
        revoked = URL.createObjectURL(blob);
        setResolved(revoked);
      } catch {
        if (!cancelled) setResolved("");
      }
    };
    void run();

    return () => {
      cancelled = true;
      if (revoked) URL.revokeObjectURL(revoked);
    };
  }, [src]);

  if (!resolved) {
    return <div className={className} aria-hidden />;
  }

  return <img src={resolved} alt={alt} className={className} />;
}
