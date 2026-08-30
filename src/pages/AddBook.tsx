import { useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { api } from "@/lib/api";
import { emptyBookForm, type BookFormData } from "@/lib/types";
import { BookForm, formToPayload } from "@/components/BookForm";
import { BarcodeScanner } from "@/components/BarcodeScanner";
import { PageHeader, Card } from "@/components/layout";
import { Button } from "@/components/Button";

type Mode = "manual" | "scan";

export function AddBookPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const initialMode = (searchParams.get("mode") as Mode) || "manual";
  const [mode, setMode] = useState<Mode>(
    initialMode === "scan" ? "scan" : "manual",
  );
  const [form, setForm] = useState(emptyBookForm());
  const [formKey, setFormKey] = useState(0);
  const [duplicateWarning, setDuplicateWarning] = useState("");
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState("");

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

  const handleIsbnScan = async (isbn: string) => {
    setLoading(true);
    setStatus("Looking up ISBN…");
    try {
      const data = await api.isbn.lookup(isbn);
      if (!data.title && !data.coverUrl) {
        setForm((f) => ({ ...f, isbn }));
        setFormKey((k) => k + 1);
        setMode("manual");
        setStatus("");
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

  const tabs: { key: Mode; label: string }[] = [
    { key: "manual", label: "Manual" },
    { key: "scan", label: "Barcode scanner" },
  ];

  return (
    <div>
      <PageHeader title="Add Book" subtitle="Catalog a new book" />

      <div className="mb-6 flex flex-wrap gap-2">
        {tabs.map((t) => (
          <Button
            key={t.key}
            variant={mode === t.key ? "primary" : "secondary"}
            onClick={() => setMode(t.key)}
          >
            {t.label}
          </Button>
        ))}
      </div>

      <Card>
        {loading && (
          <p className="mb-4 text-muted">{status || "Working…"}</p>
        )}

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

        {mode === "scan" && (
          <BarcodeScanner onScan={handleIsbnScan} onClose={() => setMode("manual")} />
        )}
      </Card>
    </div>
  );
}
