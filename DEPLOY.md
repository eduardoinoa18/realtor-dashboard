# Deployment Guide — Realtor HQ

Follow these steps to deploy Realtor HQ to Vercel and make it live.

## Step 1: Create a Supabase Project

1. Go to [supabase.com](https://supabase.com) and sign up/log in
2. Click "New Project"
3. Choose "Free" plan (perfect for Eduardo's usage)
4. Fill in project details:
   - **Name**: realtor-hq
   - **Database Password**: Generate a strong password (save it!)
   - **Region**: US East (or nearest to Northeast MA)
5. Wait for the project to spin up (~2 minutes)

## Step 2: Set Up the Database Schema

1. In Supabase, go to **SQL Editor**
2. Create a new query
3. Copy the entire contents of `supabase/migrations/001_initial.sql`
4. Paste into the query editor
5. Click "Run"
6. Verify all tables were created (should see a confirmation message)

## Step 3: Get Your Supabase Keys

1. Go to **Settings → API**
2. Copy:
   - `Project URL` → save as `NEXT_PUBLIC_SUPABASE_URL`
   - `Anon Key` (under "Project API keys") → save as `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `Service Role Key` → save as `SUPABASE_SERVICE_ROLE_KEY`

Keep these safe! ✔️

## Step 4: Get Your API Keys

### Follow Boss API Key
1. Log in to [Follow Boss](https://app.followupboss.com)
2. Go to **Admin → API**
3. Click "Generate New Key"
4. Copy the key → save as `FUB_API_KEY`

### Anthropic Claude API Key
1. Go to [console.anthropic.com](https://console.anthropic.com)
2. Click **API Keys** → "Create Key"
3. Give it a name (e.g., "Realtor HQ")
4. Copy the key → save as `ANTHROPIC_API_KEY`

Note: You'll be charged per token (~$0.25 per 1M tokens for Haiku). Eduardo's usage ~$3–5/month.

### Web Push VAPID Keys (Optional for now)

```bash
npx web-push generate-vapid-keys
```

Copy both keys. You can set up push notifications later.

## Step 5: Push to GitHub

1. Make sure you're in the project root:
   ```bash
   cd ~/OneDrive/Desktop/Realtor-Dashboard
   ```

2. Initialize git (if not already):
   ```bash
   git init
   git add .
   git commit -m "Initial commit: Realtor HQ v0.1.0"
   ```

3. Create a GitHub repo at [github.com/new](https://github.com/new)
   - Name: `realtor-hq`
   - Public or Private (your choice)
   - **Don't** initialize with README (we already have one)

4. Connect and push:
   ```bash
   git remote add origin https://github.com/eduardoinoa18/realtor-hq.git
   git branch -M main
   git push -u origin main
   ```

## Step 6: Create a Vercel Project

1. Go to [vercel.com](https://vercel.com)
2. Log in with GitHub
3. Click "New Project"
4. Select the `realtor-hq` repository
5. Keep the default settings:
   - Framework: **Next.js**
   - Root Directory: `./`
   - Node version: **18.x or 20.x**
6. Click "Deploy"
7. Wait for the build to complete (~3–5 minutes)

## Step 7: Add Environment Variables

While Vercel is building:

1. Go to your Vercel project → **Settings → Environment Variables**
2. Add all these variables:

```
NEXT_PUBLIC_SUPABASE_URL = [from Step 3]
NEXT_PUBLIC_SUPABASE_ANON_KEY = [from Step 3]
SUPABASE_SERVICE_ROLE_KEY = [from Step 3]
FUB_API_KEY = [from Step 4]
ANTHROPIC_API_KEY = [from Step 4]
```

For Web Push (optional):
```
NEXT_PUBLIC_VAPID_PUBLIC_KEY = [from web-push]
VAPID_PRIVATE_KEY = [from web-push]
VAPID_EMAIL = mailto:eduardoinoa18@gmail.com
```

3. Click "Save"

## Step 8: Redeploy with Environment Variables

1. Go to **Deployments** in Vercel
2. Click the three dots on the latest deployment
3. Select "Redeploy"
4. Click "Redeploy" again to confirm

The build should now have access to your environment variables.

## Step 9: Test the App

1. Your app is live at: `https://realtor-hq.vercel.app` (or your custom domain)
2. Go to `/login` and test the magic link authentication
3. You should receive an email with a login link
4. Click the link to log in
5. You should see the dashboard with the "Today" page

## Step 10: Install on Mobile

### iOS
1. Open the app URL in Safari
2. Tap **Share** → "Add to Home Screen"
3. Name it "Realtor HQ"
4. Tap "Add"
5. App installs!

### Android
1. Open the app URL in Chrome
2. Tap the three dots → "Install app"
3. Tap "Install"
4. App installs!

## Step 11 (Optional): Custom Domain

To use a custom domain (e.g., `hq.eduardoinoa.com`):

1. In Vercel, go to **Settings → Domains**
2. Add your domain
3. Follow Vercel's DNS setup instructions
4. After 24 hours, your app will be available at your custom URL

## Monitoring & Maintenance

### Logs
- Vercel shows all deployment logs
- Check **Deployments → [latest] → Logs**

### Error Tracking (Optional)
- Sign up for Sentry at [sentry.io](https://sentry.io)
- Add error tracking to `app/layout.tsx`

### Database Backups
- Supabase automatically backs up daily
- You can manually backup from **Database → Backups**

## Updates & Redeployments

Every time you push to `main`:
1. Vercel automatically rebuilds
2. New version goes live within 2–5 minutes
3. No downtime!

To make changes:
```bash
# Make your changes...
git add .
git commit -m "Update: [what changed]"
git push origin main
```

## Troubleshooting

### "FUB API not connecting"
- Check `FUB_API_KEY` is correct in Vercel env vars
- Go to Follow Boss → Admin → API → verify the key hasn't been rotated

### "Claude API error"
- Check `ANTHROPIC_API_KEY` is correct
- Make sure account has credits or is on a paid plan
- Check console for exact error message

### "Database not found"
- Verify `NEXT_PUBLIC_SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` are correct
- Try running the schema migration again from Supabase SQL Editor

### PWA not installing
- Make sure manifest.json is accessible at `yourdomain.com/manifest.json`
- Test in Chrome DevTools → Application → Manifest
- Make sure site is served over HTTPS (Vercel does this automatically)

## Cost Breakdown (Monthly)

| Service | Free Tier | Cost |
|---------|-----------|------|
| Supabase (PostgreSQL) | 500MB database, 50MB storage | Free |
| Vercel Hosting | 100GB bandwidth, unlimited deployments | Free |
| Anthropic Claude | Pay-per-use (~$0.25/1M tokens) | $0–5 |
| Follow Boss | (Eduardo already pays) | — |
| **Total** | — | **$0–5** |

---

**You're live! 🎉** 

Next steps:
1. Fill in your profile in Settings
2. Add your Follow Boss API key
3. Sync your first leads
4. Start using the Daily Workflow

Questions? Check the README.md or email Eduardo.
