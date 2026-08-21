# Sprint 10 Implementation Prompt — "Make it work on a real database"

> **Usage:** Paste this entire file as the opening message of a fresh agent session
> (or point the agent at `.planning/SPRINT10_PROMPT.md`). It is self-contained.
> **Output:** code + one migration + one CI change. **Size: M.** One session.

---

You are a senior full-stack engineer. Your mission: fix the class of defects that make
**ratemygig** non-functional against a real Supabase project, and install the two gates
(type-checking, live-schema smoke tests) that let them ship in the first place.

Every bug below was reproduced against the live project on 2026-08-21 and is written up
with evidence in **`docs/AUDIT_REPORT.md`** — read that first; it is the specification for
this sprint. This prompt is the executable subset (its "Tier 0" table).

**This sprint ships no new features.** Resist the urge to improve anything not listed here;
Tier 1 and the product backlog are already scheduled in the audit report §6.

---

## 1. Project context (verified facts — trust these)

- **What:** Concert discovery + rating platform ("Letterboxd for gigs").
- **Stack:** React 19 + Vite 7 + Tailwind 3 SPA (`apps/web`), TanStack React Query, direct
  Supabase client queries (no API layer), Supabase Postgres/Auth/Storage, Supabase Edge
  Functions (Deno), Ticketmaster ingestion via `packages/jobs` on a GitHub Actions cron.
- **Monorepo:** `apps/web` · `packages/core` (domain types) · `packages/db` (15 migrations,
  001–015) · `packages/jobs` · `supabase/functions/og-image`.
- **State:** Sprints 1–7 complete. Sprint 8 (setlist.fm) and 9 (PWA + Push) are planned and
  **deliberately deferred behind this sprint** — Sprint 8 writes data into two display paths
  that currently return HTTP 400.
- **Today's bar:** 310 unit tests pass, 0 lint errors/warnings, build clean, index chunk
  404.68 kB (gzip 122.09 kB). **All of this stays true when you are done.**
- **Docs of record:** `docs/AUDIT_REPORT.md` (findings + evidence — the spec for this sprint),
  `.planning/STATE.md` (settled architecture), `.planning/codebase/CONVENTIONS.md`,
  `.planning/codebase/CONCERNS.md`, `.planning/SPRINTS.md`, `DEPLOYMENT.md`.

## 2. Environment facts (verified this machine)

- Supabase CLI 2.115, project `lpfyzjfqyyrdknzgxoul` (eu-central-1, Postgres 17.6).
  Read-only SQL: `supabase db query --linked --project-ref lpfyzjfqyyrdknzgxoul "<SELECT>"`.
- `apps/web/.env.local` has a real `VITE_SUPABASE_URL` + anon key, with
  `VITE_EVENTS_PROVIDER=mock`. **`isSupabaseConfigured()` is true**, so the DB code paths run
  even in mock mode — which is exactly why these bugs reproduce locally.
- Verify from repo root: `npm run build` · `npm run test` · `npm run lint`.
- Local UI probe: `npm run dev` (port 3000).
- Known-good fixtures: published review `f9f9fe86-354a-4f6b-8000-5b42b83d7708`
  (Arctic Monkeys — The Car Tour, 5/5) · venue `b0000001-0000-4000-8000-000000000005`
  (Brixton Academy, has that review) · venue `b0000001-0000-4000-8000-000000000008`
  (Barclays Center) · artist `b0000002-0000-4000-8000-000000000007` ·
  event `b0000003-0000-4000-8000-000000000007`.

## 3. Rules

- Follow `.planning/codebase/CONVENTIONS.md`: named exports, function components,
  4-space indent, single quotes, no comments in code, `sanitizeText()` on rendered user text.
- Respect `.planning/STATE.md`: direct Supabase queries, feature-based structure, RPCs as the
  server layer, **no repository pattern, no custom API layer**. Nothing here requires them.
- **Never apply the migration by writing to the live database from this session.** Author the
  SQL file; verification against the live project happens in Task 9 under human supervision.
  `SELECT`-only queries against the live DB are fine and encouraged.
