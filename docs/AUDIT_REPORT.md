# Full-Project Audit — ratemygig

**Date:** 2026-08-21 · **Scope:** whole repo @ `main` `383635c` · **Type:** read-only audit (no code changed)
**Live target:** Supabase project `lpfyzjfqyyrdknzgxoul` (eu-central-1, Postgres 17.6) via anon REST, `supabase db query`, and the deployed `og-image` Edge Function
**Local probes:** `npm run dev` (port 3000) driven with a real browser against `apps/web/.env.local`
**Verification after audit:** `npm run build` ✅ · `npm run test` ✅ 310/310 · `npm run lint` ✅ 0/0

---

## 1. Executive summary

The repo is well-organised, well-documented and disciplined — and **substantially broken against a real database**. Mock mode plus a CI gate that never type-checks and never touches Postgres has hidden a wide class of failures: 310 green tests, 0 lint findings and a clean build coexist with six features that return HTTP 400 on every request, two RPCs that have never executed successfully, and the core rating display failing on every venue and artist page.

The two bugs already logged in CONCERNS.md are the visible tip of one root cause (no `public.profiles` FK) and one process gap (`npm run build` is `vite build` — TypeScript is never checked, anywhere).

**Top 5 risks**
1. **P0** — No FK to `public.profiles`; **9 query sites across 6 features** 400 with `PGRST200` (review page, event reviews, comments, setlists, lists, followers).
2. **P0** — `get_venue_rating_summary` / `get_artist_rating_summary` Zod schemas require a column the RPCs never return → every venue/artist shows "No ratings yet".
3. **P0** — `get_recommended_events` returns SQL error `42702`; `get_artist_setlist_stats` returns `42703`. Both features have never worked.
4. **P1** — Event dates render in the *viewer's* timezone: a stored `2026-05-10T21:00Z` London gig displays as **"Monday, May 11"** (verified, UTC+3 viewer) — and the share card says May 10.
5. **P1** — No type-check in build or CI (46 `tsc` errors today) and no live-DB smoke test; the gate that should catch all of the above does not exist.

**Top 5 opportunities**
1. Add `tsc --noEmit` to `build` + CI (S) — catches finding A4 and 45 more today.
2. Add FK `reviews.user_id → profiles.id` (+ 4 siblings) — one migration unblocks 6 features (S).
3. RPC contract tests: call every RPC against the live schema, parse with its Zod schema (M) — catches A2/A3/A5/A10 permanently.
4. Server-side search (Postgres FTS / trigram) — `ILIKE '%q%'` is a verified `Seq Scan` on `events` today (M).
5. Store an event timezone (or render venue-local) — fixes the wrong-date-on-the-card problem end to end (M).

---

## 2. Findings table

Severity: **P0** broken/blocks users or leaks data · **P1** high risk or major UX · **P2** should fix soon · **P3** nice to have.
Effort: **S** < 2h · **M** half day · **L** multi-day.

### Part A — Functional weaknesses

