# Shelfie

Personal library catalog and lending tracker. A clean, installable PWA for iPhone and Mac.

## Features

- **Add books** via barcode scan, cover photo (AI), shelf-spine batch scan (AI), or manual entry
- **ISBN lookup** from Open Library and Google Books
- **Lending system** with borrower profiles and loan history
- **Full cataloging** — status, location, series, tags, ratings, condition, purchase info
- **Search & filters** across your entire library
- **Offline browsing** with IndexedDB cache
- **CSV export/import** for data portability
- **Stats dashboard** and series tracking
- **Dark mode**

## Tech stack

- Vite + React + TypeScript
- Tailwind CSS v4 (BoardView design system)
- Netlify Database (Postgres via Drizzle ORM)
- Netlify Functions for API
- PWA with service worker

## Local development

```bash
npm install
npm run dev
```

For full API + database locally, use Netlify Dev:

```bash
npx netlify dev
```

## Environment variables

Set in the Netlify dashboard (Site settings → Environment variables):

| Variable | Required | Description |
|----------|----------|-------------|
| `ANTHROPIC_API_KEY` | For AI features | Your Anthropic API key for cover photo and shelf-spine scanning |

Get an API key at [console.anthropic.com](https://console.anthropic.com/).

## Deploy

```bash
npx netlify deploy        # preview
npx netlify deploy --prod # production
```

Netlify auto-provisions the database and applies migrations from `netlify/database/migrations/` on deploy.

## Database schema

- `books` — library catalog
- `borrowers` — lending contacts
- `loans` — loan history
- `tags` / `book_tags` — freeform tags
