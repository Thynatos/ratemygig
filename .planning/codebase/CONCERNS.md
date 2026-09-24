# Concerns

## Security

### ~~XSS / Review Body Sanitization~~ — FIXED
- **Resolved**: Added `dompurify` + `sanitizeText()` utility at `apps/web/src/shared/lib/sanitize.ts`
- Applied at write-side (`reviews.ts` create/update mutations) and read-side (all 3 pages rendering review body/title)
- Tests: 11 new tests in `sanitize.test.ts`

### ~~No Rate Limiting~~ — FIXED
- **Resolved**: Added client-side rate limiting via `createRateLimiter()` in `apps/web/src/shared/lib/throttle.ts`
- `useCreateReview`: 5s throttle
- `useUploadReviewPhotos`: 3s throttle
- `useToggleAttendance`: 2s throttle
- `useCreateSetlist`: 5s throttle
- `useImportSetlist`: 3s throttle (Sprint 8; one setlist.fm quota is shared by every user)
- **Remaining risk**: Client-side only; a determined user can bypass. Server-side rate limiting via Supabase Edge Functions would be more robust.

### API Key Exposure
- **Risk**: `VITE_TICKETMASTER_API_KEY` is embedded in the client bundle
- **Location**: `apps/web/src/shared/lib/env.ts`, `ticketmaster-browser-provider.ts`
- **Mitigation**: Ticketmaster API has its own rate limits, but a proxy through Supabase Edge Functions would be safer
- **Pattern now exists (Sprint 8)**: `supabase/functions/setlist-import` keeps the setlist.fm key in Edge Function secrets, verifies the caller's session in code, and is unit-tested from vitest through injected dependencies. The deferred TM proxy can copy it.

### RLS Gaps
- **Concern**: Review photo access depends on parent review's `is_public` flag — this requires careful RLS policy (defined in `002_rls_policies.sql`) but should be verified against actual Supabase behavior
- **Concern**: Browse-time upsert (writing events from client) is blocked by RLS for anon users — this is intentional but means the app depends on `packages/jobs` for data ingestion

## Data Integrity

### Mock Seed Data Consistency
- **Concern**: `mock-events.json` and `006_seed_mock_catalog.sql` must stay UUID-aligned. Any changes to one require updating the other.
- **Location**: `packages/db/seed/mock-events.json` + `packages/db/migrations/006_seed_mock_catalog.sql`

### Provider Filter Scoping
- **Concern**: When `VITE_EVENTS_PROVIDER=ticketmaster`, the app will return empty results if no TM-linked data exists in the database and no API key is set. The `DiscoverPage` shows an empty-state banner, but this could confuse developers.
- **Location**: `apps/web/src/features/events/pages/DiscoverPage.tsx`, `shared/lib/provider-policy.ts`

## Performance

### ~~Missing Pagination on Venues/Artists~~ — FIXED
- **Resolved**: Added offset pagination with "Load More" button to VenuesPage and ArtistsPage
- API now returns `{ data, hasMore }` from `resolveVenues` and `resolveArtists`
- Default page size: 24

### Image Thumbnails
- **Concern**: Full-size images are served from Supabase Storage with no thumbnail generation pipeline
- **Location**: Photo upload in `apps/web/src/features/reviews/components/PhotoUploader.tsx`

### No Caching Strategy for Ticketmaster Browser Calls
- **Concern**: Each Ticketmaster browser API call hits the external API directly with no client-side caching beyond React Query's 2-minute stale time
- **Location**: `ticketmaster-browser-provider.ts`

## Architecture

### No Custom Backend API Layer
- **Concern**: All data flows directly from React → Supabase client. This works but makes it harder to add server-side business logic, rate limiting, or data transformation in the future.
- **Mitigation**: RPC functions in PostgreSQL serve as the server-side layer for aggregations

### ~~Unused Zustand Dependency~~ — FIXED
- **Resolved**: Removed `zustand` from `apps/web/package.json` — was declared but never imported anywhere in the codebase.

## Developer Experience

### Vite Dynamic + Static Import Warning
- **Concern**: Dynamic import of `ticketmaster-browser-provider.ts` alongside static import of `mock-catalog.ts` causes Vite warnings
- **Location**: `apps/web/src/features/events/providers/`

### Supabase Configuration Required
- **Concern**: App requires real Supabase credentials to function beyond mock mode. No local Supabase Docker setup documented in README.
- **Mitigation**: Mock provider allows development without Supabase, but features like auth and reviews are non-functional

