import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "@/lib/api";
import type { Book } from "@/lib/types";
import { PageHeader, EmptyState, Group, GroupHeader } from "@/components/layout";
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
        action={<ButtonLink to="/library" size="sm">Catalog</ButtonLink>}
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
        <div className="space-y-6">
          {rooms.map((room) => (
            <section key={room.room}>
              <GroupHeader
                action={
                  room.room !== "Unassigned" ? (
                    <Link
                      to={`/library?room=${encodeURIComponent(room.room)}`}
                      className="text-accent"
                    >
                      Filter
                    </Link>
                  ) : undefined
                }
              >
                {room.room} · {room.total} volume{room.total !== 1 ? "s" : ""}
              </GroupHeader>

              <div className="space-y-3">
                {room.shelves.map((shelf) => (
                  <Group key={`${room.room}-${shelf.shelf}`}>
                    <div className="flex items-center justify-between px-4 py-3 hairline-b">
                      <h3 className="text-[1.0625rem] font-medium">{shelf.shelf}</h3>
                      <span className="text-[0.9375rem] text-muted">{shelf.books.length}</span>
                    </div>
                    <div className="flex gap-2 overflow-x-auto px-4 py-3">
                      {shelf.books.map((book) => (
                        <Link
                          key={book.id}
                          to={`/book/${book.id}`}
                          className="w-12 shrink-0 active:opacity-70"
                          title={book.title}
                        >
                          <CoverImage
                            book={book}
                            className="aspect-[2/3] w-full rounded-[4px] object-cover bg-fill"
                          />
                        </Link>
                      ))}
                    </div>
                  </Group>
                ))}
              </div>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
