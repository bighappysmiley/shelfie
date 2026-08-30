# Shelfie

Personal library catalog and lending tracker. A clean, installable PWA for iPhone and Mac.

**100% free to run** — no paid API keys, no Netlify Database plan required.

## Features

- **Add books** via barcode scan, cover photo OCR, shelf-spine OCR, or manual entry
- **ISBN lookup** from Open Library and Google Books (free)
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
- **Netlify Blobs** for storage (free tier — no Database feature needed)
- Netlify Functions for API
- On-device OCR (Tesseract.js) for cover/shelf photos
- PWA with service worker

## Environment variables

**None required.**

## Deploy (GitHub → Netlify)

1. Connect the repo in Netlify (branch: `main`)
2. Build settings are in `netlify.toml` — no changes needed
3. Redeploy after this update so the old Database provisioning step is gone

## Local development

```bash
npm install
npm run dev
```

For API + Blobs locally:

```bash
npx netlify dev
```
