# Google OAuth Setup (Single User)

This project uses server-side OAuth refresh tokens for one account (Eduardo).

## 1) Create OAuth client

1. Go to Google Cloud Console -> APIs & Services -> Credentials.
2. Create OAuth Client ID (Web application).
3. Authorized redirect URI:
   - `https://realtor-dashboard-neon.vercel.app/api/google-oauth-callback`

## 2) Enable APIs

Enable:
- Gmail API
- Google Calendar API

## 3) Set Vercel environment variables

Set in Vercel project settings:

- `GOOGLE_CLIENT_ID`
- `GOOGLE_CLIENT_SECRET`
- `NEXT_PUBLIC_SITE_URL` (optional, defaults to production URL)

Do not set `GOOGLE_REFRESH_TOKEN_EDUARDO` yet.

## 4) One-time consent

1. Open:
   - `https://realtor-dashboard-neon.vercel.app/api/google-oauth-start`
2. Complete consent flow.
3. Callback returns JSON with a `refreshToken` value.
4. Copy that token into Vercel env var:
   - `GOOGLE_REFRESH_TOKEN_EDUARDO`
5. Redeploy.

## 5) Verify endpoints

Check:
- `GET /api/gmail-counts?date=YYYY-MM-DD`
- `GET /api/gcal-events?date=YYYY-MM-DD`

Expected: JSON payloads with counts/events and no auth errors.

## Security notes

- Refresh token is server-side only (never exposed in client bundle).
- `google-oauth-start` and `google-oauth-callback` refuse operation if `GOOGLE_REFRESH_TOKEN_EDUARDO` is already set.
- Do not log Gmail message bodies in production routes.
