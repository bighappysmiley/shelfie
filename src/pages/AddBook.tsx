import { useCallback, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { api } from "@/lib/api";
import { emptyBookForm, type BookFormData } from "@/lib/types";
import { BookForm, formToPayload } from "@/components/BookForm";
import { HardwareBarcodeScanner } from "@/components/HardwareBarcodeScanner";
import { CameraBarcodeScanner } from "@/components/CameraBarcodeScanner";
import { PhotoCapture } from "@/components/PhotoCapture";
import { ShelfReview } from "@/components/ShelfReview";
import { PageHeader, Card } from "@/components/layout";
import { Button } from "@/components/Button";

type Mode = "manual" | "hardware" | "camera" | "cover" | "shelf" | "shelf-review";

export function AddBookPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const modeParam = searchParams.get("mode");
  const initialMode: Mode =
    modeParam === "scan" || modeParam === "hardware"
      ? "hardware"
      : modeParam === "camera" || modeParam === "cover" || modeParam === "shelf"
        ? modeParam
        : "manual";

  const [mode, setMode] = useState<Mode>(initialMode);
  const [form, setForm] = useState(emptyBookForm());
  const [formKey, setFormKey] = useState(0);
  const [duplicateWarning, setDuplicateWarning] = useState("");
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState("");
  const [shelfBooks, setShelfBooks] = useState<
    { title: string; author: string; confidence: number }[]
  >([]);

  const fillFromLookup = (data: Record<string, unknown>, isbnFallback?: string) => {
    setForm((f) => ({
      ...f,
      title: (data.title as string) || f.title,
      authors: (data.authors as string) || f.authors,
      isbn: (data.isbn as string) || isbnFallback || f.isbn,
      coverUrl: (data.coverUrl as string) || f.coverUrl,
      pageCount: (data.pageCount as number) || f.pageCount,
      publisher: (data.publisher as string) || f.publisher,
      publishYear: (data.publishYear as number) || f.publishYear,
      description: (data.description as string) || f.description,
      seriesName: (data.seriesName as string) || f.seriesName,
      seriesNumber: (data.seriesNumber as string) || f.seriesNumber,
    }));
    setFormKey((k) => k + 1);
    setMode("manual");
  };

  const handleIsbnScan = useCallback(async (isbn: string) => {
    setLoading(true);
    setStatus("Looking up ISBN…");
    try {
      const data = await api.isbn.lookup(isbn);
      if (!data.title && !data.coverUrl) {
        setForm((f) => ({ ...f, isbn }));
        setFormKey((k) => k + 1);
        setMode("manual");
        return;
      }
      fillFromLookup(data, isbn);
    } catch {
      setForm((f) => ({ ...f, isbn }));
      setFormKey((k) => k + 1);
      setMode("manual");
    } finally {
      setLoading(false);
      setStatus("");
    }
  }, []);

  const handleCoverPhoto = async (dataUrl: string, mediaType: string) => {
    setLoading(true);
    setStatus("Identifying cover…");
    try {
      const result = await api.vision.cover(dataUrl, mediaType);
      if (!result.found) {
        alert("Couldn't identify that cover. Try again or add manually.");
        return;
      }
      setStatus("Looking up book details…");
      const lookup = await api.isbn.search(result.title, result.author);
      if (lookup.title) {
        fillFromLookup(lookup);
      } else {
        setForm((f) => ({
          ...f,
          title: result.title,
          authors: result.author,
        }));
        setFormKey((k) => k + 1);
        setMode("manual");
      }
    } catch (err) {
      alert(err instanceof Error ? err.message : "Cover scan failed");
    } finally {
      setLoading(false);
      setStatus("");
    }
  };

  const handleShelfPhoto = async (dataUrl: string, mediaType: string) => {
    setLoading(true);
    setStatus("Reading book spines…");
    try {
      const result = await api.vision.shelf(dataUrl, mediaType);
      if (!result.books?.length) {
        alert("Couldn't read any spines. Try better lighting or add books another way.");
        return;
      }
      setShelfBooks(result.books);
      setMode("shelf-review");
    } catch (err) {
      alert(err instanceof Error ? err.message : "Shelf scan failed");
    } finally {
      setLoading(false);
      setStatus("");
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
    { key: "hardware", label: "USB / Bluetooth" },
    { key: "camera", label: "Camera barcode" },
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
            variant={
              mode === t.key || (mode === "shelf-review" && t.key === "shelf")
                ? "primary"
                : "secondary"
            }
            onClick={() => setMode(t.key)}
          >
            {t.label}
          </Button>
        ))}
      </div>

      <Card>
        {loading && <p className="mb-4 text-muted">{status || "Working…"}</p>}

        {mode === "manual" && (
          <BookForm
            key={formKey}
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

        {mode === "hardware" && (
          <HardwareBarcodeScanner onScan={handleIsbnScan} onClose={() => setMode("manual")} />
        )}

        {mode === "camera" && (
          <CameraBarcodeScanner onScan={handleIsbnScan} onClose={() => setMode("manual")} />
        )}

        {mode === "cover" && (
          <PhotoCapture
            label="Take a photo of the book cover. We'll identify the title and look up details."
            actionLabel="Identify cover"
            onCapture={handleCoverPhoto}
            onClose={() => setMode("manual")}
          />
        )}

        {mode === "shelf" && (
          <PhotoCapture
            label="Take a photo of your bookshelf. We'll read visible spines — review before adding."
            actionLabel="Read spines"
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