### ~~Missing E2E Test Coverage~~ — IMPROVED
- **Resolved**: Added E2E specs for login, venue, artist, and review flows (4 new spec files)
- **Remaining**: E2E tests still require running Supabase; no mock server strategy for CI

### Bundle Size
- **Concern**: Main JS chunk is 640 KB (measured 2026-07-21; the 597 KB figure previously recorded here was stale — it was already 638.5 KB before Sprint 3). Still above 500 KB warning threshold.
- **Mitigation**: 15 routes now lazy-loaded via `React.lazy()`. Further splitting possible with `manualChunks` in Vite config (Sprint 5).
- **Status (Sprint 5, 2026-08-21)**: `manualChunks` shipped — `index-*.js` now **404.02 kB** (gzip 121.91 kB), under the 500 kB warning threshold. Vendor chunks: `react-vendor` 32.87 kB / gzip 11.92, `query-vendor` 35.38 kB / gzip 10.58, `supabase-vendor` 168.74 kB / gzip 44.00. All long-cached (content-hashed) and loaded in parallel with the entry chunk.
- **Location**: `apps/web/vite.config.ts`, `apps/web/src/app/App.tsx`

### Feed Pagination Architecture
- **Concern**: Feed uses client-side merge of 4 data sources with `Promise.allSettled` for error isolation. Not true server-side pagination — each sub-query has its own limit but "Load More" increments page offset on all sources simultaneously.
- **Mitigation**: Current approach is correct for initial implementation. True infinite-scroll cursor-based pagination would require a Supabase RPC or Edge Function.
- **Location**: `apps/web/src/features/feed/api/feed.ts`

### Phase A — Social Proof (COMPLETE)

### Phase B — Setlist Archive (COMPLETE)

#### B1. Setlist Data Model — DONE
- `songs` table (id, name, artist_id FK nullable, created_at) with UNIQUE(name, artist_id)
- `setlists` table (id, event_id FK, user_id, source: 'manual' | 'verified', notes, created_at, updated_at) with UNIQUE(event_id, user_id)
- `setlist_songs` table (id, setlist_id FK, song_id FK, position, is_encore, is_debut, notes, created_at) with UNIQUE(setlist_id, song_id, position)
- Migration: `008_setlists.sql`
- RLS: public read on all, owner write on setlists/setlist_songs, authenticated insert on songs
- Domain types: `Song`, `Setlist`, `SetlistSong`, `SetlistWithSongs` in `@core/types`
- Query hooks: `useEventSetlists`, `useSetlist`, `useMySetlists`, `useCreateSetlist` (5s rate-limited), `useUpdateSetlist`, `useDeleteSetlist`, `useAddSong`, `useRemoveSong`, `useReorderSongs`
- Song hooks: `useSongSearch`, `useCreateSong`
- Stats hooks: `useArtistSongStats`, `useArtistSetlistStats`, `useSongStats`
- RPC functions: `get_artist_song_stats`, `get_artist_setlist_stats`, `get_song_stats` in `009_setlist_stats_rpc.sql`

#### B2. Setlist Editor — DONE
- `SetlistViewer` component with position numbers, encore section, debut badges, owner edit/delete
- `SetlistCard` compact view with first 3-4 songs preview
- `SetlistEditor` with song search autocomplete, reorder buttons, encore/debut toggles
- `SetlistPage` at `/events/:eventId/setlist`
- Setlists section on `EventDetailPage`
- Lazy-loaded routes in App.tsx

#### B3. Setlist Statistics — DONE
- `SongStatsList` table component (most-played songs per artist)
- `ArtistSetlistSummary` card (setlist count, avg length, unique songs)
- `SongPage` at `/songs/:songId`
- Song Statistics section on `ArtistDetailPage`

### Phase C — Discovery Intelligence (Songkick-like personalization)

#### C1. Personalized Discover
- "Recommended for You" section on DiscoverPage based on: followed artists/venues, attendance history, review ratings
- "Friends Going" badge on event cards where followed users have attendance
- Supabase RPC or Edge Function for personalization queries

#### C2. Geolocation
- Auto-detect user city via browser Geolocation API
- "Near You" event filtering with lat/lng radius search
- Store preferred location in profiles table

#### C3. Notification System
- Supabase Edge Functions for: new events from tracked artists, new reviews from followed users, friend activity
- In-app notification center (`/notifications`)
- Push notification opt-in (Web Push API)

