# Phase C: Discovery Intelligence — Implementation Prompt

## Project Context

**RateMyGig** is a concert discovery and rating web app. Monorepo with React 19 + Vite + Tailwind on the frontend, Supabase (Postgres, Auth, Storage, RLS) on the backend — no custom API server. All data access is `supabase.from('table')` or `supabase.rpc()` directly from React hooks.

**Repository:** `C:\Users\badir\Documents\ratemygig`

**Current state:** Phase A (Social Proof) and Phase B (Setlist Archive) are complete. 112 unit tests pass, 0 lint errors, build succeeds. The app has auth, event discovery, attendance, reviews with photos, venue/artist rating pages, follow systems, review reactions, an activity feed, setlist archive, and song statistics.

**What Phase C adds:** Discovery Intelligence — personalized recommendations, geolocation, enhanced search, and notification foundations. This transforms the app from "browse and search" to "the app tells you what you'll love."

---

## Architecture & Conventions

Read these files for full context before starting:
- `.planning/codebase/STACK.md` — Tech stack details
- `.planning/codebase/CONVENTIONS.md` — Code style and patterns
- `.planning/codebase/ARCHITECTURE.md` — Architecture decisions
- `.planning/codebase/STRUCTURE.md` — Directory structure

Key conventions:
- **Named exports only** (no default exports except App.tsx)
- **Function components** with hooks
- **Feature module pattern:** `features/{name}/api/`, `features/{name}/components/`, `features/{name}/pages/`
- **Path aliases:** `@/` (src root), `@shared/`, `@features/`, `@core/`
- **Query key factories** co-located in `api/*.ts` files
- **Optimistic mutations** with `onMutate`/`onError` rollback pattern
- **RLS policies:** owner can CRUD own rows, public can read all
- **Rate limiting** via `createRateLimiter()` from `shared/lib/throttle.ts`
- **Sanitize all user text** with `sanitizeText()` from `shared/lib/sanitize.ts`
- **Icons** from `lucide-react`
- **Route-level code splitting:** Use `React.lazy()` + `Suspense` for new route components
- **No comments in code** unless explicitly requested

Existing migrations are numbered `001` through `009`. Next migration is `010`.

---

## Phase C Plans

There are 4 plans in 2 waves:

### C-01 (Wave 1 — Foundation) — MUST BE DONE FIRST
**File:** `.planning/phases/C-discovery-intelligence/C-01-PLAN.md`

Database schema changes, RPC functions, and API hooks for discovery features.

**Deliverables:**
1. `packages/db/migrations/010_discovery_intelligence.sql` — migration adding:
   - `user_preferences` table (id, user_id FK→auth.users, preferred_city TEXT, preferred_lat NUMERIC, preferred_lng NUMERIC, created_at, updated_at) with UNIQUE(user_id)
   - `notifications` table (id, user_id FK→auth.users, type TEXT CHECK IN ('event_reminder', 'new_review', 'artist_event', 'venue_event'), title TEXT, body TEXT, link TEXT, is_read BOOLEAN DEFAULT false, created_at) with indexes on user_id and is_read
   - `get_recommended_events(p_user_id UUID, p_limit INTEGER DEFAULT 12)` RPC function that returns events ordered by: events from followed artists → events from followed venues → events in preferred city → remaining upcoming events, deduplicated
   - `get_nearby_venues(p_lat NUMERIC, p_lng NUMERIC, p_radius_km INTEGER DEFAULT 50, p_limit INTEGER DEFAULT 20)` RPC function using lat/lng distance calculation
   - `get_trending_events(p_limit INTEGER DEFAULT 10)` RPC function returning events with most attendance + reviews in the last 30 days
   - RLS policies: user_preferences owner CRUD, notifications owner read+update

2. `packages/core/src/types/index.ts` — Add types:
   - `UserPreferences` interface (id, user_id, preferred_city, preferred_lat, preferred_lng, created_at, updated_at)
   - `Notification` interface (id, user_id, type, title, body, link, is_read, created_at)
   - `RecommendedEvent` type extending Event with `reason` field ('followed_artist' | 'followed_venue' | 'preferred_city' | 'trending')

3. `apps/web/src/features/discovery/api/discovery.ts` — New file with hooks:
   - `useRecommendedEvents(limit?)` — calls `get_recommended_events` RPC
   - `useNearbyVenues(lat, lng, radiusKm?, limit?)` — calls `get_nearby_venues` RPC
   - `useTrendingEvents(limit?)` — calls `get_trending_events` RPC
   - Query key factory: `discoveryKeys`

4. `apps/web/src/features/discovery/api/preferences.ts` — New file with hooks:
   - `useUserPreferences()` — fetch current user's preferences (enabled only when authenticated)
   - `useUpdatePreferences()` — optimistic mutation to upsert preferences
   - `useSetPreferredLocation(city, lat, lng)` — convenience mutation that calls updatePreferences

5. `apps/web/src/features/notifications/api/notifications.ts` — New file with hooks:
   - `useNotifications()` — fetch current user's notifications (enabled only when authenticated)
   - `useMarkNotificationRead(id)` — mutation to mark a notification as read
   - `useMarkAllNotificationsRead()` — mutation to mark all as read
   - `useUnreadNotificationCount()` — count of unread notifications
   - Query key factory: `notificationKeys`

### C-02 (Wave 2 — Discovery UI, depends on C-01)
**File:** `.planning/phases/C-discovery-intelligence/C-02-PLAN.md`

