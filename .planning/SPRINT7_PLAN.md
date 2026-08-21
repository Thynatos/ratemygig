# Sprint 7 — Share cards / OG images — Implementation Plan

> **Status:** Planned · **Sprint:** 7 of 9 · **Size:** L · **Owner spec:** `.planning/SPRINTS.md`
> **Goal:** Pasting a `/r/:reviewId` link into social/chat shows a rich card.
> **Acceptance:** A social-card validator (opengraph.xyz) on a public review URL shows the generated card; browsers see no behavior change.

**Read first:** `docs/AGENT_CONTINUATION.md`, `.planning/codebase/CONVENTIONS.md`, `DEPLOYMENT.md` §9, `.planning/codebase/INTEGRATIONS.md`.

**Environment facts verified this session:** Supabase CLI 2.115 (logged in, project `lpfyzjfqyyrdknzgxoul`), Docker 29.4.3 present (function bundling works), Vercel config at `apps/web/vercel.json` (`framework: vite`, root `apps/web`), no Edge Functions exist yet, no `document.title`/meta management anywhere in the app.

---

## In-sprint decision (record in DEPLOYMENT.md when done)

- **Primary:** Supabase Edge Function `og-image` (satori + resvg-wasm) rendering per-review PNGs. Rationale: Docker + CLI are available; this also establishes the server-side function pattern Sprint 8 (setlist.fm import) needs.
- **Fallback trigger:** if `supabase functions deploy` proves painful (bundling, secrets, cold-start bugs), ship a build-time static branded fallback image instead and point `og:image` at it. **Do not carry both architectures into the next sprint.**

---

## Order of work

1. Pure/shared libs (testable in vitest): meta builders + crawler-UA detection
2. `usePageMeta` hook + apply to 4 detail pages
3. Edge Function `og-image` (Deno) + deploy + live verification
4. Vercel crawler injection (`api/og-inject.ts` + `vercel.json` rewrite)
5. Static fallback image + docs + verification + commit

---

## Step 1 — Shared pure helpers (vitest-testable)

### `apps/web/src/shared/lib/crawler.ts` (new)

```ts
export const CRAWLER_UA_PATTERN = /bot|crawl|spider|slurp|facebookexternalhit|Twitterbot|Slackbot|LinkedInBot|Discordbot|WhatsApp|TelegramBot|Pinterest|embed|preview/i
export function isCrawlerUserAgent(ua: string | null | undefined): boolean
```

Used by the Vercel function (imported from `../../src/shared/lib/crawler` — Vercel bundles it); kept in `src/` so vitest covers it.

### `apps/web/src/shared/lib/og.ts` (new)

Pure string builders, no React:

```ts
export interface OgReviewData {
  reviewId: string
  title: string            // "Review of {event name}" | "{review.title}"
  eventName: string
  artistName: string | null  // first lineup/artist name if available
  venueAndCity: string | null
  rating: number           // 1-5
  authorName: string
  photoUrl: string | null  // first public thumbnail
}

export function buildOgTags(data: OgReviewData): string
// returns meta string: og:title, og:description, og:image, og:url, og:type,
// twitter:card=summary_large_image, twitter:title, twitter:description, twitter:image
// Description template: "{authorName} rated {eventName} {rating}/5" (truncate 200 chars)

export function buildOgImageUrl(baseUrl: string, reviewId: string): string
// `${baseUrl}/functions/v1/og-image?reviewId=${encodeURIComponent(reviewId)}`
```

Escaping: single function `escapeHtmlAttribute` applied to all interpolated values (review data is user-generated; sanitizeText on client is not enough for HTML attributes).

### Tests — `apps/web/src/shared/lib/og.test.ts` + `crawler.test.ts`

