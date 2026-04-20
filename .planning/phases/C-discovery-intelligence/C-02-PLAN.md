# Plan C-02: Discovery UI Enhancement

**Wave:** 2 (depends on C-01 for hooks and types)
**Goal:** Transform the DiscoverPage from a simple browse+search experience into a personalized discovery experience with recommendations, trending events, geolocation, and enhanced search.

---

## Context

- DiscoverPage currently has city filtering and a simple text search (queries event names only).
- `DateRangePicker` component exists but is not rendered on the DiscoverPage.
- `useInfiniteScroll` hook exists at `shared/hooks/useInfiniteScroll.ts` but isn't wired up.
- `CitySelector` component persists city choice to localStorage.
- Follow data (artist_follows, venue_follows) is available for personalization.
- Event provider resolution uses `resolveEvents()` with fallback chain.

## Files to Create/Modify

### 1. `apps/web/src/features/discovery/components/RecommendedEventsSection.tsx` — New component

Shows personalized event recommendations when the user is authenticated.

```
Props:
  limit?: number (default 8)

Layout:
  - Section header: "Recommended For You" with Sparkles icon
  - Grid of EventCard components
  - Each card has a small reason badge ("Because you follow X", "Near you", "Trending")
  - Empty state: "Sign in to get personalized recommendations"
  - Loading skeleton: 4 skeleton cards
  - Only renders when user is authenticated
```

### 2. `apps/web/src/features/discovery/components/TrendingEventsSection.tsx` — New component

Shows trending events based on attendance and review counts.

```
Props:
  limit?: number (default 6)

Layout:
  - Section header: "Trending" with TrendingUp icon
  - Grid of EventCard components
  - Empty state: "No trending events right now"
  - Loading skeleton: 3 skeleton cards
  - Always visible (not auth-gated)
```

### 3. `apps/web/src/features/discovery/components/NearbyVenuesSection.tsx` — New component

Shows nearby venues when geolocation is available.

```
Props:
  (none — uses useGeolocation internally)

Layout:
  - Section header: "Venues Near You" with MapPin icon + distance badge
  - Vertical list of venue cards (name, city, distance in km)
  - Each venue links to /venues/:venueId
  - "Enable Location" button if geolocation not yet requested
  - "Location unavailable" message if denied
  - Hidden entirely if location not available and not requestable
```

### 4. `apps/web/src/shared/hooks/useGeolocation.ts` — New hook

```
Interface: {
  latitude: number | null
  longitude: number | null
  error: string | null
  isLoading: boolean
  requestLocation: () => void
  isSupported: boolean
}

Behavior:
  - Checks navigator.geolocation availability
  - requestLocation() calls navigator.geolocation.getCurrentPosition()
  - Caches position in state (not localStorage — fresh each session)
  - Returns graceful error messages if denied or unavailable
  - Does NOT auto-request on mount — caller decides when to prompt
```

### 5. `apps/web/src/features/discovery/components/EnhancedSearch.tsx` — New component

Typeahead search across events, artists, and venues.

```
Props:
  onSelect: (type: 'event' | 'artist' | 'venue', id: string) => void

State:
  - query: string (debounced 300ms)
  - isOpen: boolean (dropdown visibility)

Behavior:
  - Searches events by name (ilike), artists by name (ilike), venues by name+city (ilike)
  - Shows results grouped by type in a dropdown panel
  - Each result is a link: events → /events/:id, artists → /artists/:id, venues → /venues/:id
  - Debounced query (300ms) — only searches when query is 2+ chars
  - "No results found" message when empty
  - Keyboard navigation: Escape to close, Enter to select first result
  - Shows up to 5 results per category
```

### 6. `apps/web/src/features/events/pages/DiscoverPage.tsx` — Modify

Significant enhancement to the existing page:

- Add `RecommendedEventsSection` at the top (after city selector, before search results)
- Add `TrendingEventsSection` after recommendations
- Replace the simple input with `EnhancedSearch` component
- Wire up `DateRangePicker` for date filtering (currently exists but unused)
- Add `NearbyVenuesSection` in the right sidebar (or below events on mobile)
- Maintain existing event grid as fallback/primary content
- Pass `artist_id` filter when navigating from artist detail page (already in EventFilters type but not wired)

### 7. No App.tsx changes needed — all routes already exist

---

## Task Breakdown

| # | Task | Files | Dependencies |
|---|------|-------|-------------|
| 1 | Create useGeolocation hook | `apps/web/src/shared/hooks/useGeolocation.ts` | None |
| 2 | Create RecommendedEventsSection | `apps/web/src/features/discovery/components/RecommendedEventsSection.tsx` | C-01 hooks |
| 3 | Create TrendingEventsSection | `apps/web/src/features/discovery/components/TrendingEventsSection.tsx` | C-01 hooks |
| 4 | Create NearbyVenuesSection | `apps/web/src/features/discovery/components/NearbyVenuesSection.tsx` | Task 1, C-01 hooks |
| 5 | Create EnhancedSearch | `apps/web/src/features/discovery/components/EnhancedSearch.tsx` | None |
| 6 | Enhance DiscoverPage | `apps/web/src/features/events/pages/DiscoverPage.tsx` | Tasks 1-5, C-01 hooks |
| 7 | Run `npm run lint`, `npm run build`, `npm run test` | — | Tasks 1-6 |

## Verification

- DiscoverPage shows "Recommended For You" section when authenticated
- DiscoverPage shows "Trending" section always
- Geolocation is optional — app works fully without it
- "Enable Location" button works and then shows nearby venues
- EnhancedSearch provides typeahead across events, artists, venues
- DateRangePicker is wired up and functional
- All existing DiscoverPage functionality preserved
- Build passes, 112+ tests pass, 0 lint errors