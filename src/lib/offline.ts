import { openDB, type DBSchema, type IDBPDatabase } from "idb";
import type { Book } from "./types";

interface ShelfieDB extends DBSchema {
  books: { key: string; value: Book; indexes: { "by-title": string } };
  pending: {
    key: number;
    value: { id?: number; method: string; path: string; body?: unknown; timestamp: number };
  };
}

let dbPromise: Promise<IDBPDatabase<ShelfieDB>> | null = null;

function getDB() {
  if (!dbPromise) {
    dbPromise = openDB<ShelfieDB>("shelfie", 1, {
      upgrade(db) {
        const store = db.createObjectStore("books", { keyPath: "id" });
        store.createIndex("by-title", "title");
        db.createObjectStore("pending", { keyPath: "id", autoIncrement: true });
      },
    });
  }
  return dbPromise;
}

export async function cacheBooks(books: Book[]) {
  const db = await getDB();
  const tx = db.transaction("books", "readwrite");
  await tx.store.clear();
  for (const book of books) {
    await tx.store.put(book);
  }
  await tx.done;
}

export async function getCachedBooks(): Promise<Book[]> {
  try {
    const db = await getDB();
    return db.getAll("books");
  } catch {
    return [];
  }
}

export async function queueAction(method: string, path: string, body?: unknown) {
  const db = await getDB();
  await db.add("pending", { method, path, body, timestamp: Date.now() });
}

export async function syncPending(): Promise<number> {
  const db = await getDB();
  const pending = await db.getAll("pending");
  let synced = 0;

  for (const item of pending) {
    try {
      await fetch(`/api${item.path}`, {
        method: item.method,
        headers: { "Content-Type": "application/json" },
        body: item.body ? JSON.stringify(item.body) : undefined,
      });
      if (item.id) await db.delete("pending", item.id);
      synced++;
    } catch {
      break;
    }
  }

  return synced;
}

export function isOnline(): boolean {
  return navigator.onLine;
}