- `isCrawlerUserAgent`: true for `Googlebot/2.1`, `facebookexternalhit`, `Twitterbot`, `WhatsApp/2.23`; false for Chrome/Safari/normal UA strings; false for null
- `buildOgTags`: contains og:title/og:image/twitter:card=summary_large_image; description ≤ 200 chars; values HTML-attribute-escaped (`"` → `&quot;`, `<` → `&lt;`); rating renders "5/5" style copy
- `buildOgImageUrl`: correct query encoding for UUIDs; trailing-slash-safe base

---

## Step 2 — `usePageMeta` hook

### `apps/web/src/shared/hooks/usePageMeta.ts` (new)

```ts
interface PageMeta {
  title: string
  description?: string
  canonicalPath?: string   // e.g. `/r/${reviewId}` — resolves against window.location.origin
  ogImage?: string         // absolute URL; omitting leaves og:image unset
}

export function usePageMeta(meta: PageMeta | null)
```

Behavior (all idempotent, effect-driven):
- `document.title = meta.title + ' | ratemygig'`
- upsert `<meta name="description">` (create if missing)
- upsert `<link rel="canonical" href="origin + canonicalPath">` (remove when absent)
- upsert `og:title`, `og:description`, `og:image` (property-keyed)
- `meta === null` → restore defaults (index.html baseline title/description, no canonical)
- Runs on every meta object identity change; no cleanup teardown needed beyond null-restore

### Apply to (first line of each component body, after hooks/data available — only when `data` exists):

| Page | title | description | canonical | ogImage |
|------|-------|-------------|-----------|---------|
| `features/reviews/pages/PublicReviewPage.tsx` | `Review of {event.name}` (fallback `{review.title}`) | `{author} rated {event.name} {rating}/5` | `/r/{id}` | `buildOgImageUrl(SUPABASE_URL, reviewId)` |
| `features/events/pages/EventDetailPage.tsx` | `{event.name}` | `{event.name} at {venue} — {city}, {date}` | `/events/{id}` | — |
| `features/artists/pages/ArtistDetailPage.tsx` | `{artist.name}` | `{artist.name} — ratings, upcoming events` | `/artists/{id}` | — |
| `features/venues/pages/VenueDetailPage.tsx` | `{venue.name}` | `{venue.name}, {city} — ratings, upcoming events` | `/venues/{id}` | — |

Read `VITE_SUPABASE_URL` via the existing env accessor in `shared/lib/env.ts` for the og image base (must not leak into bundle more than it already does — it is already client-exposed).

Call pattern: `usePageMeta(review ? {...} : null)` — pass `null` while loading so stale meta from a previous render doesn't persist on navigation (component unmount on route change means the null-restore only matters for the not-found state).

### Tests — `apps/web/src/shared/hooks/usePageMeta.test.tsx`

Render a probe component with `renderHook`/testing-library, assert with `document`:
1. sets `document.title` with suffix
2. creates `meta[name=description]` when absent; updates when present
3. sets canonical link; removes it when canonicalPath omitted
4. `null` restores baseline title/description and removes canonical
5. `og:image` upsert when provided, absent when not

---

## Step 3 — Edge Function `og-image` (first function in repo)

### Scaffold

`supabase functions new og-image` (creates `supabase/functions/og-image/index.ts`; the `supabase/` dir already exists via CLI link artifacts — commit only `supabase/functions/` + `supabase/config.toml`, **never** `supabase/.temp/`).

### `supabase/functions/og-image/index.ts`

Deno + ESM imports (import map already ships with Supabase CLI templates):
```ts
import { createClient } from 'npm:@supabase/supabase-js@2'
import satori from 'npm:satori@0.12'
import { Resvg } from 'npm:@resvg/resvg-wasm'
```

Flow:
1. Parse `reviewId` from `new URL(req.url).searchParams`; 400 if missing.
2. `createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)` (env-injected by platform) → fetch review by id with
   `select('id, rating, title, body, created_at, event:event_id(name, start_at, city, venue:venue_id(name)), profile:user_id(display_name, username, avatar_url), photos(review_id, storage_path, thumbnail_path)').eq('id', reviewId).maybeSingle()`.
