# Sprint 6 — Gig Wrapped (year-in-review) — Implementation Plan

> **Status:** Planned · **Sprint:** 6 of 9 · **Size:** M · **Owner spec:** `.planning/SPRINTS.md`
> **Goal:** Personal, shareable yearly stats — the "Letterboxd Wrapped" moment.
> **Acceptance:** `/wrapped` renders correct numbers for a seeded user; `?year=` param works; link from ProfilePage; empty state for new users.

**Read first:** `docs/AGENT_CONTINUATION.md`, `.planning/codebase/CONVENTIONS.md`, `.planning/codebase/CONCERNS.md`.

---

## Order of work (each step independently verifiable)

1. Migration `015_user_year_stats.sql` (+ manual verification block)
2. Core types + Zod schema (+ schema tests)
3. Feature API: `useYearStats` hook + pure `resolveWrappedYear` (+ unit tests)
4. `WrappedPage` + route + ProfilePage entry point (+ page tests, incl. `checkA11y`)
5. Docs, verification, commit

---

## Step 1 — DB: `packages/db/migrations/015_user_year_stats.sql`

### Design decisions (record in CONCERNS.md after shipping)

- **`SECURITY DEFINER`, caller-scoped, `p_user_id` ignored** — same deliberate pattern as `014_friends_attendance.sql`: attendance RLS is owner-only and `review_photos` access is gated through the parent review's `is_public`; a DEFINER function avoids every RLS edge case. The body filters by `auth.uid()` ONLY (not `p_user_id`); the param exists for signature compatibility. Header comment must state this.
- **Always returns exactly one row** (all-scalar subqueries) so the client can distinguish "loaded with no data" (empty state) from "RPC failed". Use `LANGUAGE sql STABLE` — no variables needed.
- **Year window (UTC):** `start_at`/`created_at` are `TIMESTAMPTZ`; compare against
  `make_timestamptz(p_year, 1, 1, 0, 0, 0, 'UTC')` .. `< make_timestamptz(p_year + 1, 1, 1, 0, 0, 0, 'UTC')`.
  Tradeoff: a local-time midnight show on Dec 31 may count as Jan 1 UTC — document, don't fix.
- **JSONB pitfalls (must handle):**
  - `COUNT(*)` is `bigint` and jsonb rejects bigint → cast `COUNT(*)::INT` everywhere inside `jsonb_build_object`.
  - `AVG(rating)` is `numeric`; return the table column as `DOUBLE PRECISION` (`COALESCE(ROUND(AVG(r.rating), 1)::FLOAT8, 0)`) so PostgREST serializes a JS number, not a numeric string.
- **Year scope per metric:** attendance stats by the **event's** `start_at` year; review/photos stats by the **review's** `created_at` year. Photos are counted for reviews written in that year (not photo `created_at`), so Wrapped totals reconcile with "reviews written".

### Function spec

```sql
CREATE OR REPLACE FUNCTION public.get_user_year_stats(p_user_id UUID, p_year INT)
RETURNS TABLE(
  gigs_attended    INT,
  reviews_written  INT,
  avg_rating_given DOUBLE PRECISION,
  photos_uploaded  INT,
  distinct_cities  INT,
  first_gig_date   TIMESTAMPTZ,
  last_gig_date    TIMESTAMPTZ,
  top_artists      JSONB,
  top_venues       JSONB
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
```

- `gigs_attended` — `COUNT(*)::INT` of `attendance a JOIN events e` where
  `a.user_id = auth.uid() AND a.status = 'attended'` and `e.start_at` in the year window.
- `reviews_written` — `COUNT(*)::INT` of `reviews` where `user_id = auth.uid()`
  `AND status = 'published'` and `created_at` in window.
- `avg_rating_given` — `COALESCE(ROUND(AVG(rating), 1)::FLOAT8, 0)` over the same reviews set.
- `photos_uploaded` — `COUNT(*)::INT` of `review_photos rp JOIN reviews r ON r.id = rp.review_id`
  with the same review filters (user, published, year window).
- `distinct_cities` — `COUNT(DISTINCT e.city)::INT` over attended events in window.
- `first_gig_date` / `last_gig_date` — `MIN(e.start_at)` / `MAX(e.start_at)` over attended events in window (`NULL` when none).
- `top_artists` — `jsonb_build_object('name', ar.name, 'count', COUNT(*)::INT)` from
  `attendance → events → event_artists → artists` for attended events in window,
  `GROUP BY ar.id, ar.name ORDER BY COUNT(*) DESC, ar.name LIMIT 5`, wrapped in
  `COALESCE(jsonb_agg(js), '[]'::jsonb)`.
