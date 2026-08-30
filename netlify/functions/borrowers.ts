import type { Config } from "@netlify/functions";
import { loadData, saveData, newId, nowIso, type Borrower } from "./lib/store";
import { json, error, handleOptions, parseBody } from "./utils";

export const config: Config = {
  path: "/api/borrowers",
};

export default async (request: Request) => {
  if (request.method === "OPTIONS") return handleOptions();

  const url = new URL(request.url);
  const id = url.searchParams.get("id");

  try {
    const data = await loadData();

    if (request.method === "GET") {
      if (id) {
        const borrower = data.borrowers.find((b) => b.id === id);
        if (!borrower) return error("Borrower not found", 404);

        const loans = data.loans
          .filter((l) => l.borrowerId === id)
          .map((loan) => ({
            loan,
            book: data.books.find((b) => b.id === loan.bookId)!,
          }))
          .filter((row) => row.book)
          .sort((a, b) => b.loan.dateLoaned.localeCompare(a.loan.dateLoaned));

        return json({ ...borrower, loans });
      }

      const borrowers = [...data.borrowers].sort((a, b) =>
        a.name.localeCompare(b.name, undefined, { sensitivity: "base" }),
      );
      return json(borrowers);
    }

    if (request.method === "POST") {
      const body = await parseBody<{
        name: string;
        phone?: string;
        email?: string;
        avatarUrl?: string;
      }>(request);

      if (!body.name?.trim()) return error("Name is required");

      const borrower: Borrower = {
        id: newId(),
        name: body.name.trim(),
        phone: body.phone || null,
        email: body.email || null,
        avatarUrl: body.avatarUrl || null,
        createdAt: nowIso(),
      };

      data.borrowers.push(borrower);
      await saveData(data);
      return json(borrower, 201);
    }

    if (request.method === "PUT") {
      if (!id) return error("Borrower id required");
      const idx = data.borrowers.findIndex((b) => b.id === id);
      if (idx < 0) return error("Borrower not found", 404);

      const body = await parseBody<{
        name?: string;
        phone?: string;
        email?: string;
        avatarUrl?: string;
      }>(request);

      const borrower = { ...data.borrowers[idx] };
      if (body.name) borrower.name = body.name.trim();
      if (body.phone !== undefined) borrower.phone = body.phone || null;
      if (body.email !== undefined) borrower.email = body.email || null;
      if (body.avatarUrl !== undefined) borrower.avatarUrl = body.avatarUrl || null;

      data.borrowers[idx] = borrower;
      await saveData(data);
      return json(borrower);
    }

    if (request.method === "DELETE") {
      if (!id) return error("Borrower id required");
      data.borrowers = data.borrowers.filter((b) => b.id !== id);
      data.loans = data.loans.filter((l) => l.borrowerId !== id);
      await saveData(data);
      return json({ ok: true });
    }

    return error("Method not allowed", 405);
  } catch (e) {
    console.error(e);
    return error(e instanceof Error ? e.message : "Server error", 500);
  }
};
