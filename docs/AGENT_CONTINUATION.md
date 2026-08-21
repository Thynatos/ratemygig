# Agent continuation handoff (ratemygig)

Use this at the **start of each agent session** when continuing build-out against [PROMPT.md](../PROMPT.md). After your turn, **update the "Last updated" section** and the **Open work** list so the next agent can loop cleanly.

**Last updated:** 2026-08-21 (Sprint 5 complete — Performance & CI hardening, 260 tests, 0 lint errors 0 warnings)

---

## One-line state (copy into next agent message)

ratemygig M1–M5 + Sprints 1–5 complete: refactored APIs, split types, 260 tests, React.memo on cards, ARIA/focus management, rate limiting on 19 mutations, Zod validation on 9 RPC endpoints, sanitizeText on 50+ rendered fields, per-feature ErrorBoundaries on all 16 routes, CSV export from My Gigs, client-side image resize + thumbnail generation for review photos. Sprint 1: migration 013 adds SECURITY DEFINER notification triggers (artist_event, venue_event, new_review, new_comment, review_reaction) with preference gates + dedupe; 5 opt-out toggles in PreferencesForm. Sprint 2: .github/workflows/ingest.yml runs packages/jobs on GHA cron (06:00 UTC daily + workflow_dispatch); INGEST_CITIES env enables city-scoped ingest to stay under TM's 1000-item/query paging cap; DEPLOYMENT.md documents secrets/vars setup. Sprint 3: migration 014 adds SECURITY DEFINER get_friends_attendance RPC scoped to the caller's follow graph; Friends Going badge (avatar stack + count) on EventCard via optional pre-fetched prop (one batched RPC per page) and EventDetailPage; dependency-free ical.ts .ics builder with AddToCalendarButton (.ics download + Google Calendar template URL) on EventDetailPage and Export calendar on MyGigsPage. Sprint 4: optimistic updates with rollback (pure exported cache helpers, onMutate/onError/onSettled) for comment create/delete and list item add/remove; dedicated 2s RATE_LIMITS.LIST_ITEM limiter; AddToListButton auto-adds event to just-created list via CreateListModal onCreated; react-hooks warnings fixed with useWatch (plus a compiler-unmasked set-state-in-effect rewritten as render-phase state adjustment); CONCERNS.md Known Issues section emptied. Sprint 5: manualChunks bundle splitting (react-vendor/query-vendor/supabase-vendor) — index chunk 404 kB (gzip 122 kB), under the 500 kB threshold; vitest-axe with checkA11y helper (test/axe.ts, color-contrast off in jsdom) asserting on Button/Input/Modal/EventCard/Layout; .github/workflows/ci.yml (push/PR → Node 22, npm ci, lint, test, build; E2E stays local — no mock-server strategy). Build clean, 0 lint errors 0 warnings. Next: Sprint 6 (Gig Wrapped / year-in-review).

---

## Completed in repo (reference)

