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
- `useCreateSetlist`: 5s throttle
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
- **Mitigation**: 15 routes now lazy-loaded via `React.lazy()`. Further splitting possible with `manualChunks` in Vite config.
- **Location**: `apps/web/src/app/App.tsx`

### Feed Pagination Architecture
- **Concern**: Feed uses client-side merge of 4 data sources with `Promise.allSettled` for error isolation. Not true server-side pagination — each sub-query has its own limit but "Load More" increments page offset on all sources simultaneously.
- **Mitigation**: Current approach is correct for initial implementation. True infinite-scroll cursor-based pagination would require a Supabase RPC or Edge Function.
- **Location**: `apps/web/src/features/feed/api/feed.ts`

### Phase A — Social Proof (COMPLETE)

### Phase B — Setlist Archive (COMPLETE)

#### B1. Setlist Data Model — DONE
- `songs` table (id, name, artist_id FK nullable, created_at) with UNIQUE(name, artist_id)
- `setlists` table (id, event_id FK, user_id, source: 'manual' | 'verified', notes, created_at, updated_at) with UNIQUE(event_id, user_id)
- `setlist_songs` table (id, setlist_id FK, song_id FK, position, is_encore, is_debut, notes, created_at) with UNIQUE(setlist_id, song_id, position)
- Migration: `008_setlists.sql`
- RLS: public read on all, owner write on setlists/setlist_songs, authenticated insert on songs
- Domain types: `Song`, `Setlist`, `SetlistSong`, `SetlistWithSongs` in `@core/types`
- Query hooks: `useEventSetlists`, `useSetlist`, `useMySetlists`, `useCreateSetlist` (5s rate-limited), `useUpdateSetlist`, `useDeleteSetlist`, `useAddSong`, `useRemoveSong`, `useReorderSongs`
- Song hooks: `useSongSearch`, `useCreateSong`
- Stats hooks: `useArtistSongStats`, `useArtistSetlistStats`, `useSongStats`
- RPC functions: `get_artist_song_stats`, `get_artist_setlist_stats`, `get_song_stats` in `009_setlist_stats_rpc.sql`

#### B2. Setlist Editor — DONE
- `SetlistViewer` component with position numbers, encore section, debut badges, owner edit/delete
- `SetlistCard` compact view with first 3-4 songs preview
- `SetlistEditor` with song search autocomplete, reorder buttons, encore/debut toggles
- `SetlistPage` at `/events/:eventId/setlist`
- Setlists section on `EventDetailPage`
- Lazy-loaded routes in App.tsx

#### B3. Setlist Statistics — DONE
- `SongStatsList` table component (most-played songs per artist)
- `ArtistSetlistSummary` card (setlist count, avg length, unique songs)
- `SongPage` at `/songs/:songId`
- Song Statistics section on `ArtistDetailPage`

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

### Phase D — Profile & Lists (COMPLETE)

#### D1. Profile Enrichment — DONE
- `avatar-photos` storage bucket (public, 5MB, JPEG/PNG/WebP) with RLS
- `AvatarUpload` component with client-side resize to 256×256, remove avatar
- `SocialLinksForm` via `useUpdateProfile` React Query mutation with cache invalidation
- `GigStatsCard` showing reviews/events/followers/following counts
- `ProfilePage` enhanced with avatar upload, stats card, social links form
- `PublicProfilePage` enhanced with social links display, GigStatsCard, reviews/lists tabs

#### D2. Custom Lists/Collections — DONE
- `lists` table (id, user_id, name, description, is_public) with RLS
- `list_items` table (id, list_id, event_id, notes, position) with RLS + UNIQUE(list_id, event_id)
- `ListPage` at `/lists/:listId` with ordered event list, owner delete
- `ListCard` compact preview component
- `CreateListModal` with name, description, public/private toggle (5s rate-limited)
- `AddToListButton` dropdown on EventDetailPage showing user's lists + "New list" option

