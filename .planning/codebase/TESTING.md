# Testing

## Unit Tests — Vitest

**Configuration**: `apps/web/vitest.config.ts`
**Setup**: `apps/web/src/test/setup.ts`
**Command**: `npm run test` (from repo root)
**Status**: 86 tests passing, 0 lint errors

### Test Files

| File | Tests | Focus |
|------|-------|-------|
| `apps/web/src/shared/lib/utils.test.ts` | 31 | Utility functions |
| `apps/web/src/shared/validation/schemas.test.ts` | 27 | Zod schema validation |
| `apps/web/src/shared/lib/sanitize.test.ts` | 11 | XSS sanitization |
| `apps/web/src/shared/lib/provider-policy.test.ts` | 4 | Provider policy logic |
| `apps/web/src/features/events/api/events.resolver.test.ts` | 5 | Event resolution (DB → TM → mock fallback) |
| `apps/web/src/features/venues/api/venues.resolver.test.ts` | 4 | Venue resolution (returns `{ data, hasMore }`) |
| `apps/web/src/features/artists/api/artists.resolver.test.ts` | 4 | Artist resolution (returns `{ data, hasMore }`) |

### Testing Pattern

- Tests use dependency injection (`resolveEventsWithDeps`, `resolveVenuesWithDeps`, etc.) to mock data sources
- Venue/artist resolvers return `{ data: T[], hasMore: boolean }` — tests must provide objects in this shape
- No Supabase client mocking — resolver tests swap the fetch implementations directly
- Zod schema tests validate valid/invalid inputs

## E2E Tests — Playwright

**Configuration**: `apps/web/playwright.config.ts`
**Command**: `npm run test:e2e` (from repo root)
**Browser install**: `cd apps/web && npx playwright install`

### Test Files

| File | Scope |
|------|-------|
| `apps/web/e2e/discover.spec.ts` | Home page hero, empty search clear, 404 route |
| `apps/web/e2e/login.spec.ts` | Login page renders, validation error, nav redirect |
| `apps/web/e2e/venue.spec.ts` | Venues nav, listing state, venue detail 404, top venues page |
| `apps/web/e2e/artist.spec.ts` | Artists nav, listing state, artist detail 404, top artists page |
| `apps/web/e2e/review.spec.ts` | Review 404, write review auth redirect, my gigs auth redirect |

### Gaps

- Tests require running Supabase instance (no mock server strategy for CI)
- No test database seeding strategy for E2E
- No visual regression testing
- No performance/load testing

## Linting

- ESLint 9 flat config with `typescript-eslint`, `react-hooks`, `react-refresh`, React Compiler plugin
- Command: `npm run lint` (from repo root)
- Ignores `dist/`
- Pre-existing warnings: React Hook Form `watch()` incompatible library warnings (2)
- Known React Compiler rule: `set-state-in-effect` — bypassed in `usePhotoUrls.ts` for data-fetching pattern

## Build Verification

- `npm run build` — Vite production build with sourcemaps
- Pre-deploy: lint + build + test recommended
- Current build: ~666KB JS (single chunk), ~38KB CSS
- Chunk size warning: consider code-splitting for routes