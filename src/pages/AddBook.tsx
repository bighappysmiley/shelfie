import { useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { api } from "@/lib/api";
import { emptyBookForm, type BookFormData } from "@/lib/types";
import { BookForm, formToPayload } from "@/components/BookForm";
import { BarcodeScanner } from "@/components/BarcodeScanner";
import { PhotoCapture } from "@/components/PhotoCapture";
import { ShelfReview } from "@/components/ShelfReview";
import { PageHeader, Card } from "@/components/layout";
import { Button } from "@/components/Button";

type Mode = "manual" | "scan" | "cover" | "shelf" | "shelf-review";

export function AddBookPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const initialMode = (searchParams.get("mode") as Mode) || "manual";
  const [mode, setMode] = useState<Mode>(initialMode);
  const [form, setForm] = useState(emptyBookForm());
  const [duplicateWarning, setDuplicateWarning] = useState("");
  const [loading, setLoading] = useState(false);
  const [shelfBooks, setShelfBooks] = useState<{ title: string; author: string; confidence: number }[]>([]);

  const fillFromLookup = async (data: Record<string, unknown>) => {
    setForm((f) => ({
      ...f,
      title: (data.title as string) ?? f.title,
      authors: (data.authors as string) ?? f.authors,
      isbn: (data.isbn as string) ?? f.isbn,
      coverUrl: (data.coverUrl as string) ?? f.coverUrl,
      pageCount: (data.pageCount as number) ?? f.pageCount,
      publisher: (data.publisher as string) ?? f.publisher,
      publishYear: (data.publishYear as number) ?? f.publishYear,
      description: (data.description as string) ?? f.description,
      seriesName: (data.seriesName as string) ?? f.seriesName,
      seriesNumber: (data.seriesNumber as string) ?? f.seriesNumber,
    }));
    setMode("manual");
  };

  const handleIsbnScan = async (isbn: string) => {
    setLoading(true);
    try {
      const data = await api.isbn.lookup(isbn);
      await fillFromLookup(data);
    } catch {
      setForm((f) => ({ ...f, isbn }));
      setMode("manual");
    } finally {
      setLoading(false);
    }
  };

  const handleCoverPhoto = async (dataUrl: string, mediaType: string) => {
    setLoading(true);
    try {
      const result = await api.vision.cover(dataUrl, mediaType);
      if (result.found) {
        const lookup = await api.isbn.search(result.title, result.author);
        if (lookup.title) {
          await fillFromLookup(lookup);
        } else {
          setForm((f) => ({
            ...f,
            title: result.title,
            authors: result.author,
          }));
          setMode("manual");
        }
      }
    } catch (err) {
      alert(err instanceof Error ? err.message : "Vision failed");
    } finally {
      setLoading(false);
    }
  };

  const handleShelfPhoto = async (dataUrl: string, mediaType: string) => {
    setLoading(true);
    try {
      const result = await api.vision.shelf(dataUrl, mediaType);
      setShelfBooks(result.books);
      setMode("shelf-review");
    } catch (err) {
      alert(err instanceof Error ? err.message : "Vision failed");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (data: BookFormData) => {
    try {
      const book = await api.books.create(formToPayload(data));
      navigate(`/book/${book.id}`);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed";
      if (msg.includes("ISBN") || msg.includes("duplicate")) {
        setDuplicateWarning(msg);
      }
      throw err;
    }
  };

  const handleShelfConfirm = async (books: { title: string; author: string }[]) => {
    for (const b of books) {
      try {
        const lookup = await api.isbn.search(b.title, b.author);
        await api.books.create({
          title: (lookup.title as string) || b.title,
          authors: (lookup.authors as string) || b.author,
          isbn: lookup.isbn as string | undefined,
          coverUrl: lookup.coverUrl as string | undefined,
          allowDuplicate: true,
        });
      } catch {
        await api.books.create({
          title: b.title,
          authors: b.author,
          allowDuplicate: true,
        });
      }
    }
    navigate("/library");
  };

  const tabs: { key: Mode; label: string }[] = [
    { key: "manual", label: "Manual" },
    { key: "scan", label: "Barcode" },
    { key: "cover", label: "Cover photo" },
    { key: "shelf", label: "Shelf scan" },
  ];

  return (
    <div>
      <PageHeader title="Add Book" subtitle="Catalog a new book" />

      <div className="mb-6 flex flex-wrap gap-2">
        {tabs.map((t) => (
          <Button
            key={t.key}
            variant={mode === t.key || (mode === "shelf-review" && t.key === "shelf") ? "primary" : "secondary"}
            onClick={() => setMode(t.key)}
          >
            {t.label}
          </Button>
        ))}
      </div>

      <Card>
        {loading && <p className="mb-4 text-muted">Looking up book…</p>}

        {mode === "manual" && (
          <BookForm
            initial={form}
            onSubmit={handleSubmit}
            submitLabel="Add to library"
            duplicateWarning={duplicateWarning}
            onAllowDuplicate={() => {
              setForm((f) => ({ ...f, allowDuplicate: true }));
              setDuplicateWarning("");
            }}
          />
        )}

        {mode === "scan" && (
          <BarcodeScanner onScan={handleIsbnScan} onClose={() => setMode("manual")} />
        )}

        {mode === "cover" && (
          <PhotoCapture
            label="Take a photo of the book cover. We'll identify the title and look up details."
            onCapture={handleCoverPhoto}
            onClose={() => setMode("manual")}
          />
        )}

        {mode === "shelf" && (
          <PhotoCapture
            label="Take a photo of your bookshelf. We'll read every visible spine."
            onCapture={handleShelfPhoto}
            onClose={() => setMode("manual")}
          />
        )}

        {mode === "shelf-review" && (
          <ShelfReview
            books={shelfBooks}
            onConfirmAll={handleShelfConfirm}
            onDone={() => navigate("/library")}
          />
        )}
      </Card>
    </div>
  );
}