| ID | Sev | Title | Evidence | Impact | Fix | Effort |
|---|---|---|---|---|---|---|
| A1 | P0 | No FK to `public.profiles` → every `profile:profiles(...)` embed 400s | `pg_constraint` dump: **zero** FKs reference `public.profiles`; every `user_id` → `auth.users`. Live: `GET /rest/v1/reviews?...select=*,profile:profiles(display_name)` → `400 PGRST200`. Same for `comments`, `lists`, `setlists`, `user_follows`. Sites: [reviews.ts:28](apps/web/src/features/reviews/api/reviews.ts:28), [reviews.ts:52](apps/web/src/features/reviews/api/reviews.ts:52), [comments.ts:41](apps/web/src/features/comments/api/comments.ts:41), [comments.ts:79](apps/web/src/features/comments/api/comments.ts:79), [setlists.ts:28](apps/web/src/features/setlists/api/setlists.ts:28), [setlists.ts:57](apps/web/src/features/setlists/api/setlists.ts:57), [lists.ts:93](apps/web/src/features/lists/api/lists.ts:93), [follows.ts:45](apps/web/src/features/profile/api/follows.ts:45), [follows.ts:62](apps/web/src/features/profile/api/follows.ts:62) | `/r/:id` always "Review not found"; event review lists always empty; comments, setlists, list pages, follower/following lists all dead | Add `ALTER TABLE reviews ADD CONSTRAINT reviews_profile_fkey FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE` and the same for `comments`, `lists`, `setlists`, `user_follows` (both columns). `profiles.id` **is** `auth.users.id`, so the constraint is already satisfied by existing rows | S |
| A2 | P0 | `get_recommended_events` throws `42702 column reference "event_id" is ambiguous` | Live RPC → `400 {"code":"42702",...}`. Source: [010_discovery_intelligence.sql:116](packages/db/migrations/010_discovery_intelligence.sql:116) `SELECT DISTINCT ON (event_id) event_id, ...` collides with the `RETURNS TABLE(event_id UUID, ...)` OUT parameter | "Recommended for You" on Discover has never rendered for any user | Qualify as `es.event_id` (alias the CTE) or rename OUT params | S |
| A3 | P0 | Venue/artist rating summary Zod schemas demand a non-existent column | RPC returns `artist_id, artist_name, avg_rating, count_reviews, rating_1..rating_5`; [schemas.ts:178](apps/web/src/shared/validation/schemas.ts:178) requires `count_ratings`. Browser console on `/venues/b0000001-…-05` (has a 5★ review): `RPC response validation failed (get_venue_rating_summary)` → page shows "No ratings yet". Same on `/artists/…` | The product's headline feature — aggregated venue/artist ratings — is dead on every detail page with real data. Leaderboards still work (different schema) | Replace `count_ratings` with the real `rating_1..rating_5` distribution, or change the RPC to return `count_ratings` | S |
| A4 | P1 | `ArtistDetailPage` crashes into the error boundary | [ArtistDetailPage.tsx:33](apps/web/src/features/artists/pages/ArtistDetailPage.tsx:33) `const { data: venueList = [] } = useVenues()` then [:222](apps/web/src/features/artists/pages/ArtistDetailPage.tsx:222) `venueList.map(...)`; `useVenues` returns `{ data, hasMore }`. Live console: `TypeError: venueList.map is not a function` → `[FeatureErrorBoundary] Caught error`. `tsc` also flags it: `TS2339 Property 'map' does not exist on type 'never[] \| { data: Venue[]; hasMore: boolean }'` | Whole artist page replaced by the error card whenever Supabase is configured | `const { data: venuesResult } = useVenues(); const venueList = venuesResult?.data ?? []`. **Only consumer with this shape mismatch** — `VenuesPage:22`, `ArtistsPage:19`, `DiscoverPage:31` all destructure `.data` correctly | S |
| A5 | P1 | `get_artist_setlist_stats` throws `42703 column ss.song_id does not exist` | Live RPC → `400`. [009_setlist_stats_rpc.sql:37](packages/db/migrations/009_setlist_stats_rpc.sql:37) selects `ss.song_id` but the `ss` subquery at [:41](packages/db/migrations/009_setlist_stats_rpc.sql:41) only projects `setlist_id, song_count` | `ArtistSetlistSummary` card has never rendered | Add `song_id` to the subquery, or compute unique songs in a separate scalar subquery | S |
| A6 | P1 | Activity feed's attendance source can never return rows | [feed.ts:162-168](apps/web/src/features/feed/api/feed.ts:162) queries `attendance` `.in('user_id', followedUserIds)`; live policy is `attendance SELECT USING (auth.uid() = user_id)` (owner-only). `followedUserIds` never contains the caller (`no_self_follow` CHECK, [007_social_features.sql:71](packages/db/migrations/007_social_features.sql:71)) | "X is going to Y" feed items are structurally impossible; 1 of 4 feed sources is dead weight | Route through a `SECURITY DEFINER` RPC like `get_friends_attendance` (014), which exists precisely for this | M |
| A7 | P1 | Event dates render in the viewer's local timezone, not the venue's | DB: `Arctic Monkeys - The Car Tour` = `2026-05-10 21:00:00+00` (Sun 22:00 London). App rendered **"Monday, May 11, 2026 · 12:00 AM"** (viewer `Europe/Istanbul`). [utils.ts:7](apps/web/src/shared/lib/utils.ts:7) `format(parseISO(date))` = local. Meanwhile [og-image/index.ts:125](supabase/functions/og-image/index.ts:125) uses `timeZone: 'UTC'` → the share card says **May 10** for the same gig | Wrong date on cards, detail pages, "Past/Upcoming" badges, CSV export and Wrapped year buckets; SPA and share card disagree | Store `timezone` on `events` (Ticketmaster supplies `dates.timezone`) and format venue-local; interim: format everything in UTC so at least all surfaces agree | M |
| A8 | P1 | Review-photo **thumbnails** are unreadable by anyone but the owner | Thumbnails are written to `{uid}/{reviewId}/thumbs/{uuid}.{ext}` and recorded in `thumbnail_path` ([reviews.ts:262-291](apps/web/src/features/reviews/api/reviews.ts:262)). The public storage policy matches `rp.storage_path = objects.name` only (live `pg_policies`, from [005_storage.sql:46](packages/db/migrations/005_storage.sql:46)) — `thumbnail_path` is never matched | Every non-owner viewing a public review fails to sign the thumbnail; `usePhotoUrls` silently returns an empty `thumbUrls` map and the UI falls back to full-size images. The M5 "thumbnails" optimisation delivers zero bandwidth saving in production | Extend the policy to `OR rp.thumbnail_path = objects.name` | S |
| A9 | P1 | Signing out leaves the previous user's private data in the React Query cache | No `queryClient.clear()/removeQueries/resetQueries` anywhere (grep: 0 hits); [AuthProvider.tsx:66](apps/web/src/features/auth/AuthProvider.tsx:66) `signOut` only calls Supabase. Keys are not user-scoped: `['my-gigs', status]`, `['user-review', eventId]`, `draftKeys.byUser() = ['drafts','user']`, `feedKeys.timeline(page)`, `discoveryKeys.recommended('current')`, `venueFollowKeys.followedVenues()`, `artistFollowKeys.followedArtists()`, `userFollowKeys.isFollowing(targetId)` | On a shared device, account B sees account A's gigs/drafts/feed and wrong follow state until each query goes stale (default 5 min) | `queryClient.clear()` in `signOut` **and** on `onAuthStateChange`; add `user.id` to user-scoped keys | S |
| A10 | P2 | Setlist-stats Zod schemas reject PostgREST timestamps | Verified: PostgREST serialises `timestamptz` as `2026-03-15T20:00:00+00:00`; `z.string().datetime()` rejects offsets (`safeParse(...).success === false`), `datetime({offset:true})` accepts. [schemas.ts:226](apps/web/src/shared/validation/schemas.ts:226) and [:239-240](apps/web/src/shared/validation/schemas.ts:239) omit `offset:true`; the RPCs return `TIMESTAMPTZ` ([009:7](packages/db/migrations/009_setlist_stats_rpc.sql:7), [009:50](packages/db/migrations/009_setlist_stats_rpc.sql:50)) | `useArtistSongStats` and `useSongStats` will throw the moment any setlist song exists. Not reproducible today only because `setlist_songs` is empty | Add `{ offset: true }` (as [schemas.ts:254](apps/web/src/shared/validation/schemas.ts:254) already does for Wrapped) | S |
| A11 | P2 | The Drafts feature has no creation path — it is inert | `useSaveDraft` has exactly one reference in the whole app: the barrel re-export at [reviews/index.ts:21](apps/web/src/features/reviews/index.ts:21). `WriteReviewPage.tsx` contains the string "draft" **zero** times. `useCreateReview` never sets `status`, which defaults to `'published'` ([011:178](packages/db/migrations/011_profile_lists.sql:178)) | `DraftReviewsSection` on My Gigs can only ever render its empty state. A shipped D3 deliverable is half-built | Add a "Save draft" action wired to `useSaveDraft`; make `useUpdateReview` preserve `status` instead of leaving it untouched | S |
| A12 | P2 | `og-image` returns **HTTP 500, cached for 24 h**, on a malformed `reviewId` | `curl "…/og-image?reviewId=not-a-uuid"` → `HTTP/1.1 500` with `Cache-Control: public, max-age=86400, s-maxage=86400` ([index.ts:265](supabase/functions/og-image/index.ts:265) reuses `PNG_HEADERS`). Valid id → 200 (92 kB); unknown-but-valid UUID → 200 fallback | Any bad share link yields a broken image that CDNs are told to keep for a day; transient 5xx get cached the same way | Return the fallback card (or the pre-baked `FALLBACK_PNG_B64`) with 200 for bad input, and `Cache-Control: no-store` on genuine 5xx | S |
| A13 | P2 | Query errors are systematically rendered as "empty", not "error" | 27 call sites destructure `const { data: x = [] }`, which turns any thrown query into an empty array. Only 4 of 22 pages consume `error`/`isError` (`DiscoverPage`, `EventDetailPage`, `ListPage`, `PublicReviewPage`). Live proof: `/events/b0000003-…-07` shows **"No reviews yet"** and **"No setlists yet"** while the network 400s ([EventDetailPage.tsx:33-34](apps/web/src/features/events/pages/EventDetailPage.tsx:33)) | This is *why* A1 went unnoticed for a whole sprint. Broken features look like empty features to users and to whoever is testing | Drop the `= []` defaults on the pages that render sections; render an inline error + retry when `isError` | M |
| A14 | P3 | `sanitizeText()` called with `null` | [PublicProfilePage.tsx:110](apps/web/src/features/profile/pages/PublicProfilePage.tsx:110) and [:115](apps/web/src/features/profile/pages/PublicProfilePage.tsx:115) — `profile.display_name \|\| profile.username`, both nullable. `tsc`: `TS2345 'string \| null' not assignable to 'string'` | A user with neither field renders a blank name and blank avatar initials | `?? 'Anonymous'` | S |
| A15 | P3 | Ingest stats over-report creations | [sync-service.ts:214](packages/jobs/src/sync/sync-service.ts:214) and [:226](packages/jobs/src/sync/sync-service.ts:226) increment `venuesCreated`/`artistsCreated` on every **cache miss**, not on an actual insert (the upsert returns existing rows too) | GHA logs claim thousands of venues/artists "created" on every run; the only signal you have about ingest health is wrong | Compare `created_at` or use `ignoreDuplicates` + row-count | S |
| A16 | P3 | Ingest exits `0` even when every event failed | [daily-ingest.ts:131-132](packages/jobs/src/jobs/daily-ingest.ts:131) prints "Job completed successfully" and `process.exit(0)` regardless of `totalStats.errors.length` | A fully failed nightly ingest shows a green check in GitHub Actions | `process.exit(stats.errors.length ? 1 : 0)` (or a threshold) | S |
| A17 | P3 | "Last played" is the setlist row's creation time | [009:15](packages/db/migrations/009_setlist_stats_rpc.sql:15) `MAX(sl.created_at)`; same at [:58-59](packages/db/migrations/009_setlist_stats_rpc.sql:58) | A 1998 gig transcribed today reports "last played: today" | Use `MAX(e.start_at)` (events is already joined) | S |
| A18 | P3 | `URL:` is the only unescaped iCal property | [ical.ts:85](apps/web/src/shared/lib/ical.ts:85) writes `URL:${event.ticketUrl}` raw while `DESCRIPTION` is escaped. `ticket_urls` is provider-sourced JSONB, so a newline would fold/inject lines | Malformed `.ics` if a provider ever emits a control character | Strip CR/LF from URI values | S |

### Part B — Security

