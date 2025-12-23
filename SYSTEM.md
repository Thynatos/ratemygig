# ratemygig - System Architecture & LLM Context

> **Purpose**: This document provides a comprehensive overview of the ratemygig system for LLMs to understand the codebase structure, data flow, and key patterns.

---

## 1. Project Overview

**ratemygig** is a concert discovery and rating platform built with:
- **Frontend**: Vite + React 19 + TypeScript + Tailwind CSS
- **Backend**: Supabase (PostgreSQL + Auth + Storage)
- **Background Jobs**: Node.js with Ticketmaster API integration

### One-Line Goal
Discover concerts → Get tickets → Save attended gigs → Rate/review with photos → Explore aggregated ratings

---

## 2. Repository Structure

```
ratemygig/
├── apps/
│   └── web/                      # React frontend application
│       ├── src/
│       │   ├── app/              # App.tsx with routes
│       │   ├── features/         # Feature modules (see Section 3)
│       │   ├── shared/           # Shared components, hooks, lib
│       │   └── test/             # Vitest setup
│       ├── vitest.config.ts
│       └── package.json
│
├── packages/
│   ├── core/                     # Shared domain types
│   │   └── src/
│   │       ├── types/index.ts    # Event, Venue, Artist, Review types
│   │       └── interfaces/       # IEventsProvider interface
│   │
│   ├── db/                       # Database configuration
│   │   ├── migrations/           # 5 SQL migration files
│   │   └── seed/                 # mock-events.json
│   │
│   └── jobs/                     # Background sync service
│       └── src/
│           ├── ticketmaster/     # TM API client + types
│           ├── sync/             # SyncService for DB upserts
│           └── jobs/             # Daily ingest job
│
├── README.md                     # Setup instructions
├── SYSTEM.md                     # This file
└── package.json                  # Monorepo root
```

---

## 3. Feature Modules

Each feature follows this pattern:
```
features/{name}/
├── api/           # React Query hooks
├── components/    # Feature-specific components
├── pages/         # Route pages
└── providers/     # Data providers (events only)
```

### Feature Summary

| Feature | Pages | Key Files |
|---------|-------|-----------|
| **auth** | LoginPage, AuthCallbackPage | AuthProvider.tsx, ProtectedRoute.tsx |
| **events** | DiscoverPage, EventDetailPage | events.ts (API), MockEventsProvider |
| **reviews** | MyGigsPage, WriteReviewPage, PublicReviewPage | reviews.ts, PhotoUploader |
| **venues** | VenuesPage, VenueDetailPage | venues.ts (API) |
| **artists** | ArtistsPage, ArtistDetailPage | artists.ts (API) |
| **profile** | ProfilePage, PublicProfilePage | Direct Supabase calls |

---

## 4. Data Flow

### 4.1 Event Discovery Flow

```
User visits /
    ↓
CitySelector (stored in localStorage)
    ↓
useEvents(city, query, page)
    ↓
MockEventsProvider.searchEvents()
    ↓
Returns: Event[] with venue, artists, ticket_urls
    ↓
Renders EventCard grid
```

### 4.2 Review Creation Flow

```
User marks event as "attended"
    ↓
useToggleAttendance() → Supabase attendance table
    ↓
User navigates to /review/:eventId
    ↓
WriteReviewPage with:
  - StarRating (1-5)
  - Title, Body (Zod validated)
  - Tag selection
  - PhotoUploader (max 10 files)
  - Public/Private toggle
    ↓
useCreateReview() → Supabase reviews + review_photos
    ↓
Review available at /r/:reviewId
```

### 4.3 Rating Aggregation Flow

```
VenueDetailPage or ArtistDetailPage
    ↓
useVenueRatingSummary(venueId) or useArtistRatingSummary(artistId)
    ↓
Supabase RPC: get_venue_rating_summary() or get_artist_rating_summary()
    ↓
Returns: { avg_rating, count_reviews, rating_1..5 counts, top_tags }
```

### 4.4 Background Sync Flow (packages/jobs)

```
npm run ingest -w packages/jobs
    ↓
TicketmasterClient.searchEvents(cities)
    ↓
TicketmasterMapper.toProviderEvent()
    ↓
SyncService.syncEvents()
    ↓
Upsert: venues → artists → events → event_artists
    ↓
Stats logged: created/updated counts
```

---

## 5. Database Schema

### Tables

| Table | Purpose | Key Columns |
|-------|---------|-------------|
| `profiles` | User profiles | id, username, display_name, is_profile_public |
| `venues` | Concert venues | id, name, city, country, lat, lng |
| `artists` | Musical artists | id, name, provider_artist_id |
| `events` | Concert events | id, provider, name, start_at, venue_id, ticket_urls |
| `event_artists` | M:N events↔artists | event_id, artist_id, billing_order |
| `attendance` | User attendance | user_id, event_id, status (planned/attended) |
| `reviews` | User reviews | user_id, event_id, rating, title, body, is_public |
| `review_photos` | Photo attachments | review_id, storage_path |
| `tags` | Predefined tags | id, name, category |
| `review_tags` | M:N reviews↔tags | review_id, tag_id |

### RLS Policies