#### C4. Calendar Integration
- Export attendance to iCal/Google Calendar
- "Add to Calendar" button on event cards and detail page

### Phase D — Profile & Lists (Letterboxd diary richness)

#### D1. Profile Enrichment
- Avatar upload (Supabase Storage, new bucket)
- Favorite genres/artists selection
- Social links (Twitter, Instagram, website)
- Gig stats summary (X concerts attended, Y reviews written, Z cities)
- Location/city preference

#### D2. Custom Lists/Collections
- New `lists` table (id, user_id, name, description, is_public, created_at)
- New `list_items` table (list_id, event_id, notes, position)
- List pages: `/u/:username/lists/:listId`
- Pre-made list templates: "Best Shows of 2025", "Bucket List"

#### D3. Review Enhancements
- Draft reviews (save without publishing)
- Review comments/discussion thread
- Seat/section info in reviews (optional field)
- Review reactions display (from Phase A4)

### Phase D — Profile & Lists (COMPLETE)

#### D1. Profile Enrichment — DONE
- `avatar-photos` storage bucket (public, 5MB, JPEG/PNG/WebP) with RLS
- `AvatarUpload` component with client-side resize to 256×256, remove avatar
- `SocialLinksForm` via `useUpdateProfile` React Query mutation with cache invalidation
- `GigStatsCard` showing reviews/events/followers/following counts
- `ProfilePage` enhanced with avatar upload, stats card, social links form
- `PublicProfilePage` enhanced with social links display, GigStatsCard, reviews/lists tabs

#### D2. Custom Lists/Collections — DONE
- `lists` table (id, user_id, name, description, is_public) with RLS
- `list_items` table (id, list_id, event_id, notes, position) with RLS + UNIQUE(list_id, event_id)
- `ListPage` at `/lists/:listId` with ordered event list, owner delete
- `ListCard` compact preview component
- `CreateListModal` with name, description, public/private toggle (5s rate-limited)
- `AddToListButton` dropdown on EventDetailPage showing user's lists + "New list" option

#### D3. Review Enhancements — DONE
- `reviews.status` column (TEXT, 'draft' | 'published') added via migration
- Draft reviews: `useDrafts`, `useSaveDraft`, `usePublishDraft` hooks
- `DraftReviewsSection` on MyGigsPage with edit/publish/delete actions
- `comments` table (id, review_id, user_id, body) with RLS
- `CommentSection` + `CommentItem` on PublicReviewPage (3s rate-limited)
- Public review queries filter by `status = 'published'` to prevent draft leak
- `Review` type updated with `status: ReviewStatus` field
- `profiles` extended with website_url, twitter_handle, instagram_handle columns

## Sprint 1 — Notification Triggers (Notes & Tradeoffs)

### Dedupe collapses repeat activity on the same review
- The `idx_notifications_dedupe` unique index on `notifications(user_id, type, link)` means a review owner gets **one** `new_comment` and **one** `review_reaction` notification per review, ever — later comments/reactions on the same review do not re-notify (this is per the Sprint 1 spec; comment/reaction links are `/r/<review id>`).
- Acceptable as noise reduction for v1; revisit with per-actor links or grouped copy ("X and 3 others") if it feels lossy.