| ID | Sev | Title | Evidence | Impact | Fix | Effort |
|---|---|---|---|---|---|---|
| B1 | P1 | `reviews` RLS has no `status` gate — drafts are anon-readable | Live policy: `reviews SELECT USING ((is_public = true) OR (auth.uid() = user_id))` — no `status` predicate, although `status` was added in [011:178](packages/db/migrations/011_profile_lists.sql:178). `GET /rest/v1/reviews?status=eq.draft` returns `200` (empty only because no drafts exist). The same omission repeats in `review_photos`/`review_tags` policies, the storage policy ([005:46](packages/db/migrations/005_storage.sql:46)) and **all** aggregation RPCs ([004](packages/db/migrations/004_aggregation_functions.sql) filters `r.is_public = true` only) | Draft protection is client-side only ([reviews.ts:33](apps/web/src/features/reviews/api/reviews.ts:33), [PublicReviewPage.tsx:53](apps/web/src/features/reviews/pages/PublicReviewPage.tsx:53)) — one `curl` reads them. Draft reviews would also silently count toward public venue/artist averages. **Currently latent** because no draft can be created (A11); it becomes a live leak the day drafts ship | Add `AND status = 'published'` to the anon branch of the reviews SELECT policy and to every aggregation RPC + storage policy | S |
| B2 | P1 | No security headers on the static host | [vercel.json](apps/web/vercel.json) has no `headers` block; [index.html](apps/web/index.html) has no CSP meta. Vercel supplies HSTS only | No CSP (the app renders user text from 5 tables), no `X-Frame-Options`/`frame-ancestors` (clickjacking on follow/react buttons), no `Referrer-Policy`, no `Permissions-Policy` (geolocation is used) | Add a `headers` block: `Content-Security-Policy` (script-src 'self'; connect-src 'self' *.supabase.co; img-src 'self' data: blob: *.supabase.co *.ticketm.net), `X-Frame-Options: DENY`, `Referrer-Policy: strict-origin-when-cross-origin`, `Permissions-Policy: geolocation=(self)` | S |
| B3 | P2 | Production source maps are published | Build emits **3.76 MB** of `.map` next to 813 kB of JS ([vite.config.ts](apps/web/vite.config.ts) `build.sourcemap: true`) | Full readable source, including query shapes and internal comments, downloadable from the CDN; 4.6× the JS payload in cold storage | `sourcemap: 'hidden'` + upload to an error tracker (see G1) | S |
| B4 | P2 | `og-image` is an unauthenticated, CPU-heavy, **uncached** renderer | Verified live: `CF-Cache-Status: DYNAMIC` on repeat requests despite `s-maxage=86400`; five sequential warm requests took 1.17–1.29 s each. Unknown UUIDs still *render* a fallback card ([index.ts:296](supabase/functions/og-image/index.ts:296)) instead of returning the pre-baked `FALLBACK_PNG_B64` | `?reviewId=<random-uuid>` in a loop burns ~1.2 s of Deno CPU per request against the 2 s CPU cap and the free-tier invocation budget, with no CDN absorbing it | Serve the static PNG for the not-visible path; add a UUID regex guard; put Cloudflare/Vercel in front (or cache in Supabase Storage keyed by review id + `updated_at`) | M |
| B5 | P2 | Rate limiting is per-tab JavaScript only | [throttle.ts:1](apps/web/src/shared/lib/throttle.ts:1) — a module-level closure, reset on reload, absent from the API. `useRemoveReaction` ([reviews.ts:491](apps/web/src/features/reviews/api/reviews.ts:491)) has **no** limiter at all | A scripted anon/authenticated client can: create one review per event per user (bounded by the unique constraint) but unlimited **comments**, **songs**, **reactions** (delete/insert churn), **follow/unfollow** churn, **list items**, and unlimited photo uploads up to 10 MB each. All writes go straight to PostgREST | Postgres-side throttling (trigger counting recent rows per user) or move mutations behind an Edge Function. Cheapest interim: per-user insert-rate triggers on `comments`, `songs`, `review_reactions` | M |
| B6 | P2 | `songs` is append-only and open to any authenticated user | `songs INSERT WITH CHECK (auth.uid() IS NOT NULL)`; **no** UPDATE or DELETE policy exists (live `pg_policies`) | Any signed-in account can insert unlimited song rows with arbitrary names, and nobody — including an admin using the anon/authenticated role — can edit or remove them through the API. Song names are rendered in the UI | Add owner/moderator DELETE policy + a `created_by` column; rate-limit server-side | M |
| B7 | P2 | `handle_new_user()` is `SECURITY DEFINER` with an unpinned `search_path` | `pg_proc.proconfig` = `(none)` for `handle_new_user`; all seven other DEFINER functions correctly carry `search_path=public` | The one function that runs on `auth.users` insert is the one not hardened. Matches Supabase's own `function_search_path_mutable` lint | `ALTER FUNCTION public.handle_new_user() SET search_path = public, pg_temp` | S |
| B8 | P2 | No account deletion; privacy policy is a placeholder | Grep for `delete account\|admin.deleteUser\|delete_user` across `apps/`, `packages/`, `docs/`, `*.md`: **0 hits**. [PrivacyPage.tsx](apps/web/src/shared/pages/PrivacyPage.tsx) is 23 lines with no retention period, no data-subject rights, no controller identity, no contact address | EU-hosted service (eu-central-1) collecting email + behavioural data with no erasure path and no compliant notice. `auth.users` cascades are in place, so the DB half is ready — only the UX and the policy text are missing | Add a "Delete account" flow (Edge Function with service role → `auth.admin.deleteUser`) and a real privacy notice | M |
| B9 | P3 | Comments on private/draft reviews are world-readable | `comments SELECT USING (true)` (live). `comments.review_id` is exposed, and the parent review's visibility is never consulted | Comment bodies attached to a private review leak. Low blast radius today (comments are only created from the public review page) | Mirror the `review_photos` pattern: `EXISTS (SELECT 1 FROM reviews r WHERE r.id = review_id AND (r.is_public AND r.status='published' OR r.user_id = auth.uid()))` | S |
| B10 | P3 | `VITE_TICKETMASTER_API_KEY` bundle exposure | Not set in `apps/web/.env.local`, and `VITE_EVENTS_PROVIDER=mock`, so **no key is in the current build**. The exposure only materialises when someone sets the var: Vite inlines `import.meta.env.VITE_*` literally ([env.ts:18](apps/web/src/shared/lib/env.ts:18)) | Realistic abuse: quota exhaustion (TM Discovery is 5 000 calls/day, 5 req/s) and attribution of scraping to your key → key revocation kills ingest too, since both use the same account | Keep it unset in production (current state is safe). If live browser TM is ever wanted, proxy through an Edge Function — the Sprint 8 function pattern is the natural home | M |
| B11 | P3 | `get_recommended_events` trusts `p_user_id` | Invoker-rights (`prosecdef = false`), and the body filters by `p_user_id`, not `auth.uid()` ([010:88-94](packages/db/migrations/010_discovery_intelligence.sql:88)) — unlike 014/015, which deliberately ignore the parameter | An attacker can request another user's recommendations. Not a real leak: `artist_follows`/`venue_follows` are `SELECT USING (true)` anyway, and `user_preferences` stays RLS-protected. Flagged as an inconsistency with the 014/015 convention | Scope to `auth.uid()` like the other two | S |

### Part C — Performance & scalability

