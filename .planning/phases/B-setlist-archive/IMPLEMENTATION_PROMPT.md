# Phase B: Setlist Archive — Implementation Prompt

## Project Context

**RateMyGig** is a concert discovery and rating web app. It's a monorepo with React 19 + Vite + Tailwind on the frontend, Supabase (Postgres, Auth, Storage, RLS) on the backend — no custom API server. All data access is `supabase.from('table')` or `supabase.rpc()` directly from React hooks.

**Repository:** `C:\Users\badir\Documents\ratemygig`

**Current state:** Phase A (Social Proof) is complete. 112 unit tests pass, 0 lint errors, build succeeds. The app has auth, event discovery, attendance, reviews with photos, venue/artist rating pages, follow systems, review reactions, and an activity feed.

**What Phase B adds:** Community wiki-style setlists for events. Users can view setlists, add their own, see what songs an artist plays most, and explore individual songs.

---

## Architecture & Conventions

Read these files for full context before starting:
- `.planning/codebase/STACK.md` — Tech stack details
- `.planning/codebase/CONVENTIONS.md` — Code style and patterns
- `.planning/codebase/ARCHITECTURE.md` — Architecture decisions
- `.planning/codebase/STRUCTURE.md` — Directory structure

Key conventions:
- **Named exports only** (no default exports except App.tsx)
- **Function components** with hooks
- **Feature module pattern:** `features/{name}/api/`, `features/{name}/components/`, `features/{name}/pages/`
- **Path aliases:** `@/` (src root), `@shared/`, `@features/`, `@core/`
- **Query key factories** co-located in `api/*.ts` files (e.g., `setlistKeys.byEvent(eventId)`)
- **Optimistic mutations** with `onMutate`/`onError` rollback pattern
- **RLS policies:** owner can CRUD own rows, public can read all
- **Rate limiting** via `createRateLimiter()` from `shared/lib/throttle.ts`
- **Sanitize all user text** with `sanitizeText()` from `shared/lib/sanitize.ts`
- **Icons** from `lucide-react`
- **Route-level code splitting:** Use `React.lazy()` + `Suspense` for new route components (see `apps/web/src/app/App.tsx` for the pattern)
- **No comments in code** unless explicitly requested

Existing migrations are numbered `001` through `007`. Next migration is `008`.

Existing RPC functions: `get_venue_rating_summary`, `get_artist_rating_summary`, `get_event_rating_summary`, `get_venue_top_tags`, `get_artist_top_tags` in migration `004_aggregation_functions.sql`.

---

## Phase B Plans

There are 3 plans in 2 waves:

### B-01 (Wave 1 — Foundation) — MUST BE DONE FIRST
**File:** `.planning/phases/B-setlist-archive/B-01-PLAN.md`

Creates the database schema and all API hooks. Other plans depend on this.

**Deliverables:**
1. `packages/db/migrations/008_setlists.sql` — Three tables: `songs`, `setlists`, `setlist_songs` with indexes, constraints, triggers, and RLS policies
2. Domain types in `packages/core/src/types/index.ts` — `Song`, `Setlist`, `SetlistSong`, `SetlistWithSongs` interfaces
3. `apps/web/src/features/setlists/api/songs.ts` — `useSongSearch(query, artistId?)` and `useCreateSong()` hooks
4. `apps/web/src/features/setlists/api/setlists.ts` — Full CRUD hooks: `useEventSetlists`, `useSetlist`, `useMySetlists`, `useCreateSetlist`, `useUpdateSetlist`, `useDeleteSetlist`, `useAddSong`, `useRemoveSong`, `useReorderSongs`
5. All hooks must: use `useAuth()` for auth checks, use `enabled: !!id && !!user` guards where appropriate, use optimistic updates for mutations, rate-limit setlist creation (5s)

**Schema details** (see B-01-PLAN.md for full SQL):
- `songs` table: id, name, artist_id (FK → artists, ON DELETE SET NULL), created_at. UNIQUE(name, artist_id)
- `setlists` table: id, event_id (FK → events), user_id (FK → auth.users), source ('manual'|'verified'), notes, created_at, updated_at. UNIQUE(event_id, user_id)
- `setlist_songs` table: id, setlist_id (FK → setlists), song_id (FK → songs), position, is_encore, is_debut, notes, created_at. UNIQUE(setlist_id, song_id, position)
- RLS: songs = public read, authenticated insert; setlists = public read, owner CRUD; setlist_songs = public read, owner of parent setlist CRUD

### B-02 (Wave 2 — UI, depends on B-01)
**File:** `.planning/phases/B-setlist-archive/B-02-PLAN.md`

