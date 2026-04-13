# Stack

## Runtime & Language

- **Language**: TypeScript (strict mode via `typescript-eslint`)
- **Runtime**: Node.js 18+ (frontend: browser; jobs: Node.js)
- **Package Manager**: npm (workspaces monorepo)
- **Module System**: ESM (`"type": "module"` in `packages/jobs/package.json`; web app uses Vite ESM)

## Frontend (`apps/web`)

| Concern | Technology | Version |
|---------|-----------|---------|
| Framework | React | 19.2 |
| Build | Vite | 7.2 |
| Routing | React Router DOM | 6.25 |
| State (server) | TanStack React Query | 5.51 |
| State (client) | Zustand (declared but minimal usage) | 4.5 |
| Forms | React Hook Form + @hookform/resolvers | 7.52 / 3.9 |
| Validation | Zod | 3.23 |
| Styling | Tailwind CSS | 3.4 |
| Icons | Lucide React | 0.424 |
| Dates | date-fns | 3.6 |

## Frontend Dev Dependencies

| Tool | Version |
|------|---------|
| TypeScript | ~5.9 |
| ESLint | 9.39 + typescript-eslint 8.46 + react-hooks + react-refresh |
| Vitest | 2.0 |
| Playwright | 1.45 |
| Testing Library | @testing-library/react 16 + @testing-library/jest-dom 6.6 |
| jsdom | 25.0 |

## Backend (Supabase)

| Concern | Technology |
|---------|-----------|
| Database | PostgreSQL (via Supabase) |
| Auth | Supabase Auth (magic link + Google OAuth) |
| Storage | Supabase Storage (`review-photos` bucket) |
| API | Supabase client SDK (direct from frontend, no custom API layer) |
| Aggregations | PostgreSQL RPC functions (`get_venue_rating_summary`, `get_artist_rating_summary`) |

## Background Jobs (`packages/jobs`)

| Concern | Technology | Version |
|---------|-----------|---------|
| Runtime | tsx (TypeScript runner) | 4.19 |
| Supabase client | @supabase/supabase-js | 2.49 |
| Scheduling | node-cron | 3.0 |
| Language | TypeScript | ~5.6 |

## Shared Packages

| Package | Purpose |
|---------|---------|
| `@ratemygig/core` | Domain types (`Event`, `Venue`, `Artist`, `Review`, etc.) + `IEventsProvider` interface |
| `@ratemygig/db` | SQL migrations (001-006) + seed data (`mock-events.json`) |

## Vite Aliases

Defined in `apps/web/vite.config.ts`:

| Alias | Resolves To |
|-------|------------|
| `@` | `apps/web/src` |
| `@shared` | `apps/web/src/shared` |
| `@features` | `apps/web/src/features` |
| `@core` | `packages/core/src` |
| `@jobs` | `packages/jobs/src` (browser-shimmed for Ticketmaster client) |

## Environment Variables

| Variable | Scope | Purpose |
|----------|-------|---------|
| `VITE_SUPABASE_URL` | Frontend | Supabase project URL |
| `VITE_SUPABASE_ANON_KEY` | Frontend | Supabase anon key |
| `VITE_EVENTS_PROVIDER` | Frontend | `mock` / `ticketmaster` / `all` |
| `VITE_TICKETMASTER_API_KEY` | Frontend | Optional: live TM API from browser |
| `TICKETMASTER_API_KEY` | Jobs | Server-side TM API key |
| `SUPABASE_URL` | Jobs | Supabase project URL (service role) |
| `SUPABASE_SERVICE_ROLE_KEY` | Jobs | Supabase service role key (bypasses RLS) |
| `INGEST_COUNTRIES` | Jobs | Comma-sep country codes (default: `US`) |
| `INGEST_CLASSIFICATION` | Jobs | Event classification (default: `music`) |
| `INGEST_DAYS_AHEAD` | Jobs | Days ahead to fetch (default: `180`) |

## NPM Scripts (root)

| Script | Action |
|--------|--------|
| `npm run dev` | Start Vite dev server on port 3000 |
| `npm run build` | Production build |
| `npm run preview` | Preview production build |
| `npm run test` | Run Vitest unit tests |
| `npm run test:e2e` | Run Playwright E2E tests |
| `npm run lint` | ESLint |
| `npm run jobs:ingest` | One-shot Ticketmaster sync |
| `npm run jobs:start` | Start cron scheduler |
| `npm run jobs:test-api` | Test TM API connection |