| ID | Sev | Title | Evidence | Impact | Fix | Effort |
|---|---|---|---|---|---|---|
| C1 | P1 | Free-text search is a sequential scan | `EXPLAIN ANALYZE select … from events where name ilike '%tour%' order by start_at limit 5` → `Seq Scan on events / Filter: (name ~~* '%tour%')`. `events.name` and `venues.name` have **no** trigram index (only `artists.name` does, `idx_artists_name_trgm`). [EnhancedSearch.tsx:43-87](apps/web/src/features/discovery/components/EnhancedSearch.tsx:43) fires 3 such queries per debounced keystroke, per user | At 100 k events, every keystroke of every user scans the whole table | `CREATE INDEX … USING gin (name gin_trgm_ops)` on `events` and `venues`, or a `tsvector` column + FTS (see F1) | M |
| C2 | P1 | `get_recommended_events` ignores its `p_limit` | [010:82-119](packages/db/migrations/010_discovery_intelligence.sql:82) declares `p_limit` and never uses it — no `LIMIT` clause. Then [discovery.ts:41-44](apps/web/src/features/discovery/api/discovery.ts:41) does `.in('id', eventIds)` with **all** returned ids | Once A2 is fixed, this RPC returns every future event and the follow-up query stuffs all of them into a URL — a guaranteed 414/timeout at scale | Add `ORDER BY priority DESC, … LIMIT p_limit` | S |
| C3 | P1 | Feed cannot paginate correctly | [feed.ts:280-307](apps/web/src/features/feed/api/feed.ts:280) merges 4 sources with `Promise.allSettled`, applies the same `offset` to two of them, hard-limits the other two to 10 rows each, then sorts and slices client-side. `fetchFollowedIds` pulls the entire follow graph on every page | Page 2+ skips and duplicates items non-deterministically; a user following 5 000 artists downloads 5 000 ids per feed request | Single `get_activity_feed(p_cursor timestamptz, p_limit int)` RPC (SECURITY DEFINER, `auth.uid()`-scoped) doing the UNION + keyset pagination server-side | L |
| C4 | P2 | Event review lists are unbounded | [reviews.ts:20-40](apps/web/src/features/reviews/api/reviews.ts:20) — no `.limit()`, plus `photos:review_photos(*)` for every review. `usePhotoUrls` then issues **two** `createSignedUrls` batch calls per render ([usePhotoUrls.ts:18](apps/web/src/shared/hooks/usePhotoUrls.ts:18), [:28](apps/web/src/shared/hooks/usePhotoUrls.ts:28)) | A festival event with 2 000 reviews × 10 photos ships ~20 000 rows and signs 20 000 URLs on page load | `.limit(20)` + keyset "load more"; sign only the photos actually rendered | M |
| C5 | P2 | `count: 'exact'` on every venue/artist page request | [resolver.ts:29](apps/web/src/features/venues/api/resolver.ts:29) `.select('*', { count: 'exact' })`, same in the artists resolver. PostgREST runs a full `COUNT(*)` over the filtered set per request | At 100 k venues the count dominates the query; the ordering itself is fine (`venues_name_city_country_key` covers `ORDER BY name` — verified by `EXPLAIN`) | `count: 'planned'` or `estimated`, or drop the count and infer `hasMore` from `pageSize + 1` rows | S |
| C6 | P2 | Provider filtering does a full `events` scan client-side | [resolver.ts:32-37](apps/web/src/features/venues/api/resolver.ts:32) fetches **every** `events.venue_id` for the provider, dedupes in JS, then `.in('id', ids)` | With `VITE_EVENTS_PROVIDER=ticketmaster` and 100 k events this downloads 100 k UUIDs before rendering page 1 of venues | `EXISTS` subquery via an RPC, or a `provider` column on `venues` | M |
| C7 | P2 | `og-image` is never CDN-cached | `CF-Cache-Status: DYNAMIC` (verified) — the `s-maxage=86400` header is not honoured by the Cloudflare layer in front of Supabase Functions. Warm render 1.17–1.29 s | Every crawler impression pays a full satori+resvg render. The CONCERNS.md note ("fetched at most once per day per CDN edge") is **not true today** | Render once and store the PNG in a public Storage bucket keyed by `reviewId`, serve from there; or front the function with a CDN you control | M |
| C8 | P2 | Notification fan-out is row-at-a-time on ingest | [013:112-129](packages/db/migrations/013_notification_triggers.sql:112) runs a `NOT EXISTS` correlated subquery **per follower per event_artist row**, and `SyncService.linkEventArtists` inserts one row at a time ([sync-service.ts:168-186](packages/jobs/src/sync/sync-service.ts:168)) | First ingest after 013 with a large follow graph = O(events × artists × followers) statements inside the ingest transaction window | Batch the link insert; move fan-out to a queue table drained by a scheduled job | M |
| C9 | P2 | Ticketmaster ingest truncates silently and never retries | `maxPage = floor(1000/size) - 1` ([ticketmaster-client.ts:131](packages/jobs/src/ticketmaster/ticketmaster-client.ts:131)) breaks out with no log. `fetch` ([:74-87](packages/jobs/src/ticketmaster/ticketmaster-client.ts:74)) throws on any non-2xx with no retry/backoff — a single 429 aborts the whole generator | Country-mode ingest quietly loses events; one transient TM error loses the night's run | Log when the cap is hit; add exponential backoff on 429/5xx; per-city checkpointing | M |
| C10 | P3 | Duplicate / low-value indexes | `idx_events_provider_event_id` duplicates `events_provider_provider_event_id_key`; `idx_artists_name` duplicates `artists_name_key`; `idx_profiles_username` duplicates `profiles_username_key`; `idx_reviews_is_public WHERE is_public = true` has ~0 selectivity | 4 of 78 indexes are pure write amplification | Drop them | S |
| C11 | P3 | Index gaps vs. actual predicates | `reviews` is queried as `(event_id, is_public, status)` ordered by `created_at` — the partial index stops at `(event_id, is_public)`. Feed attendance uses `(user_id, created_at)`; only `(user_id)` exists | Sorts and filters that could be index-only aren't | `idx_reviews_event_published ON reviews (event_id, created_at DESC) WHERE is_public AND status='published'` | S |
| C12 | P3 | Storage grows unbounded; `blurhash` is dead weight | Every review photo stores a ≤1200 px original **and** a 300 px thumb; `review_photos.blurhash` exists ([001:152](packages/db/migrations/001_initial_schema.sql:152)) and is never written (0 producers) | Free tier is 1 GB of storage; no lifecycle policy, no orphan cleanup when a review is deleted (the DB row cascades, the object does not) | Populate `blurhash` at upload for cheap placeholders; add a scheduled orphan sweep | M |
| C13 | P3 | Notification bell polls every 30 s per tab, forever | [constants.ts:8](apps/web/src/shared/lib/constants.ts:8) `NOTIFICATION_REFETCH_INTERVAL = 30000`, used with `refetchInterval` ([notifications.ts:56](apps/web/src/features/notifications/api/notifications.ts:56)) | 2 880 head-count requests per user per day, regardless of tab visibility | Supabase Realtime subscription, or pause when `document.hidden` | S |

**Scaling table** — see §5.

### Part D — Architecture & code quality

| ID | Sev | Title | Evidence | Impact | Fix | Effort |
|---|---|---|---|---|---|---|
| D1 | **P1** | **TypeScript is never checked — anywhere** | `"build": "vite build"` ([apps/web/package.json:8](apps/web/package.json:8)) — no `tsc`. [ci.yml:27-31](.github/workflows/ci.yml:27) runs lint, test, build only. ESLint uses `tseslint.configs.recommended` (non-type-checked). `npx tsc -p tsconfig.app.json --noEmit` → **exit 2, 46 errors in 24 files** | The single largest quality gap. It is why A4 shipped, and why `feed.ts` types lie about nullability. ~20 of the 46 are config gaps (`"types": ["vite/client"]` missing → 9 × `import.meta.env` errors; no `@jobs/*` path alias; `vitest-axe` matchers untyped; no `*.css` module declaration); the other ~26 are real | `"build": "tsc -b --noEmit && vite build"`, add `"types": ["vite/client","vitest/globals"]` and the `@jobs/*` alias to `tsconfig.app.json`, then fix the remaining real errors | M |
| D2 | P2 | Supabase results are untyped `any`, so shape drift is invisible | No generated DB types anywhere (`supabase gen types` never run; no `Database` generic on `createClient` at [supabase.ts:4](apps/web/src/shared/lib/supabase.ts:4)). Row shapes are re-declared ad hoc: inline types in [reviews.ts:37](apps/web/src/features/reviews/api/reviews.ts:37), `OgReviewData` in [og.ts:1](apps/web/src/shared/lib/og.ts:1), `RestReview` in [og-inject.ts:7](apps/web/api/og-inject.ts:7), `ReviewRow` in [og-image/index.ts:44](supabase/functions/og-image/index.ts:44), `ArtistSongStats`/`SongStatsEntry` duplicating the Zod schemas in [stats.ts](apps/web/src/features/setlists/api/stats.ts) | Four independent definitions of "a review" already drift. `any` from `supabase.from()` is why A1's broken embeds compile fine | Generate `packages/core/src/types/database.ts` and pass it as the `createClient` generic. This is fully compatible with STATE.md (no API layer, no repository) — it types the *existing* direct queries | M |
| D3 | P2 | Bogus type assertions that defeat their own purpose | [PublicProfilePage.tsx:72](apps/web/src/features/profile/pages/PublicProfilePage.tsx:72) `data as (typeof data & { list_items: … })[]` — `typeof data` is already the **array**, so each row is typed as an array intersection. Result: 6 × `TS2339 Property 'id' does not exist` at [:286-298](apps/web/src/features/profile/pages/PublicProfilePage.tsx:286). Runtime is fine; the type is nonsense | Casts like this are how A4-class bugs get past review | Type the row explicitly | S |
| D4 | P3 | Dead exports | Zero non-test consumers: `getPublicPhotoUrl`, `getSignedPhotoUrl` (singular), `uploadPhoto`, `deletePhoto` ([storage.ts](apps/web/src/shared/lib/storage.ts)), `sanitizeHtml` + `sanitizeRichText` ([sanitize.ts:36](apps/web/src/shared/lib/sanitize.ts:36), [:50](apps/web/src/shared/lib/sanitize.ts:50)), `paginatedResponseSchema` ([schemas.ts:135](apps/web/src/shared/validation/schemas.ts:135)), `useSaveDraft` (A11). Also **two different `sanitizeHtml`** exist — [utils.ts:90](apps/web/src/shared/lib/utils.ts:90) (textContent escape) and [sanitize.ts:36](apps/web/src/shared/lib/sanitize.ts:36) (DOMPurify) | Two functions with the same name and different security properties is a footgun waiting for a wrong import | Delete the unused ones; rename or remove `utils.sanitizeHtml` | S |
| D5 | P3 | `*.integration.test.ts` never integrates | `events.integration.test.ts`, `artists.integration.test.ts`, `venues.integration.test.ts` inject mock `deps` into `resolveXxxWithDeps` — no DB, no network | The name promises exactly the coverage that would have caught A1–A3, and its absence is disguised | Rename to `*.resolver-contract.test.ts`, and add a genuine integration suite (E2) | S |
| D6 | P3 | Resolver triplication — **verdict: leave it** | `features/{events,venues,artists}/api/resolver.ts` share the `fetchFromDb → provider fallback → resolveXxxWithDeps` shape. The bodies differ meaningfully (venues filter through `events.venue_id`, artists through `event_artists`, events map JSONB) | Extraction would produce a generic with 4 injected callbacks — less readable than three explicit 200-line files, and ARCHITECTURE_REVIEW already "fixed" this once by splitting them apart | No change. Reassess only if a 4th entity appears | — |
| D7 | P3 | `el()`/card-builder duplication is pre-emptive, not actual | `el()`/`img()`/`buildReviewCard()` exist only in [og-image/index.ts](supabase/functions/og-image/index.ts) (graph shows them as 5-edge hubs *within that file*) | The graph flags them as god nodes, but they are file-local helpers with one consumer | No change until a second renderer (e.g. Wrapped cards, F3) exists — then extract to `supabase/functions/_shared/` | — |

