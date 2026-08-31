import { openDB, type DBSchema, type IDBPDatabase } from "idb";
import type { Book } from "./types";
import { supabase } from "./supabase";

interface ShelfieDB extends DBSchema {
  books: { key: string; value: Book; indexes: { "by-title": string } };
  pending: {
    key: number;
    value: { id?: number; method: string; path: string; body?: unknown; timestamp: number };
  };
}

const dbCache = new Map<string, Promise<IDBPDatabase<ShelfieDB>>>();

async function currentUserKey(): Promise<string> {
  const { data } = await supabase.auth.getSession();
  return data.session?.user?.id ?? "anon";
}

async function getDB() {
  const key = await currentUserKey();
  let promise = dbCache.get(key);
  if (!promise) {
    promise = openDB<ShelfieDB>(`shelfie-${key}`, 1, {
      upgrade(db) {
        const store = db.createObjectStore("books", { keyPath: "id" });
        store.createIndex("by-title", "title");
        db.createObjectStore("pending", { keyPath: "id", autoIncrement: true });
      },
    });
    dbCache.set(key, promise);
  }
  return promise;
}

async function authHeaders(): Promise<Record<string, string>> {
  const { data } = await supabase.auth.getSession();
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (data.session?.access_token) {
    headers.Authorization = `Bearer ${data.session.access_token}`;
  }
  return headers;
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
  const headers = await authHeaders();

  for (const item of pending) {
    try {
      await fetch(`/api${item.path}`, {
        method: item.method,
        headers,
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
