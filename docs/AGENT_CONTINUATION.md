# Agent continuation handoff (ratemygig)

Use this at the **start of each agent session** when continuing build-out against [PROMPT.md](../PROMPT.md). After your turn, **update the "Last updated" section** and the **Open work** list so the next agent can loop cleanly.

**Last updated:** 2026-04-26 (Milestones 1–4 complete, 196 tests)

---

## One-line state (copy into next agent message)

ratemygig M1–M4 complete: refactored APIs, split types, 196 tests, React.memo on cards, ARIA/focus management, rate limiting on 19 mutations, Zod validation on 8 RPC endpoints, sanitizeText on 50+ rendered fields, per-feature ErrorBoundaries on all 16 routes. Build clean, 0 lint errors. Next: M5 features (CSV export, thumbnails) or polish.

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

Mock catalog for offline path: `apps/web/src/features/events/providers/mock-provider.ts`.

---

## Human / environment (not in git)

1. **Supabase SQL:** run migrations in order: `packages/db/migrations/001` … `006` (including **`006_seed_mock_catalog.sql`**), or the app leans on mock/empty DB behavior.
2. **`apps/web/.env.local`:** real `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`; optional `VITE_TICKETMASTER_API_KEY`, `VITE_EVENTS_PROVIDER` (`mock` | `ticketmaster` | `all`).
3. **Playwright (fresh machine):** `cd apps/web && npx playwright install` before `npm run test:e2e`.

---

## Open work vs PROMPT.md (suggested backlog)

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
