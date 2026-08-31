import type { Config } from "@netlify/functions";
import {
  loadData,
  saveData,
  newId,
  nowIso,
  normalizeLibraryStatus,
  type Book,
} from "./lib/store";
import { json, error, parseBody, corsHeaders } from "./utils";
import { withAuth } from "./lib/auth";

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

export default withAuth(async (request, user) => {
  const url = new URL(request.url);
  const action = url.searchParams.get("action");

  const data = await loadData(user.id);

    if (request.method === "GET" && action === "export") {
      const bookHeaders = [
        "id", "title", "authors", "isbn", "format", "locationRoom", "locationShelf",
        "readingStatus", "personalRating", "seriesName", "seriesNumber",
        "purchaseDate", "purchasePrice", "condition", "notes", "pageCount",
        "publisher", "publishYear", "copyNumber", "createdAt",
      ];

      const bookRows = data.books.map((b) =>
        bookHeaders.map((h) => escapeCsv(b[h as keyof Book] as string | number | null)).join(","),
      );

      const loanHeaders = [
        "loan_id", "book_title", "borrower_name", "date_loaned", "due_date", "date_returned", "notes",
      ];
      const loanRows = data.loans.map((loan) => {
        const book = data.books.find((b) => b.id === loan.bookId);
        const borrower = data.borrowers.find((b) => b.id === loan.borrowerId);
        return [
          loan.id,
          book?.title,
          borrower?.name,
          loan.dateLoaned,
          loan.dueDate,
          loan.dateReturned,
          loan.notes,
        ].map(escapeCsv).join(",");
      });

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
        headers: corsHeaders({
          "Content-Type": "text/csv",
          "Content-Disposition": 'attachment; filename="shelfie-export.csv"',
        }),
      });
    }

    if (request.method === "GET" && action === "stats") {
      const activeLoans = data.loans.filter((l) => !l.dateReturned);
      const today = new Date().toISOString().slice(0, 10);
      const overdue = activeLoans.filter((l) => l.dueDate && l.dueDate < today);

      const byStatus: Record<string, number> = {
        available: 0,
        on_loan: 0,
        wishlist: 0,
        missing: 0,
      };
      const byLocation: Record<string, number> = {};
      const byFormat: Record<string, number> = {};
      let totalValue = 0;
      const loanedBookIds = new Set(
        activeLoans.map((l) => l.bookId),
      );

      for (const b of data.books) {
        if (loanedBookIds.has(b.id)) {
          byStatus.on_loan += 1;
        } else {
          const status = normalizeLibraryStatus(b.readingStatus);
          byStatus[status] = (byStatus[status] ?? 0) + 1;
        }
        const loc = [b.locationRoom, b.locationShelf].filter(Boolean).join(" / ") || "Unsorted";
        byLocation[loc] = (byLocation[loc] ?? 0) + 1;
        byFormat[b.format] = (byFormat[b.format] ?? 0) + 1;
        if (b.purchasePrice) totalValue += parseFloat(b.purchasePrice);
      }

      const seriesMap: Record<string, string[]> = {};
      for (const b of data.books) {
        if (!b.seriesName) continue;
        if (!seriesMap[b.seriesName]) seriesMap[b.seriesName] = [];
        if (b.seriesNumber) seriesMap[b.seriesName].push(b.seriesNumber);
      }

      return json({
        totalBooks: data.books.length,
        byStatus,
        byLocation,
        byFormat,
        totalValue: Math.round(totalValue * 100) / 100,
        activeLoans: activeLoans.length,
        overdueCount: overdue.length,
        series: Object.entries(seriesMap).map(([name, owned]) => ({
          name,
          owned: owned.sort(),
        })),
      });
    }

    if (request.method === "POST" && action === "import") {
      const body = await parseBody<{ books: Record<string, string>[] }>(request);
      if (!body.books?.length) return error("No books to import");

      let imported = 0;
      const now = nowIso();

      for (const row of body.books) {
        const title = row.title || row.Title;
        if (!title) continue;

        const book: Book = {
          id: newId(),
          title,
          authors: row.authors || row.Author || "",
          isbn: row.isbn || row.ISBN || null,
          coverUrl: row.cover_url || row["Cover Image"] || null,
          format: "paperback",
          locationRoom: null,
          locationShelf: null,
          readingStatus: normalizeLibraryStatus(
            row.reading_status ||
              row["Exclusive Shelf"]?.toLowerCase()?.replace(/\s+/g, "_") ||
              "available",
          ),
          personalRating: row.personal_rating
            ? parseInt(row.personal_rating, 10)
            : row["My Rating"]
              ? parseInt(row["My Rating"], 10)
              : null,
          seriesName: row.series_name || row["Book Series"] || null,
          seriesNumber: row.series_number || null,
          purchaseDate: null,
          purchasePrice: null,
          condition: null,
          notes: row.notes || row["Private Notes"] || null,
          pageCount: row.page_count
            ? parseInt(row.page_count, 10)
            : row["Number of Pages"]
              ? parseInt(row["Number of Pages"], 10)
              : null,
          publisher: row.publisher || row.Publisher || null,
          publishYear: row.publish_year
            ? parseInt(row.publish_year, 10)
            : row["Year Published"]
              ? parseInt(row["Year Published"], 10)
              : null,
          description: null,
          copyNumber: 1,
          tags: [],
          createdAt: now,
          updatedAt: now,
        };

        data.books.push(book);
        imported++;
      }

      await saveData(user.id, data);
      return json({ imported });
    }

  return error("Unknown action", 400);
});