3. **Public-only gate (RLS bypassed by service role — must filter manually):** `status === 'published' && is_public === true`, else render branded fallback card ("ratemygig — Concert Rating Platform").
4. First photo → public URL via `supabase.storage.from('review-photos').getPublicUrl(thumbnail_path ?? storage_path)`.
5. `satori(jsx, { width: 1200, height: 630, fonts: [Inter 400/700 .ttf fetched from jsDelivr or bundled] })` → JSX card: ratemygig brand chip, event name (clamped 2 lines), venue · city · date, big rating `N/5` with 5-star row, author line, photo strip (first image right-aligned ~500px when present, dark gradient overlay).
6. `Resvg.renderAsync(svg)` → PNG buffer.
7. Response: `image/png`, `Cache-Control: public, max-age=86400, s-maxage=86400`, `X-Content-Type-Options: nosniff`.
8. try/catch → 500 with fallback PNG (pre-rendered static asset inside the function dir).

Font strategy: **bundle a .ttf in `supabase/functions/og-image/assets/`** (download Inter from Google Fonts repo once) — avoids runtime font fetch flakiness; fall back to `sans-serif` (satori default) if the bundled font fails to load. Record which font file + source URL in DEPLOYMENT.md.

### Deploy & verify

```bash
supabase functions deploy og-image --project-ref lpfyzjfqyyrdknzgxoul
```
- Note: first deploy may need `--no-verify-jwt` decision — **keep JWT verification ON** (function is public by design but verifying JWT only when present is the pattern; actually set `verify_jwt = false` in `supabase/config.toml` for `og-image` since it is intentionally public, and rely on the manual published/public filter).
- Verify live: `curl -I https://lpfyzjfqyyrdknzgxoul.supabase.co/functions/v1/og-image?reviewId=<REAL_PUBLISHED_REVIEW>` → 200, `image/png`, cache headers; open URL in a browser.

---

## Step 4 — Crawler injection (Vercel)

### `apps/web/api/og-inject.ts` (new, Vercel serverless function)

```ts
import type { VercelRequest, VercelResponse } from '@vercel/node'
```

Flow (only reached for crawler UAs — see rewrite below):
1. `reviewId` from `req.query.reviewId`.
2. Fetch review meta from PostgREST directly using `process.env.SUPABASE_URL` + `process.env.SUPABASE_ANON_KEY` (server env vars — anon key works because published reviews are RLS-readable by anon):
   `GET {SUPABASE_URL}/rest/v1/reviews?id=eq.{id}&status=eq.published&is_public=eq.true&select=id,title,rating,event:event_id(name,city),profile:user_id(display_name,username)`
3. Fetch the SPA shell: read `apps/web/index.html`... at runtime the function must read the built `dist/index.html` (Vercel serves functions with the project root = apps/web; read `../../dist/index.html`? — unreliable). **Safer:** inject into a *statically served* HTML: set the rewrite destination to a dedicated `apps/web/public/og-shell.html` — a copy of index.html structure whose `</head>` gets replaced. Copy is kept in sync by a tiny build step? — **Decision:** generate `og-shell.html` at build time via a `vite-plugin`-free script in `package.json` postbuild: `node scripts/copy-og-shell.mjs` copies `dist/index.html` → `dist/og-shell.html`; the function reads `dist/og-shell.html` (same working dir in Vercel). Document that `og-shell.html` is build output (gitignored).
4. Inject `<meta>` block built by `buildOgTags(...)` + `buildOgImageUrl` (og:image → deployed function URL) before `</head>`, return text/html 200.

### `apps/web/vercel.json` (extend)

```jsonc
{
  "framework": "vite",
  "installCommand": "cd ../.. && npm install",
  "buildCommand": "npm run build",
  "outputDirectory": "dist",
  "rewrites": [
    {
      "source": "/r/:reviewId",
      "has": [{ "type": "header", "key": "user-agent", "value": "(?i).*(bot|crawl|spider|facebookexternalhit|Twitterbot|Slackbot|LinkedInBot|Discordbot|WhatsApp|TelegramBot|Pinterest|embed|preview).*" }],
      "destination": "/api/og-inject?reviewId=:reviewId"
    }
  ]
}
```