- **profiles**: Owner can update; public read if `is_profile_public = true`
- **attendance**: User-only access
- **reviews**: Owner CRUD; public read if `is_public = true`
- **events/venues/artists**: Read-only for all

---

## 6. Key Interfaces

### IEventsProvider (packages/core)

```typescript
interface IEventsProvider {
  searchEvents(params: SearchEventsParams): Promise<SearchEventsResult>
  getEvent(providerEventId: string): Promise<ProviderEvent | null>
  getCities(): Promise<string[]>
}
```

### SearchEventsParams

```typescript
interface SearchEventsParams {
  city?: string
  query?: string
  from?: Date
  to?: Date
  page?: number
  pageSize?: number
}
```

---

## 7. Shared Utilities

### Location: `apps/web/src/shared/`

| Directory | Purpose |
|-----------|---------|
| `components/` | 10 UI components (Button, Card, Modal, StarRating, etc.) |
| `components/ui/` | Low-level primitives |
| `components/ErrorBoundary.tsx` | Error catching |
| `hooks/` | useInfiniteScroll, usePhotoUrls |
| `lib/` | utils, supabase, logger, storage |
| `validation/` | Centralized Zod schemas |

### Key Zod Schemas

```typescript
emailSchema        // Login form
profileSchema      // Profile settings
reviewSchema       // Review form (rating, title, body, isPublic)
eventFiltersSchema // Event search filters
ratingFiltersSchema // Aggregation filters (city, year, venue, artist)
```

---

## 8. Authentication

### Methods

1. **Magic Link** - `signInWithOtp({ email })`
2. **Google OAuth** - `signInWithOAuth({ provider: 'google' })`

### AuthProvider Context

```typescript
{
  user: User | null
  session: Session | null
  isLoading: boolean
  signInWithMagicLink(email)
  signInWithGoogle()
  signOut()
}
```

---

## 9. Environment Variables

```env
# Required
VITE_SUPABASE_URL=https://xxx.supabase.co
VITE_SUPABASE_ANON_KEY=xxx

# Optional
VITE_EVENTS_PROVIDER=mock|ticketmaster
VITE_TICKETMASTER_API_KEY=xxx

# For packages/jobs
SUPABASE_URL=xxx
SUPABASE_SERVICE_ROLE_KEY=xxx
TICKETMASTER_API_KEY=xxx
```

---

## 10. Routes

| Path | Component | Auth Required |
|------|-----------|---------------|
| `/` | DiscoverPage | No |
| `/events/:eventId` | EventDetailPage | No |
| `/venues` | VenuesPage | No |
| `/venues/:venueId` | VenueDetailPage | No |
| `/artists` | ArtistsPage | No |
| `/artists/:artistId` | ArtistDetailPage | No |
| `/login` | LoginPage | No |
| `/auth/callback` | AuthCallbackPage | No |
| `/my-gigs` | MyGigsPage | Yes |
| `/review/:eventId` | WriteReviewPage | Yes |
| `/r/:reviewId` | PublicReviewPage | No |
| `/profile` | ProfilePage | Yes |
| `/u/:username` | PublicProfilePage | No |

---

## 11. Testing

### Unit Tests (Vitest)

```bash
npm run test -w apps/web
# 58 tests passing
```

**Test Files**:
- `shared/lib/utils.test.ts` - 31 tests
- `shared/validation/schemas.test.ts` - 27 tests

### E2E Tests (Playwright)

```bash
npm run test:e2e -w apps/web
# Configured but no tests written yet
```

---

## 12. Commands

```bash
# Development
npm run dev              # Start web app at localhost:3000

# Testing
npm run test             # Run unit tests
npm run test:e2e         # Run Playwright tests

# Build
npm run build            # Production build

# Background Jobs
npm run ingest -w packages/jobs    # Run Ticketmaster sync
npm run start -w packages/jobs     # Start cron scheduler
```

---

## 13. Key Patterns

### React Query Keys

```typescript
// Events
eventKeys.list(city, query, page)
eventKeys.detail(eventId)

// Reviews
reviewKeys.event(eventId)
reviewKeys.user(userId)
reviewKeys.detail(reviewId)

// Venues/Artists
venueKeys.detail(venueId)
artistKeys.detail(artistId)
```

### Component Conventions

- All components use `cn()` for className merging
- Forms use `react-hook-form` + `zod` validation
- Loading states use `<Skeleton>` or `<LoadingPage>`
- Errors display via ErrorBoundary or inline messages

---

## 14. File Naming Conventions

| Type | Convention | Example |
|------|------------|---------|
| Pages | `{Name}Page.tsx` | DiscoverPage.tsx |
| Components | `{Name}.tsx` | EventCard.tsx |
| Hooks | `use{Name}.ts` | useAuth.ts |
| API | `{entity}.ts` | events.ts |
| Types | `index.ts` or `types.ts` | types/index.ts |
| Tests | `{name}.test.ts` | utils.test.ts |

---

## 15. State Management

| Type | Solution |
|------|----------|
| Server State | TanStack React Query |
| Auth State | React Context (AuthProvider) |
| UI State | Local useState |
| Persistent | localStorage (city selection) |

---

*Last updated: 2024-12-23*