### Part E — Testing & CI

| ID | Sev | Title | Evidence | Impact | Fix | Effort |
|---|---|---|---|---|---|---|
| E1 | P1 | No type-check step (see D1) | — | Cheapest possible fix with the highest catch rate: would have caught A4 on the commit that introduced it | `tsc -b --noEmit` in `build` + a dedicated CI step | S |
| E2 | P1 | Nothing in CI ever talks to Postgres | [ci.yml](.github/workflows/ci.yml) has no DB; e2e is explicitly local-only; the three `*.integration.test.ts` files are mock-only (D5) | A1, A2, A3, A5 — four "feature is completely dead" bugs — are all invisible to the current gate | **Recommended minimum (S):** a `smoke` CI job that `curl`s the live project's anon REST for one row of each shape used in the app (`reviews?select=*,profile:profiles(...)`, each `rpc/<name>`) and asserts HTTP 200. Needs only `SUPABASE_URL` + anon key as CI secrets. **Better (M):** `supabase start` in Docker + apply all 15 migrations + run the suite | S–M |
| E3 | P1 | RPC responses are validated at runtime but never at build time | 11 Zod schemas in [schemas.ts:163-258](apps/web/src/shared/validation/schemas.ts:163) exist precisely to catch shape drift — and 3 of them (A3 ×2, A10 ×2) have been wrong since they were written, failing only in production | The validation layer creates a *false* sense of contract safety | A contract test that, for each RPC, calls it once and asserts `schema.safeParse(row).success`. Combined with E2 this is one test file | S |
| E4 | P2 | Zero coverage on the critical paths | No tests touch: auth flows, photo upload/resize/signing, draft→publish, notification triggers, storage RLS, Wrapped year boundaries (only the pure `resolveWrappedYear` helper is tested), or the `og-image` function | 310 tests, and every one of the confirmed P0s lives outside their reach | Prioritise E2/E3 over more unit tests — the gap is integration, not volume | M |
| E5 | P2 | `og-image` has no automated test | No test file references it | A2/A12-class regressions ship silently | Post-deploy CI step: `curl -fsS "$URL?reviewId=$KNOWN_ID" \| file -` asserts PNG + `200`, plus a 400 assertion for the missing-param case | S |
| E6 | P3 | No mutation-mocking infrastructure | Documented Sprint 4 note; optimistic rollback is only tested via the extracted pure helpers | Reasonable trade-off as recorded — but it means `onMutate/onError/onSettled` wiring itself is untested | MSW at the PostgREST layer would cover both this and E2 in one investment | M |

### Part F — Product opportunities (ranked in §6)

### Part G — Ops, DX & deployment

| ID | Sev | Title | Evidence | Impact | Fix | Effort |
|---|---|---|---|---|---|---|
| G1 | P1 | No error tracking, analytics, or uptime monitoring | No Sentry/PostHog/analytics dependency in [apps/web/package.json](apps/web/package.json); [logger.ts](apps/web/src/shared/lib/logger.ts) is console-only; [FeatureErrorBoundary](apps/web/src/shared/components/FeatureErrorBoundary.tsx) logs to `console.error` | Every P0 in this report has been live and invisible. A1 has been shipping "Review not found" on every share link since Sprint 7 with zero signal | **Minimum viable stack (S, ~2 h):** `@sentry/react` on the web app (`tracesSampleRate: 0.1`) + `@sentry/deno` in `og-image` + Vercel Web Analytics (one flag). Wire `FeatureErrorBoundary` and `validateRpcResponse` to `Sentry.captureException`. Add a free uptime check on `/` and on the og-image endpoint | S |
| G2 | P1 | Ingest failures are structurally silent | A15 (wrong stats) + A16 (exit 0 on error) + C9 (no retry) together | The only data pipeline has no working health signal | Fix A16 first (one line), then add a GHA `if: failure()` notification step | S |
| G3 | P2 | **UNVERIFIED:** the Vercel crawler rewrite has never run on a deploy | [vercel.json:18](apps/web/vercel.json:18) `(?i).*(bot\|crawl\|…).*` and [:8](apps/web/vercel.json:8) `includeFiles: dist/og-shell.html`; [og-inject.ts:21-24](apps/web/api/og-inject.ts:21) reads `process.cwd()/dist/og-shell.html`. None of it can be tested locally | If `(?i)` or `includeFiles` behaves differently than assumed, every share link falls back to generic meta — silently | **First-deploy checklist:** (1) `curl -A "Twitterbot/1.0" https://<host>/r/<id> \| grep og:image` → must show the function URL; (2) `curl -A "Mozilla/5.0 … Chrome" https://<host>/r/<id>` → must return the SPA shell, **not** a 302; (3) `curl -A "TWITTERBOT/1.0"` (upper-case) → proves `(?i)`; (4) run the URL through opengraph.xyz. **Fallback if `(?i)` is unsupported:** expand to explicit case alternation `[Bb][Oo][Tt]` etc., or drop the `has` gate and do UA detection inside `og-inject.ts` (which already calls `isCrawlerUserAgent` and 302s non-crawlers — the function is already correct standalone). **Also:** the TS pattern ([crawler.ts:1](apps/web/src/shared/lib/crawler.ts:1)) and the JSON pattern are currently identical; they can only be kept so by hand | S |
| G4 | P2 | Env var sprawl has no single source of truth | Four stores: `apps/web/.env.local` (`VITE_*`), root `.env` (jobs), Vercel dashboard (`SUPABASE_URL`, `SUPABASE_ANON_KEY` **without** the `VITE_` prefix, for `og-inject`), GHA secrets/vars. `SUPABASE_URL` means different things in different places; Supabase Functions get `SUPABASE_SERVICE_ROLE_KEY` injected implicitly | Easy to configure a deploy that silently degrades (e.g. missing `SUPABASE_ANON_KEY` on Vercel makes `buildReviewTags` return `null` and share cards go generic — [og-inject.ts:46](apps/web/api/og-inject.ts:46)) | A single matrix table in DEPLOYMENT.md: variable × consumer × required/optional × failure mode when missing. DEPLOYMENT.md covers ~70% of this already | S |
| G5 | P2 | No backup/restore story; free-tier ceilings undocumented | Nothing in DEPLOYMENT.md about PITR, `pg_dump`, or tier limits | Free tier: 500 MB DB, 1 GB storage, 500 k Edge invocations/mo, 5 GB egress, and **projects pause after 7 days of inactivity** — which would take the og-image endpoint and the whole app down. Storage (C12) and edge invocations (B4/C7) are the two that will bite first | Document the ceilings and which finding breaches each; schedule a weekly `pg_dump` to object storage | S |
| G6 | P3 | Doc drift (details in §8) | README says 12 migrations (there are 15) and lists Zustand (removed); DEPLOYMENT.md says 14; ARCHITECTURE_REVIEW.md quotes a 609–638 kB bundle (now 404 kB) and 196 tests (now 310) | Onboarding a human or an agent from the docs produces a broken deployment (missing migrations 013–015) | See §8 | S |

---

## 3. Confirmed bugs — minimal repro steps

Every step below was executed during this audit. Replace `$URL`/`$KEY` with `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY`.

### BUG-1 (A1) — `profiles` embeds 400 across 6 features

