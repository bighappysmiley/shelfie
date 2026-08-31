import { useCallback, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { api } from "@/lib/api";
import { emptyBookForm, type BookFormData } from "@/lib/types";
import { BookForm, formToPayload } from "@/components/BookForm";
import { HardwareBarcodeScanner } from "@/components/HardwareBarcodeScanner";
import { CameraBarcodeScanner } from "@/components/CameraBarcodeScanner";
import { PhotoCapture } from "@/components/PhotoCapture";
import { ShelfReview } from "@/components/ShelfReview";
import { PageHeader, Group, SegmentedControl, Banner } from "@/components/layout";

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
  const [scanError, setScanError] = useState("");
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
    setScanError("");
    setStatus("Identifying cover…");
    try {
      const result = await api.vision.cover(dataUrl, mediaType);
      if (!result.found) {
        setScanError("Cover could not be identified. Enter details manually or try another image.");
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
      setScanError(err instanceof Error ? err.message : "Cover scan failed.");
    } finally {
      setLoading(false);
      setStatus("");
    }
  };

  const handleShelfPhoto = async (dataUrl: string, mediaType: string) => {
    setLoading(true);
    setScanError("");
    setStatus("Reading spines…");
    try {
      const result = await api.vision.shelf(dataUrl, mediaType);
      if (!result.books?.length) {
        setScanError("No readable spines detected. Improve lighting or add volumes manually.");
        return;
      }
      setShelfBooks(result.books);
      setMode("shelf-review");
    } catch (err) {
      setScanError(err instanceof Error ? err.message : "Shelf scan failed.");
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
    { key: "hardware", label: "Scanner" },
    { key: "camera", label: "Camera" },
    { key: "cover", label: "Cover" },
    { key: "shelf", label: "Shelf" },
  ];

  return (
    <div>
      <PageHeader title="Add Book" />

      <div className="mb-4 overflow-x-auto">
        <SegmentedControl
          value={mode === "shelf-review" ? "shelf" : mode}
          onChange={(v) => setMode(v as Mode)}
          options={tabs.map((t) => ({ value: t.key, label: t.label }))}
          className="min-w-[320px]"
        />
      </div>

      <Group>
        {loading && <p className="px-4 pt-3 text-[0.9375rem] text-muted">{status || "Processing…"}</p>}
        {scanError && (
          <Banner variant="warning" className="mx-4 mt-3">
            {scanError}
          </Banner>
        )}

        <div className="p-4">
        {mode === "manual" && (
          <BookForm
            key={formKey}
            initial={form}
            onSubmit={handleSubmit}
            submitLabel="Add to catalog"
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
            label="Photograph the book cover. Title and author will be identified automatically when possible."
            actionLabel="Process cover"
            onCapture={handleCoverPhoto}
            onClose={() => setMode("manual")}
          />
        )}

        {mode === "shelf" && (
          <PhotoCapture
            label="Photograph a shelf of books. Detected titles can be reviewed before adding to the catalog."
            actionLabel="Process shelf"
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
        </div>
      </Group>
    </div>
  );
}