- Browsers (no matching UA header) never hit the rewrite → "no behavior change" acceptance.
- **Netlify equivalent** documented in DEPLOYMENT.md (`_redirects`/edge function note — not implemented this sprint).
- Static hosts (S3/CF Pages): get `usePageMeta` only; documented limitation in DEPLOYMENT.md.

### Env vars to add on Vercel (document in DEPLOYMENT.md)
- Server-side (non-`VITE_`): `SUPABASE_URL`, `SUPABASE_ANON_KEY` — used by `api/og-inject.ts`.
- Client-side `VITE_SUPABASE_URL` already exists; og:image base comes from it.

---

## Step 5 — Static fallback image

- `apps/web/public/og-fallback.png` (1200×630 branded "ratemygig — Concert Rating Platform", generated once — keep it small, ~<100 kB).
- Used by the Edge Function for missing/private reviews **and** as the `og:image` value if the function is ever unreachable (documented switch in one place: `buildOgImageUrl` stays the single source of truth).

---

## Tests / verification matrix

| Layer | Test | Where |
|-------|------|-------|
| crawler UA regex | unit | `src/shared/lib/crawler.test.ts` |
| og tag builder + escaping + truncation | unit | `src/shared/lib/og.test.ts` |
| usePageMeta behavior | hook test | `src/shared/hooks/usePageMeta.test.tsx` |
| Edge function | manual | curl -I + browser + opengraph.xyz (acceptance) |
| Vercel function | manual (Vercel-only) | opengraph.xyz against deployed preview |
| axe regression | existing suite | untouched pages get `checkA11y` only if their tests exist |

**Verification commands (repo root):** `npm run build` · `npm run test` · `npm run lint` · `supabase functions deploy og-image --project-ref lpfyzjfqyyrdknzgxoul`.

---

## Docs & ship

1. **DEPLOYMENT.md** — new "Share cards / OG images" section: architecture diagram (browser → SPA; crawler → rewrite → api function → injected shell; og:image → Edge Function), Vercel env vars, Netlify/static-host caveats, function deploy command, font source, the in-sprint decision record.
2. **CONCERNS.md** — "Sprint 7" notes: crawler-UA list is best-effort (new bots missed); `og-shell.html` is generated build output (sync risk if index.html changes — mitigated by postbuild copy step); public Edge Function relies on manual published/public filter (service-role bypasses RLS); cold-start latency ~200-500 ms acceptable for crawlers.
3. **SPRINTS.md** — tick `[x]` row 7. **STATE.md** — status → Sprint 8 next, completed bullets, activity date. **AGENT_CONTINUATION.md** — last-updated, one-liner, "Completed in repo" row.
4. **README.md** — roadmap line: `- [x] Share cards / OG images — per-review social previews via Supabase Edge Function + Vercel crawler rewrite`.
5. `.gitignore` — add `apps/web/dist/og-shell.html` if not covered by `dist/` ignore; **never commit `supabase/.temp/`** (verify gitignore).
6. Graphify rebuild + commit: `feat: Sprint 7 — Share cards: usePageMeta, og-image Edge Function, Vercel crawler OG injection`.

---

## Acceptance checklist (SPRINTS.md)

- [ ] opengraph.xyz (or similar) on a deployed public `/r/:reviewId` URL shows review title, author/rating description, and a 1200×630 image
- [ ] Browsers hitting `/r/:reviewId` see no behavior change (rewrite only matches crawler UAs)
- [ ] `usePageMeta` live on review/event/artist/venue detail pages (title + description + canonical)
- [ ] Private/draft review IDs return the branded fallback card (no data leak through service role)
- [ ] 0 lint errors/warnings; build clean; new unit tests pass
