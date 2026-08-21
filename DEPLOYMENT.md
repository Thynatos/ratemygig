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
013_notification_triggers.sql
014_friends_attendance.sql
015_user_year_stats.sql
016_schema_fixes.sql           ← Audit fixes: profiles FKs, RPC repairs, RLS status gates
017_indexes.sql                ← Search trigram indexes, redundant index cleanup
018_og_image_cache.sql         ← Public og-cache bucket for share-card renders
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
# Optional: comma-separated cities; when set, ingest is per city and INGEST_COUNTRIES is ignored
# INGEST_CITIES=New York,Los Angeles,Chicago
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

**For ongoing sync:** See the **Scheduled Ingest** section below — the repo ships a GitHub Actions cron workflow that runs `npm run jobs:ingest` daily.

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
- [ ] Share card renders for a public review URL (Edge Function `og-image` + Vercel crawler injection)
- [ ] CSV export works on My Gigs page
- [ ] Venue/artist rating pages load
- [ ] Mobile responsive

---

## Scheduled Ingest (GitHub Actions)

The repo includes [`.github/workflows/ingest.yml`](.github/workflows/ingest.yml), which runs
`npm run jobs:ingest` on a cron (`0 6 * * *` — 06:00 UTC daily) and on demand.

**Decision: GitHub Actions cron, not Supabase Edge Functions.** The jobs package is Node
(`tsx` + `node-cron` + `@supabase/supabase-js`); porting it to Deno Edge Functions is a rewrite
for zero functional gain, and GitHub Actions provides logs, secrets management, manual dispatch,
and run history for free. The `node-cron` self-host path (`npm run jobs:start`,
`packages/jobs/src/scheduler.ts`) remains untouched for anyone who prefers to run the scheduler
on their own server.

### Setup

In your GitHub repo, go to **Settings > Secrets and variables > Actions**:

**Secrets** (required — the job fails fast if any are missing):

| Secret | Value |
|---|---|
| `TICKETMASTER_API_KEY` | Ticketmaster Discovery API key |
| `SUPABASE_URL` | e.g. `https://xxxxxxxx.supabase.co` |
| `SUPABASE_SERVICE_ROLE_KEY` | `service_role` key (bypasses RLS for upserts) |

**Variables** (optional, under the **Variables** tab):

| Variable | Default | Notes |
|---|---|---|
| `INGEST_CITIES` | _(empty)_ | Comma-separated, e.g. `New York,Los Angeles,Chicago`. When set, ingest fetches per city and ignores `INGEST_COUNTRIES`. **Recommended** — see paging note below. |
| `INGEST_DAYS_AHEAD` | `180` | How far ahead to fetch events. |

### Running it manually

**Actions** tab → **Scheduled event ingest** → **Run workflow** (workflow_dispatch). Logs live in
the same place: open the run → `ingest` job → the `npm run jobs:ingest` step shows per-city/country
fetch progress and sync stats (events created/updated, venues, artists, errors).

Overlapping runs are prevented by a workflow concurrency group (`cancel-in-progress: false`), so a
slow run queues the next one rather than double-ingesting. Re-runs are safe regardless: events
upsert on `(provider, provider_event_id)` and notifications dedupe on `(user_id, type, link)`.

### Ticketmaster paging cap (why INGEST_CITIES exists)

Ticketmaster caps deep paging at **1000 items per query** (`size * page < 1000`; enforced by the
`maxPage` guard in `packages/jobs/src/ticketmaster/ticketmaster-client.ts`). A country-wide US
query with the default 180-day window returns far more than 1000 music events, so country mode
silently truncates. City-scoped queries stay well under the cap, so set `INGEST_CITIES` to the
metros you care about (each city is a separate paged query; same city name as on Ticketmaster).

---

## Environment Variables — Full Matrix

The same variable name can mean different things in different stores. This
matrix exists because `SUPABASE_ANON_KEY` is both a GitHub secret (CI tests)
and a Vercel variable (`api/og-inject`) — setting only the first is why share
cards rendered generic tags after Sprint 10 while every check looked green.

### Vercel project environment variables

| Variable | Consumer | Required | Failure mode when missing |
|---|---|---|---|
| `VITE_SUPABASE_URL` | Browser bundle | Yes | App falls back to placeholder URL; auth and all data features silently dead |
| `VITE_SUPABASE_ANON_KEY` | Browser bundle | Yes | Same as above |
| `VITE_EVENTS_PROVIDER` | Browser bundle | No | Defaults to `mock` (no real events) |
| `VITE_TICKETMASTER_API_KEY` | Browser bundle | No | Live TM search disabled |
| `VITE_SENTRY_DSN` | `shared/lib/monitoring.ts` | Recommended | Monitoring silently off — production errors invisible again |
| `VITE_SENTRY_ENVIRONMENT` | Sentry init | No | Defaults to `production`/`development` from build mode |
| `SUPABASE_URL` | `api/og-inject.ts` (server) | Yes* | Share cards degrade to bare document, no OG tags |
| `SUPABASE_ANON_KEY` | `api/og-inject.ts` (server) | Yes* | Same as above |
| `SENTRY_AUTH_TOKEN` | `@sentry/vite-plugin` at build time | Recommended | Sourcemaps not uploaded → stack traces stay minified in Sentry |
| `SENTRY_ORG` / `SENTRY_PROJECT` | `@sentry/vite-plugin` at build time | Recommended | Same as above |

