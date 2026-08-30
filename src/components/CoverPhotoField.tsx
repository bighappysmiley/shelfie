import { useRef, useState } from "react";
import { compressCover } from "@/lib/cover-upload";
import { CoverImage } from "./CoverImage";
import { Button } from "./Button";

export function CoverPhotoField({
  value,
  title,
  authors,
  isbn,
  onChange,
}: {
  value: string;
  title: string;
  authors: string;
  isbn?: string;
  onChange: (url: string) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");

  const upload = async (file: File) => {
    if (!file.type.startsWith("image/")) {
      setError("Please choose an image");
      return;
    }
    setUploading(true);
    setError("");
    try {
      const raw = await readAsDataUrl(file);
      const { dataUrl, mediaType } = await compressCover(raw);
      const res = await fetch("/api/covers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ image: dataUrl, mediaType }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: "Upload failed" }));
        throw new Error(err.error || "Upload failed");
      }
      const data = (await res.json()) as { url: string };
      onChange(data.url);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  };

  const fromLookup =
    value.includes("/api/cover-proxy") ||
    value.includes("covers.openlibrary.org") ||
    value.includes("books.google");

  return (
    <div>
      <span className="mb-1.5 block text-sm font-medium">Cover</span>
      <div className="flex items-start gap-4">
        <CoverImage
          book={{ coverUrl: value || null, title: title || "Book", authors, isbn }}
          className="h-36 w-24 shrink-0 rounded-md object-cover bg-accent-soft"
        />
        <div className="min-w-0 flex-1 space-y-2">
          <p className="text-sm text-muted">
            {fromLookup
              ? "Cover loaded from ISBN lookup. You can replace it with your own photo."
              : "Take a photo or choose an image from your library."}
          </p>
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant="secondary"
              disabled={uploading}
              onClick={() => inputRef.current?.click()}
            >
              {uploading ? "Uploading…" : value ? "Change photo" : "Add photo"}
            </Button>
            {value && (
              <Button
                type="button"
                variant="ghost"
                disabled={uploading}
                onClick={() => onChange("")}
              >
                Remove
              </Button>
            )}
          </div>
          {error && <p className="text-sm text-warning">{error}</p>}
        </div>
      </div>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          e.target.value = "";
          if (file) void upload(file);
        }}
      />
    </div>
  );
}

function readAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error("Could not read file"));
    reader.readAsDataURL(file);
  });
}
