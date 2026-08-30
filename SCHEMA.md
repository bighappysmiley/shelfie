# Database Schema

Shelfie uses Netlify Database (Postgres) with Drizzle ORM.

## Tables

### books
| Column | Type | Notes |
|--------|------|-------|
| id | uuid | Primary key |
| title | text | Required |
| authors | text | Comma-separated |
| isbn | text | Nullable; duplicates allowed for multi-copy |
| cover_url | text | |
| format | text | hardcover, paperback, ebook, audiobook |
| location_room | text | |
| location_shelf | text | |
| reading_status | text | owned, reading, read, want_to_read, wishlist |
| personal_rating | integer | 1–5 |
| series_name | text | |
| series_number | text | |
| purchase_date | date | |
| purchase_price | numeric(10,2) | |
| condition | text | new, good, worn, damaged |
| notes | text | |
| page_count | integer | |
| publisher | text | |
| publish_year | integer | |
| description | text | |
| copy_number | integer | Default 1, for multi-copy |
| created_at | timestamptz | |
| updated_at | timestamptz | |

### borrowers
| Column | Type | Notes |
|--------|------|-------|
| id | uuid | Primary key |
| name | text | Required |
| phone | text | |
| email | text | |
| avatar_url | text | |
| created_at | timestamptz | |

### loans
| Column | Type | Notes |
|--------|------|-------|
| id | uuid | Primary key |
| book_id | uuid | FK → books |
| borrower_id | uuid | FK → borrowers |
| date_loaned | date | Required |
| due_date | date | |
| date_returned | date | Null = currently out |
| notes | text | |
| created_at | timestamptz | |

### tags / book_tags
Many-to-many tagging. Tag names are unique and stored lowercase.

## Migrations

Located in `netlify/database/migrations/`. Applied automatically on Netlify deploy.
