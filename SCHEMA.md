# Shelfie / Pine Bookkeeping data model

Library documents in Netlify Blobs, keyed by shared library id.

- Store: `shelfie`
- Key: `library:{libraryId}` (legacy: `library:{userId}` migrated on first access)
- Shape: `{ books: Book[], borrowers: Borrower[], loans: Loan[] }`

Uploaded covers:

- Store: `shelfie-covers`
- Key: `{libraryId}/{coverId}` (legacy `{userId}/{coverId}` still readable)

## Shared libraries (Supabase)

| Table | Purpose |
|-------|---------|
| `libraries` | Named library, one owner |
| `library_members` | Users with access (owner or member) |
| `library_invites` | Pending invites by email or phone |
| `user_profiles` | Phone, 2FA preference, preferred sign-in method |

API requests include `X-Library-Id` (except `/api/libraries`). Membership verified via Supabase RLS.

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
