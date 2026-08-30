import { useEffect, useState, useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import { api } from "@/lib/api";
import { cacheBooks, getCachedBooks, isOnline } from "@/lib/offline";
import type { Book } from "@/lib/types";
import { STATUS_LABELS } from "@/lib/types";
import { BookCard } from "@/components/BookCard";
import { PageHeader, EmptyState } from "@/components/layout";
import { SearchInput, SelectField } from "@/components/form";
import { Button } from "@/components/Button";

export function LibraryPage() {
  const [searchParams] = useSearchParams();
  const [books, setBooks] = useState<Book[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [status, setStatus] = useState(searchParams.get("status") ?? "");
  const [sort, setSort] = useState("title");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [bulkMode, setBulkMode] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      if (isOnline()) {
        const params: Record<string, string> = { sort };
        if (q) params.q = q;
        if (status) params.status = status;
        const data = await api.books.list(params);
        setBooks(data);
        await cacheBooks(data);
      } else {
        const cached = await getCachedBooks();
        setBooks(cached);
      }
    } catch {
      const cached = await getCachedBooks();
      setBooks(cached);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [q, status, sort]);

  const filtered = useMemo(() => {
    if (!q && !status) return books;
    return books;
  }, [books, q, status]);

  const toggleSelect = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const bulkUpdateStatus = async (newStatus: string) => {
    for (const id of selected) {
      await api.books.update(id, { readingStatus: newStatus });
    }
    setSelected(new Set());
    setBulkMode(false);
    load();
  };

  return (
    <div>
      <PageHeader
        title="Library"
        subtitle={`${filtered.length} book${filtered.length !== 1 ? "s" : ""}`}
        action={
          <Button
            variant={bulkMode ? "primary" : "secondary"}
            onClick={() => { setBulkMode(!bulkMode); setSelected(new Set()); }}
          >
            {bulkMode ? "Done" : "Select"}
          </Button>
        }
      />

      <div className="mb-6 space-y-4">
        <div className="relative">
          <SearchInput value={q} onChange={setQ} placeholder="Search title, author, ISBN, location…" />
        </div>
        <div className="flex flex-wrap gap-3">
          <SelectField
            label=""
            aria-label="Filter by status"
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className="w-auto min-w-[140px]"
          >
            <option value="">All statuses</option>
            <option value="available">Available</option>
            <option value="on_loan">On loan</option>
            {Object.entries(STATUS_LABELS)
              .filter(([k]) => k !== "available")
              .map(([k, v]) => (
                <option key={k} value={k}>{v}</option>
              ))}
          </SelectField>
          <SelectField
            label=""
            aria-label="Sort by"
            value={sort}
            onChange={(e) => setSort(e.target.value)}
            className="w-auto min-w-[140px]"
          >
            <option value="title">Title</option>
            <option value="author">Author</option>
            <option value="added">Date added</option>
            <option value="published">Publish year</option>
            <option value="rating">Rating</option>
          </SelectField>
        </div>
      </div>

      {bulkMode && selected.size > 0 && (
        <div className="mb-4 flex flex-wrap gap-2 rounded-lg border border-black/8 bg-surface p-3 dark:border-white/10">
          <span className="text-sm text-muted">{selected.size} selected</span>
          {Object.entries(STATUS_LABELS).map(([k, v]) => (
            <Button key={k} variant="secondary" onClick={() => bulkUpdateStatus(k)}>
              Mark {v}
            </Button>
          ))}
        </div>
      )}

      {loading ? (
        <p className="text-muted">Loading…</p>
      ) : filtered.length === 0 ? (
        <EmptyState
          title="No books yet"
          description="Add your first book to start building your library."
        />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {filtered.map((book) => (
            <BookCard
              key={book.id}
              book={book}
              selected={selected.has(book.id)}
              onSelect={bulkMode ? toggleSelect : undefined}
            />
          ))}
        </div>
      )}
    </div>
  );
}