- One migration file for all DB work: `packages/db/migrations/016_schema_fixes.sql`.
  It must be **idempotent** (re-runnable) like every other migration in the folder.
- Do not touch `.env*`, `supabase/.temp/`, or `graphify-out/`.

---

## 4. Tasks

Work them in order — 1–4 are independent and unblock the UI; 5–7 are the gates; 8 is the
security migration content. Tasks 1, 2 and 8 all land in the same migration file.

### Task 1 — Add foreign keys to `public.profiles` (P0, unblocks 6 features)

**Problem.** No table has an FK to `public.profiles`; every `user_id` points at
`auth.users`. PostgREST therefore cannot resolve any `profile:profiles(...)` embed and
returns `400 PGRST200`. Nine query sites across six features are dead:

| Site | Feature that is broken today |
|---|---|
| `features/reviews/api/reviews.ts:28` | Event review lists (renders "No reviews yet") |
| `features/reviews/api/reviews.ts:52` | `/r/:reviewId` (renders "Review not found") |
| `features/comments/api/comments.ts:41`, `:79` | Comments on reviews |
| `features/setlists/api/setlists.ts:28`, `:57` | Event setlists + setlist detail |
| `features/lists/api/lists.ts:93` | `/lists/:listId` |
| `features/profile/api/follows.ts:45`, `:62` | Followers / Following lists |

**Do.** In `016_schema_fixes.sql`, add FKs from each of those tables to `public.profiles(id)`:
`reviews.user_id`, `comments.user_id`, `lists.user_id`, `setlists.user_id`,
`user_follows.follower_id`, `user_follows.following_id`. Keep the existing `auth.users` FKs;
`profiles.id` **is** `auth.users.id`, so both hold simultaneously.

Notes you will need:
- **Data is clean — verified.** `users_without_profile = 0`, `reviews_without_profile = 0`,
  `follows_without_profile = 0` as of 2026-08-21. Re-run that check before adding the
  constraints and make the migration fail loudly if orphans exist rather than silently
  skipping (a `DO $$ ... RAISE EXCEPTION ... $$` guard is fine).
- Use `ON DELETE CASCADE` to match the existing `auth.users` FKs. Deleting an auth user
  cascades to `profiles`, which now cascades onward — same end state as today.
- Idempotency: `IF NOT EXISTS` is not available for `ADD CONSTRAINT`; guard with a
  `pg_constraint` lookup.
- **`user_follows` gains two FKs to `profiles`** (one per column), so its embeds stay
  ambiguous and *must* keep a disambiguating hint. `follows.ts:45` and `:62` currently use
  `profiles!user_follows_follower_id_fkey` / `..._following_id_fkey` — **those names belong to
  the existing `auth.users` constraints**, and you cannot reuse them for the new ones (the
  names are taken on the same table). So: name the new constraints distinctly (e.g.
  `user_follows_follower_profile_fkey`) and **update both hints in `follows.ts` to match**.
  Verify with a live REST call rather than assuming the hint resolved.
- PostgREST caches the schema. Supabase reloads it automatically on DDL, but if an embed
  still 400s right after the migration, `NOTIFY pgrst, 'reload schema';` is the manual nudge.

**Acceptance.** All nine sites return `200`. Specifically:
`GET /rest/v1/reviews?id=eq.f9f9fe86-354a-4f6b-8000-5b42b83d7708&select=*,profile:profiles(display_name)`
→ `200` with a populated `profile`, and `/r/f9f9fe86-354a-4f6b-8000-5b42b83d7708` renders the
review instead of "Review not found".

### Task 2 — Fix the two RPCs that have never executed (P0)

Both are live SQL errors, not edge cases.

**2a. `get_recommended_events` → `42702 column reference "event_id" is ambiguous`.**
`packages/db/migrations/010_discovery_intelligence.sql:116` —
`SELECT DISTINCT ON (event_id) event_id, reason, priority FROM event_scores` collides with the
`RETURNS TABLE(event_id UUID, ...)` OUT parameter. Qualify the references
(`es.event_id` with the CTE aliased) or rename the OUT params.