#### D3. Review Enhancements — DONE
- `reviews.status` column (TEXT, 'draft' | 'published') added via migration
- Draft reviews: `useDrafts`, `useSaveDraft`, `usePublishDraft` hooks
- `DraftReviewsSection` on MyGigsPage with edit/publish/delete actions
- `comments` table (id, review_id, user_id, body) with RLS
- `CommentSection` + `CommentItem` on PublicReviewPage (3s rate-limited)
- Public review queries filter by `status = 'published'` to prevent draft leak
- `Review` type updated with `status: ReviewStatus` field
- `profiles` extended with website_url, twitter_handle, instagram_handle columns

## Known Issues (Medium — Not Blocking)

### Comment/List Mutations Lack Optimistic Updates
- `useCreateComment`, `useDeleteComment`, `useAddEventToList`, `useRemoveEventFromList` do not use `onMutate`/`onError` rollback
- Comments and list changes appear only after server round-trip
- Low priority since these are not frequently rapid-fire actions

### Missing Rate Limiter on useAddEventToList
- `useAddEventToList` has no rate limiter; rapid clicking could hit duplicate key errors (caught server-side by UNIQUE constraint)
- Consider adding a 1-2s limiter or debouncing the AddToListButton

### AddToListButton Does Not Auto-Add After List Creation
- `CreateListModal`'s `onCreated` callback is not wired in `AddToListButton`
- After creating a new list, the event is not automatically added to it

## Sprint 1 — Notification Triggers (Notes & Tradeoffs)

### Dedupe collapses repeat activity on the same review
- The `idx_notifications_dedupe` unique index on `notifications(user_id, type, link)` means a review owner gets **one** `new_comment` and **one** `review_reaction` notification per review, ever — later comments/reactions on the same review do not re-notify (this is per the Sprint 1 spec; comment/reaction links are `/r/<review id>`).
- Acceptable as noise reduction for v1; revisit with per-actor links or grouped copy ("X and 3 others") if it feels lossy.

### Artist fan-out lives on event_artists, not events
- `packages/jobs` `SyncService.syncEvents()` inserts the `events` row first and links `event_artists` afterwards, so an `AFTER INSERT ON events` trigger can never see artist links (FK guarantees they can't exist yet).
- `013_notification_triggers.sql` therefore fires `artist_event` notifications from `trg_notify_on_event_artist` (AFTER INSERT ON `event_artists`); the events trigger handles `venue_event` only (venue_id is on the events row). Dedupe protects any writer that links in a different order.

### useUpdatePreferences is now a partial upsert
- The mutation builds its upsert payload from provided keys only. Previously it always sent all three location fields with `?? null`, so saving a city silently cleared `preferred_lat`/`preferred_lng`; now omitted fields are preserved. Required so the Sprint 1 notification toggles don't wipe location prefs (and vice versa).

## Sprint 2 — Scheduled Ingest (Notes & Tradeoffs)

### Ticketmaster deep-paging cap truncates country-mode ingest
- `TicketmasterClient.searchEventsAll()` stops at 1000 items per query (`maxPage` guard, TM API limit). Country-wide US ingest with the default 180-day window exceeds this, so country mode **silently truncates** — no error is logged when the cap is hit.
- Mitigation shipped in Sprint 2: `INGEST_CITIES` (comma-separated) switches `fetchAllEvents` to per-city queries, which stay under the cap. Very large metros with long windows could still hit it; reduce `INGEST_DAYS_AHEAD` or split cities further if so.

### GitHub Actions scheduled-workflow caveats
- Scheduled runs can be delayed during periods of high GitHub Actions load — ingest is not guaranteed to start exactly at 06:00 UTC. Acceptable for daily sync.
- On public repos, GitHub disables scheduled workflows after 60 days of repository inactivity; re-enable from the Actions tab if ingest stops after a quiet period.

### First ingest run after enabling notifications causes a fan-out burst
- Expected behavior, not a bug: the first cron (or local) ingest after migration `013` is applied fires `artist_event`/`venue_event` notifications for every newly inserted future event matching existing follows. The `(user_id, type, link)` dedupe index keeps re-ingests quiet.