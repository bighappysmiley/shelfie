# Shelfie data model

Per-user library documents in Netlify Blobs.

- Store: `shelfie`
- Key: `library:{userId}`
- Shape: `{ books: Book[], borrowers: Borrower[], loans: Loan[] }`

Uploaded covers:

- Store: `shelfie-covers`
- Key: `{userId}/{coverId}`

## Book

| Field | Type | Notes |
|-------|------|--------|
| id | string (uuid) | |
| title | string | required |
| authors | string | |
| isbn | string \| null | |
| coverUrl | string \| null | |
| format | hardcover \| paperback \| ebook \| audiobook | |
| locationRoom | string \| null | |
| locationShelf | string \| null | |
| readingStatus | available \| wishlist \| missing | catalog status |
| personalRating | number \| null | 1–5 |
| seriesName / seriesNumber | string \| null | |
| purchaseDate / purchasePrice | string \| null | |
| condition | string \| null | |
| notes | string \| null | |
| pageCount | number \| null | |
| publisher / publishYear | string / number \| null | |
| description | string \| null | |
| copyNumber | number | default 1 |
| tags | string[] | |
| createdAt / updatedAt | ISO string | |

Active loans are computed from `loans` where `dateReturned` is null (shown as “On loan”).

## Borrower

id, name, phone, email, avatarUrl, createdAt

## Loan

id, bookId, borrowerId, dateLoaned, dueDate, dateReturned, notes, createdAt

Auth: Supabase JWT (`Authorization: Bearer …`) required on all `/api/*` routes except `cover-proxy` (public ISBN cover CDN proxy).