**2b. The same function ignores `p_limit` entirely** — there is no `LIMIT` clause, so it
returns *every* future event. `features/discovery/api/discovery.ts:41` then feeds all of those
ids into a single `.in('id', eventIds)`. **Fix both in the same change**, or fixing 2a turns a
400 into a 414 at any real data volume. Add
`ORDER BY priority DESC, ... LIMIT p_limit`.

**2c. `get_artist_setlist_stats` → `42703 column ss.song_id does not exist`.**
`009_setlist_stats_rpc.sql:37` selects `ss.song_id`, but the `ss` subquery at `:41` only
projects `setlist_id, song_count`. Project `song_id` too, or compute unique songs in a
separate scalar subquery.

Redefine both functions in `016_schema_fixes.sql` with `CREATE OR REPLACE FUNCTION`
(do **not** edit 009/010 — migrations already applied to production are immutable).

**Acceptance.** Both RPCs return `200` for the fixture ids, and `get_recommended_events`
returns at most `p_limit` rows.

### Task 3 — Fix the three wrong Zod RPC schemas (P0/P2)

**3a. Rating summaries.** `shared/validation/schemas.ts:163` and `:178` require
`count_ratings` — a column that neither `get_venue_rating_summary` nor
`get_artist_rating_summary` has ever returned. `validateRpcResponse` throws, so **every venue
and artist page shows "No ratings yet"**, including ones with reviews.

The RPC actually returns (verified live):
`venue_id, venue_name, city, avg_rating, count_reviews, rating_1, rating_2, rating_3, rating_4, rating_5`.

Alignment decision — **recommended: make the flat RPC shape the source of truth.**
`VenueRatingSummary`/`ArtistRatingSummary` in `packages/core/src/types/rating.ts` declare a
nested `distribution: RatingDistribution`, but `distribution` has **zero producers and zero
consumers** anywhere in the codebase (verified by grep). Meanwhile `ArtistDetailPage.tsx:243`
and `VenueDetailPage.tsx:213` read `ratingSummary['rating_${stars}']` **flat**, and only
type-check because of the `as VenueRatingSummary` cast. So: change the Zod schemas *and*
`RatingSummary` to the flat `rating_1..rating_5` shape, and drop the casts. Do not change the
RPC — its output is already what the UI reads.

**3b. Setlist-stats timestamps.** `schemas.ts:226` and `:239-240` use
`z.string().datetime()`, which rejects offsets. PostgREST serialises `timestamptz` as
`2026-03-15T20:00:00+00:00`, so `useArtistSongStats` and `useSongStats` will throw the moment
any setlist song exists (they pass today only because `setlist_songs` is empty). Add
`{ offset: true }`, exactly as `yearStatsSchema` at `:254` already does.

**3c. Recommendation reasons.** `recommendedEventSchema:194` allows
`attended_venue | popular | similar_taste`, but the RPC emits
`followed_artist | followed_venue | preferred_city | trending`. Two of the four real values
fail validation. Align the enum with the RPC (and with `RecommendationReason` in
`packages/core`), then check what `RecommendedEventsSection` renders for each reason.

**Acceptance.** `/venues/b0000001-0000-4000-8000-000000000005` shows **5.0 (1 review)** and a
populated distribution bar chart instead of "No ratings yet". No
`RPC response validation failed` lines in the browser console on any page.

### Task 4 — Fix the `ArtistDetailPage` crash (P1)

`features/artists/pages/ArtistDetailPage.tsx:33` does `const { data: venueList = [] } = useVenues()`
and `:222` calls `venueList.map(...)`, but `useVenues()` resolves to `{ data, hasMore }`.
Live console: `TypeError: venueList.map is not a function` → the whole page is replaced by the
`FeatureErrorBoundary` card.

Destructure properly: `const { data: venuesResult } = useVenues()` then
`const venueList = venuesResult?.data ?? []`.

