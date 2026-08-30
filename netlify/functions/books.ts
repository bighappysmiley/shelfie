import type { Config } from "@netlify/functions";
import { eq, ilike, or, desc, asc, and, isNull } from "drizzle-orm";
import { db, schema } from "../../db/index";
import { json, error, handleOptions, parseBody } from "./utils";

export const config: Config = {
  path: "/api/books",
};

export default async (request: Request) => {
  if (request.method === "OPTIONS") return handleOptions();

  const url = new URL(request.url);
  const id = url.searchParams.get("id");

  try {
    if (request.method === "GET") {
      if (id) {
        const book = await db.query.books.findFirst({
          where: eq(schema.books.id, id),
        });
        if (!book) return error("Book not found", 404);

        const bookTagRows = await db
          .select({ name: schema.tags.name })
          .from(schema.bookTags)
          .innerJoin(schema.tags, eq(schema.bookTags.tagId, schema.tags.id))
          .where(eq(schema.bookTags.bookId, id));

        const activeLoan = await db
          .select({
            loan: schema.loans,
            borrower: schema.borrowers,
          })
          .from(schema.loans)
          .innerJoin(schema.borrowers, eq(schema.loans.borrowerId, schema.borrowers.id))
          .where(and(eq(schema.loans.bookId, id), isNull(schema.loans.dateReturned)))
          .limit(1);

        return json({
          ...book,
          tags: bookTagRows.map((r) => r.name),
          activeLoan: activeLoan[0] ?? null,
        });
      }

      const q = url.searchParams.get("q") ?? "";
      const status = url.searchParams.get("status");
      const sort = url.searchParams.get("sort") ?? "title";
      const order = url.searchParams.get("order") === "desc" ? "desc" : "asc";

      let query = db.select().from(schema.books).$dynamic();

      const conditions = [];
      if (q) {
        conditions.push(
          or(
            ilike(schema.books.title, `%${q}%`),
            ilike(schema.books.authors, `%${q}%`),
            ilike(schema.books.isbn, `%${q}%`),
            ilike(schema.books.seriesName, `%${q}%`),
            ilike(schema.books.locationRoom, `%${q}%`),
            ilike(schema.books.locationShelf, `%${q}%`),
          ),
        );
      }
      if (status) {
        conditions.push(eq(schema.books.readingStatus, status));
      }

      if (conditions.length > 0) {
        query = query.where(and(...conditions));
      }

      const sortCol = {
        title: schema.books.title,
        author: schema.books.authors,
        added: schema.books.createdAt,
        published: schema.books.publishYear,
        rating: schema.books.personalRating,
      }[sort] ?? schema.books.title;

      const books = await query.orderBy(order === "desc" ? desc(sortCol) : asc(sortCol));
      return json(books);
    }

    if (request.method === "POST") {
      const body = await parseBody<{
        title: string;
        authors?: string;
        isbn?: string;
        coverUrl?: string;
        format?: string;
        locationRoom?: string;
        locationShelf?: string;
        readingStatus?: string;
        personalRating?: number;
        seriesName?: string;
        seriesNumber?: string;
        purchaseDate?: string;
        purchasePrice?: string;
        condition?: string;
        notes?: string;
        pageCount?: number;
        publisher?: string;
        publishYear?: number;
        description?: string;
        copyNumber?: number;
        tags?: string[];
        allowDuplicate?: boolean;
      }>(request);

      if (!body.title?.trim()) return error("Title is required");

      if (body.isbn && !body.allowDuplicate) {
        const existing = await db
          .select()
          .from(schema.books)
          .where(eq(schema.books.isbn, body.isbn))
          .limit(1);
        if (existing.length > 0) {
          return json(
            {
              duplicate: true,
              existing: existing[0],
              message: "A book with this ISBN already exists",
            },
            409,
          );
        }
      }

      const [book] = await db
        .insert(schema.books)
        .values({
          title: body.title.trim(),
          authors: body.authors?.trim() ?? "",
          isbn: body.isbn?.trim() || null,
          coverUrl: body.coverUrl || null,
          format: body.format ?? "paperback",
          locationRoom: body.locationRoom || null,
          locationShelf: body.locationShelf || null,
          readingStatus: body.readingStatus ?? "owned",
          personalRating: body.personalRating ?? null,
          seriesName: body.seriesName || null,
          seriesNumber: body.seriesNumber || null,
          purchaseDate: body.purchaseDate || null,
          purchasePrice: body.purchasePrice || null,
          condition: body.condition || null,
          notes: body.notes || null,
          pageCount: body.pageCount ?? null,
          publisher: body.publisher || null,
          publishYear: body.publishYear ?? null,
          description: body.description || null,
          copyNumber: body.copyNumber ?? 1,
        })
        .returning();

      if (body.tags?.length) {
        for (const tagName of body.tags) {
          const trimmed = tagName.trim().toLowerCase();
          if (!trimmed) continue;
          let [tag] = await db
            .select()
            .from(schema.tags)
            .where(eq(schema.tags.name, trimmed))
            .limit(1);
          if (!tag) {
            [tag] = await db.insert(schema.tags).values({ name: trimmed }).returning();
          }
          await db
            .insert(schema.bookTags)
            .values({ bookId: book.id, tagId: tag.id })
            .onConflictDoNothing();
        }
      }

      return json(book, 201);
    }

    if (request.method === "PUT" || request.method === "PATCH") {
      if (!id) return error("Book id required");
      const body = await parseBody<Record<string, unknown>>(request);

      const allowed = [
        "title", "authors", "isbn", "coverUrl", "format", "locationRoom",
        "locationShelf", "readingStatus", "personalRating", "seriesName",
        "seriesNumber", "purchaseDate", "purchasePrice", "condition", "notes",
        "pageCount", "publisher", "publishYear", "description", "copyNumber",
      ] as const;

      const updates: Partial<typeof schema.books.$inferInsert> = {
        updatedAt: new Date(),
      };

      for (const f of allowed) {
        if (body[f] !== undefined) {
          (updates as Record<string, unknown>)[f] = body[f];
        }
      }

      const [book] = await db
        .update(schema.books)
        .set(updates)
        .where(eq(schema.books.id, id))
        .returning();

      if (!book) return error("Book not found", 404);

      if (Array.isArray(body.tags)) {
        await db.delete(schema.bookTags).where(eq(schema.bookTags.bookId, id));
        for (const tagName of body.tags as string[]) {
          const trimmed = tagName.trim().toLowerCase();
          if (!trimmed) continue;
          let [tag] = await db
            .select()
            .from(schema.tags)
            .where(eq(schema.tags.name, trimmed))
            .limit(1);
          if (!tag) {
            [tag] = await db.insert(schema.tags).values({ name: trimmed }).returning();
          }
          await db.insert(schema.bookTags).values({ bookId: id, tagId: tag.id });
        }
      }

      return json(book);
    }

    if (request.method === "DELETE") {
      if (!id) return error("Book id required");
      await db.delete(schema.books).where(eq(schema.books.id, id));
      return json({ ok: true });
    }

    return error("Method not allowed", 405);
  } catch (e) {
    console.error(e);
    return error(e instanceof Error ? e.message : "Server error", 500);
  }
};