- `top_venues` — same shape via `events.venue_id → venues`, **exclude `venue_id IS NULL`**,
  order `COUNT(*) DESC, v.name`, limit 5.

### Manual verification block (bottom of file, like `014`)

Seed via SQL editor: insert 2 attended events in year Y (one with an artist + venue),
1 attended event in year Y-1, 1 published review in Y with a photo row, 1 draft review in Y →
assert exactly: `gigs_attended=2`, `reviews_written=1`, `photos_uploaded=1`,
`distinct_cities` correct, top lists contain the expected names with correct counts,
`set_config('request.jwt.claim.sub', ...)` required to simulate the caller, and the
anti-enumeration check (pass another user's id → same result).

---

## Step 2 — Types + validation

### `packages/core/src/types/wrapped.ts` (new)

```ts
export interface YearStatEntry { name: string; count: number }

export interface UserYearStats {
  gigs_attended: number
  reviews_written: number
  avg_rating_given: number
  photos_uploaded: number
  distinct_cities: number
  first_gig_date: string | null
  last_gig_date: string | null
  top_artists: YearStatEntry[]
  top_venues: YearStatEntry[]
}
```

Re-export from `packages/core/src/types/index.ts` following its existing pattern.

### `apps/web/src/shared/validation/schemas.ts` (RPC Response Schemas section)

```ts
export const yearStatEntrySchema = z.object({ name: z.string(), count: z.number() })
export const yearStatsSchema = z.object({
  gigs_attended: z.number(), reviews_written: z.number(), avg_rating_given: z.number(),
  photos_uploaded: z.number(), distinct_cities: z.number(),
  first_gig_date: z.string().nullable(), last_gig_date: z.string().nullable(),
  top_artists: z.array(yearStatEntrySchema), top_venues: z.array(yearStatEntrySchema),
})
```

### Tests — extend `apps/web/src/shared/validation/schemas.test.ts`

- parses a full valid RPC row (with populated top lists)
- parses zero-data row (`gigs_attended: 0`, `[]` lists, `null` dates)
- rejects when `top_artists` entries miss `count`

---

## Step 3 — Feature API: `apps/web/src/features/wrapped/api/yearStats.ts`

Follow `features/setlists/api/stats.ts` (RPC + `validateRpcResponse`) and
`features/profile/api/profile.ts` (key factory) conventions.

```ts
export const yearStatsKeys = { detail: (userId: string, year: number) => ['wrapped', userId, year] as const }

export function resolveWrappedYear(param: string | null, now: Date = new Date()): number
```

`resolveWrappedYear` rules (pure, exported for tests — Sprint 4 precedent):
1. Parse `param` as int; if invalid (NaN, < 2000, > current year) → fall through to default.
2. Default: `now.getFullYear()`, except January (month 0) → `now.getFullYear() - 1`.

```ts
export function useYearStats(userId: string | undefined, year: number) {
  return useQuery({
    queryKey: yearStatsKeys.detail(userId ?? '', year),
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_user_year_stats', { p_user_id: userId, p_year: year })
      if (error) throw error
      if (!data || data.length === 0) return null
      return validateRpcResponse(yearStatsSchema, data[0], 'get_user_year_stats') as UserYearStats
    },
    enabled: !!userId && Number.isFinite(year),
    staleTime: 5 * 60 * 1000,
  })
}
```

### Tests — `apps/web/src/features/wrapped/api/yearStats.test.ts`

- `resolveWrappedYear('2025', new Date('2026-08-21'))` → `2025`
- `resolveWrappedYear('2024', new Date('2026-01-15'))` → `2024` (valid param beats January default)
- `resolveWrappedYear(null, new Date('2026-01-15'))` → `2025` (January default)
- `resolveWrappedYear(null, new Date('2026-08-21'))` → `2026`
- invalid / out-of-range / future params (`'abc'`, `'1999'`, `'2027'` with now=2026) → default
- `yearStatsSchema` rejects a row where `avg_rating_given` is a string (PostgREST numeric leak guard)

---

## Step 4 — UI

### `apps/web/src/features/wrapped/pages/WrappedPage.tsx` (new)

- `useSearchParams()` for `year`; `useAuth()` for `user`; `useYearStats(user?.id, resolvedYear)`.
- Header: `section-title` "Your Year in Review" + year controls:
  - Prev button (decrement, min 2000) · Next button (disabled at current year) · the
    resolved year rendered via `formatNumber`-free plain text.
  - Buttons call `setSearchParams({ year: String(y) })` — URL stays shareable.
- Stat cards grid (2/4 cols) **reusing GigStatsCard visual language** (`Card` + lucide
  icon + `formatNumber` + `text-surface-400` label):
  Gigs attended (Calendar), Reviews written (Star), Average rating (Star, 1 decimal),
  Photos (Camera), Cities (MapPin), First/last gig dates (rendered via existing date
  formatting util if present, else `new Date(x).toLocaleDateString()`).
- Top Artists list (rank, name, count "N gigs") and Top Venues list — same card style.
- Empty state: when `gigs_attended === 0` → card with copy + CTA `Link` to `/` ("Discover shows").
- Loading: `LoadingPage message="Crunching your year..."`. Errors bubble to the route's
  `FeatureErrorBoundary`.

### `apps/web/src/features/wrapped/index.ts` (new)

Named exports `WrappedPage`, `useYearStats`, `resolveWrappedYear` — mirror `features/profile/index.ts`.

### `apps/web/src/app/App.tsx`

- Add lazy: `const WrappedPage = lazy(() => import('@/features/wrapped/pages/WrappedPage').then(m => ({ default: m.WrappedPage })))`
- Add inside the `ProtectedRoute` block:
  `<Route path="/wrapped" element={<FeatureErrorBoundary title="Gig Wrapped"><WrappedPage /></FeatureErrorBoundary>} />`

### `apps/web/src/features/profile/pages/ProfilePage.tsx`

- New `Card` below `GigStatsCard` (line ~137): title "Your Year in Review", one-line
  copy, `Link to="/wrapped"` styled like existing buttons. No new queries on this page.

### Tests — `apps/web/src/features/wrapped/pages/WrappedPage.test.tsx`

Mock pattern: `vi.mock('@/features/wrapped/api/yearStats')` + `vi.mock('@/features/auth/hooks/useAuth')`
(PreferenceForm / layout-auth precedent). Wrap in `MemoryRouter initialEntries={['/wrapped']}`.
Cases:
1. renders stat values + top-5 names from mocked stats
2. renders empty state when `gigs_attended === 0` (and hides top lists)
3. Next button disabled when resolved year is the current year; click Prev → `setSearchParams` called with year-1
4. January default: mock `Date`/`vi.setSystemTime` (or pass param-free `resolveWrappedYear` inputs) → page requests year-1
5. `checkA11y(container)` has no violations (Sprint 5 helper)

---

## Step 5 — Docs & ship

1. **CONCERNS.md** — new "Sprint 6 — Gig Wrapped (Notes & Tradeoffs)" section:
   - DEFINER + `p_user_id` ignored (same rationale as 014)
   - UTC year-window edge (local Dec 31 / Jan 1)
   - `COUNT(*)::INT` jsonb cast + `avg` as `DOUBLE PRECISION` (PostgREST numeric-string guard)
   - photos counted against the review's year
2. **SPRINTS.md** — tick `[x]` on row 6.
3. **STATE.md** — status → "Sprint 6 complete — next up: Sprint 7 (Share cards / OG images)";
   add completed bullets; Last Activity date.
4. **AGENT_CONTINUATION.md** — update "Last updated", one-line state, "Completed in repo" row.
5. **README.md** — grep for a matching roadmap item ("Year in review" / Wrapped); tick if present.
6. **Verification (repo root):** `npm run build` · `npm run test` · `npm run lint`.
   E2E: existing specs unchanged; run `npm run test:e2e` only if a live Supabase is available.
7. **Migration note for user:** `015_user_year_stats.sql` must be applied to Supabase
   before `/wrapped` returns real data (add to DEPLOYMENT.md migration list if it lists them).
8. Graphify rebuild: `python -c "from graphify.watch import _rebuild_code; from pathlib import Path; _rebuild_code(Path('.'))"`
9. Commit: `feat: Sprint 6 — Gig Wrapped: get_user_year_stats RPC (015) + /wrapped page with year nav, top artists/venues, ProfilePage entry`

---

## Acceptance checklist (SPRINTS.md)

- [ ] `/wrapped` renders correct numbers for a seeded user (manual SQL verification passes)
- [x] `?year=` param works and survives navigation buttons
- [x] Link from ProfilePage reaches `/wrapped`
- [x] Empty state (no attendance that year) with CTA to Discover
- [x] 0 lint errors/warnings; build clean; new tests pass; axe clean on WrappedPage
