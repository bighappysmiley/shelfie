import type { Config } from "@netlify/functions";
import { eq, isNull } from "drizzle-orm";
import { db, schema } from "../../db/index";
import { json, error, handleOptions, parseBody } from "./utils";

export const config: Config = {
  path: "/api/data",
};

function escapeCsv(val: string | number | null | undefined): string {
  if (val == null) return "";
  const s = String(val);
  if (s.includes(",") || s.includes('"') || s.includes("\n")) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

export default async (request: Request) => {
  if (request.method === "OPTIONS") return handleOptions();

  const url = new URL(request.url);
  const action = url.searchParams.get("action");

  try {
    if (request.method === "GET" && action === "export") {
      const books = await db.select().from(schema.books).orderBy(schema.books.title);
      const loans = await db
        .select({
          loan: schema.loans,
          bookTitle: schema.books.title,
          borrowerName: schema.borrowers.name,
        })
        .from(schema.loans)
        .innerJoin(schema.books, eq(schema.loans.bookId, schema.books.id))
        .innerJoin(schema.borrowers, eq(schema.loans.borrowerId, schema.borrowers.id));

      const bookHeaders = [
        "id", "title", "authors", "isbn", "format", "location_room", "location_shelf",
        "reading_status", "personal_rating", "series_name", "series_number",
        "purchase_date", "purchase_price", "condition", "notes", "page_count",
        "publisher", "publish_year", "copy_number", "created_at",
      ];

      const bookRows = books.map((b) =>
        bookHeaders.map((h) => {
          const key = h.replace(/_([a-z])/g, (_, c) => c.toUpperCase()) as keyof typeof b;
          return escapeCsv(b[key] as string | number | null);
        }).join(","),
      );

      const loanHeaders = [
        "loan_id", "book_title", "borrower_name", "date_loaned", "due_date", "date_returned", "notes",
      ];
      const loanRows = loans.map((r) =>
        [
          r.loan.id, r.bookTitle, r.borrowerName,
          r.loan.dateLoaned, r.loan.dueDate, r.loan.dateReturned, r.loan.notes,
        ].map(escapeCsv).join(","),
      );

      const csv = [
        "# Books",
        bookHeaders.join(","),
        ...bookRows,
        "",
        "# Loans",
        loanHeaders.join(","),
        ...loanRows,
      ].join("\n");

      return new Response(csv, {
        headers: {
          "Content-Type": "text/csv",
          "Content-Disposition": 'attachment; filename="shelfie-export.csv"',
        },
      });
    }

    if (request.method === "GET" && action === "stats") {
      const allBooks = await db.select().from(schema.books);
      const activeLoans = await db
        .select()
        .from(schema.loans)
        .where(isNull(schema.loans.dateReturned));

      const today = new Date().toISOString().slice(0, 10);
      const overdue = activeLoans.filter((l) => l.dueDate && l.dueDate < today);

      const byStatus: Record<string, number> = {};
      const byLocation: Record<string, number> = {};
      const byFormat: Record<string, number> = {};
      let totalValue = 0;

      for (const b of allBooks) {
        byStatus[b.readingStatus] = (byStatus[b.readingStatus] ?? 0) + 1;
        const loc = [b.locationRoom, b.locationShelf].filter(Boolean).join(" / ") || "Unsorted";
        byLocation[loc] = (byLocation[loc] ?? 0) + 1;
        byFormat[b.format] = (byFormat[b.format] ?? 0) + 1;
        if (b.purchasePrice) totalValue += parseFloat(b.purchasePrice);
      }

      const loanCounts = await db
        .select({
          bookId: schema.loans.bookId,
          count: schema.loans.id,
        })
        .from(schema.loans);

      const countMap: Record<string, number> = {};
      for (const l of loanCounts) {
        countMap[l.bookId] = (countMap[l.bookId] ?? 0) + 1;
      }

      const seriesMap: Record<string, { owned: string[]; all: Set<string> }> = {};
      for (const b of allBooks) {
        if (!b.seriesName) continue;
        if (!seriesMap[b.seriesName]) {
          seriesMap[b.seriesName] = { owned: [], all: new Set() };
        }
        if (b.seriesNumber) {
          seriesMap[b.seriesName].owned.push(b.seriesNumber);
          seriesMap[b.seriesName].all.add(b.seriesNumber);
        }
      }

      return json({
        totalBooks: allBooks.length,
        byStatus,
        byLocation,
        byFormat,
        totalValue: Math.round(totalValue * 100) / 100,
        activeLoans: activeLoans.length,
        overdueCount: overdue.length,
        series: Object.entries(seriesMap).map(([name, data]) => ({
          name,
          owned: data.owned.sort(),
        })),
      });
    }

    if (request.method === "POST" && action === "import") {
      const body = await parseBody<{ books: Record<string, string>[]; format?: string }>(request);
      if (!body.books?.length) return error("No books to import");

      let imported = 0;
      for (const row of body.books) {
        const title = row.title || row.Title;
        if (!title) continue;

        await db.insert(schema.books).values({
          title,
          authors: row.authors || row.Author || row.authors || "",
          isbn: row.isbn || row.ISBN || null,
          coverUrl: row.cover_url || row["Cover Image"] || null,
          readingStatus: row.reading_status || row["Exclusive Shelf"]?.toLowerCase()?.replace(" ", "_") || "owned",
          personalRating: row.personal_rating ? parseInt(row.personal_rating, 10) : row["My Rating"] ? parseInt(row["My Rating"], 10) : null,
          seriesName: row.series_name || row["Book Series"] || null,
          seriesNumber: row.series_number || null,
          notes: row.notes || row["Private Notes"] || null,
          publisher: row.publisher || row.Publisher || null,
          publishYear: row.publish_year ? parseInt(row.publish_year, 10) : row["Year Published"] ? parseInt(row["Year Published"], 10) : null,
          pageCount: row.page_count ? parseInt(row.page_count, 10) : row["Number of Pages"] ? parseInt(row["Number of Pages"], 10) : null,
        });
        imported++;
      }

      return json({ imported });
    }

    return error("Unknown action", 400);
  } catch (e) {
    console.error(e);
    return error(e instanceof Error ? e.message : "Server error", 500);
  }
};
