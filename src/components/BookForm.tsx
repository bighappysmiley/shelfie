import { useState } from "react";
import type { BookFormData, BookFormat, BookCondition, ReadingStatus } from "@/lib/types";
import { FORMAT_LABELS, STATUS_LABELS } from "@/lib/types";
import { TextField, SelectField, TextArea, FormError } from "./form";
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

  const update = (field: keyof BookFormData, value: string | number | boolean) => {
    setForm((f) => ({ ...f, [field]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title.trim()) {
      setError("Title is required");
      return;
    }
    setSaving(true);
    setError("");
    try {
      await onSubmit(form);
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
      <TextField
        label="ISBN"
        value={form.isbn}
        onChange={(e) => update("isbn", e.target.value)}
        inputMode="numeric"
      />
      <TextField
        label="Cover image URL"
        value={form.coverUrl}
        onChange={(e) => update("coverUrl", e.target.value)}
        type="url"
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
  return {
    title: form.title,
    authors: form.authors,
    isbn: form.isbn || undefined,
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
