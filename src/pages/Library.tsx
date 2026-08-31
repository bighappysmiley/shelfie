import { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { api } from "@/lib/api";
import { cacheBooks, getCachedBooks, isOnline } from "@/lib/offline";
import type { Book, BookFormat, LibraryStatus } from "@/lib/types";
import { FORMAT_LABELS, STATUS_LABELS } from "@/lib/types";
import { BookCard } from "@/components/BookCard";
import { PageHeader, EmptyState, Group, SegmentedControl } from "@/components/layout";
import { SearchInput, SelectField, TextField } from "@/components/form";
import { Button, ButtonLink } from "@/components/Button";
import { IconGrid, IconList } from "@/components/Icons";

type ViewMode = "list" | "covers";
type StatusFilter = "" | "available" | "on_loan" | LibraryStatus;

const VIEW_KEY = "shelfie-library-view";

function loadView(): ViewMode {
  const v = localStorage.getItem(VIEW_KEY);
  return v === "covers" ? "covers" : "list";
}

export function LibraryPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [books, setBooks] = useState<Book[]>([]);
  const [facetBooks, setFacetBooks] = useState<Book[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState(searchParams.get("q") ?? "");
  const [status, setStatus] = useState<StatusFilter>(
    (searchParams.get("status") as StatusFilter) || "",
  );
  const [format, setFormat] = useState(searchParams.get("format") ?? "");
  const [room, setRoom] = useState(searchParams.get("room") ?? "");
  const [tag, setTag] = useState(searchParams.get("tag") ?? "");
  const [sort, setSort] = useState(searchParams.get("sort") ?? "title");
  const [view, setView] = useState<ViewMode>(loadView);
  const [showFilters, setShowFilters] = useState(
    Boolean(searchParams.get("format") || searchParams.get("room") || searchParams.get("tag")),
  );
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [bulkMode, setBulkMode] = useState(false);
  const [bulkRoom, setBulkRoom] = useState("");
  const [bulkShelf, setBulkShelf] = useState("");

  useEffect(() => {
    api.books
      .list({ sort: "title" })
      .then(setFacetBooks)
      .catch(() => {});
  }, []);

  const load = async () => {
    setLoading(true);
    try {
      if (isOnline()) {
        const params: Record<string, string> = { sort };
        if (sort === "added" || sort === "rating" || sort === "published") {
          params.order = "desc";
        }
        if (q) params.q = q;
        if (status) params.status = status;
        if (format) params.format = format;
        if (room) params.room = room;
        if (tag) params.tag = tag;
        const data = await api.books.list(params);
        setBooks(data);
        await cacheBooks(data);
      } else {
        let cached = await getCachedBooks();
        if (q) {
          const needle = q.toLowerCase();
          cached = cached.filter((b) =>
            [b.title, b.authors, b.isbn, b.seriesName, b.locationRoom, b.locationShelf, ...(b.tags ?? [])]
              .filter(Boolean)
              .some((v) => String(v).toLowerCase().includes(needle)),
          );
        }
        if (status === "on_loan") cached = cached.filter((b) => b.activeLoan);
        else if (status === "available")
          cached = cached.filter((b) => b.readingStatus === "available" && !b.activeLoan);
        else if (status) cached = cached.filter((b) => b.readingStatus === status);
        if (format) cached = cached.filter((b) => b.format === format);
        if (room) cached = cached.filter((b) => (b.locationRoom ?? "") === room);
        if (tag) cached = cached.filter((b) => (b.tags ?? []).includes(tag));
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
  }, [q, status, format, room, tag, sort]);

  useEffect(() => {
    const next = new URLSearchParams();
    if (q) next.set("q", q);
    if (status) next.set("status", status);
    if (format) next.set("format", format);
    if (room) next.set("room", room);
    if (tag) next.set("tag", tag);
    if (sort !== "title") next.set("sort", sort);
    setSearchParams(next, { replace: true });
  }, [q, status, format, room, tag, sort, setSearchParams]);

  const rooms = useMemo(() => {
    const set = new Set<string>();
    facetBooks.forEach((b) => {
      if (b.locationRoom) set.add(b.locationRoom);
    });
    return [...set].sort((a, b) => a.localeCompare(b));
  }, [facetBooks]);

  const tags = useMemo(() => {
    const set = new Set<string>();
    facetBooks.forEach((b) => (b.tags ?? []).forEach((t) => set.add(t)));
    return [...set].sort((a, b) => a.localeCompare(b));
  }, [facetBooks]);

  const counts = useMemo(() => ({ total: books.length }), [books]);

  const changeView = (v: ViewMode) => {
    setView(v);
    localStorage.setItem(VIEW_KEY, v);
  };

  const toggleSelect = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const selectAll = () => setSelected(new Set(books.map((b) => b.id)));

  const bulkUpdateStatus = async (newStatus: string) => {
    for (const id of selected) {
      await api.books.update(id, { readingStatus: newStatus });
    }
    setSelected(new Set());
    setBulkMode(false);
    load();
  };

  const bulkUpdateLocation = async () => {
    if (!bulkRoom && !bulkShelf) return;
    for (const id of selected) {
      const payload: Record<string, string> = {};
      if (bulkRoom) payload.locationRoom = bulkRoom;
      if (bulkShelf) payload.locationShelf = bulkShelf;
      await api.books.update(id, payload);
    }
    setBulkRoom("");
    setBulkShelf("");
    setSelected(new Set());
    setBulkMode(false);
    load();
  };

  const bulkDelete = async () => {
    if (!confirm(`Delete ${selected.size} book${selected.size === 1 ? "" : "s"}?`)) return;
    for (const id of selected) {
      await api.books.delete(id);
    }
    setSelected(new Set());
    setBulkMode(false);
    load();
  };

  const clearFilters = () => {
    setStatus("");
    setFormat("");
    setRoom("");
    setTag("");
    setQ("");
  };

  const hasFilters = Boolean(status || format || room || tag || q);

  const statusSegments: { value: StatusFilter; label: string }[] = [
    { value: "", label: "All" },
    { value: "available", label: "Available" },
    { value: "on_loan", label: "On Loan" },
    { value: "wishlist", label: "Wishlist" },
  ];

  return (
    <div>
      <PageHeader
        title="Library"
        subtitle={`${counts.total} volume${counts.total !== 1 ? "s" : ""}`}
        action={
          <div className="flex items-center gap-2">
            <div className="flex rounded-[var(--radius-control)] bg-fill p-0.5">
              <button
                type="button"
                aria-label="List view"
                onClick={() => changeView("list")}
                className={`rounded-[0.4375rem] p-2 ${view === "list" ? "bg-surface shadow-sm" : "text-muted"}`}
              >
                <IconList size={18} />
              </button>
              <button
                type="button"
                aria-label="Cover grid"
                onClick={() => changeView("covers")}
                className={`rounded-[0.4375rem] p-2 ${view === "covers" ? "bg-surface shadow-sm" : "text-muted"}`}
              >
                <IconGrid size={18} />
              </button>
            </div>
            <Button
              variant={bulkMode ? "tinted" : "secondary"}
              size="toolbar"
              onClick={() => {
                setBulkMode(!bulkMode);
                setSelected(new Set());
              }}
            >
              {bulkMode ? "Done" : "Edit"}
            </Button>
          </div>
        }
      />

      <div className="mb-4 space-y-3">
        <SearchInput value={q} onChange={setQ} placeholder="Search catalog" />

        <SegmentedControl
          value={status === "missing" ? "" : status}
          onChange={(v) => setStatus(v)}
          options={statusSegments}
        />

        <div className="flex flex-wrap items-center gap-2">
          <SelectField
            label=""
            aria-label="Sort by"
            value={sort}
            onChange={(e) => setSort(e.target.value)}
            className="min-w-[140px] flex-1"
          >
            <option value="title">Title</option>
            <option value="author">Author</option>
            <option value="added">Date added</option>
            <option value="published">Publish year</option>
            <option value="rating">Rating</option>
          </SelectField>
          <Button variant="plain" size="sm" onClick={() => setShowFilters((v) => !v)}>
            {showFilters ? "Hide" : "Filters"}
          </Button>
          {hasFilters && (
            <Button variant="plain" size="sm" onClick={clearFilters}>
              Clear
            </Button>
          )}
          <Link to="/locations" className="ml-auto text-[0.9375rem] text-link">
            Locations
          </Link>
        </div>

        {showFilters && (
          <Group>
            <SelectField label="Format" grouped value={format} onChange={(e) => setFormat(e.target.value)}>
              <option value="">All formats</option>
              {(Object.keys(FORMAT_LABELS) as BookFormat[]).map((k) => (
                <option key={k} value={k}>
                  {FORMAT_LABELS[k]}
                </option>
              ))}
            </SelectField>
            <SelectField label="Room" grouped value={room} onChange={(e) => setRoom(e.target.value)}>
              <option value="">All rooms</option>
              {rooms.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </SelectField>
            <SelectField label="Tag" grouped value={tag} onChange={(e) => setTag(e.target.value)}>
              <option value="">All tags</option>
              {tags.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </SelectField>
          </Group>
        )}
      </div>

      {bulkMode && (
        <Group className="mb-4">
          <div className="space-y-3 p-4">
            <p className="text-[0.9375rem] text-muted">{selected.size} selected</p>
            <div className="flex flex-wrap gap-2">
              <Button variant="tinted" size="sm" onClick={selectAll}>
                Select All
              </Button>
              {Object.entries(STATUS_LABELS).map(([k, v]) => (
                <Button
                  key={k}
                  variant="secondary"
                  size="sm"
                  disabled={selected.size === 0}
                  onClick={() => bulkUpdateStatus(k)}
                >
                  {v}
                </Button>
              ))}
              <Button variant="danger" size="sm" disabled={selected.size === 0} onClick={bulkDelete}>
                Delete
              </Button>
            </div>
            <div className="flex flex-wrap items-end gap-2">
              <TextField
                label="Room"
                value={bulkRoom}
                onChange={(e) => setBulkRoom(e.target.value)}
                placeholder="Living room"
                className="flex-1"
              />
              <TextField
                label="Shelf"
                value={bulkShelf}
                onChange={(e) => setBulkShelf(e.target.value)}
                placeholder="Shelf A"
                className="flex-1"
              />
              <Button
                variant="secondary"
                size="sm"
                disabled={selected.size === 0 || (!bulkRoom && !bulkShelf)}
                onClick={bulkUpdateLocation}
              >
                Update
              </Button>
            </div>
          </div>
        </Group>
      )}

      {loading ? (
        <p className="px-1 text-muted">Loading…</p>
      ) : books.length === 0 ? (
        <EmptyState
          title={hasFilters ? "No Results" : "Empty Catalog"}
          description={
            hasFilters
              ? "Try adjusting your search or filters."
              : "Add your first book to get started."
          }
          action={
            hasFilters ? (
              <Button variant="tinted" onClick={clearFilters}>
                Clear Filters
              </Button>
            ) : (
              <ButtonLink to="/add">Add Book</ButtonLink>
            )
          }
        />
      ) : view === "covers" ? (
        <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-7">
          {books.map((book) => (
            <BookCard
              key={book.id}
              book={book}
              view="covers"
              selected={selected.has(book.id)}
              onSelect={bulkMode ? toggleSelect : undefined}
            />
          ))}
        </div>
      ) : (
        <Group>
          {books.map((book) => (
            <BookCard
              key={book.id}
              book={book}
              view="list"
              selected={selected.has(book.id)}
              onSelect={bulkMode ? toggleSelect : undefined}
            />
          ))}
        </Group>
      )}
    </div>
  );
}