\* Required for rich share cards; the site itself works without them.

> The `VITE_*` prefix embeds values into the shipped JS bundle. Never put the
> service role key behind a `VITE_` name or in any client-reachable store.

### GitHub Actions secrets

| Secret | Workflow | Required | Failure mode when missing |
|---|---|---|---|
| `TICKETMASTER_API_KEY` | ingest.yml | Yes | Job exits non-zero immediately; red run + auto-filed issue |
| `SUPABASE_URL` | ingest.yml | Yes | Same as above |
| `SUPABASE_SERVICE_ROLE_KEY` | ingest.yml | Yes | Same as above. **Never** add this to Vercel or `VITE_*` |
| `SUPABASE_URL` | ci.yml (live-schema job) | Yes | Contract tests fail against wrong/absent project |

### GitHub Actions variables

| Variable | Default | Notes |
|---|---|---|
| `INGEST_CITIES` | _(empty)_ | Empty = country mode, which truncates at Ticketmaster's 1000-item paging cap |
| `INGEST_DAYS_AHEAD` | `180` | Look-ahead window |

### Supabase Edge Function secrets

```bash
supabase secrets set SENTRY_DSN=...   # optional: og-image errors land in Sentry
```

Missing `SENTRY_DSN`: og-image failures are console-only.

### Local development

- `apps/web/.env.local` — the `VITE_*` variables
- `.env` (repo root) — jobs package: `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `TICKETMASTER_API_KEY`, `INGEST_*`

---

## Monitoring & Free-Tier Ceilings

### What watches production

- **Sentry (web)** — `@sentry/react`, initialised in `main.tsx`; no-ops unless
  `VITE_SENTRY_DSN` is set. Four sources feed it: both error boundaries,
  `logger.error(...)` in production, and `validateRpcResponse` failures (the
  function that hid a broken RPC for a whole sprint). Traces sampled at 10%.
- **Sourcemaps** — built as `hidden` and uploaded to Sentry by
  `@sentry/vite-plugin` during the Vercel build (needs `SENTRY_AUTH_TOKEN`,
  `SENTRY_ORG`, `SENTRY_PROJECT` as Vercel vars). Release = git SHA, shared
  with the runtime SDK so frames resolve against the exact deployed build.
- **Sentry (edge)** — `@sentry/deno` inside `og-image`; set `SENTRY_DSN` via
  `supabase secrets set`.
- **Uptime** — [`.github/workflows/uptime.yml`](.github/workflows/uptime.yml)
  curls `/` and the `og-image` endpoint every 30 minutes and auto-files a
  GitHub issue on failure. Doubles as the free-tier keep-alive (below).
- **Ingest failure alerting** — `ingest.yml` files an issue when the nightly
  run fails (the run's exit code now reflects sync errors).
- **Security headers** — CSP, `X-Frame-Options`, `Referrer-Policy`,
  `Permissions-Policy`, `X-Content-Type-Options` are set in
  `apps/web/vercel.json`. After changing the CSP: click through Discover, a
  review with photos, and geolocation search with the browser console open —
  a wrong CSP is a white screen, and curl alone cannot prove otherwise.

### Free-tier ceilings (Supabase) and what eats them

| Ceiling | Limit | What pushes against it |
|---|---|---|
| Database size | 500 MB | Nightly ingest growth (events/venues/artists) |
| Storage | 1 GB | Review photos + avatars + the public `og-cache` bucket |
| Edge function invocations | 500 k/mo | Crawler fetches of `og-image`; the Storage-bucket render cache keeps repeat requests off satori |
| Egress | 5 GB/mo | Image-heavy pages; thumbnails are served instead of originals where possible |
| **Project pausing** | **7 days idle** | Mitigated: `uptime.yml` hits the edge function twice hourly, resetting the idle timer |

If the project pauses, the first symptom is the uptime issue firing with
connection errors on both checks.

---

## Share Cards / OG Images

Pasting a `/r/:reviewId` link into social/chat apps shows a rich preview card
(rating, author, event name, 1200×630 image).

### Architecture

```
Browser  ───────────────▶ /r/:reviewId ─▶ SPA (no behavior change; usePageMeta sets client-side meta)
Crawler  ── user-agent ──▶ vercel.json UA-gated rewrite
                              └─▶ api/og-inject (Vercel Node function)
                                    ├─ PostgREST (anon key; status=published AND is_public=true)
                                    └─ serves a self-contained terminal HTML document
                                       with buildOgTags() injected (no file reads; no meta-refresh)
