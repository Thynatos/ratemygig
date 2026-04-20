# Integrations

## Supabase (Primary Backend)

- **Client**: `@supabase/supabase-js` v2 — initialized in `apps/web/src/shared/lib/supabase.ts`
- **Auth**: Magic link (`signInWithOtp`) + Google OAuth (`signInWithOAuth`)
- **Database**: Direct client-side queries with RLS enforcement
- **Storage**: `review-photos` bucket for user photo uploads
- **RPC Functions**:
  - `get_venue_rating_summary(p_venue_id, p_city, p_year)` — aggregate ratings for a venue or all venues (NULL = all)
  - `get_artist_rating_summary(p_artist_id, p_city, p_year, p_venue_id)` — aggregate ratings for an artist or all artists (NULL = all)
  - `get_event_rating_summary(p_event_id)` — aggregate ratings for a single event
  - `get_venue_top_tags(p_venue_id, p_limit)` — most-used tags for a venue
  - `get_artist_top_tags(p_artist_id, p_limit)` — most-used tags for an artist

### Supabase Tables (direct query pattern)

All data access in the frontend goes through `supabase.from('table')` calls in feature API modules (`features/*/api/*.ts`). No custom backend API layer exists.

| Table | Query Location | Notes |
|-------|---------------|-------|
| `events` | `features/events/api/events.ts` | Paginated with count |
| `venues` | `features/venues/api/venues.ts` | Paginated with count |
| `artists` | `features/artists/api/artists.ts` | Paginated with count |
| `reviews` | `features/reviews/api/reviews.ts` | Per-event, per-user, single |
| `attendance` | `features/events/api/events.ts` | Per-event per-user |
| `review_photos` | `features/reviews/api/reviews.ts` | Nested in reviews |
| `review_tags` | `features/reviews/api/reviews.ts` | On create review |
| `tags` | `features/reviews/api/reviews.ts` | All tags |
| `profiles` | `features/profile/pages/ProfilePage.tsx` | Direct query |
| `event_artists` | `features/artists/api/artists.ts` | Artist-to-event junction |

## Ticketmaster Discovery API

- **Server-side**: `packages/jobs/src/ticketmaster/ticketmaster-client.ts` — `TicketmasterClient` class with rate limiting (5 req/s)
- **Browser-side**: `apps/web/src/features/events/providers/ticketmaster-browser-provider.ts` — wraps `TicketmasterMapper` via Vite alias `@jobs`
- **Mapper**: `packages/jobs/src/ticketmaster/ticketmaster-provider.ts` → `TicketmasterMapper.toProviderEvent()`
- **Sync**: `packages/jobs/src/sync/sync-service.ts` — upserts venues → artists → events → event_artists
- **Environment**: `VITE_TICKETMASTER_API_KEY` (browser) or `TICKETMASTER_API_KEY` (server)

### API Endpoints Used

| Endpoint | Purpose |
|----------|---------|
| `GET /events.json` | Search events by city, keyword, date |
| `GET /events/{id}.json` | Get single event |
| `GET /venues.json` | Search venues |
| `GET /attractions.json` | Search attractions/artists |
| `GET /venues/{id}.json` | Get single venue |
| `GET /attractions/{id}.json` | Get single attraction |

## External Auth Providers

- **Google OAuth**: Configured via Supabase Auth dashboard (redirect-based)
- **Email Magic Link**: Supabase `signInWithOtp` — sends email with link

## Events Provider Strategy

Three-tier resolution pattern configured by `VITE_EVENTS_PROVIDER`:

1. **Database first** — always query Supabase first
2. **Live provider (optional)** — Ticketmaster API if key is set and mode allows
3. **Mock fallback** — seed data from `mock-provider.ts` / `mock-events.json` if mode allows

Provider access is governed by `apps/web/src/shared/lib/provider-policy.ts`:
- `mock` mode: DB mock rows → mock seed data
- `ticketmaster` mode: DB TM rows → live TM API (no mock fallback)
- `all` mode: all DB rows → live TM → mock seed data

## Deployment

- **Vercel**: `apps/web/vercel.json` — configured for Vite SPA deployment
- **No custom backend**: All backend is Supabase (hosted) + scheduled jobs (Node.js script)