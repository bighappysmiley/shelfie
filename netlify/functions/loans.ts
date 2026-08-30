import type { Config } from "@netlify/functions";
import { eq, isNull, and, desc } from "drizzle-orm";
import { db, schema } from "../../db/index";
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
    if (request.method === "GET") {
      const conditions = activeOnly ? [isNull(schema.loans.dateReturned)] : [];

      const rows = await db
        .select({
          loan: schema.loans,
          book: schema.books,
          borrower: schema.borrowers,
        })
        .from(schema.loans)
        .innerJoin(schema.books, eq(schema.loans.bookId, schema.books.id))
        .innerJoin(schema.borrowers, eq(schema.loans.borrowerId, schema.borrowers.id))
        .where(conditions.length ? and(...conditions) : undefined)
        .orderBy(desc(schema.loans.dueDate));

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

      const existing = await db
        .select()
        .from(schema.loans)
        .where(and(eq(schema.loans.bookId, body.bookId), isNull(schema.loans.dateReturned)))
        .limit(1);

      if (existing.length > 0) {
        return error("This book is already loaned out", 409);
      }

      const today = new Date().toISOString().slice(0, 10);

      const [loan] = await db
        .insert(schema.loans)
        .values({
          bookId: body.bookId,
          borrowerId: body.borrowerId,
          dateLoaned: body.dateLoaned ?? today,
          dueDate: body.dueDate || null,
          notes: body.notes || null,
        })
        .returning();

      return json(loan, 201);
    }

    if (request.method === "PATCH") {
      if (!id) return error("Loan id required");
      const body = await parseBody<{ action?: string; dateReturned?: string }>(request);

      if (body.action === "return") {
        const today = new Date().toISOString().slice(0, 10);
        const [loan] = await db
          .update(schema.loans)
          .set({ dateReturned: body.dateReturned ?? today })
          .where(eq(schema.loans.id, id))
          .returning();

        if (!loan) return error("Loan not found", 404);
        return json(loan);
      }

      return error("Unknown action");
    }

    return error("Method not allowed", 405);
  } catch (e) {
    console.error(e);
    return error(e instanceof Error ? e.message : "Server error", 500);
  }
};