This is the **only** consumer with this mismatch — `VenuesPage:22`, `ArtistsPage:19` and
`DiscoverPage:31` all read `.data` correctly. Do not go looking for more; Task 5 will find
any that exist.

**Acceptance.** `/artists/b0000002-0000-4000-8000-000000000007` renders the artist page with a
populated venue filter dropdown.

### Task 5 — Turn TypeScript on (P1, the root cause)

`apps/web/package.json:8` is `"build": "vite build"` — no `tsc`. `.github/workflows/ci.yml`
runs lint/test/build only, and ESLint uses `tseslint.configs.recommended` (**not**
type-checked). TypeScript has never been enforced. `npx tsc -p tsconfig.app.json --noEmit`
exits 2 with **46 errors in 18 files** — including Task 4's bug, which would have been caught
on the commit that introduced it.

**5a. Close the config gaps first** (about 20 of the 46 errors are missing type config, not
real defects) in `apps/web/tsconfig.app.json`:
- `"types": ["vite/client", "vitest/globals"]` — kills 11 × `Property 'env' does not exist on type 'ImportMeta'`
  in `env.ts`, `logger.ts`, `ErrorBoundary.tsx`.
- A `@jobs/*` path alias mapping to `../../packages/jobs/src/*` — `vite.config.ts` already has
  it, `tsconfig.app.json` does not, so `ticketmaster-browser-provider.ts` cannot resolve its
  imports. **Warning:** adding this pulls `packages/jobs` into the type-check and may surface
  new errors there (it uses `.js`-suffixed ESM specifiers). If it does, prefer narrowing the
  alias or adding jobs as a project reference over disabling the check.
- A `*.css` module declaration (or `vite/client`, which provides it) for `main.tsx:9`.
- `vitest-axe` matcher types (`/// <reference types="vitest-axe/extend-expect" />` in
  `src/test/setup.ts` or a `.d.ts`) — kills 6 × `toHaveNoViolations does not exist`
  plus the error in `src/test/axe.ts`.

**5b. Fix the ~26 genuine errors.** Notable ones, with the intended fix:
- `feed.ts:130`, `:180` — the profile lookups select 4 columns but the `Map` is typed from
  `{ id: string }`, so `author`/`user` don't satisfy `ReviewFeedItem`/`AttendanceFeedItem`.
  Type the select result properly. **Do not** widen the interfaces to `any`.
- `PublicProfilePage.tsx:72` — `data as (typeof data & { list_items: ... })[]` intersects the
  **array** type with the row shape, which is why `:286-298` report 6 × "Property 'id' does not
  exist". Type the row explicitly.
- `PublicProfilePage.tsx:110`, `:115` — `sanitizeText(profile.display_name || profile.username)`
  where both are nullable. Use `?? 'Anonymous'`.
- `NotificationsPage.tsx:13` — `Notification[]` passed where an index-signature type is
  expected. Fix the helper's signature, not the call site.
- `sanitize.ts:22` unused `@ts-expect-error`, `:37/:44/:51` "Object is possibly null" —
  `getPurify()` returns a nullable field; narrow it.
- `components.test.tsx:8` imports `FeedItem` from `@core/index`, which does not export it.

**5c. Wire it in.** `"build": "tsc -b --noEmit && vite build"` in `apps/web/package.json`, and
a dedicated `- run: npx tsc -b --noEmit` step in `ci.yml` **before** `npm run test` so the
failure message is unambiguous.

**Acceptance.** `npx tsc -b --noEmit` exits 0. `npm run build` still produces an index chunk
under 500 kB. Zero `any` and zero `@ts-ignore` added.

### Task 6 — A CI job that actually talks to the database (P1)

Four of this sprint's five P0s (Tasks 1, 2, 3) are invisible to 310 passing unit tests
because **nothing in CI ever contacts Postgres**, and the three `*.integration.test.ts` files
are mock-only (they inject fake `deps` into `resolveXxxWithDeps`).

Build the cheap version — an afternoon, not a Docker rewrite:

