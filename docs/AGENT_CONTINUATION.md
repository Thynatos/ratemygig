# Agent continuation handoff (ratemygig)

Use this at the **start of each agent session** when continuing build-out against [PROMPT.md](../PROMPT.md). After your turn, **update the “Last updated” section** and the **Open work** list so the next agent can loop cleanly.

**Last updated:** 2026-04-04

---

## One-line state (copy into next agent message)

ratemygig: UUID mock + `006_seed_mock_catalog.sql` added; events/venues/artists are Supabase-first with mock/TM fallbacks in `apps/web/src/features/**/api/*.ts`; TM browser wrapper uses `@jobs` in `vite.config.ts`; venue/artist rating filters wired on detail pages; Playwright smoke in `apps/web/e2e/`; **Ticketmaster empty Discover** callout on `DiscoverPage` + README section for `npm run jobs:ingest` and env. **Human must** apply SQL migrations in Supabase and set `apps/web/.env.local`. **Still open:** browse-time upsert (or jobs-only ingestion docs), deeper e2e, PROMPT polish (rate limits, XSS/sanitize review text, etc.), DX mock-json import consolidation.

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

Pick **one** item per iteration unless the user says otherwise.

1. **Ingestion story** – Browse-time upsert is **not** implemented (RLS blocks anon writes); real sync is **`packages/jobs`** + service role. Options: document clearly, or add Edge Function / RPC (design + security).
2. **E2E depth** – Only discover + not-found; add flows: login (if testable), event detail, review write (needs test DB or mocks).
3. **PROMPT NFRs** – Rate limiting (where applicable), XSS/sanitize user review HTML, stronger empty/error states (beyond TM Discover callout).
4. **DX** – Vite warning: dynamic + static import of `mock-events.json`; consolidate loading.

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
