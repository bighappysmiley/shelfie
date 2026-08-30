# Data storage

Shelfie stores data in **Netlify Blobs** (included on free Netlify plans). No database plan or connection string is required.

## Store

- Store name: `shelfie`
- Key: `library`
- Value: one JSON document

```json
{
  "books": [ /* Book */ ],
  "borrowers": [ /* Borrower */ ],
  "loans": [ /* Loan */ ]
}
```

## Book

| Field | Type | Notes |
|-------|------|-------|
| id | string (uuid) | |
| title | string | Required |
| authors | string | |
| isbn | string \| null | |
| coverUrl | string \| null | |
| format | string | hardcover, paperback, ebook, audiobook |
| locationRoom / locationShelf | string \| null | |
| readingStatus | string | owned, reading, read, want_to_read, wishlist |
| personalRating | number \| null | 1–5 |
| seriesName / seriesNumber | string \| null | |
| purchaseDate / purchasePrice | string \| null | |
| condition | string \| null | |
| notes | string \| null | |
| pageCount / publisher / publishYear / description | mixed | |
| copyNumber | number | Default 1 |
| tags | string[] | |
| createdAt / updatedAt | ISO string | |

## Borrower / Loan

Same shape as before: borrowers have name/phone/email; loans link `bookId` + `borrowerId` with dates. `dateReturned: null` means currently out.
