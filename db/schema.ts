import {
  pgTable,
  uuid,
  text,
  integer,
  decimal,
  date,
  timestamp,
  primaryKey,
} from "drizzle-orm/pg-core";

export const books = pgTable("books", {
  id: uuid("id").primaryKey().defaultRandom(),
  title: text("title").notNull(),
  authors: text("authors").notNull().default(""),
  isbn: text("isbn"),
  coverUrl: text("cover_url"),
  format: text("format").notNull().default("paperback"),
  locationRoom: text("location_room"),
  locationShelf: text("location_shelf"),
  readingStatus: text("reading_status").notNull().default("owned"),
  personalRating: integer("personal_rating"),
  seriesName: text("series_name"),
  seriesNumber: text("series_number"),
  purchaseDate: date("purchase_date"),
  purchasePrice: decimal("purchase_price", { precision: 10, scale: 2 }),
  condition: text("condition"),
  notes: text("notes"),
  pageCount: integer("page_count"),
  publisher: text("publisher"),
  publishYear: integer("publish_year"),
  description: text("description"),
  copyNumber: integer("copy_number").notNull().default(1),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const borrowers = pgTable("borrowers", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  phone: text("phone"),
  email: text("email"),
  avatarUrl: text("avatar_url"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const loans = pgTable("loans", {
  id: uuid("id").primaryKey().defaultRandom(),
  bookId: uuid("book_id")
    .notNull()
    .references(() => books.id, { onDelete: "cascade" }),
  borrowerId: uuid("borrower_id")
    .notNull()
    .references(() => borrowers.id, { onDelete: "cascade" }),
  dateLoaned: date("date_loaned").notNull(),
  dueDate: date("due_date"),
  dateReturned: date("date_returned"),
  notes: text("notes"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const tags = pgTable("tags", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull().unique(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const bookTags = pgTable(
  "book_tags",
  {
    bookId: uuid("book_id")
      .notNull()
      .references(() => books.id, { onDelete: "cascade" }),
    tagId: uuid("tag_id")
      .notNull()
      .references(() => tags.id, { onDelete: "cascade" }),
  },
  (t) => [primaryKey({ columns: [t.bookId, t.tagId] })],
);

export type Book = typeof books.$inferSelect;
export type NewBook = typeof books.$inferInsert;
export type Borrower = typeof borrowers.$inferSelect;
export type Loan = typeof loans.$inferSelect;
export type Tag = typeof tags.$inferSelect;
