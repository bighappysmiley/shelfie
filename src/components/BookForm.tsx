import { useState } from "react";
import type { BookFormData, BookFormat, BookCondition, ReadingStatus } from "@/lib/types";
import { FORMAT_LABELS, STATUS_LABELS } from "@/lib/types";
import { api } from "@/lib/api";
import { isbnHint, isValidIsbn, normalizeIsbn } from "@/lib/isbn";
import { TextField, SelectField, TextArea, FormError } from "./form";
import { CoverPhotoField } from "./CoverPhotoField";
import { Button } from "./Button";

interface BookFormProps {
  initial: BookFormData;
  onSubmit: (data: BookFormData) => Promise<void>;
  submitLabel?: string;
  duplicateWarning?: string;
  onAllowDuplicate?: () => void;
}

export function BookForm({
  initial,
  onSubmit,
  submitLabel = "Save Book",
  duplicateWarning,
  onAllowDuplicate,
}: BookFormProps) {
  const [form, setForm] = useState<BookFormData>(initial);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [lookingUp, setLookingUp] = useState(false);

  const update = (field: keyof BookFormData, value: string | number | boolean) => {
    setForm((f) => ({ ...f, [field]: value }));
  };

  const handleIsbnChange = (raw: string) => {
    const cleaned = raw.replace(/[^0-9Xx\-\s]/g, "");
    update("isbn", cleaned);
  };

  const lookupIsbn = async () => {
    const isbn = normalizeIsbn(form.isbn);
    if (!isValidIsbn(isbn)) {
      setError("Enter a valid ISBN-10 or ISBN-13");
      return;
    }
    setLookingUp(true);
    setError("");
    try {
      const data = await api.isbn.lookup(isbn);
      if (!data.title && !data.coverUrl) {
        setError("No book found for that ISBN — you can still save it manually");
        update("isbn", isbn);
        return;
      }
      if (!data.title) {
        setError("No metadata found — cover attached if available");
      }
      setForm((f) => ({
        ...f,
        isbn: (data.isbn as string) || isbn,
        title: (data.title as string) || f.title,
        authors: (data.authors as string) || f.authors,
        // Always sync cover from ISBN lookup when one is returned
        coverUrl: (data.coverUrl as string) || f.coverUrl,
        pageCount: (data.pageCount as number) || f.pageCount,
        publisher: (data.publisher as string) || f.publisher,
        publishYear: (data.publishYear as number) || f.publishYear,
        description: (data.description as string) || f.description,
        seriesName: (data.seriesName as string) || f.seriesName,
        seriesNumber: (data.seriesNumber as string) || f.seriesNumber,
      }));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Lookup failed");
    } finally {
      setLookingUp(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title.trim()) {
      setError("Title is required");
      return;
    }
    const isbn = normalizeIsbn(form.isbn);
    if (isbn && !isValidIsbn(isbn)) {
      setError("ISBN must be a valid ISBN-10 or ISBN-13 (leave blank if unknown)");
      return;
    }
    setSaving(true);
    setError("");
    try {
      await onSubmit({ ...form, isbn });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save");
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {error && <FormError message={error} />}
      {duplicateWarning && (
        <div className="rounded-lg border border-black/8 bg-warning-bg px-4 py-3 text-sm dark:border-white/10">
          <p className="text-warning">{duplicateWarning}</p>
          {onAllowDuplicate && (
            <Button type="button" variant="secondary" className="mt-2" onClick={onAllowDuplicate}>
              Add as another copy
            </Button>
          )}
        </div>
      )}

      <TextField
        label="Title"
        value={form.title}
        onChange={(e) => update("title", e.target.value)}
        required
      />
      <TextField
        label="Author(s)"
        value={form.authors}
        onChange={(e) => update("authors", e.target.value)}
      />

      <div>
        <span className="mb-1.5 block text-sm font-medium">ISBN</span>
        <div className="flex gap-2">
          <input
            className="w-full rounded-lg border border-black/10 bg-surface px-3.5 py-2.5 text-base text-foreground placeholder:text-muted/70 transition-colors hover:border-black/20 focus-visible:border-accent dark:border-white/10 dark:hover:border-white/20"
            value={form.isbn}
            onChange={(e) => handleIsbnChange(e.target.value)}
            placeholder="ISBN-10 or ISBN-13"
            inputMode="text"
            autoCapitalize="characters"
            autoComplete="off"
            spellCheck={false}
            maxLength={17}
            aria-label="ISBN"
          />
          <Button
            type="button"
            variant="secondary"
            disabled={lookingUp || !normalizeIsbn(form.isbn)}
            onClick={lookupIsbn}
          >
            {lookingUp ? "…" : "Look up"}
          </Button>
        </div>
        <span className="mt-1.5 block text-sm text-muted">{isbnHint(form.isbn)}</span>
      </div>

      <CoverPhotoField
        value={form.coverUrl}
        title={form.title}
        authors={form.authors}
        onChange={(url) => update("coverUrl", url)}
      />

      <TextField
        label="Cover image URL (optional)"
        value={form.coverUrl.startsWith("/api/covers") ? "" : form.coverUrl}
        onChange={(e) => update("coverUrl", e.target.value)}
        type="url"
        hint="Or paste a link if you already have one online"
      />

      <div className="grid gap-5 sm:grid-cols-2">
        <SelectField
          label="Format"
          value={form.format}
          onChange={(e) => update("format", e.target.value as BookFormat)}
        >
          {Object.entries(FORMAT_LABELS).map(([k, v]) => (
            <option key={k} value={k}>{v}</option>
          ))}
        </SelectField>
        <SelectField
          label="Status"
          value={form.readingStatus}
          onChange={(e) => update("readingStatus", e.target.value as ReadingStatus)}
        >
          {Object.entries(STATUS_LABELS).map(([k, v]) => (
            <option key={k} value={k}>{v}</option>
          ))}
        </SelectField>
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <TextField
          label="Room"
          value={form.locationRoom}
          onChange={(e) => update("locationRoom", e.target.value)}
        />
        <TextField
          label="Shelf"
          value={form.locationShelf}
          onChange={(e) => update("locationShelf", e.target.value)}
        />
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <TextField
          label="Series"
          value={form.seriesName}
          onChange={(e) => update("seriesName", e.target.value)}
        />
        <TextField
          label="Series #"
          value={form.seriesNumber}
          onChange={(e) => update("seriesNumber", e.target.value)}
        />
      </div>

      <div className="grid gap-5 sm:grid-cols-3">
        <TextField
          label="Rating (1–5)"
          type="number"
          min={1}
          max={5}
          value={form.personalRating}
          onChange={(e) => update("personalRating", e.target.value ? parseInt(e.target.value, 10) : "")}
        />
        <SelectField
          label="Condition"
          value={form.condition}
          onChange={(e) => update("condition", e.target.value as BookCondition | "")}
        >
          <option value="">—</option>
          <option value="new">New</option>
          <option value="good">Good</option>
          <option value="worn">Worn</option>
          <option value="damaged">Damaged</option>
        </SelectField>
        <TextField
          label="Copy #"
          type="number"
          min={1}
          value={form.copyNumber}
          onChange={(e) => update("copyNumber", parseInt(e.target.value, 10) || 1)}
        />
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <TextField
          label="Purchase date"
          type="date"
          value={form.purchaseDate}
          onChange={(e) => update("purchaseDate", e.target.value)}
        />
        <TextField
          label="Purchase price"
          type="number"
          step="0.01"
          value={form.purchasePrice}
          onChange={(e) => update("purchasePrice", e.target.value)}
        />
      </div>

      <TextField
        label="Tags"
        value={form.tags}
        onChange={(e) => update("tags", e.target.value)}
        hint="Comma-separated"
      />
      <TextArea
        label="Notes"
        value={form.notes}
        onChange={(e) => update("notes", e.target.value)}
      />

      <Button type="submit" disabled={saving}>
        {saving ? "Saving…" : submitLabel}
      </Button>
    </form>
  );
}

export function formToPayload(form: BookFormData) {
  const isbn = normalizeIsbn(form.isbn);
  return {
    title: form.title,
    authors: form.authors,
    isbn: isbn || undefined,
    coverUrl: form.coverUrl || undefined,
    format: form.format,
    locationRoom: form.locationRoom || undefined,
    locationShelf: form.locationShelf || undefined,
    readingStatus: form.readingStatus,
    personalRating: form.personalRating || undefined,
    seriesName: form.seriesName || undefined,
    seriesNumber: form.seriesNumber || undefined,
    purchaseDate: form.purchaseDate || undefined,
    purchasePrice: form.purchasePrice || undefined,
    condition: form.condition || undefined,
    notes: form.notes || undefined,
    pageCount: form.pageCount || undefined,
    publisher: form.publisher || undefined,
    publishYear: form.publishYear || undefined,
    description: form.description || undefined,
    copyNumber: form.copyNumber,
    tags: form.tags ? form.tags.split(",").map((t) => t.trim()).filter(Boolean) : [],
    allowDuplicate: form.allowDuplicate,
  };
}