```bash
curl -s -H "apikey: $KEY" -H "Authorization: Bearer $KEY" \
  "$URL/rest/v1/reviews?id=eq.f9f9fe86-354a-4f6b-8000-5b42b83d7708&select=*,profile:profiles(display_name)"
```
```json
{"code":"PGRST200","details":"Searched for a foreign key relationship between 'reviews' and 'profiles' in the schema 'public', but no matches were found.","message":"Could not find a relationship between 'reviews' and 'profiles' in the schema cache"}
```
The same 400 reproduces verbatim for `comments`, `lists`, `setlists`, and both `user_follows` hint variants. Root cause:

```sql
select conrelid::regclass, pg_get_constraintdef(oid) from pg_constraint
where contype='f' and connamespace='public'::regnamespace;
-- every user_id/follower_id/following_id → auth.users(id); ZERO rows reference public.profiles
```

**UI impact, observed at `localhost:3000`:**
- `/r/f9f9fe86-354a-4f6b-8000-5b42b83d7708` → "Review not found. This review may be private or has been deleted." (the review is `status=published, is_public=true` — verified by a plain `select` that returns 200).
- `/events/b0000003-0000-4000-8000-000000000007` → "No reviews yet. Be the first to share your experience!" **and** "No setlists yet for this event." with three `400` entries in the console.

### BUG-2 (A3) — rating summaries never render

Navigate to `/venues/b0000001-0000-4000-8000-000000000005` (Brixton Academy, has a 5★ review).
Page shows **"No ratings yet"**; console shows `RPC response validation failed (get_venue_rating_summary)`.

```bash
curl -s -X POST -H "apikey: $KEY" -H "Authorization: Bearer $KEY" -H "content-type: application/json" \
  -d '{"p_artist_id":"b0000002-0000-4000-8000-000000000007","p_city":null,"p_year":null,"p_venue_id":null}' \
  "$URL/rest/v1/rpc/get_artist_rating_summary"
# [{"artist_id":"…","artist_name":"Arctic Monkeys","avg_rating":5.00,"count_reviews":1,"rating_1":0,…,"rating_5":1}]
```
`artistRatingSummarySchema` ([schemas.ts:178](apps/web/src/shared/validation/schemas.ts:178)) requires `count_ratings` — not in the payload, not in the RPC's `RETURNS TABLE`.

### BUG-3 (A2) — recommendations RPC is a SQL error

```bash
curl -s -X POST … -d '{"p_user_id":"…","p_limit":5}' "$URL/rest/v1/rpc/get_recommended_events"
# {"code":"42702","details":"It could refer to either a PL/pgSQL variable or a table column.",
#  "message":"column reference \"event_id\" is ambiguous"}
```

### BUG-4 (A5) — setlist stats RPC is a SQL error

```bash
curl -s -X POST … -d '{"p_artist_id":"b0000002-0000-4000-8000-000000000007"}' "$URL/rest/v1/rpc/get_artist_setlist_stats"
# {"code":"42703","message":"column ss.song_id does not exist"}
```

### BUG-5 (A4) — ArtistDetailPage crash

`npm run dev` → `/artists/b0000002-0000-4000-8000-000000000007` → renders "Artist Details — This section encountered an error."
Console: `TypeError: venueList.map is not a function … The above error occurred in the <ArtistDetailPage> component … FeatureErrorBoundary`.
Reproduces with `VITE_EVENTS_PROVIDER=mock` because the crash depends on `isSupabaseConfigured()`, not on provider mode.

### BUG-6 (A7) — wrong day displayed

```sql
select name, start_at from events where name = 'Arctic Monkeys - The Car Tour';
-- 2026-05-10 21:00:00+00   (Sunday 22:00 London)
```
`/events/b0000003-0000-4000-8000-000000000007` renders **"Monday, May 11, 2026 · 12:00 AM"** (viewer TZ `Europe/Istanbul`).
The share card for the same event renders **"May 10, 2026"** (`timeZone: 'UTC'`, [og-image/index.ts:125](supabase/functions/og-image/index.ts:125)).

### BUG-7 (A12) — cached 500 from the share-card endpoint

```bash
curl -I "https://lpfyzjfqyyrdknzgxoul.supabase.co/functions/v1/og-image?reviewId=not-a-uuid"
# HTTP/1.1 500 Internal Server Error
# Cache-Control: public, max-age=86400, s-maxage=86400
```

### BUG-8 (C7) — the share-card cache header is not honoured

```
CF-Cache-Status: DYNAMIC        # on every repeat request
warm timings: 1.196s 1.293s 1.179s 1.166s 1.255s
```

### BUG-9 (A6) — friend-attendance feed items are impossible

`attendance SELECT USING (auth.uid() = user_id)` (live `pg_policies`) vs. [feed.ts:165](apps/web/src/features/feed/api/feed.ts:165) `.in('user_id', followedUserIds)` — and `no_self_follow` guarantees the caller is never in that list. The query returns `[]` for every user, always.

### BUG-10 (A8) — thumbnails are private

Storage policy `Public can read photos of public reviews` matches `rp.storage_path = objects.name`; thumbnails live at `…/thumbs/…` in `thumbnail_path`. Non-owners cannot sign them, so `thumbUrls` is always empty for other people's reviews.

---

## 4. Security assessment

### RLS matrix (verified against live `pg_policies`, 67 policies + 8 storage policies)

| Table | Anon read | Authenticated write | Verdict |
|---|---|---|---|
| `profiles` | public rows only (`is_profile_public`) | own row only; **no INSERT policy** (relies on `handle_new_user` DEFINER), **no DELETE policy** | ⚠️ correct for read/write; no erasure path (B8) |
| `venues` / `artists` / `events` / `event_artists` | all rows | none (the `service_role` `FOR ALL` policies are inert — that role bypasses RLS) | ✅ |
| `attendance` | none | own rows only | ✅ (and this is why A6 fails) |
| `reviews` | `is_public = true` — **no `status` gate** | own rows only | ❌ **B1** |
| `review_photos` / `review_tags` | via parent `is_public` — **no `status` gate** | via parent ownership | ⚠️ inherits B1; write side ✅ |
| `tags` | all | none | ✅ |
| `comments` | **all rows** regardless of parent visibility | own rows only | ⚠️ **B9** |
| `review_reactions` | all rows | own rows only | ✅ |
| `artist_follows` / `venue_follows` / `user_follows` | all rows (social graph fully public) | own rows only | ⚠️ by design; note the whole follow graph is enumerable by anon |
| `setlists` / `setlist_songs` | all rows | owner only | ✅ |
| `songs` | all rows | **INSERT by any authenticated user; no UPDATE/DELETE policy at all** | ❌ **B6** |
| `lists` | `is_public = true` or own | own rows only | ✅ |
| `list_items` | via parent list visibility | via parent ownership | ✅ |
| `notifications` | own rows only | own rows only (triggers use DEFINER) | ✅ |
| `user_preferences` | own rows only | own rows only | ✅ |
| `storage.review-photos` | via `storage_path` + `is_public` — **misses `thumbnail_path`, misses `status`** | own folder only | ❌ **A8** + inherits B1 |
| `storage.avatar-photos` | public bucket, all objects | own folder only | ✅ as decided in STATE.md |

**Checked and cleared (no finding):** every `UPDATE` policy here has `USING` but no `WITH CHECK`. In Postgres that means the `USING` expression is *also* applied as the check on the new row, so none of these allow re-assigning `user_id`/`list_id` to another owner. Not a vulnerability.

### SECURITY DEFINER surface

| Function | `search_path` | Caller-scoping | Verdict |
|---|---|---|---|
| `get_friends_attendance` | `public` ✅ | ignores `p_user_id`, filters `follower_id = auth.uid()` | ✅ correct and documented |
| `get_user_year_stats` | `public` ✅ | ignores `p_user_id`, everything `auth.uid()` | ✅ correct and documented |
| `trg_notify_on_*` (5) | `public` ✅ | trigger context | ✅ |
| `handle_new_user` | **unpinned** ❌ | trigger on `auth.users` | ❌ **B7** |

No *new* instance of the caller-scoping mistake was found. The one inconsistency is `get_recommended_events`, which trusts `p_user_id` — but it is invoker-rights, so RLS still applies (B11).

### Exposure list