**Deliverables:**
1. `SetlistViewer.tsx` — Read-only view of a setlist (ordered song list with position numbers, encore markers, debut badges, notes)
2. `SetlistCard.tsx` — Compact card for list view (first 3-4 songs preview, source badge, song count)
3. `SetlistEditor.tsx` — Full editor for creating/editing setlists (song search autocomplete, position management with up/down buttons, encore/debut toggles, notes fields, save via useCreateSetlist/useUpdateSetlist)
4. `SetlistPage.tsx` — Page at `/events/:eventId/setlist` showing all setlists for an event
5. Add "Setlists" section to `EventDetailPage.tsx` (between reviews and sidebar bottom)
6. Add lazy-loaded route in `App.tsx` for `/events/:eventId/setlist`

**Key behaviors:**
- Only authenticated users can create setlists
- Only the setlist owner can edit/delete their own setlist
- Song search is typeahead against the songs table with "Create '{query}'" option for new songs
- Use `Music` icon from lucide-react for section headers

### B-03 (Wave 2 — Statistics, parallel to B-02)
**File:** `.planning/phases/B-setlist-archive/B-03-PLAN.md`

**Deliverables:**
1. `packages/db/migrations/009_setlist_stats_rpc.sql` — Three RPC functions: `get_artist_song_stats(p_artist_id, p_limit)`, `get_artist_setlist_stats(p_artist_id)`, `get_song_stats(p_song_id)`
2. `apps/web/src/features/setlists/api/stats.ts` — `useArtistSongStats`, `useArtistSetlistStats`, `useSongStats` hooks
3. `SongStatsList.tsx` — Table of most-played songs for an artist (#, Song Name, Times Played, Last Played)
4. `ArtistSetlistSummary.tsx` — Compact stats card (setlist count, avg length, unique songs)
5. `SongPage.tsx` — Page at `/songs/:songId` showing song details, play count, events where played
6. Add "Song Statistics" section to `ArtistDetailPage.tsx`
7. Add lazy-loaded route in `App.tsx` for `/songs/:songId`

**RPC function signatures** (see B-03-PLAN.md for full SQL):
- `get_artist_song_stats(UUID, INTEGER)` → returns song_id, song_name, play_count, last_played
- `get_artist_setlist_stats(UUID)` → returns setlist_count, avg_song_count, total_unique_songs
- `get_song_stats(UUID)` → returns artist_id, artist_name, play_count, first_played, last_played

---

## Execution Order

1. **B-01 first** — Create migration, types, song API, setlist API, tests
2. **B-02 and B-03 in parallel** — UI components and statistics (no file overlap)
3. **After each plan:** Run `npm run lint`, `npm run test`, `npm run build` and fix any errors
4. **After all plans:** Update `.planning/ROADMAP.md` marking B-01/B-02/B-03 as complete, update `.planning/STATE.md` and `.planning/codebase/CONCERNS.md`

---

## Verification Checklist

After completing ALL plans, verify:
- [ ] `npm run lint` — 0 errors (2 pre-existing warnings in ProfilePage/WriteReviewPage are OK)
- [ ] `npm run test` — All tests pass (currently 112)
- [ ] `npm run build` — Build succeeds  
- [ ] All new TypeScript types compile
- [ ] All migrations are valid SQL (correct FK references, indexes, RLS)
- [ ] All hooks follow the established pattern (query key factory, optimistic mutations, `useAuth` for auth checks)
- [ ] New route components are lazy-loaded via `React.lazy()`
- [ ] No unnecessary comments in code
- [ ] User text is sanitized with `sanitizeText()` where applicable
- [ ] Rate limiters applied to creation mutations

---

## Important Files to Read Before Starting

| File | Why |
|------|-----|
| `apps/web/src/features/artists/api/artists.ts` | Pattern for query key factories + follow hooks |
| `apps/web/src/features/reviews/api/reviews.ts` | Pattern for reaction hooks with rate limiting |
| `apps/web/src/features/feed/api/feed.ts` | Pattern for complex multi-query hooks with error isolation |
| `packages/db/migrations/007_social_features.sql` | Most recent migration (pattern for RLS, indexes) |
| `packages/db/migrations/004_aggregation_functions.sql` | Pattern for RPC functions |
| `apps/web/src/app/App.tsx` | Route definitions and lazy-loading pattern |
| `apps/web/src/features/events/pages/EventDetailPage.tsx` | Where setlist section will be added |
| `apps/web/src/features/artists/pages/ArtistDetailPage.tsx` | Where song stats will be added |
| `packages/core/src/types/index.ts` | Where new domain types go |