# Concerns

## Security

### ~~XSS / Review Body Sanitization~~ — FIXED
- **Resolved**: Added `dompurify` + `sanitizeText()` utility at `apps/web/src/shared/lib/sanitize.ts`
- Applied at write-side (`reviews.ts` create/update mutations) and read-side (all 3 pages rendering review body/title)
- Tests: 11 new tests in `sanitize.test.ts`

### No Rate Limiting
- **Risk**: No rate limiting on review creation, attendance toggling, or photo uploads
- **Location**: All `useMutation` hooks in `api/*.ts` files
- **Recommendation**: Add Supabase Edge Functions with rate limiting, or client-side throttling

### API Key Exposure
- **Risk**: `VITE_TICKETMASTER_API_KEY` is embedded in the client bundle
- **Location**: `apps/web/src/shared/lib/env.ts`, `ticketmaster-browser-provider.ts`
- **Mitigation**: Ticketmaster API has its own rate limits, but a proxy through Supabase Edge Functions would be safer

### RLS Gaps
- **Concern**: Review photo access depends on parent review's `is_public` flag — this requires careful RLS policy (defined in `002_rls_policies.sql`) but should be verified against actual Supabase behavior
- **Concern**: Browse-time upsert (writing events from client) is blocked by RLS for anon users — this is intentional but means the app depends on `packages/jobs` for data ingestion

## Data Integrity

### Mock Seed Data Consistency
- **Concern**: `mock-events.json` and `006_seed_mock_catalog.sql` must stay UUID-aligned. Any changes to one require updating the other.
- **Location**: `packages/db/seed/mock-events.json` + `packages/db/migrations/006_seed_mock_catalog.sql`

### Provider Filter Scoping
- **Concern**: When `VITE_EVENTS_PROVIDER=ticketmaster`, the app will return empty results if no TM-linked data exists in the database and no API key is set. The `DiscoverPage` shows an empty-state banner, but this could confuse developers.
- **Location**: `apps/web/src/features/events/pages/DiscoverPage.tsx`, `shared/lib/provider-policy.ts`

## Performance

### Missing Pagination on Venues/Artists
- **Concern**: `VenuesPage` and `ArtistsPage` may load all records without pagination. With large datasets, this could cause performance issues.
- **Location**: `apps/web/src/features/venues/api/venues.ts`, `apps/web/src/features/artists/api/artists.ts`

### Image Thumbnails
- **Concern**: PROMPT.md recommends generating thumbnails; currently full-size images are served from Supabase Storage
- **Location**: Photo upload in `apps/web/src/features/reviews/components/PhotoUploader.tsx`

### No Caching Strategy for Ticketmaster Browser Calls
- **Concern**: Each Ticketmaster browser API call hits the external API directly with no client-side caching beyond React Query's 2-minute stale time
- **Location**: `ticketmaster-browser-provider.ts`

## Architecture

### No Custom Backend API Layer
- **Concern**: All data flows directly from React → Supabase client. This works but makes it harder to add server-side business logic, rate limiting, or data transformation in the future.
- **Mitigation**: RPC functions in PostgreSQL serve as the server-side layer for aggregations

### ~~Unused Zustand Dependency~~ — FIXED
- **Resolved**: Removed `zustand` from `apps/web/package.json` — was declared but never imported anywhere in the codebase.

## Developer Experience

### Vite Dynamic + Static Import Warning
- **Concern**: Dynamic import of `ticketmaster-browser-provider.ts` alongside static import of `mock-catalog.ts` causes Vite warnings
- **Location**: `apps/web/src/features/events/providers/` (noted in `AGENT_CONTINUATION.md`)

### Supabase Configuration Required
- **Concern**: App requires real Supabase credentials to function beyond mock mode. No local Supabase Docker setup documented in README.
- **Mitigation**: Mock provider allows development without Supabase, but features like auth and reviews are non-functional

### Missing E2E Test Coverage
- **Concern**: Only `discover.spec.ts` exists — no E2E for login, review, profile, or venue/artist flows
- **Location**: `apps/web/e2e/`

## Incomplete Features (from PROMPT.md / README roadmap)

### Not Yet Implemented
1. **Scheduled event sync** — `packages/jobs` has the script but no Supabase Edge Function / cron setup
2. **Image thumbnails generation** — no thumbnail pipeline
3. **Top rated venues/artists leaderboard** — RPC functions exist but no dedicated UI
4. **Review reactions** (helpful/upvote) — not in schema or code
5. **Friend follow system** — not in schema or code
6. **Export gig history as CSV** — not implemented
7. **Browse-time event upsert** — explicitly blocked by RLS, relies on jobs ingestion