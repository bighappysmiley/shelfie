# Email confirmation (Supabase Auth)

Signup confirmation links redirect to `/auth/callback` on the **current site origin**
(local, preview, or production). That page exchanges the auth code/session, then
continues to `/setup`.

## Supabase dashboard checklist

Authentication → URL Configuration:

1. **Site URL** — your primary app URL (e.g. `https://shelfielibrary.netlify.app`)
2. **Redirect URLs** — include every origin you use, for example:
   - `https://shelfielibrary.netlify.app/**`
   - `http://localhost:3000/**`
   - `http://localhost:5173/**`
   - `http://localhost:8888/**`

If a redirect URL is missing, confirmation emails appear to “do nothing” or land
on an error page.

## App behavior

- New signup with confirm-email enabled → “check your email” + **Resend** button
- Signup with an email that already exists → clear error (not a fake confirmation message)
- Login while unconfirmed → clear error + **Resend confirmation email**
- Confirmation link opens `/auth/callback` → session established → `/setup`
