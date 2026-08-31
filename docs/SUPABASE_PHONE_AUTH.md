# Phone sign-in (Supabase)

Phone login is built into the app (Sign In → Phone tab). Supabase must be configured to send SMS verification codes.

## Enable in Supabase Dashboard

1. Open [Supabase Dashboard](https://supabase.com/dashboard) → your project → **Authentication** → **Providers**.
2. Enable **Phone**.
3. Under **SMS Provider**, choose **Twilio** (or MessageBird / Vonage / Textlocal).
4. Add your provider credentials:
   - **Twilio**: Account SID, Auth Token, and a Message Service SID (or From number).
5. Save.

## Site URL

Ensure **Authentication → URL Configuration** includes:

- Site URL: `https://shelfielibrary.netlify.app`
- Redirect URLs: `https://shelfielibrary.netlify.app/**`

## Testing

- Use E.164 format: `+15550100` (include country code).
- Twilio trial accounts can only SMS verified numbers — add test numbers in Twilio Console first.

## App behavior

- **Login / Sign up** → Phone tab sends OTP via `signInWithOtp`.
- **Account page** (sidebar profile) stores phone for 2FA and team invites — not in the sidebar menu itself.
- **2FA** (Account → Two-Factor Authentication) sends a second code after email/password login when enabled.

Without SMS configured, phone sign-in will fail when sending the code; email sign-in continues to work.