1. Draft reviews once a creation path exists (B1) — **P1 latent**.
2. Comment bodies on private reviews (B9).
3. The complete social graph (`*_follows` are `USING (true)`) — anyone can enumerate who follows whom, by design.
4. Full application source via published source maps (B3).
5. No CSP/frame protection on any page (B2).
6. Unauthenticated CPU-heavy public endpoint with no cache (B4).
7. `VITE_TICKETMASTER_API_KEY` — **not currently exposed** (unset in `.env.local`, provider is `mock`); becomes a live exposure the moment it is set (B10).
8. `sanitizeText` coverage — **no gap found.** Every rendered user-controlled string checked (review title/body, comment body, profile display name/username/bio/handles, list name/description, setlist notes, song names, event/venue/artist names, notification title/body, tag names) is wrapped. Write-side sanitisation is also applied in `useCreateReview`/`useUpdateReview`/`useSaveDraft`/`useCreateComment`. Zod length caps (title 200, body 5 000, bio 500, display_name 100) are **client-only** — the DB has no length constraints, so a scripted client can store arbitrarily long text; low severity given sanitisation, but it is an unbounded-storage vector.
9. Signed URLs: 1 h expiry ([constants.ts:41](apps/web/src/shared/lib/constants.ts:41)) for review photos, 300 s in the Edge Function. `getPublicPhotoUrl` exists and would produce a broken URL on the private bucket — but it has **zero callers** (D4). No misuse found.
10. `api/og-inject.ts` SSRF review: `reviewId` is `encodeURIComponent`-wrapped into a fixed `id=eq.…` PostgREST filter against a fixed host from `process.env` — the host is never attacker-influenced. The 302 target is a relative, encoded path. The `</head>` replacement uses a **function** replacer, so `$&`-style injection is not possible. **No SSRF or injection found.**

---

## 5. Bottleneck analysis

Assumes the P0s are fixed (otherwise most of these paths return 400 rather than being slow). "10 / 1 k / 100 k users" = registered users, with proportional content.

| # | Path | 10 users | 1 000 users | 100 000 users | First thing that breaks |
|---|---|---|---|---|---|
| 1 | Typeahead search (C1) | fine | ~50 ms seq scan on ~50 k events | **seq scan over millions of rows on every keystroke**; 3 concurrent scans per user | DB CPU saturates first; add trigram/FTS before 1 k |
| 2 | Activity feed (C3) | fine | 4 queries + whole follow graph per page; ~300–800 ms | follow lists of 10 k+ ids blow the PostgREST URL length; pagination already incorrect | Correctness fails before performance does — it is wrong at 1 k |
| 3 | Event reviews (C4) | fine | popular event ≈ 200 reviews, ~1 MB payload + 400 signed URLs | festival ≈ 5 000 reviews → multi-MB payload, storage-API rate limits on signing | Browser memory / signing throughput at ~1 k |
| 4 | Venue & artist lists (C5) | fine | `count=exact` ≈ 5 ms | `count=exact` over 200 k venues on every page click | Noticeable at ~10 k rows |
| 5 | Recommendations (C2) | fine | returns every future event (~20 k rows) | 100 k+ rows into a `.in()` URL → 414 | Breaks immediately once A2 is fixed — **fix C2 in the same commit** |
| 6 | Notification fan-out (C8) | fine | first ingest = tens of thousands of trigger-time subqueries | ingest run exceeds the 30-min GHA timeout | Ingest reliability at ~1 k followers/artist |
| 7 | Notification polling (C13) | 20 req/min | 2 000 req/min sustained | 200 000 req/min — well past free/pro connection limits | Supabase request quota at ~5 k users |
| 8 | `og-image` (B4, C7) | fine | 1.2 s per uncached crawler hit | one viral link = thousands of renders/min, each ~1.2 s CPU | Free-tier 500 k invocations, then CPU limits |
| 9 | Storage (C12) | fine | ~10 k photos ≈ 2–5 GB | ~1 M photos ≈ 200–500 GB, no lifecycle | Free tier (1 GB) at ~2 k photos |
| 10 | TM ingest (C9) | fine | city mode holds | 1 000-item cap per city per window truncates large metros | Silent data loss, no alert (G2) |
| 11 | Bundle (404 kB / gzip 122 kB) | fine | fine | fine | Not a bottleneck. Per-route chunks are all ≤ 19 kB; `lucide` and `date-fns` sit in the entry chunk because eagerly-loaded pages use them — acceptable |

---

## 6. Ranked opportunity backlog

Ordered by value ÷ effort. **Sprint 10** and **Sprint 11** are proposed new sprints; items marked *before Sprint 8* should jump the existing queue.

### Tier 0 — do these before any new feature work (proposed **Sprint 10: "Make it work on a real database"**, size M)

| # | Item | Findings | Effort |
|---|---|---|---|
| 1 | Migration 016: FKs to `public.profiles` on `reviews`, `comments`, `lists`, `setlists`, `user_follows` | A1 | S |
| 2 | Migration 016: fix `get_recommended_events` (ambiguity **+ the missing `LIMIT`**) and `get_artist_setlist_stats` | A2, A5, C2 | S |
| 3 | Fix `venueRatingSummarySchema` / `artistRatingSummarySchema` / setlist-stats `datetime({offset:true})` | A3, A10 | S |
| 4 | `venueList` destructuring fix | A4 | S |
| 5 | `tsc -b --noEmit` in `build` + CI, `vite/client` + `@jobs/*` in `tsconfig.app.json`, fix the resulting real errors | D1, E1 | M |
| 6 | Live-schema smoke + RPC contract test job in CI | E2, E3, E5 | M |
| 7 | `queryClient.clear()` on auth change + user-scoped keys | A9 | S |
| 8 | Migration 016: `status='published'` in the reviews SELECT policy, the storage policy, and all aggregation RPCs; `thumbnail_path` in the storage policy; pin `handle_new_user` search_path | B1, A8, B7 | S |

> One migration, one CI change, and four small client fixes turn a demo into a working product. Everything below is worth much less until this ships.

### Tier 1 — high value, low effort (proposed **Sprint 11: "Eyes on production"**, size S–M)

| # | Item | Findings | Effort |
|---|---|---|---|
| 9 | Sentry (web + edge) + Vercel Analytics + uptime checks | G1 | S |
| 10 | Security headers block in `vercel.json`; `sourcemap: 'hidden'` | B2, B3 | S |
| 11 | Ingest exit code + failure notification | A16, G2 | S |
| 12 | First-deploy verification of the crawler rewrite (checklist in G3) | G3 | S |
| 13 | Surface query errors instead of empty states (18 of 22 feature pages consume no error state; 27 call sites default to `[]`) | A13 | M |
| 14 | Trigram indexes on `events.name` / `venues.name`; drop the 4 redundant indexes | C1, C10 | S |
| 15 | `og-image`: static fallback for invalid ids, `no-store` on 5xx, cache rendered PNGs in Storage | A12, B4, C7 | M |

### Tier 2 — product features, ranked

| # | Feature | Why now | Verdict vs. current backlog | Effort |
|---|---|---|---|---|
| F1 | **Server-side search (Postgres FTS)** across events/artists/venues/reviews | Search is the primary discovery surface and is a verified seq scan (C1). A `tsvector` column + GIN index + one `search_all()` RPC replaces three `ILIKE` queries | **New — schedule immediately after Sprint 10.** Higher value than Sprint 8 | M |
| F2 | **Finish drafts** (Save-draft button, `status` handling in `useUpdateReview`) | A shipped feature is inert (A11); the UI to list and publish them already exists | **New, S.** Cheapest "new feature" in the repo | S |
| F3 | **Shareable Gig Wrapped card** | Reuses `og-image` end to end; Wrapped is built and unshared; strongest organic-growth lever the product has | **New — proposed Sprint 12.** Do after Tier 1 fixes B4/C7, or it amplifies the cost problem | M |
| F4 | **Account deletion + real privacy notice** | Legal exposure for an EU-hosted service; DB cascades already exist | **New, and arguably not optional.** Fold into Sprint 11 | M |
| F5 | **setlist.fm import** (existing Sprint 8) | Sound and unchanged — but note it lands on a setlist feature whose stats RPC is broken (A5) and whose event-setlist list 400s (A1) | **Keep, but gate on Sprint 10.** Importing data into a display path that returns 400 is wasted work | M |
| F6 | **Event timezone** (`events.timezone` from TM `dates.timezone`, venue-local rendering) | Fixes the wrong-date bug at the root (A7) across cards, iCal, CSV, Wrapped and share cards | **New, M.** Bundle with F1 if both touch the ingest schema | M |
| F7 | **Digest emails / notification grouping** | Preference gates exist; also relieves the dedupe limitation (one notification per review, ever) and the polling cost (C13) | **New, L.** After Sprint 11 | L |
| F8 | **Seat/section info + photo captions + "helpful" sorting** | Old Phase D3 leftovers; reactions data already exists for helpful-sorting | **New, S each.** Good filler work | S |
| F9 | **PWA + Web Push** (existing Sprint 9) | Solid, unchanged. Push would also let you drop the 30 s poll (C13) | **Keep as-is, after Sprint 10–12** | L |
| F10 | **Onboarding taste-picker / follow suggestions** | Recommendations are empty for new users even once A2 is fixed — nothing to recommend from | **New, M.** Pairs naturally with A2's fix | M |
| F11 | **Ticket price tracking** | TM data is ingested but `ticket_urls` JSONB is stored and never mined; prices aren't captured at all today | **New, L.** Requires an ingest schema change first | L |
| F12 | **Artist/venue claim & verification** | No moderation or ownership model exists anywhere yet; large surface | **Defer.** Not before an admin/moderation story exists | L |
| F13 | **Public API / embeddable rating widget** | Genuinely blocked: needs the Edge-Function proxy, server-side rate limiting (B5) and stable RPC contracts (E3) | **Defer** — correctly listed as deferred in SPRINTS.md | L |
| F14 | **i18n / light theme** | No pull signal; `darkMode: 'class'` is already wired, so a theme toggle is cheap if ever wanted | **Defer** | M |

