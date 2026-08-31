import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "@/lib/api";
import type { Book } from "@/lib/types";
import { PageHeader, EmptyState, Card } from "@/components/layout";
import { ButtonLink } from "@/components/Button";
import { CoverImage } from "@/components/CoverImage";

type ShelfGroup = {
  shelf: string;
  books: Book[];
};

type RoomGroup = {
  room: string;
  shelves: ShelfGroup[];
  total: number;
};

export function LocationsPage() {
  const [books, setBooks] = useState<Book[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.books
      .list({ sort: "title" })
      .then(setBooks)
      .finally(() => setLoading(false));
  }, []);

  const rooms = useMemo(() => {
    const map = new Map<string, Map<string, Book[]>>();

    for (const book of books) {
      const room = book.locationRoom?.trim() || "Unassigned";
      const shelf = book.locationShelf?.trim() || "No shelf";
      if (!map.has(room)) map.set(room, new Map());
      const shelves = map.get(room)!;
      if (!shelves.has(shelf)) shelves.set(shelf, []);
      shelves.get(shelf)!.push(book);
    }

    const groups: RoomGroup[] = [...map.entries()]
      .map(([room, shelves]) => {
        const shelfGroups: ShelfGroup[] = [...shelves.entries()]
          .map(([shelf, shelfBooks]) => ({ shelf, books: shelfBooks }))
          .sort((a, b) => a.shelf.localeCompare(b.shelf));
        return {
          room,
          shelves: shelfGroups,
          total: shelfGroups.reduce((n, s) => n + s.books.length, 0),
        };
      })
      .sort((a, b) => {
        if (a.room === "Unassigned") return 1;
        if (b.room === "Unassigned") return -1;
        return a.room.localeCompare(b.room);
      });

    return groups;
  }, [books]);

  const assigned = books.filter((b) => b.locationRoom || b.locationShelf).length;

  return (
    <div>
      <PageHeader
        title="Locations"
        subtitle={
          loading
            ? "Loading…"
            : `${assigned} of ${books.length} volumes assigned to a location`
        }
        action={<ButtonLink to="/library">View catalog</ButtonLink>}
      />

      {loading ? (
        <p className="text-muted">Loading…</p>
      ) : books.length === 0 ? (
        <EmptyState
          title="No volumes in catalog"
          description="Add books and assign room or shelf locations to organize them here."
          action={<ButtonLink to="/add">Add book</ButtonLink>}
        />
      ) : (
        <div className="space-y-8">
          {rooms.map((room) => (
            <section key={room.room}>
              <div className="mb-4 flex items-end justify-between gap-3">
                <div>
                  <h2 className="text-xl font-semibold">{room.room}</h2>
                  <p className="text-sm text-muted">
                    {room.total} book{room.total !== 1 ? "s" : ""} · {room.shelves.length} shelf
                    {room.shelves.length !== 1 ? "s" : ""}
                  </p>
                </div>
                {room.room !== "Unassigned" && (
                  <Link
                    to={`/library?room=${encodeURIComponent(room.room)}`}
                    className="text-sm text-muted hover:text-foreground"
                  >
                    Filter catalog
                  </Link>
                )}
              </div>

              <div className="space-y-4">
                {room.shelves.map((shelf) => (
                  <Card key={`${room.room}-${shelf.shelf}`} className="!p-4">
                    <div className="mb-3 flex items-center justify-between">
                      <h3 className="font-medium">{shelf.shelf}</h3>
                      <span className="text-sm text-muted">{shelf.books.length}</span>
                    </div>
                    <div className="flex gap-2 overflow-x-auto pb-1">
                      {shelf.books.map((book) => (
                        <Link
                          key={book.id}
                          to={`/book/${book.id}`}
                          className="w-14 shrink-0 transition-opacity hover:opacity-80"
                          title={book.title}
                        >
                          <CoverImage
                            book={book}
                            className="aspect-[2/3] w-full rounded-md object-cover bg-accent-soft"
                          />
                        </Link>
                      ))}
                    </div>
                  </Card>
                ))}
              </div>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
