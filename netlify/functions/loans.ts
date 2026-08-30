import type { Config } from "@netlify/functions";
import { loadData, saveData, newId, nowIso, todayDate, type Loan } from "./lib/store";
import { json, error, handleOptions, parseBody } from "./utils";

export const config: Config = {
  path: "/api/loans",
};

export default async (request: Request) => {
  if (request.method === "OPTIONS") return handleOptions();

  const url = new URL(request.url);
  const id = url.searchParams.get("id");
  const activeOnly = url.searchParams.get("active") === "true";

  try {
    const data = await loadData();

    if (request.method === "GET") {
      let loans = data.loans;
      if (activeOnly) loans = loans.filter((l) => !l.dateReturned);

      const rows = loans
        .map((loan) => {
          const book = data.books.find((b) => b.id === loan.bookId);
          const borrower = data.borrowers.find((b) => b.id === loan.borrowerId);
          if (!book || !borrower) return null;
          return { loan, book, borrower };
        })
        .filter(Boolean)
        .sort((a, b) => {
          const aDue = a!.loan.dueDate ?? "9999";
          const bDue = b!.loan.dueDate ?? "9999";
          return bDue.localeCompare(aDue);
        });

      return json(rows);
    }

    if (request.method === "POST") {
      const body = await parseBody<{
        bookId: string;
        borrowerId: string;
        dateLoaned?: string;
        dueDate?: string;
        notes?: string;
      }>(request);

      if (!body.bookId || !body.borrowerId) {
        return error("bookId and borrowerId are required");
      }

      const alreadyOut = data.loans.find(
        (l) => l.bookId === body.bookId && !l.dateReturned,
      );
      if (alreadyOut) return error("This book is already loaned out", 409);

      const loan: Loan = {
        id: newId(),
        bookId: body.bookId,
        borrowerId: body.borrowerId,
        dateLoaned: body.dateLoaned ?? todayDate(),
        dueDate: body.dueDate || null,
        dateReturned: null,
        notes: body.notes || null,
        createdAt: nowIso(),
      };

      data.loans.push(loan);
      await saveData(data);
      return json(loan, 201);
    }

    if (request.method === "PATCH") {
      if (!id) return error("Loan id required");
      const body = await parseBody<{ action?: string; dateReturned?: string }>(request);

      if (body.action === "return") {
        const idx = data.loans.findIndex((l) => l.id === id);
        if (idx < 0) return error("Loan not found", 404);

        data.loans[idx] = {
          ...data.loans[idx],
          dateReturned: body.dateReturned ?? todayDate(),
        };
        await saveData(data);
        return json(data.loans[idx]);
      }

      return error("Unknown action");
    }

    return error("Method not allowed", 405);
  } catch (e) {
    console.error(e);
    return error(e instanceof Error ? e.message : "Server error", 500);
  }
};