**6a. A live-schema smoke test.** For each shape the app actually requests, issue one anon
REST call against the live project and assert `200`:
- every `profile:profiles(...)` embed from Task 1's table (nine of them),
- every RPC in `supabase.rpc(...)` across the codebase, called once with fixture arguments.

**6b. An RPC contract test.** For each RPC, parse one returned row with the Zod schema that
the app uses for it and assert `safeParse().success`. This is the test that makes Task 3
permanent — it fails the moment an RPC's columns and its schema diverge again.

**6c. Wire it into `ci.yml`** as a separate job needing `SUPABASE_URL` and
`SUPABASE_ANON_KEY` repo secrets. Guard it so it is skipped (not failed) on fork PRs, which
do not receive secrets:
`if: github.event_name == 'push' || github.event.pull_request.head.repo.full_name == github.repository`.
Keep the existing `build-test` job secret-free and unchanged.

**6d.** Rename the three misleading `*.integration.test.ts` files to
`*.resolver-contract.test.ts`. They are good tests with a name that promises coverage the
project does not have.

**Acceptance.** The new job passes on `main`. Reverting Task 2a or Task 3a locally makes it
fail with a message that names the offending RPC.

### Task 7 — Clear the query cache on sign-out (P1)

There is no `queryClient.clear()`/`removeQueries`/`resetQueries` anywhere (grep: 0 hits), and
`AuthProvider.tsx:66` `signOut` only calls Supabase. Many keys are not user-scoped:
`['my-gigs', status]`, `['user-review', eventId]`, `draftKeys.byUser()`,
`feedKeys.timeline(page)`, `discoveryKeys.recommended('current')`,
`venueFollowKeys.followedVenues()`, `artistFollowKeys.followedArtists()`, and
`userFollowKeys.isFollowing(targetId)` (keyed by the *target*, not the viewer).

Result: on a shared device, the next account sees the previous account's gigs, drafts, feed
and follow state until each query goes stale (default 5 minutes).

**Do.** Clear the cache in `signOut`, and on `onAuthStateChange` when the user identity
changes. Then add `user.id` to the user-scoped key factories.

**Critical detail:** `onAuthStateChange` also fires `TOKEN_REFRESHED` (roughly hourly) and
`INITIAL_SESSION`. Clearing on every event would wipe the cache on every token refresh. Gate
on `SIGNED_OUT`, or on the previous session's user id differing from the new one.

**Acceptance.** Sign in as A, visit `/my-gigs`, sign out, sign in as B — B sees B's data
immediately. A token refresh does not empty the cache (assert this in a unit test on whatever
pure helper you extract for the decision; follow the Sprint 4 precedent of extracting pure
functions rather than inventing mutation-mock infrastructure).

### Task 8 — Close the RLS `status` gap and the thumbnail gap (P1/P2)

All in `016_schema_fixes.sql`.

**8a. `reviews` SELECT policy has no `status` gate.** Live policy:
`USING ((is_public = true) OR (auth.uid() = user_id))`. `status` was added in `011` and the
policy was never updated, so draft protection is **client-side only** —
`GET /rest/v1/reviews?status=eq.draft` would return drafts to anyone. Change the anon branch
to `(is_public = true AND status = 'published')`; **keep the owner branch unqualified** or
`useDrafts()` (which queries `status = 'draft'` for the current user) breaks.