### Artist fan-out lives on event_artists, not events
- `packages/jobs` `SyncService.syncEvents()` inserts the `events` row first and links `event_artists` afterwards, so an `AFTER INSERT ON events` trigger can never see artist links (FK guarantees they can't exist yet).
- `013_notification_triggers.sql` therefore fires `artist_event` notifications from `trg_notify_on_event_artist` (AFTER INSERT ON `event_artists`); the events trigger handles `venue_event` only (venue_id is on the events row). Dedupe protects any writer that links in a different order.

### useUpdatePreferences is now a partial upsert
- The mutation builds its upsert payload from provided keys only. Previously it always sent all three location fields with `?? null`, so saving a city silently cleared `preferred_lat`/`preferred_lng`; now omitted fields are preserved. Required so the Sprint 1 notification toggles don't wipe location prefs (and vice versa).

## Sprint 2 — Scheduled Ingest (Notes & Tradeoffs)

### Ticketmaster deep-paging cap truncates country-mode ingest
- `TicketmasterClient.searchEventsAll()` stops at 1000 items per query (`maxPage` guard, TM API limit). Country-wide US ingest with the default 180-day window exceeds this, so country mode **silently truncates** — no error is logged when the cap is hit.
- Mitigation shipped in Sprint 2: `INGEST_CITIES` (comma-separated) switches `fetchAllEvents` to per-city queries, which stay under the cap. Very large metros with long windows could still hit it; reduce `INGEST_DAYS_AHEAD` or split cities further if so.

### GitHub Actions scheduled-workflow caveats
- Scheduled runs can be delayed during periods of high GitHub Actions load — ingest is not guaranteed to start exactly at 06:00 UTC. Acceptable for daily sync.
- On public repos, GitHub disables scheduled workflows after 60 days of repository inactivity; re-enable from the Actions tab if ingest stops after a quiet period.

### First ingest run after enabling notifications causes a fan-out burst
- Expected behavior, not a bug: the first cron (or local) ingest after migration `013` is applied fires `artist_event`/`venue_event` notifications for every newly inserted future event matching existing follows. The `(user_id, type, link)` dedupe index keeps re-ingests quiet.

## Sprint 3 — Friends Going + Calendar Export (Notes & Tradeoffs)

### get_friends_attendance ignores its p_user_id parameter (deliberate spec deviation)
- The RPC signature keeps `p_user_id UUID` per the Sprint 3 spec, but the function body filters `user_follows` by `follower_id = auth.uid()` only. Because the function is SECURITY DEFINER (required to read friends' attendance past the owner-only RLS policy), honoring p_user_id would let any caller enumerate any user's social graph. Documented in the migration header comment; the client always passes the caller's own id.

### Friends' profile display fields bypass is_profile_public
- `get_friends_attendance` joins `profiles` under SECURITY DEFINER, so a followed user's `display_name`/`avatar_url` is returned even when their profile is private. Deliberate: showing names/avatars of people you follow is the point of the badge. Revisit (e.g. filter `is_profile_public` in the RPC) if private-profile users object to being surfaced to their followers.

### MyGigsPage always fetches the unfiltered gigs list
- The Export calendar button needs ALL planned+attended events, so the page now calls `useMyGigs()` (no status) alongside the tab-filtered call. On the 'all' tab React Query dedupes (same `['my-gigs', undefined]` key); on the tracked-artists/venues tabs this adds one attendance fetch that wasn't previously made. Acceptable cost for correct export; could be made lazy if it ever matters.

## Sprint 4 — UX Correctness Pack (Notes & Tradeoffs)

### The "missing rate limiter" concern was stale
- The old Known Issues entry claimed `useAddEventToList` had no rate limiter. In reality it already shared `listMutationLimiter` (5s) with update/delete/reorder — the real problem was the *opposite*: a 5s shared window made rapid add/remove of different events feel broken.
- Sprint 4 gave `useAddEventToList`/`useRemoveEventFromList` their own `listItemLimiter` (`RATE_LIMITS.LIST_ITEM = 2000`). Create/update/delete/reorder stay on the existing 5s limiters. Still client-side only (see "No Rate Limiting" remaining risk).

### Optimistic helpers are pure exported functions (no mutation-mock infra exists)
- There is no supabase-mocking pattern for mutations anywhere in the test suite (`follows.test.ts` is pure key-factory tests; `layout-auth.test.tsx` mocks `supabase.auth` only). Rather than invent one, the optimistic cache transforms were extracted as pure exported functions (`applyCommentAdded`/`applyCommentRemoved` in comments.ts; `applyEventListToggle`/`applyListItemAdded`/`applyListItemRemoved`/`applyListItemCountDelta` in lists.ts) following the Sprint 3 `groupFriendsByEvent` precedent. `onMutate` handlers are thin wrappers: cancel → snapshot → `setQueryData` via helper; `onError` restores; `onSettled` (not `onSuccess`) invalidates so caches resync after rollback too.
- Optimistic comment carries `profile: null` (CommentItem falls back to 'Anonymous'); optimistic list item carries `event: null` (ListPage falls back to 'Unknown Event'). Both use `generateId()` temp ids and are replaced by server rows on the `onSettled` invalidation.

### Fixing the 2 react-hooks warnings unmasked a compiler error
- The `watch()` calls in ProfilePage/WriteReviewPage caused React Compiler to skip compiling those components, which also hid a real `react-hooks/set-state-in-effect` error in WriteReviewPage (photo sync effect). After switching to `useWatch({ control, name })`, the effect was rewritten as React's documented render-phase state adjustment (prev-deps tracking) — same sync semantics, no eslint-disable anywhere.

## Sprint 5 — Performance & CI Hardening (Notes & Tradeoffs)

### axe color-contrast disabled in jsdom
- jsdom has no layout/color computation, so axe's `color-contrast` rule walks every text node calling `getContext` on canvases, throwing "Not implemented: HTMLCanvasElement.prototype.getContext" stderr noise (and can never produce meaningful results anyway).
- `apps/web/src/test/axe.ts` exports `checkA11y()` — a thin wrapper over `vitest-axe`'s `axe()` with `color-contrast` disabled by default (per-call rules still win via options spread). All component a11y assertions go through it.
- Contrast is still exercised manually/e2e; nothing in the current axe suite depends on computed styles.

### CI runs lint/test/build only — E2E stays local
- `ci.yml` intentionally skips Playwright: the suite needs a live Supabase instance and no mock-server strategy exists (SPRINTS.md "Deferred / rejected"). All three CI steps run without secrets — `env.ts` falls back to placeholder Supabase values when `VITE_*` vars are unset. Commented in the workflow file.

## Sprint 7 — Share Cards / OG Images (Notes & Tradeoffs)

### The crawler UA list is best-effort
- `CRAWLER_UA_PATTERN` (and the parallel regex in `vercel.json`) matches the major crawlers (Googlebot, facebookexternalhit, Twitterbot, WhatsApp, Slack, LinkedIn, Discord, Telegram, Pinterest, embed/preview probes). New or obscure bots that don't match get the plain SPA shell — no rich card, but no breakage either. Revisit the list when a specific validator shows a blank card.
- The two lists (TS + vercel.json) must stay in sync manually; the Vercel `has` value cannot import from `src/`.

### og-shell.html is generated build output
- `dist/og-shell.html` is created by the `postbuild` step (`scripts/copy-og-shell.mjs`) copying `dist/index.html`. If `index.html` ever changes structure, the copy tracks it automatically (it is regenerated on every build) — the only drift risk is a stale `og-shell.html` when someone serves `dist/` from a build that predates the script. `dist/` is gitignored, so CI/deploy builds always regenerate it.

### Public Edge Function relies on a manual visibility filter
- `og-image` runs with the service role key (`verify_jwt = false` in `supabase/config.toml`), which bypasses RLS. The function therefore re-checks `status = 'published' && is_public = true` itself before rendering any review data; everything else gets the branded fallback card. Any future change to review visibility semantics must be mirrored in this filter (and in `api/og-inject.ts`, which uses the anon key + explicit PostgREST filters).

### Cold-start latency
- First request to `og-image` after idle pays Deno cold start + wasm init (~200–500 ms). Acceptable for crawlers; the `Cache-Control: public, max-age=86400, s-maxage=86400` response headers mean each review image is fetched at most once per day per CDN edge.

### Renderer deviation from the sprint plan (recorded in DEPLOYMENT.md)
- The plan specified raw `npm:satori` + `npm:@resvg/resvg-wasm`; the shipped function uses `npm:@vercel/og` (the same stack, bundled) because server-side CLI bundling does not expose function static assets to the runtime (verified empirically — see DEPLOYMENT.md "In-sprint decision record"). Inter subsets are base64-embedded in `fonts.ts` instead of read from `assets/`.

### ~~Pre-existing bugs found during Sprint 7 e2e verification~~ — FIXED (Sprint 10)

#### ~~ArtistDetailPage crashes whenever the venues query succeeds~~ — FIXED
- **Resolved (Sprint 10 / audit A4)**: `ArtistDetailPage` now destructures `venuesResult?.data ?? []`. The class of bug is gated by `tsc -b --noEmit` in `npm run build` and CI.

#### ~~reviews → profiles PostgREST embed fails (PGRST200)~~ — FIXED
- **Resolved (Sprint 10 / audit A1)**: migration `016_schema_fixes.sql` adds FKs to `public.profiles` from `reviews`, `comments`, `lists`, `setlists`, and both `user_follows` columns. `user_follows` embeds now hint the new constraint names (`user_follows_follower_profile_fkey` / `user_follows_following_profile_fkey`). All nine embed sites are covered by the `live-schema` CI job.

## Sprint 10 — Make it work on a real database (Notes & Tradeoffs)

### Production had NO SPA fallback — every deep link 404'd (found during the Sprint 10 merge)
- Verified against `https://ratemygig-web.vercel.app` on 2026-08-21 while running the G3 checklist: `/` returned 200 but `/venues`, `/artists`, `/events/:id` and `/r/:id` all returned a **platform** 404 (`X-Vercel-Error: NOT_FOUND`, `Server: Vercel`, plain-text body — not the app's NotFoundPage, which would be a 200 SPA shell). Cause: `apps/web/vercel.json` declared `framework: "vite"` but no catch-all rewrite, and Vercel's Vite preset does not add one (Vite can be an MPA).
- This had nothing to do with Sprint 10, but it would have made Sprint 7's share cards look broken on their first production deploy: the UA-gated `/r/:reviewId` rewrite serves crawlers correctly, so a Slack/Twitter preview renders — while a human clicking that same link fell through to the filesystem and got the 404. Fixed by appending `{"source": "/(.*)", "destination": "/index.html"}` **after** the crawler rewrite (order matters; Vercel evaluates rewrites top-down).
- Safe against the `api/og-inject` function and static assets because Vercel checks redirects → headers → **filesystem** → rewrites, so anything that exists on disk or as a function is matched before the catch-all is considered.
- **G3 remains partly unverified:** Vercel preview deployments on this account are SSO-protected (every request, crawler UA included, 302s to `vercel.com/sso-api`), so the crawler rewrite cannot be exercised on a preview. It can only be checked on the production alias after a merge — run the four-step G3 checklist there.

### user_follows keeps TWO FK targets per column — embed hints are mandatory
- After 016, `follower_id`/`following_id` each have FKs to both `auth.users` and `public.profiles`. PostgREST only embeds through the `profiles` ones, but the table now has two relationships to `profiles`, so `useFollowers`/`useFollowing` must keep disambiguating hints — and those hints name the **new** constraints (`user_follows_follower_profile_fkey` / `user_follows_following_profile_fkey`), because the old `*_id_fkey` names belong to the `auth.users` constraints.

### get_artist_setlist_stats returns zero rows for artists with no setlist songs
- The 016 redefinition adds a `HAVING` clause so an artist with no setlists yields an empty result set instead of one all-NULL row. This matches the client (`useArtistSetlistStats` returns `null` on empty) and keeps `artistSetlistStatsSchema` non-nullable. Without it, fixing the RPC's 42703 would have traded a 400 for a Zod validation failure on every artist without setlists.

### Query-cache clearing is gated on identity change, not on every auth event
- `AuthProvider` clears the React Query cache in `signOut` and on `onAuthStateChange` — but only when `shouldClearQueryCache()` (pure, unit-tested in `cache-policy.test.ts`) says so: `SIGNED_OUT`, or a previous user id that differs from the next. `TOKEN_REFRESHED` (~hourly) and `INITIAL_SESSION` never wipe the cache. User-scoped query keys (`my-gigs`, `user-review`, drafts, feed timeline, recommended, followed artists/venues, user-follow `isFollowing`) additionally carry the user id as defense in depth.

### The live-schema job needs repo secrets and skips forks
- `.github/workflows/ci.yml` `live-schema` job runs `npm run test:live` (anon REST smoke for all nine profile embeds + Zod contract parse for every RPC the app calls) with `SUPABASE_URL`/`SUPABASE_ANON_KEY` from repo secrets. Fork PRs don't receive secrets, so the job is `if`-gated to skip (not fail) there. Both secrets were set on `Thynatos/ratemygig` on 2026-08-21. Locally, `npm run test:live -w apps/web` reads `VITE_SUPABASE_URL`/`VITE_SUPABASE_ANON_KEY` from `apps/web/.env.local` via `vitest.live.config.ts`; `process.env` takes precedence, which is the path CI uses (verified by injecting a wrong key and watching all 22 assertions turn into 401s).
- The anon key is Supabase's **publishable** key (`sb_publishable_…`) — public by design and already inlined into the client bundle by Vite. It lives in repo secrets for log hygiene and to keep the job's env contract explicit, not because it is confidential. The `sb_secret_…` / service-role key must never appear in this workflow: `build-test` is deliberately secret-free.
- Migration 016 was applied to the live project 2026-08-21; the suite went from 10/22 to **22/22** across that change, which is the regression signal the job exists to preserve.

### tsconfig `types` is now restrictive
- `tsconfig.app.json` sets `"types": ["vite/client", "vitest/globals"]`, which turns OFF automatic inclusion of every `@types/*` package for `src/`. Nothing in `src/` uses Node globals (verified), but if that changes, `node` must be added to the array explicitly. `vitest-axe` matchers are typed by `src/test/vitest-axe.d.ts` (the package's own augmentation targets the pre-1.0 `Vi` namespace that Vitest 2 ignores).

### B1 is closed at the enforcement layer, not every mirror
- 016 adds `status = 'published'` to the reviews SELECT policy (anon branch only — the owner branch stays unqualified so `useDrafts()` works), to all five aggregation RPCs, to `get_trending_events`, and to the storage read policy (which now also matches `thumbnail_path`, fixing A8). The `review_photos`/`review_tags`/`comments` SELECT policies still consult only `is_public` — metadata rows (paths, tag ids, comment bodies) for a hypothetical draft remain readable; the photos themselves are not. Tracked under B9/Tier 1.

## Sprint 6 — Gig Wrapped (Notes & Tradeoffs)

### get_user_year_stats ignores its p_user_id parameter (deliberate, same as 014)
- The RPC signature keeps `p_user_id UUID` per the Sprint 6 spec, but the function body scopes every query to `auth.uid()` only. It is `SECURITY DEFINER` (attendance RLS is owner-only and `review_photos` access is gated through the parent review's `is_public`), so honoring `p_user_id` would let any caller read any user's stats. Documented in the migration header comment; the client always passes the caller's own id.

### Year windows are UTC; local-time midnight gigs can bleed across years
- Events count toward the year of their `start_at` in UTC (`[Jan 1 00:00 UTC, next Jan 1 00:00 UTC)`). A local-time midnight show on Dec 31 will usually fall on the next UTC day and count for the wrong year from the user's perspective. Accepted for v1 — per-user timezone storage doesn't exist.

### PostgREST numeric serialization guards in the RPC
- jsonb rejects `bigint`, so every `COUNT(*)` inside `jsonb_build_object` is cast `::INT`. `AVG(rating)` is `numeric`; the TABLE column is `DOUBLE PRECISION` so PostgREST serializes a JSON number instead of a numeric string (the client Zod schema rejects strings as a guard).

### Photos are counted against the review's year
- `photos_uploaded` joins `review_photos` through the reviews written that year (same window as `reviews_written`), not the photo's own `created_at`, so Wrapped totals reconcile with the review count even for photos uploaded later.
## Sprint 8 — setlist.fm Import (Notes & Tradeoffs)

### setlist.fm's API terms vs. saving imported setlists — decide before enabling in production
- The [API terms](https://www.setlist.fm/help/terms) allow **non-commercial use only**, require an attribution link "wherever Setlist.fm data is used" (the link each API response carries), and forbid retaining copies of the data beyond short-term caching.
- Sprint 8 saves imported songs permanently (`songs` / `setlist_songs`) once the user reviews and presses Save. The editor shows setlist.fm's attribution link during review. The saved setlist keeps no record of where it came from: there is no column for a source URL, and `setlists.source` only allows `'manual' | 'verified'`, so imports save as `'manual'`. `SetlistViewer` therefore cannot attribute it afterwards.
- Options: (a) confirm with setlist.fm that user-reviewed, user-saved setlists are acceptable; (b) add a `source_url` column (plus a `'setlistfm'` source value) in a new migration so the viewer can attribute; (c) leave the feature dark by not setting the secret. Nothing reaches production until `SETLISTFM_API_KEY` is set and the function is deployed.

### Encore numbering collapses to a boolean
- setlist.fm numbers encores (1, 2, …) but `setlist_songs.is_encore` is a boolean, so a second encore reads as part of the first. Play order and positions are preserved exactly.

### Tape and unnamed entries are dropped
- The normalizer skips `tape: true` entries (intro/outro music played from a recording) and unnamed placeholder songs. Positions are renumbered in play order over what remains, so an import can be shorter than the setlist.fm page.

### Artist matching is by name
- setlist.fm identifies artists by MusicBrainz id, and `artists` only stores Ticketmaster ids, so matching compares names. It ignores case, accents, punctuation and a leading "the", and accepts a billing that extends the name with a joiner ("Bruce Springsteen" ↔ "Bruce Springsteen & The E Street Band"). Aliases and renamed acts (P!nk / Pink) read as mismatches; those setlists can still be entered by hand.
- Candidates are the event's `event_artists` links (with ids). An event with no links falls back to its `lineup` names, and those songs save with `artist_id` NULL.

### The date check is advisory
- A setlist dated more than a day from the gig's UTC start date shows a "make sure it's the same night" line in the editor, but the import still goes through. Venue time zones aren't stored, so a tighter check would flag legitimate late shows.

### One quota, client-side limit only
- A single setlist.fm key serves every user. The only per-user throttle is the client-side 3 s limiter, so a signed-in user could script the function and drain the daily quota (about 1,440 requests on a starter key). Server-side rate limiting stays deferred (SPRINTS.md "Deferred / rejected").

### Pre-existing save-path bugs fixed because the import depends on them
- `useCreateSetlist` / `useAddSong` looked songs up with `.is('artist_id', <uuid>)`, which PostgREST rejects (HTTP 400 PGRST100, verified against the live project). The error was ignored, so every artist-scoped lookup "missed" and the insert then hit `UNIQUE(name, artist_id)`. This stayed latent because `SetlistPage` never passes an `artistId`; imports always do. Both hooks now go through `getOrCreateSongId` (`songs.ts`), which uses `eq` for artist-scoped lookups, `limit(1)` where NULL-artist names can repeat, and a re-read after losing a `23505` race. The logic is unit-tested via `getOrCreateSongIdWithDeps`.
- The create path wrote the setlist row first and its songs one at a time, so a mid-save failure left a partial setlist and `UNIQUE(event_id, user_id)` then blocked the retry. Song ids are now resolved first, the songs go in as one bulk insert, and the setlist row is deleted if that insert fails.
- The editor swallowed save errors, including the rate limiter's own message. They now raise a toast (`setlistSaveErrorMessage`, which never shows the raw database text).
- Editor layout: song names were centred in their rows (`.row-body`'s `justify-center` applied along the row axis), and both input rows were about 200 px wide because `flex-1` landed on the inner `<input>` rather than `Input`'s wrapper. Both are fixed; the editor sits behind sign-in, which is likely why the design finish review missed them.

### Toasts are new, errors-only, and persistent
- `ToastProvider` (`shared/components/ui/Toast.tsx`) + `useToast` (`shared/hooks/useToast.ts`). Toasts stay until dismissed or replaced by id, because errors that time out get missed. Their owner dismisses them on unmount, as the setlist editor does. At most three show at once. Only an `error` tone exists; add others when a real caller needs one.

### New issues found in Sprint 8 (verified; not fixed, outside the sprint)
1. **SetlistEditor edit mode discards song changes.** It renders Encore/Debut/reorder/remove controls, but "Save changes" calls `useUpdateSetlist`, which only writes `notes`/`source`.
2. **Hand-entered songs never count in artist song stats.** `SetlistPage` passes no `artistId`, so they're created with `artist_id` NULL, and `get_artist_song_stats` requires `s.artist_id = p_artist_id`. Imported songs are the first to carry an artist.
3. **`useCreateSong` (no callers)** upserts with `ignoreDuplicates` then calls `.single()`, which fails with PGRST116 whenever the song already exists. `useAddSong`, `useRemoveSong` and `useReorderSongs` have no callers either.
4. ~~**Not-found pages for malformed ids still take ~4–6 s.**~~ — FIXED. PostgREST answers a non-UUID id with HTTP 400 `22P02`, which `retryUnlessNotFound` retried twice (1 s + 2 s backoff). **Resolved:** `22P02` is now definitive alongside `PGRST116` (unit-tested in `queryClient.test.ts`), so each detail query makes one request. Run on their own, the three not-found e2e tests went from 4.4–5.4 s to 1.5–2.7 s each, and in full-suite runs the heading assertion takes ~1 s. They are back on Playwright's default 5 s timeout and passed 33 of 33 times across eight full-suite runs and one repeat run.
5. **Pressed controls are amber** (editor Encore/Debut chips, review tag chips, follow and attendance buttons). DESIGN.md §3 says a confirmed state is "a filled bone mark, not a colour", and §7.7 keeps amber for the live fact, a score and the primary action. The built system is consistent with itself, so this is a design decision to make, not a bug; imports make it more visible (every imported encore shows an amber chip).
6. **Nightly ingest has failed every run since at least 2026-09-18.** `ingest.yml` exits with "Missing required environment variable: TICKETMASTER_API_KEY": the repo has only the `SUPABASE_URL` / `SUPABASE_ANON_KEY` secrets, not `TICKETMASTER_API_KEY` or `SUPABASE_SERVICE_ROLE_KEY`.
7. **E2E depends on live Supabase latency.** In one of three full runs this session, six tests timed out on loading states; the other two were 25/25.
8. **Planning-doc drift.** Sprint 11 shipped (`9f2c8a3`) but isn't in the SPRINTS.md status table. Sprint 9's spec names `016_push_subscriptions.sql`, but migrations 016–018 exist, so the next free number is 019.
