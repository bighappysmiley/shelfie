import type { Config } from "@netlify/functions";
import { eq, asc } from "drizzle-orm";
import { db, schema } from "../../db/index";
import { json, error, handleOptions, parseBody } from "./utils";

export const config: Config = {
  path: "/api/borrowers",
};

export default async (request: Request) => {
  if (request.method === "OPTIONS") return handleOptions();

  const url = new URL(request.url);
  const id = url.searchParams.get("id");

  try {
    if (request.method === "GET") {
      if (id) {
        const borrower = await db.query.borrowers.findFirst({
          where: eq(schema.borrowers.id, id),
        });
        if (!borrower) return error("Borrower not found", 404);

        const loanHistory = await db
          .select({
            loan: schema.loans,
            book: schema.books,
          })
          .from(schema.loans)
          .innerJoin(schema.books, eq(schema.loans.bookId, schema.books.id))
          .where(eq(schema.loans.borrowerId, id))
          .orderBy(schema.loans.dateLoaned);

        return json({ ...borrower, loans: loanHistory });
      }

      const borrowers = await db.select().from(schema.borrowers).orderBy(asc(schema.borrowers.name));
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

      const [borrower] = await db
        .insert(schema.borrowers)
        .values({
          name: body.name.trim(),
          phone: body.phone || null,
          email: body.email || null,
          avatarUrl: body.avatarUrl || null,
        })
        .returning();

      return json(borrower, 201);
    }

    if (request.method === "PUT") {
      if (!id) return error("Borrower id required");
      const body = await parseBody<{
        name?: string;
        phone?: string;
        email?: string;
        avatarUrl?: string;
      }>(request);

      const [borrower] = await db
        .update(schema.borrowers)
        .set({
          ...(body.name && { name: body.name.trim() }),
          ...(body.phone !== undefined && { phone: body.phone || null }),
          ...(body.email !== undefined && { email: body.email || null }),
          ...(body.avatarUrl !== undefined && { avatarUrl: body.avatarUrl || null }),
        })
        .where(eq(schema.borrowers.id, id))
        .returning();

      if (!borrower) return error("Borrower not found", 404);
      return json(borrower);
    }

    if (request.method === "DELETE") {
      if (!id) return error("Borrower id required");
      await db.delete(schema.borrowers).where(eq(schema.borrowers.id, id));
      return json({ ok: true });
    }

    return error("Method not allowed", 405);
  } catch (e) {
    console.error(e);
    return error(e instanceof Error ? e.message : "Server error", 500);
  }
};