**Deliverables:**
1. `DiscoverPage.tsx` — Enhance existing discover page:
   - Add "Recommended For You" section at top (only when authenticated and preferences exist)
   - Add "Trending" section below recommendations
   - Wire up `DateRangePicker` for date filtering (currently exists but not rendered)
   - Add `artist_id` filter support when navigating from artist detail page
   - Add infinite scroll pagination via existing `useInfiniteScroll` hook

2. `NearbyVenuesSection.tsx` — New component for DiscoverPage sidebar:
   - Shows nearby venues using `useNearbyVenues` if geolocation is available
   - "Enable Location" button if geolocation not yet granted
   - Falls back gracefully if denied

3. `GeolocationProvider.tsx` — New context/hook at `shared/hooks/useGeolocation.ts`:
   - `useGeolocation()` hook that requests and caches browser geolocation
   - Returns `{ latitude, longitude, error, isLoading, requestLocation() }`
   - Persmits graceful denial; doesn't block the app

4. `RecommendedEventsSection.tsx` — New component showing personalized event recommendations with reason badges

5. `TrendingEventsSection.tsx` — New component showing trending events

6. `EnhancedSearch.tsx` — New component replacing the simple text search:
   - Typeahead search across events, artists, and venues
   - Uses `supabase` `.ilike()` queries against events, artists, and venues tables
   - Shows results grouped by type (Events, Artists, Venues) in a dropdown
   - Debounced input (300ms)
   - Navigates to detail pages on selection

### C-03 (Wave 2 — Preferences & Notifications UI, parallel to C-02)
**File:** `.planning/phases/C-discovery-intelligence/C-03-PLAN.md`

**Deliverables:**
1. `PreferencesForm.tsx` — New component in `features/profile/components/`:
   - Preferred city (text input with autocomplete from existing venue cities)
   - "Use my current location" button that calls `useGeolocation` and saves lat/lng
   - Saved preferences displayed on ProfilePage
   - Uses `useUpdatePreferences` mutation

2. `ProfilePage.tsx` — Modify to add:
   - Preferences section with `PreferencesForm`
   - Followed artists count, followed venues count sections (links to detail pages)

3. `NotificationBell.tsx` — New component in `shared/components/`:
   - Bell icon in the `Layout.tsx` nav bar (next to profile link, only shown when authenticated)
   - Shows unread count badge
   - Dropdown panel on click showing recent notifications
   - "Mark all as read" button
   - Uses `useNotifications`, `useUnreadNotificationCount`, `useMarkAllNotificationsRead`

4. `NotificationsPage.tsx` — New page at `/notifications`:
   - Full list of notifications grouped by date (Today, Yesterday, This Week, Older)
   - Each notification links to its target (event, review, etc.)
   - "Mark all as read" button
   - Lazy-loaded route in `App.tsx`

5. `Layout.tsx` — Modify to include `NotificationBell` in the nav

---

## Execution Order

1. **C-01 first** — Create migration, types, discovery API, preferences API, notifications API
2. **C-02 and C-03 in parallel** — Discovery UI and preferences/notifications (no file overlap)
3. **After each plan:** Run `npm run lint`, `npm run test`, `npm run build` and fix any errors
4. **After all plans:** Update `.planning/ROADMAP.md` marking C-01/C-02/C-03 as complete, update `.planning/STATE.md` and `.planning/codebase/CONCERNS.md`

---

## Verification Checklist

After completing ALL plans, verify:
- [ ] `npm run lint` — 0 errors (2 pre-existing warnings in ProfilePage/WriteReviewPage are OK)
- [ ] `npm run test` — All tests pass (currently 112)
- [ ] `npm run build` — Build succeeds
- [ ] All new TypeScript types compile
- [ ] All migrations are valid SQL (correct FK references, indexes, RLS)
- [ ] All hooks follow the established pattern (query key factory, optimistic mutations, `useAuth` for auth checks)
- [ ] New route components are lazy-loaded via `React.lazy()`
- [ ] No unnecessary comments in code
- [ ] User text is sanitized with `sanitizeText()` where applicable
- [ ] Rate limiters applied to creation mutations
- [ ] Geolocation is optional and graceful (app works without it)
- [ ] Notifications don't block the app if the table is empty

---

## Important Files to Read Before Starting

| File | Why |
|------|-----|
| `apps/web/src/features/events/api/events.ts` | Pattern for event queries with provider resolution and filtering |
| `apps/web/src/features/events/pages/DiscoverPage.tsx` | Where discovery sections will be added |
| `apps/web/src/features/events/components/EventCard.tsx` | Event card component to reuse in recommendations |
| `apps/web/src/features/events/components/CitySelector.tsx` | City selection pattern and localStorage persistence |
| `apps/web/src/shared/hooks/useInfiniteScroll.ts` | Existing infinite scroll hook to wire up |
| `apps/web/src/features/feed/api/feed.ts` | Pattern for multi-source data aggregation with error isolation |
| `apps/web/src/features/profile/pages/ProfilePage.tsx` | Where preferences form will be added |
| `apps/web/src/shared/components/Layout.tsx` | Where notification bell will be added |
| `apps/web/src/features/auth/AuthProvider.tsx` | Auth context for auth-gated features |
| `packages/db/migrations/004_aggregation_functions.sql` | Pattern for RPC functions |
| `packages/db/migrations/009_setlist_stats_rpc.sql` | Most recent migration (pattern for new RPC) |