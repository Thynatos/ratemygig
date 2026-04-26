# Agent continuation handoff (ratemygig)

Use this at the **start of each agent session** when continuing build-out against [PROMPT.md](../PROMPT.md). After your turn, **update the “Last updated” section** and the **Open work** list so the next agent can loop cleanly.

**Last updated:** 2026-04-26 (Milestone 1 complete)

---

## One-line state (copy into next agent message)

ratemygig M1 complete: split 3 large API files into resolver/hooks/follows modules; split monolithic types into 13 domain files; added 12 barrel exports; extracted magic numbers to constants.ts; Zod-validated DB JSONB parsing. All 112 tests pass, build clean. Next: M2 (test coverage) or M3/M4.

---

## Completed in repo (reference)

| Area | Notes | Primary paths |
|------|--------|----------------|
| UUID mock + DB seed | Aligns JSON with Postgres UUID PKs + FKs | `packages/db/seed/mock-events.json`, `packages/db/migrations/006_seed_mock_catalog.sql` |
| Discover/detail from DB | Supabase-first; provider filter from env | `apps/web/src/features/events/api/events.ts`, `apps/web/src/shared/lib/env.ts` |
| Ticketmaster in browser | Wraps jobs package TM client | `apps/web/src/features/events/providers/ticketmaster-browser-provider.ts`, `apps/web/vite.config.ts` (`@jobs`, `server.fs.allow`) |
| Venues / artists APIs | Supabase-first + fallbacks | `apps/web/src/features/venues/api/venues.ts`, `apps/web/src/features/artists/api/artists.ts` |
| Rating RPC filters in UI | Matches `get_*_rating_summary` params | `apps/web/src/features/venues/pages/VenueDetailPage.tsx`, `apps/web/src/features/artists/pages/ArtistDetailPage.tsx` |
| Attendance scoping | Current user only for read/update/delete | `apps/web/src/features/events/api/events.ts` |
| E2E smoke | Home + 404 | `apps/web/playwright.config.ts`, `apps/web/e2e/discover.spec.ts` |
| Docs / env | Migration list, Playwright install note | `README.md`, `.env.example` (`VITE_EVENTS_PROVIDER` includes `all`) |
| TM empty Discover UX | Empty-state banner when `VITE_EVENTS_PROVIDER=ticketmaster`; README “Ticketmaster and empty Discover” | `apps/web/src/features/events/pages/DiscoverPage.tsx`, `README.md` |

Mock catalog for offline path: `apps/web/src/features/events/providers/mock-provider.ts`.

---

## Human / environment (not in git)

1. **Supabase SQL:** run migrations in order: `packages/db/migrations/001` … `006` (including **`006_seed_mock_catalog.sql`**), or the app leans on mock/empty DB behavior.
2. **`apps/web/.env.local`:** real `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`; optional `VITE_TICKETMASTER_API_KEY`, `VITE_EVENTS_PROVIDER` (`mock` | `ticketmaster` | `all`).
3. **Playwright (fresh machine):** `cd apps/web && npx playwright install` before `npm run test:e2e`.

---

## Open work vs PROMPT.md (suggested backlog)

Milestones from `docs/ARCHITECTURE_REVIEW.md`:

**M2: Test Coverage** (next priority)
1. Component tests for UI kit (Button, Input, Modal, StarRating, etc.)
2. Component tests for feature components (EventCard, FeedCard, etc.)
3. Deepen E2E tests (user flows: login→browse→review, follow/unfollow)
4. Integration tests for DB→mock resolver flow
5. Tests for AuthProvider, ProtectedRoute, Layout

**M3: Performance & Accessibility**
1. React.memo on card components
2. useMemo/useCallback on large pages
3. ARIA labels, roles, keyboard nav
4. Focus trap, keyboard handlers, skip-to-content
5. Client-side image resize for review photos

**M4: Security & Data Hardening**
1. Zod validation for all Supabase response parsing
2. Consistent sanitizeText() everywhere
3. Per-feature error boundaries

**M5: Feature Completion**
1. Export gig history as CSV
2. Image thumbnails generation
3. Leaderboard time-range filters
4. Missing loading skeleton states

---

## Loop checklist (each agent turn)

1. Read this file + `PROMPT.md` §11–12 (implementation order / acceptance).
2. Implement **one** backlog slice; keep diffs focused.
3. Run from repo root: `npm run build`, `npm run test`, `npm run test:e2e` (when UI touched).
4. Update **Last updated** and **Open work** here; leave a short summary in the user chat.

---

## Commands (repo root)

```bash
npm install
npm run dev
npm run build
npm run test
npm run test:e2e
npm run jobs:ingest   # requires packages/jobs env (service role, TM key)
```