| Area | Notes | Primary paths |
|------|--------|----------------|
| UUID mock + DB seed | Aligns JSON with Postgres UUID PKs + FKs | `packages/db/seed/mock-events.json`, `packages/db/migrations/006_seed_mock_catalog.sql` |
| Discover/detail from DB | Supabase-first; provider filter from env | `apps/web/src/features/events/api/resolver.ts`, `apps/web/src/shared/lib/env.ts` |
| Ticketmaster in browser | Wraps jobs package TM client | `apps/web/src/features/events/providers/ticketmaster-browser-provider.ts`, `apps/web/vite.config.ts` (`@jobs`, `server.fs.allow`) |
| Venues / artists APIs | Supabase-first + fallbacks | `apps/web/src/features/venues/api/resolver.ts`, `apps/web/src/features/artists/api/resolver.ts` |
| Rating RPC filters in UI | Matches `get_*_rating_summary` params | `apps/web/src/features/venues/pages/VenueDetailPage.tsx`, `apps/web/src/features/artists/pages/ArtistDetailPage.tsx` |
| Attendance scoping | Current user only for read/update/delete | `apps/web/src/features/events/api/attendance.ts` |
| E2E tests | User flows: navigation, auth, search, mobile, footer, responsive | `apps/web/e2e/user-flows.spec.ts` |
| Component tests | UI kit + feature components + auth/layout | `apps/web/src/shared/components/ui/ui.test.tsx`, `apps/web/src/features/components.test.tsx`, `apps/web/src/shared/components/layout-auth.test.tsx` |
| Integration tests | DB→mock resolver flow for events, artists, venues | `apps/web/src/features/*/api/*.integration.test.ts` |
| Accessibility | ARIA landmarks, focus trap, skip-to-content | `apps/web/src/shared/components/Layout.tsx`, `apps/web/src/shared/components/ui/Modal.tsx` |
| Performance | React.memo on card components | `apps/web/src/features/*/components/*Card.tsx` |
| Docs / env | Migration list, Playwright install note | `README.md`, `.env.example` (`VITE_EVENTS_PROVIDER` includes `all`) |
| TM empty Discover UX | Empty-state banner when `VITE_EVENTS_PROVIDER=ticketmaster`; README "Ticketmaster and empty Discover" | `apps/web/src/features/events/pages/DiscoverPage.tsx`, `README.md` |
| A11y automation | vitest-axe + `checkA11y` helper (color-contrast off in jsdom); assertions for Button/Input/Modal/EventCard/Layout | `apps/web/src/test/axe.ts`, `apps/web/src/test/setup.ts`, `ui.test.tsx`, `components.test.tsx`, `layout-auth.test.tsx` |
| Bundle splitting | manualChunks: react-vendor/query-vendor/supabase-vendor; index 404 kB (gzip 122 kB) | `apps/web/vite.config.ts` |
| CI | push/PR → lint, test, build (E2E local-only, commented rationale) | `.github/workflows/ci.yml` |

Mock catalog for offline path: `apps/web/src/features/events/providers/mock-provider.ts`.

---

## Human / environment (not in git)

1. **Supabase SQL:** run migrations in order: `packages/db/migrations/001` … `014` (including **`006_seed_mock_catalog.sql`**, **`013_notification_triggers.sql`** which powers all live notifications, and **`014_friends_attendance.sql`** which powers the Friends Going badge), or the app leans on mock/empty DB behavior.
2. **`apps/web/.env.local`:** real `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`; optional `VITE_TICKETMASTER_API_KEY`, `VITE_EVENTS_PROVIDER` (`mock` | `ticketmaster` | `all`).
3. **Playwright (fresh machine):** `cd apps/web && npx playwright install` before `npm run test:e2e`.

---

## Open work vs PROMPT.md (suggested backlog)

> **2026-07-21:** The backlog below is superseded by [`.planning/SPRINTS.md`](../.planning/SPRINTS.md) —
> 9 ordered, independently-shippable sprints with acceptance criteria. Work the first
> unchecked sprint, one per session.

Milestones from `docs/ARCHITECTURE_REVIEW.md`:

**M4: Security & Data Hardening** ✅ COMPLETE
- Rate limiting on 19 mutation endpoints (follows, profile, lists, setlists, drafts, notifications, preferences, songs)
- Zod validation on 8 RPC call sites (venues, artists, discovery, setlists)
- sanitizeText on 50+ rendered fields across 25+ files
- Per-feature ErrorBoundaries on all 16 routes

**M5: Feature Completion** (next priority)
1. Export gig history as CSV — **needs requirements** (what columns? where in UI?)
2. Image thumbnails generation — **needs requirements** (resize dimensions? storage?)
3. Leaderboard time-range filters — ✅ Already implemented (year + city on TopVenues/TopArtists)
4. Missing loading skeleton states — ✅ Already implemented throughout app

**Polish / nice-to-have**
- axe-core accessibility automation
- Bundle size analysis / further code splitting
- Repository pattern to decouple UI from Supabase

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
