# Architecture

## Pattern

**Feature-based monorepo** with npm workspaces, direct Supabase client access (no custom API layer), and pluggable event provider abstraction.

## Layers

```
┌─────────────────────────────────────────────────────────┐
│  React UI (apps/web/src/features/*)                      │
│  Pages → Components → React Query hooks (api/*.ts)      │
├─────────────────────────────────────────────────────────┤
│  Shared Layer (apps/web/src/shared/)                     │
│  Components, hooks, validation (Zod), lib (supabase,    │
│  env, utils, storage, logger, provider-policy)           │
├─────────────────────────────────────────────────────────┤
│  Core Package (packages/core/src/)                       │
│  Domain types (Event, Venue, Artist, Review...)          │
│  Interfaces (IEventsProvider)                             │
├─────────────────────────────────────────────────────────┤
│  Supabase (PostgreSQL + Auth + Storage)                  │
│  Direct client queries · RLS enforcement · RPC functions │
├─────────────────────────────────────────────────────────┤
│  Jobs Package (packages/jobs/src/)                       │
│  TicketmasterClient → SyncService → Supabase upserts    │
└─────────────────────────────────────────────────────────┘
```

## Data Flow

### Event Discovery

```
DiscoverPage → useEvents(filters) → resolveEvents()
  ├─ DB first: fetchEventsFromDatabase() → supabase.from('events')...
  ├─ Live TM:  fetchEventsFromTicketmasterLive() → TicketmasterBrowserProvider
  └─ Mock:     fetchEventsFromMockProvider() → mockEventsProvider.searchEvents()
```

Provider resolution is dependency-injected for testability (`resolveEventsWithDeps`, `resolveEventWithDeps`, `resolveCitiesWithDeps`).

### Review Creation

```
WriteReviewPage → useCreateReview() → supabase.from('reviews').insert()
                                          → supabase.from('review_tags').insert()
                                          → storage.upload() for photos
                                          → supabase.from('review_photos').insert()
```

### Rating Aggregation

```
VenueDetailPage → useVenueRatingSummary(venueId, filters)
  → supabase.rpc('get_venue_rating_summary', { venue_id, ...filters })
ArtistDetailPage → useArtistRatingSummary(artistId, filters)
  → supabase.rpc('get_artist_rating_summary', { artist_id, ...filters })
```

### Background Ingestion

```
npm run jobs:ingest
  → daily-ingest.ts → TicketmasterClient.searchEventsAll()
  → TicketmasterMapper.toProviderEvent()
  → SyncService.syncEvents() → upsert venues → artists → events → event_artists
```

## Auth Flow

```
LoginPage → AuthProvider (React Context)
  ├─ Magic Link: signInWithOtp({ email })
  └─ Google OAuth: signInWithOAuth({ provider: 'google' })
  
AuthCallbackPage → URL hash exchange → session established

ProtectedRoute → redirects to /login if no session
```

## State Management

| Type | Tool | Where |
|------|------|-------|
| Server state | TanStack React Query | All `api/*.ts` hooks |
| Auth state | React Context | `AuthProvider.tsx` |
| UI state | `useState` | Component-local |
| Persistent | `localStorage` | City selection |

## Key Abstractions

### IEventsProvider

Defined in `packages/core/src/interfaces/events-provider.ts`:

```typescript
interface IEventsProvider {
  readonly providerId: string
  searchEvents(params: SearchEventsParams): Promise<SearchEventsResult>
  getEvent(providerEventId: string): Promise<ProviderEvent | null>
  getVenueEvents?(venueId: string, params?): Promise<ProviderEvent[]>
  getArtistEvents?(artistId: string, params?): Promise<ProviderEvent[]>
}
```

Implementations:
- `MockEventsProvider` — uses static JSON seed data
- `TicketmasterBrowserProvider` — wraps `TicketmasterMapper` for client-side API calls

### ProviderPolicy

`apps/web/src/shared/lib/provider-policy.ts` — determines which data sources are available based on `VITE_EVENTS_PROVIDER` mode.

## Vite Build Configuration

- `@jobs` alias gives browser access to `TicketmasterMapper` and `TicketmasterClient` types
- `server.fs.allow` includes parent directories for workspace package resolution
- Sourcemaps enabled in production builds

## No Custom Backend

The application has **no custom API server**. All data access goes directly from the React frontend to Supabase via the JS client SDK. The only server-side code is the background jobs package (`packages/jobs`) for Ticketmaster ingestion.