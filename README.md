# Shelfie

Personal library catalog and lending tracker. A clean, installable PWA for iPhone and Mac.

## Features

- **Library-first layout** — status chips, cover/list views, tag & location filters, bulk edit
- **Locations browser** — books grouped by room and shelf
- **Add books** via USB/Bluetooth scanner, camera barcode, cover photo AI, shelf-spine AI, or manual entry
- **ISBN lookup** from Open Library and Google Books (free)
- **Lending** with borrowers, due dates, overdue/due-soon filters, extend due date
- **Full cataloging** — status, location, series, tags, ratings, condition, purchase info
- **Search & filters** by status, format, room, tag, and text
- **Offline browsing** with IndexedDB cache
- **CSV export/import** for data portability
- **Stats dashboard** and series tracking
- **Dark mode**

## Tech stack

- Vite + React + TypeScript
- Tailwind CSS v4 (BoardView design system)
- **Netlify Blobs** for storage (free tier)
- Netlify Functions for API
- Camera barcode (html5-qrcode) — free, no AI key
- Cover / shelf vision via **Google Gemini free tier**
- USB / Bluetooth barcode scanners (keyboard-wedge)
- PWA with service worker

## Environment variables

| Name | Required? | Notes |
|------|-----------|--------|
| `GEMINI_API_KEY` | Only for cover photo & shelf scan | Free key from [Google AI Studio](https://aistudio.google.com/apikey) |

Manual add, USB/Bluetooth scan, camera barcode, and ISBN lookup work **without** any env vars.

Optional: `GEMINI_MODEL` (default `gemini-2.0-flash`).

## Deploy (GitHub → Netlify)

1. Connect the repo in Netlify (branch: `main`)
2. Build settings are in `netlify.toml`
3. For cover/shelf AI: Site configuration → Environment variables → add `GEMINI_API_KEY`

## Local development

```bash
npm install
npm run dev
```

For API + Blobs locally:

```bash
npx netlify dev
```