og:image ───────────────▶ Supabase Edge Function og-image (satori + resvg via @vercel/og)
                              ├─ service role (bypasses RLS → manual published/public filter)
                              ├─ rendered PNGs cached in the public og-cache Storage bucket
                              ├─ Inter 400/700 subsets base64-embedded in fonts.ts
                              └─ 1200×630 PNG · successful renders cached 24h,
                                 fallback cards 5min/1h CDN, genuine 5xx never cached
```

| Piece | Path | Notes |
|---|---|---|
| Pure tag builders | `apps/web/src/shared/lib/og.ts` | `buildOgTags` (HTML-attribute-escaped, ≤200-char description), `buildOgImageUrl` |
| Crawler UA detection | `apps/web/src/shared/lib/crawler.ts` | used by `api/og-inject.ts`; unit-tested in vitest |
| Client meta hook | `apps/web/src/shared/hooks/usePageMeta.ts` | title/description/canonical/og on review, event, artist, venue pages |
| Image renderer | `supabase/functions/og-image/` | Deno Edge Function, `?reviewId=` → PNG; branded fallback card for missing/private reviews |
| Crawler injection | `apps/web/api/og-inject.ts` | serves crawlers a self-contained terminal HTML document with injected OG tags |
| Static fallback | `apps/web/public/og-fallback.png` | 1200×630 branded image (<100 kB), also embedded in the function for 5xx/malformed/unknown ids |

### Deploy the Edge Function

```bash
supabase functions deploy og-image --project-ref lpfyzjfqyyrdknzgxoul
```

`verify_jwt = false` is set for `og-image` in `supabase/config.toml` (the
endpoint is intentionally public); the function itself filters
`status = 'published' AND is_public = true` because the service role client
bypasses RLS. Private/draft/missing review IDs get the branded fallback card —
no data leak. A missing `reviewId` parameter returns 400.

Verify:

```bash
curl -I "https://lpfyzjfqyyrdknzgxoul.supabase.co/functions/v1/og-image?reviewId=<published-review-id>"
# 200 · content-type: image/png · cache-control: public, max-age=86400, s-maxage=86400
```

### Vercel environment variables

Server-side (no `VITE_` prefix) — used by `api/og-inject.ts`:

| Variable | Value |
|---|---|
| `SUPABASE_URL` | e.g. `https://lpfyzjfqyyrdknzgxoul.supabase.co` |
| `SUPABASE_ANON_KEY` | anon key (works because published reviews are RLS-readable by anon) |

The existing client-side `VITE_SUPABASE_URL` is unchanged — the client og:image
base URL comes from it. `vercel.json` rewrites `/r/:reviewId` to
`/api/og-inject` only when the `user-agent` header matches the crawler regex,
so browsers never hit the rewrite ("no behavior change" acceptance).

### Netlify / static-host caveats

- **Netlify**: `_redirects` cannot inspect user agents, so the equivalent needs
  a Netlify Edge Function doing the same injection. Not implemented this
  sprint.
- **Static hosts (S3/CloudFront/GitHub Pages)**: no server-side injection is
  possible — crawlers see the generic `index.html` meta; only the client-side
  `usePageMeta` tags help. The Edge Function image URL is absolute and works
  from any host if tags are hand-authored.

### Fonts

Inter Regular/Bold subsets are base64-embedded in
`supabase/functions/og-image/fonts.ts` (generated from
`supabase/functions/og-image/assets/*.ttf`). Source: [rsms/inter v3.19](https://github.com/rsms/inter/releases/tag/v3.19)
static TTFs (SIL OFL), subset with fonttools to ASCII + Latin-1 + punctuation +
★/☆. Rendering uses `npm:@vercel/og`, which ships its own fallback font
(Geist) and wasm binaries — no font files are fetched at runtime.

### In-sprint decision record

- **Primary architecture (chosen):** per-review PNGs rendered by the Supabase
  Edge Function `og-image`. This also establishes the server-side function
  pattern Sprint 8 (setlist.fm import) needs. The static-fallback-only escape
  hatch was not needed.
- **Renderer:** `npm:@vercel/og` (satori + resvg-wasm under the hood) instead
  of raw `npm:satori` + `npm:@resvg/resvg-wasm`. With server-side CLI bundling
  (no Docker), function static assets are not readable at runtime (verified:
  `Deno.readFileSync` → path not found, `fetch(file://)` → blocked,
  `readDirSync` → blocklisted), while `@vercel/og`'s internal `?module` wasm
  imports and font fetch are supported by the edge runtime. This matches
  Supabase's official OG image example.
- **Fonts:** base64-embedded subsets instead of bundled asset files (same
  reason as above).
- **Review photos:** the `review-photos` bucket is private, so the function
  generates short-lived signed URLs (300 s) for card photos instead of public
  URLs.

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
| Database | 18 migrations, full RLS | ✅ |
| Auth | Magic Link + Google OAuth | ✅ |
| Storage | Photos + Avatars | ✅ |
| Data | Mock seed + Ticketmaster ingestion | ✅ |
| Tests | 310 passing | ✅ |

**You're ready to go live! 🚀**
