# Concerns

## Security

### ~~XSS / Review Body Sanitization~~ — FIXED
- **Resolved**: Added `dompurify` + `sanitizeText()` utility at `apps/web/src/shared/lib/sanitize.ts`
- Applied at write-side (`reviews.ts` create/update mutations) and read-side (all 3 pages rendering review body/title)
- Tests: 11 new tests in `sanitize.test.ts`

### ~~No Rate Limiting~~ — FIXED
- **Resolved**: Added client-side rate limiting via `createRateLimiter()` in `apps/web/src/shared/lib/throttle.ts`
- `useCreateReview`: 5s throttle
- `useUploadReviewPhotos`: 3s throttle
- `useToggleAttendance`: 2s throttle
- **Remaining risk**: Client-side only; a determined user can bypass. Server-side rate limiting via Supabase Edge Functions would be more robust.

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

### ~~Missing Pagination on Venues/Artists~~ — FIXED
- **Resolved**: Added offset pagination with "Load More" button to VenuesPage and ArtistsPage
- API now returns `{ data, hasMore }` from `resolveVenues` and `resolveArtists`
- Default page size: 24

### Image Thumbnails
- **Concern**: Full-size images are served from Supabase Storage with no thumbnail generation pipeline
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
- **Location**: `apps/web/src/features/events/providers/`

### Supabase Configuration Required
- **Concern**: App requires real Supabase credentials to function beyond mock mode. No local Supabase Docker setup documented in README.
- **Mitigation**: Mock provider allows development without Supabase, but features like auth and reviews are non-functional

### ~~Missing E2E Test Coverage~~ — IMPROVED
- **Resolved**: Added E2E specs for login, venue, artist, and review flows (4 new spec files)
- **Remaining**: E2E tests still require running Supabase; no mock server strategy for CI

### Bundle Size
- **Concern**: Main JS chunk is 597 KB (down from 692 KB after code splitting). Still above 500 KB warning threshold.
- **Mitigation**: 13 routes now lazy-loaded via `React.lazy()`. Further splitting possible with `manualChunks` in Vite config.
- **Location**: `apps/web/src/app/App.tsx`

### Feed Pagination Architecture
- **Concern**: Feed uses client-side merge of 4 data sources with `Promise.allSettled` for error isolation. Not true server-side pagination — each sub-query has its own limit but "Load More" increments page offset on all sources simultaneously.
- **Mitigation**: Current approach is correct for initial implementation. True infinite-scroll cursor-based pagination would require a Supabase RPC or Edge Function.
- **Location**: `apps/web/src/features/feed/api/feed.ts`

### Phase A — Social Proof (COMPLETE)

### Phase B — Setlist Archive (Setlist.fm differentiator)

#### B1. Setlist Data Model
- New `songs` table (id, name, artist_id FK nullable)
- New `setlists` table (id, event_id FK, user_id, source: 'manual' | 'verified', created_at, updated_at)
- New `setlist_songs` table (setlist_id, song_id, position, is_encore, is_debut, notes)
- Migration: `007_setlists.sql`

#### B2. Setlist Editor (Community Wiki)
- `/events/:eventId/setlist` page — view/add/edit songs
- UI: drag-to-reorder song list, mark encores, mark debuts
- "Best Song Moment" tag on reviews linking to a specific setlist_songs row
- Community editing: any authenticated user can submit a setlist

#### B3. Setlist Statistics Pages
- Artist most-played songs (aggregate from setlist_songs)
- Tour statistics: average setlist length, unique songs per tour
- "This song was played X times" stats on setlist pages
- Comparison view: how setlists differ between dates/venues

### Phase C — Discovery Intelligence (Songkick-like personalization)

#### C1. Personalized Discover
- "Recommended for You" section on DiscoverPage based on: followed artists/venues, attendance history, review ratings
- "Friends Going" badge on event cards where followed users have attendance
- Supabase RPC or Edge Function for personalization queries

#### C2. Geolocation
- Auto-detect user city via browser Geolocation API
- "Near You" event filtering with lat/lng radius search
- Store preferred location in profiles table

#### C3. Notification System
- Supabase Edge Functions for: new events from tracked artists, new reviews from followed users, friend activity
- In-app notification center (`/notifications`)
- Push notification opt-in (Web Push API)

#### C4. Calendar Integration
- Export attendance to iCal/Google Calendar
- "Add to Calendar" button on event cards and detail page

### Phase D — Profile & Lists (Letterboxd diary richness)

#### D1. Profile Enrichment
- Avatar upload (Supabase Storage, new bucket)
- Favorite genres/artists selection
- Social links (Twitter, Instagram, website)
- Gig stats summary (X concerts attended, Y reviews written, Z cities)
- Location/city preference

#### D2. Custom Lists/Collections
- New `lists` table (id, user_id, name, description, is_public, created_at)
- New `list_items` table (list_id, event_id, notes, position)
- List pages: `/u/:username/lists/:listId`
- Pre-made list templates: "Best Shows of 2025", "Bucket List"

#### D3. Review Enhancements
- Draft reviews (save without publishing)
- Review comments/discussion thread
- Seat/section info in reviews (optional field)
- Review reactions display (from Phase A4)