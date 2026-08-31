import { supabase } from "./supabase";

const API_BASE = "/api";

async function getAccessToken(): Promise<string | null> {
  const { data } = await supabase.auth.getSession();
  return data.session?.access_token ?? null;
}

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const token = await getAccessToken();
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options?.headers as Record<string, string> | undefined),
  };
  if (token) headers.Authorization = `Bearer ${token}`;

  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers,
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    if (res.status === 401) {
      throw new Error(err.error || "Please sign in to continue");
    }
    throw new Error(err.error || err.message || "Request failed");
  }

  if (res.headers.get("content-type")?.includes("text/csv")) {
    return (await res.text()) as T;
  }

  return res.json();
}

/** Authenticated fetch for binary resources (uploaded covers). */
export async function fetchAuthed(path: string): Promise<Response> {
  const token = await getAccessToken();
  const headers: Record<string, string> = {};
  if (token) headers.Authorization = `Bearer ${token}`;
  return fetch(path.startsWith("/") ? path : `${API_BASE}${path}`, { headers });
}

export const api = {
  books: {
    list: (params?: Record<string, string>) => {
      const qs = params ? "?" + new URLSearchParams(params).toString() : "";
      return request<import("./types").Book[]>(`/books${qs}`);
    },
    get: (id: string) => request<import("./types").Book>(`/books?id=${id}`),
    create: (data: Record<string, unknown>) =>
      request<import("./types").Book>("/books", { method: "POST", body: JSON.stringify(data) }),
    update: (id: string, data: Record<string, unknown>) =>
      request<import("./types").Book>(`/books?id=${id}`, { method: "PUT", body: JSON.stringify(data) }),
    delete: (id: string) => request<{ ok: boolean }>(`/books?id=${id}`, { method: "DELETE" }),
  },
  borrowers: {
    list: () => request<import("./types").Borrower[]>("/borrowers"),
    get: (id: string) => request<import("./types").Borrower>(`/borrowers?id=${id}`),
    create: (data: { name: string; phone?: string; email?: string }) =>
      request<import("./types").Borrower>("/borrowers", { method: "POST", body: JSON.stringify(data) }),
    update: (id: string, data: Record<string, unknown>) =>
      request<import("./types").Borrower>(`/borrowers?id=${id}`, { method: "PUT", body: JSON.stringify(data) }),
    delete: (id: string) => request<{ ok: boolean }>(`/borrowers?id=${id}`, { method: "DELETE" }),
  },
  loans: {
    list: (active?: boolean) =>
      request<import("./types").LoanWithDetails[]>(`/loans${active ? "?active=true" : ""}`),
    create: (data: { bookId: string; borrowerId: string; dueDate?: string; notes?: string }) =>
      request<import("./types").Loan>("/loans", { method: "POST", body: JSON.stringify(data) }),
    return: (id: string) =>
      request<import("./types").Loan>(`/loans?id=${id}`, {
        method: "PATCH",
        body: JSON.stringify({ action: "return" }),
      }),
    update: (id: string, data: { dueDate?: string | null; notes?: string | null }) =>
      request<import("./types").Loan>(`/loans?id=${id}`, {
        method: "PATCH",
        body: JSON.stringify({ action: "update", ...data }),
      }),
  },
  isbn: {
    lookup: (isbn: string) =>
      request<Record<string, unknown>>(`/isbn-lookup?isbn=${encodeURIComponent(isbn)}`),
    search: (title: string, authors?: string) =>
      request<Record<string, unknown>>(
        `/isbn-lookup?title=${encodeURIComponent(title)}&authors=${encodeURIComponent(authors ?? "")}`,
      ),
  },
  vision: {
    cover: (image: string, mediaType?: string) =>
      request<{ title: string; author: string; confidence: number; found: boolean }>("/vision", {
        method: "POST",
        body: JSON.stringify({ image, mediaType, mode: "cover" }),
      }),
    shelf: (image: string, mediaType?: string) =>
      request<{ books: { title: string; author: string; confidence: number }[]; count: number }>(
        "/vision",
        { method: "POST", body: JSON.stringify({ image, mediaType, mode: "shelf" }) },
      ),
  },
  data: {
    export: () => request<string>("/data?action=export"),
    stats: () => request<Record<string, unknown>>("/data?action=stats"),
    import: (books: Record<string, string>[]) =>
      request<{ imported: number }>("/data?action=import", {
        method: "POST",
        body: JSON.stringify({ books }),
      }),
  },
};
