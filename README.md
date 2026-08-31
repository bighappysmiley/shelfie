# Shelfie

Your personal library — catalog books, know where they live, and track who borrowed them.

## What you can do

- **Sign up** for a private account (your library isn’t shared)
- Add books by hand, barcode camera, USB/Bluetooth scanner, cover photo, or shelf photo
- Organize by room and shelf, tags, status, and series
- Loan books to friends and track due dates
- Export or import your catalog

## For operators (deploy)

Built as a Vite + React PWA on Netlify Functions + Netlify Blobs, with Supabase Auth.

### Netlify environment variables

| Variable | Notes |
|----------|--------|
| `SUPABASE_URL` | `https://xdsnoqckoolwatgwtyfy.supabase.co` |
| `SUPABASE_ANON_KEY` | Supabase anon / publishable key |
| `VITE_SUPABASE_URL` | Same URL (needed at build time) |
| `VITE_SUPABASE_ANON_KEY` | Same anon key (needed at build time) |
| `GEMINI_API_KEY` | Optional — enables cover & shelf photo features |

In Supabase Auth settings, set **Site URL** to your Netlify site URL and add it under redirect URLs.

### Local development

```bash
npm install
npx netlify dev
```

Copy `.env.example` to `.env` if you need to override keys.
