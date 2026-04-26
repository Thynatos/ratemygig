# Production Deployment Guide

This guide walks you through deploying ratemygig from local development to production-ready application with real data.

---

## Step 1: Prerequisites

- [Node.js 18+](https://nodejs.org)
- [npm](https://npmjs.com) or [pnpm](https://pnpm.io)
- [Git](https://git-scm.com)
- A [Supabase](https://supabase.com) account (free tier works)

---

## Step 2: Create Supabase Project

1. Go to [supabase.com](https://supabase.com) and sign in
2. Click **New Project**
3. Choose an organization and name your project (e.g., `ratemygig-prod`)
4. Set a secure database password (save this somewhere safe)
5. Choose a region close to your users
6. Wait for the project to be created (~2 minutes)

**Copy these values from Project Settings > API:**
- `Project URL` (e.g., `https://xxxxxxxxxxxxxxxxxxxx.supabase.co`)
- `anon public` API key
- `service_role secret` API key (for data ingestion)

---

## Step 3: Run Database Migrations

In your Supabase project, go to the **SQL Editor** and run each migration file in order:

```
001_initial_schema.sql
002_rls_policies.sql
003_indexes.sql
004_aggregation_functions.sql
005_storage.sql
006_seed_mock_catalog.sql      ← Optional: demo data for testing
007_social_features.sql
008_setlists.sql
009_setlist_stats_rpc.sql
010_discovery_intelligence.sql
011_profile_lists.sql
012_review_photos_thumbnail.sql
```

> **Important:** Run them one at a time in order. Each file is idempotent (can be re-run safely).

---

## Step 4: Configure Storage Buckets

The migrations create storage policies, but you must enable the buckets:

1. In Supabase Dashboard, go to **Storage**
2. You should see `review-photos` and `avatar-photos` buckets
3. If they don't appear, run this in SQL Editor:

```sql
-- Create review-photos bucket
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('review-photos', 'review-photos', false, 10485760, ARRAY['image/jpeg', 'image/png', 'image/webp'])
ON CONFLICT (id) DO NOTHING;

-- Create avatar-photos bucket
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('avatar-photos', 'avatar-photos', true, 5242880, ARRAY['image/jpeg', 'image/png', 'image/webp'])
ON CONFLICT (id) DO NOTHING;
```

---

## Step 5: Configure Authentication

### Email (Magic Link)
1. Go to **Authentication > Providers > Email**
2. Enable **Enable Email provider**
3. Enable **Confirm email** (optional but recommended)
4. Enable **Secure email change**
5. Set **Site URL** to your production domain (e.g., `https://ratemygig.vercel.app`)
6. Add your production domain to **Redirect URLs**

### Google OAuth
1. Go to **Authentication > Providers > Google**
2. Enable it
3. Get Google OAuth credentials:
   - Go to [Google Cloud Console](https://console.cloud.google.com/)
   - Create a project → APIs & Services → Credentials → Create OAuth 2.0 Client ID
   - Authorized redirect URI: `https://your-project.supabase.co/auth/v1/callback`
4. Copy **Client ID** and **Client Secret** into Supabase

---

## Step 6: Configure Environment Variables

Create `apps/web/.env.local`:

```env
# Supabase Configuration
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key

# Events Provider
# Options: mock | ticketmaster | all
VITE_EVENTS_PROVIDER=mock

# Optional: For live Ticketmaster data
# VITE_TICKETMASTER_API_KEY=your-ticketmaster-key
```

For the **jobs workspace** (data ingestion), create `.env` in the project root:

```env
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
TICKETMASTER_API_KEY=your-ticketmaster-key
INGEST_COUNTRIES=US
INGEST_CLASSIFICATION=music
INGEST_DAYS_AHEAD=180
```

---

## Step 7: Seed with Real Data (Choose One)

### Option A: Mock Data (Quick Start)
Already included via `006_seed_mock_catalog.sql`. Good for testing UI.

### Option B: Ticketmaster Ingestion (Real Events)

**One-time ingestion:**

```bash
# Install jobs dependencies
cd packages/jobs && npm install

# Run ingestion
cd ../..
npm run jobs:ingest
```

This fetches real concert data from Ticketmaster and inserts it into your Supabase database.

**For ongoing sync:** Set up a cron job or GitHub Action that runs `npm run jobs:ingest` daily.

---

## Step 8: Build for Production

```bash
# Install dependencies
npm install

# Build the web app
cd apps/web && npm run build
```

Output will be in `apps/web/dist/`.

---

## Step 9: Deploy

### Option A: Vercel (Recommended)

1. Push your code to GitHub
2. Go to [vercel.com](https://vercel.com) and import the repo
3. Set framework preset to **Vite**
4. Set root directory to `apps/web`
5. Add environment variables in Vercel dashboard:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
   - `VITE_EVENTS_PROVIDER`
6. Deploy

### Option B: Netlify

1. Push to GitHub
2. Go to [netlify.com](https://netlify.com)
3. Import repo → build command: `npm run build` → publish dir: `dist`
4. Set base directory to `apps/web`
5. Add environment variables
6. Deploy

### Option C: Static Hosting (Any CDN)

After `npm run build`, upload the contents of `apps/web/dist/` to:
- AWS S3 + CloudFront
- Cloudflare Pages
- GitHub Pages
- Any static file host

---

## Step 10: Post-Deployment Checklist

- [ ] App loads at production URL
- [ ] Magic link login works (check spam folder)
- [ ] Google OAuth login works
- [ ] Events display on homepage
- [ ] Can mark event as attended
- [ ] Can write a review with rating
- [ ] Photo upload works
- [ ] Public review page loads (`/r/:reviewId`)
- [ ] CSV export works on My Gigs page
- [ ] Venue/artist rating pages load
- [ ] Mobile responsive

---

## Troubleshooting

### "No events found"
- Check `VITE_EVENTS_PROVIDER` env var
- If using `mock`, ensure `006_seed_mock_catalog.sql` was run
- If using `ticketmaster`, ensure `VITE_TICKETMASTER_API_KEY` is set and events were ingested

### "Login not working"
- Check Supabase Auth > URL Configuration
- Ensure Site URL and Redirect URLs include your production domain
- Check browser console for CORS errors

### "Photo upload fails"
- Check Storage > Policies in Supabase
- Ensure `review-photos` bucket exists
- Check browser console for 403/404 errors

### "Database errors"
- Ensure all migrations ran in order
- Check RLS policies aren't blocking reads
- Verify indexes exist for performance

---

## Architecture Summary

| Layer | Technology | Status |
|---|---|---|
| Frontend | Vite + React 19 + Tailwind | ✅ |
| Backend | Supabase (Postgres + Auth + Storage) | ✅ |
| Database | 12 migrations, full RLS | ✅ |
| Auth | Magic Link + Google OAuth | ✅ |
| Storage | Photos + Avatars | ✅ |
| Data | Mock seed + Ticketmaster ingestion | ✅ |
| Tests | 196 passing | ✅ |

**You're ready to go live! 🚀**