### Backlog items this audit would *replace or re-order*

- **Sprint 8 (setlist.fm) should not be next.** Insert Sprint 10 (Tier 0) and Sprint 11 (Tier 1) ahead of it; Sprint 8's output is unreachable through the UI until A1 and A5 are fixed.
- **"Server-side rate limiting" (currently *Deferred/rejected*)** should be re-opened to at least P2 status: B5/B6 give an authenticated account unbounded write access to three tables.
- **"E2E mock-server for CI" (currently *Deferred — high effort*)** is the wrong framing. The cheap version (E2: `curl` the live anon REST for shape assertions) costs an afternoon and would have caught four of the five P0s.

---

## 7. What we deliberately did NOT flag

| Settled decision | Why we left it alone |
|---|---|
| Direct Supabase queries, no custom API layer | Explicit STATE.md decision; nothing found argues against it. D2 (generated DB types) *strengthens* it rather than replacing it. |
| No repository/data-access pattern | Explicitly rejected in STATE.md and re-confirmed in SPRINTS.md "Deferred / rejected". |
| RPCs as the server-side layer | Working well where the SQL is correct; the fixes proposed here add RPCs, they don't route around them. |
| Feature-based file structure | Consistent across all 12 features; barrel exports in place. No cohesion problem found. |
| Resolver triplication across events/venues/artists | D6 — extraction would reduce readability. ARCHITECTURE_REVIEW already split these apart deliberately in M1. |
| Named exports / function components / 4-space / single quotes / no comments | Spot-checked ~30 files: adhered to throughout, including in code written across seven different sprints. `App.tsx`'s `export default` is the documented exception. |
| Avatar bucket is public (no signed URLs) | Deliberate STATE.md decision; policy set is consistent with it. |
| `get_friends_attendance` / `get_user_year_stats` ignoring `p_user_id` | Documented, correct, and the safer choice. Verified: both scope to `auth.uid()`. |
| Friends' names bypassing `is_profile_public` in 014 | Deliberate, documented trade-off; the feature has no meaning otherwise. |
| Notification `(user_id, type, link)` dedupe collapsing repeat activity | Recorded Sprint 1 trade-off. Noted as an input to F7, not as a defect. |
| Wrapped UTC year windows | Recorded Sprint 6 trade-off. Rolled into A7/F6 as one problem rather than re-litigated separately. |
| GitHub Actions cron instead of Edge Functions for ingest | Documented Sprint 2 decision with sound rationale; the ingest problems found (A15/A16/C9) are in the job itself, not the scheduler. |
| `@vercel/og` instead of raw satori/resvg | Empirically justified and documented in DEPLOYMENT.md. |
| CI runs lint/test/build only, e2e stays local | Respected — E2 proposes a *new, cheap* smoke job rather than moving Playwright into CI. |
| Mock provider / `VITE_EVENTS_PROVIDER` modes | Exercised and useful. Flagged only where mock mode *masks* real-DB behaviour (A4, A13), not the mechanism itself. |
| `mock-events.json` ↔ `006_seed_mock_catalog.sql` drift risk | **Verified in sync** — all 29 seed UUIDs match exactly. Remains a maintenance risk, not a current defect. |

---

## 8. Stale-doc corrections

*(Listed only — no documentation files were edited.)*

**README.md**
1. Tech-stack table lists **Zustand**; it was removed (CONCERNS.md records this as FIXED) and appears in no `package.json`.
2. "Run **12** SQL migrations in order" — there are **15**.
3. The migration list stops at `012_review_photos_thumbnail.sql`. **013, 014 and 015 are missing** — following the README verbatim produces a database with no notification triggers, no `get_friends_attendance` and no `get_user_year_stats`. This is the single most damaging doc error in the repo.
4. Project structure omits `packages/jobs` and `supabase/functions`.
5. Feature list predates notifications, lists, setlists, comments, Wrapped and share cards.

**DEPLOYMENT.md**
6. Architecture Summary: "Database | **14 migrations**, full RLS" — 15.
7. "Share Cards / OG images" states the response is "fetched at most once per day per CDN edge". Verified false: `CF-Cache-Status: DYNAMIC` on every request (C7).

**docs/ARCHITECTURE_REVIEW.md**
8. §11 "Large Vendor Bundle — Main chunk is 609KB"; Health Score says 638 KB. Actual: **404.68 kB / gzip 122.09 kB**. → **stale**.
9. "Test Coverage Summary: Total 196" and "Tests: 192/192" → now **310**. → **stale**.
10. Accessibility row: "Needs axe-core automation" → done in Sprint 5 (`vitest-axe` + `checkA11y`). → **resolved**.
11. "Open Roadmap Items: Scheduled event sync / Image thumbnails / Export CSV" → all three shipped. → **resolved**.
12. M5 line says "New migration: `007_review_photos_thumbnail.sql`" → it is **012**; `007` is `social_features`. → **wrong**.
13. §10 "Inline Supabase Everywhere — LOW PRIORITY" → **still open**, and this audit raises its priority via D2 (untyped `any` results) without disturbing the architectural decision.
14. §12 "Mock Intersection/Resize Observers" → **still open**, still trivial.
15. Security score 8/10 → not supportable given B1/B2/B6; the rate-limiting/sanitisation work it credits is real, but the RLS `status` gap and missing headers were never assessed.

**.planning/codebase/CONCERNS.md**
16. "ArtistDetailPage … (~line 383)" → the actual site is **line 222** (line 33 for the hook). → **stale line reference**.
17. "Image Thumbnails — no thumbnail generation pipeline" → the pipeline shipped in M5; the live problem is now different and worse (A8: thumbnails are unreadable by non-owners).
18. "Sprint 7 — Cold-start latency … ~200–500 ms" understates it: warm renders measured at **1.17–1.29 s**, and there is no cache in front (C7).
19. "reviews → profiles PostgREST embed fails" is scoped to `useReview`/`useEventReviews`. → **understated**: the same failure hits `comments`, `setlists` (×2), `lists` and `user_follows` (×2) — 9 sites, 6 features.
20. The Security section does not mention that the `reviews` SELECT policy lacks a `status` gate (B1), which is the load-bearing assumption behind "Public review queries filter by status=published (no draft leak)" in STATE.md — that guarantee is client-side only.

**.planning/STATE.md**
21. "Public review queries filter by `status = 'published'` (no draft leak)" → true of the client, **not** of the database (B1).
22. "310 unit tests passing, 0 lint errors, 0 lint warnings" → **confirmed accurate** (re-verified during this audit).

---

## 9. Recommended manual checks (not performed here)

1. **First Vercel deploy** — the four-step crawler-rewrite checklist in G3. Cannot be simulated locally.
2. **Draft leak, end to end** — with a service-role session, insert a `status='draft', is_public=true` review, then read it with the anon key. Skipped: this audit made no writes. The policy text and a `status=eq.draft` anon query returning `200` are the evidence offered instead.
3. **Notification fan-out under load** — needs a seeded follow graph; would confirm C8's cost model.
4. **`supabase start` parity** — confirm the 15 migrations apply cleanly from scratch into an empty local database (the live project has drifted at least once: `012`'s header comment still says "Migration 007").
5. **Email deliverability** for magic links on the production domain.
6. **`og-image` under concurrency** — measure when the 2 s CPU limit is actually breached (B4). Skipped as it would be a load test against a live free-tier project.

---

*Audit performed read-only. No source file, migration, or database row was modified. `npm run build`, `npm run test` (310/310) and `npm run lint` (0 errors, 0 warnings) all pass unchanged.*
