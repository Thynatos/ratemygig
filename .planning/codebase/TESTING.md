# Testing

## Unit Tests — Vitest

**Configuration**: `apps/web/vitest.config.ts`
**Setup**: `apps/web/src/test/setup.ts`
**Command**: `npm run test` (from repo root)

### Test Files

| File | Tests | Focus |
|------|-------|-------|
| `apps/web/src/shared/lib/utils.test.ts` | 31 | Utility functions |
| `apps/web/src/shared/validation/schemas.test.ts` | 27 | Zod schema validation |
| `apps/web/src/shared/lib/provider-policy.test.ts` | Unknown | Provider policy logic |
| `apps/web/src/features/events/api/events.resolver.test.ts` | Unknown | Event resolution (DB → TM → mock fallback) |
| `apps/web/src/features/venues/api/venues.resolver.test.ts` | Unknown | Venue resolution |
| `apps/web/src/features/artists/api/artists.resolver.test.ts` | Unknown | Artist resolution |

### Testing Pattern

- Tests use dependency injection (`resolveEventsWithDeps`, `resolveEventWithDeps`) to mock data sources
- No Supabase client mocking — resolver tests swap the fetch implementations directly
- Zod schema tests validate valid/invalid inputs

## E2E Tests — Playwright

**Configuration**: `apps/web/playwright.config.ts`
**Command**: `npm run test:e2e` (from repo root)
**Browser install**: `cd apps/web && npx playwright install`

### Test Files

| File | Scope |
|------|-------|
| `apps/web/e2e/discover.spec.ts` | Home page + 404 smoke test |

### Gaps

- No E2E test coverage for: login flow, event detail, review write, venue/artist detail
- Tests require running Supabase (no mock server configured)
- No test database seeding strategy for E2E

## Linting

- ESLint 9 flat config with `typescript-eslint`, `react-hooks`, `react-refresh`
- Command: `npm run lint` (from repo root)
- Ignores `dist/`

## Build Verification

- `npm run build` — Vite production build with sourcemaps
- Pre-deploy: lint + build + test recommended