**8b. Same omission downstream.** Add `AND r.status = 'published'` to the five aggregation
functions in `004_aggregation_functions.sql` and to `get_trending_events` in `010` (redefine
them in `016`, don't edit the old files). Without this, a draft would silently count toward
public venue/artist averages.

**8c. Thumbnails are unreadable by non-owners.** The storage policy
`Public can read photos of public reviews` matches `rp.storage_path = objects.name` only, but
thumbnails are written to `thumbnail_path` (`.../thumbs/...`). Every non-owner viewing a
public review silently fails to sign the thumbnail and falls back to the full-size image — the
M5 thumbnail optimisation currently delivers zero bandwidth saving in production. Extend the
policy with `OR rp.thumbnail_path = objects.name`, and add the same `status = 'published'`
condition while you are in there.

**8d. Pin the one unpinned `SECURITY DEFINER` search_path.**
`ALTER FUNCTION public.handle_new_user() SET search_path = public, pg_temp;` — it is the only
one of the eight DEFINER functions without it (the seven from 013/014/015 are correct).

**Acceptance.** `useDrafts()` still returns the owner's drafts. Anon cannot read a draft.
A signed-out browser successfully signs a thumbnail URL for a public review's photo.

### Task 9 — Verify, then hand off

1. `npm run lint` → 0 errors, 0 warnings.
2. `npx tsc -b --noEmit` → exit 0.
3. `npm run test` → all pass (310 + whatever you add; the count must not go **down**).
4. `npm run build` → clean, index chunk still under 500 kB.
5. **Ask the human to apply `016_schema_fixes.sql`** to the live project, then re-run the
   Task 6 smoke job and walk these five routes in `npm run dev` with the real `.env.local`:
   - `/r/f9f9fe86-354a-4f6b-8000-5b42b83d7708` → renders the review with its author
   - `/events/b0000003-0000-4000-8000-000000000007` → shows the review, not "No reviews yet"
   - `/venues/b0000001-0000-4000-8000-000000000005` → shows 5.0 (1 review) + distribution
   - `/artists/b0000002-0000-4000-8000-000000000007` → renders, no error boundary
   - `/venues/top` → unchanged (regression check; it works today)

   The browser console must be free of `400` responses and
   `RPC response validation failed` lines on all five.
6. Update the docs: mark Sprint 10 `[x]` in `.planning/SPRINTS.md` (add the row — this sprint
   post-dates the file), update `.planning/STATE.md`, and empty the CONCERNS.md entries this
   sprint resolves. `docs/AUDIT_REPORT.md` is a dated artefact — **do not rewrite it**; note
   which finding ids are closed in STATE.md instead.
7. Rebuild the graph:
   `python -c "from graphify.watch import _rebuild_code; from pathlib import Path; _rebuild_code(Path('.'))"`
   (`graphify-out/` is gitignored).
8. Commit on a branch (not `main`) as
   `fix: Sprint 10 — profiles FKs, broken RPCs, RPC schemas, type-check + live-schema CI`.

---

## 5. Out of scope — do not do these

Named explicitly because they are tempting while you are in these files:

- **Event timezones (audit A7).** Dates render in the viewer's timezone, not the venue's, and
  the share card disagrees with the page. Real, and a separate sprint — it needs an `events.timezone`
  column and an ingest change.
- **The activity feed (A6, C3).** Its attendance source can never return a row under
  owner-only RLS, and its pagination is structurally wrong. Needs a new RPC; own sprint.
- **Error/empty state handling (A13).** 27 sites do `const { data: x = [] }`, turning query
  failures into empty states — this is *why* these bugs hid for a sprint. Tier 1, not here.
- **Security headers, Sentry, source maps, `og-image` caching** (B2, B3, B4, C7, G1) — Tier 1,
  next sprint.
- **Finishing the Drafts feature (A11).** `useSaveDraft` has no callers, so drafts cannot be
  created. Task 8a hardens the DB for the day they can be; building the UI is a separate item.
- **Generated database types (D2).** The right long-term fix for `any`-typed Supabase results,
  but it would collide with every file Task 5 touches. Next sprint, on a clean tree.
- **Any refactor of the three resolvers.** The audit explicitly assessed and kept the
  duplication (§7).

## 6. Success criteria

- The five routes in Task 9.5 work against the live database.
- `npx tsc -b --noEmit` is green **and enforced** in both `npm run build` and CI.
- A CI job exists that fails when an RPC's shape and its Zod schema diverge.
- Anon cannot read a draft review; a signed-out visitor can load a public review's thumbnail.
- Lint 0/0, tests green, build under 500 kB — the existing bar, unchanged.
