# Plan A-03: Review Reactions UI + Activity Feed Page

**Wave:** 2 (depends on A-01 for hooks; parallel to A-02 with no file overlap)
**Goal:** Add reaction buttons (👍 Helpful, ❤️ Love, 🔥 Like) to review displays and create a new `/feed` activity page showing recent activity from followed entities.

---

## Context

- A-01 provides: `useReactToReview`, `useRemoveReaction`, `useReviewReactions`, `useUserReactions` hooks in `reviews.ts`, plus reaction key factory, and the `ReactionType` type.
- A-01 also provides: all follow hooks needed for the feed query.
- Review cards appear in: `PublicReviewPage`, `EventDetailPage` (review list), `PublicProfilePage` (user's reviews).
- EventDetailPage renders reviews via `useEventReviews(eventId)` which returns reviews with `profile` and `photos` join.
- Layout.tsx defines the main nav with `NAV_LINKS` array — needs a new "Feed" link.
- App.tsx defines routes — needs a new `/feed` route with `FeedPage` component.
- Tailwind theme uses emoji-free interaction patterns; reaction buttons should use text + icon pairs consistent with the existing Badge/Button components.

## Files to Create/Modify

### 1. `apps/web/src/features/reviews/components/ReactionButtons.tsx` — New component

Inline reaction UI for review cards and review detail page.

```
Props:
  reviewId: string
  compact?: boolean  // smaller layout for cards vs full page

Behavior:
- Fetch reactions with useReviewReactions(reviewId)
- Fetch current user's reactions with useUserReactions(reviewId)  
- Render three reaction buttons in a row:
  - 🔥 Like (renders text "Like" + fire icon, compact: just icon)
  - 👍 Helpful (renders text "Helpful" + thumbs-up icon)
  - ❤️ Love (renders text "Love" + heart icon)
- Each button shows count of that reaction_type
- If current user has that reaction_type, button is highlighted (accent/primary color)
- Click toggles: if active → useRemoveReaction, if inactive → useReactToReview
- Buttons are disabled if not authenticated (use useAuth)
- Uses createRateLimiter(1000) from A-01 for repeated clicks
- Optimistic updates handled by A-01 mutation hooks

Styling:
- Row of 3 buttons, gap-3
- Each button: flex items-center gap-1.5, rounded-lg px-3 py-1.5
- Active state: bg-primary-500/20 text-primary-400 border border-primary-500/30
- Inactive state: bg-surface-800 text-surface-400 border border-surface-700
- Count shown as superscript badge next to icon
- compact mode: smaller sizing (px-2 py-1 text-xs)
```

### 2. `apps/web/src/features/reviews/pages/PublicReviewPage.tsx` — Modify

Add `ReactionButtons` below the review body, above the author footer.

- Import `ReactionButtons` from `../components/ReactionButtons`
- Render `<ReactionButtons reviewId={review.id} />` in a `<div className="mt-6 pt-4 border-t border-surface-700">` between the review body/photos section and the author section

### 3. `apps/web/src/features/events/pages/EventDetailPage.tsx` — Modify

Add `ReactionButtons` to each review card in the reviews section.

- Import `ReactionButtons`
- Render `<ReactionButtons reviewId={review.id} compact />` at the bottom of each review card
- Only render for authenticated users (check useAuth)

### 4. `apps/web/src/features/feed/api/feed.ts` — New file

Activity feed data fetching hook.

```typescript
export const feedKeys = {
  all: ['feed'] as const,
  timeline: (page?: number) => [...feedKeys.all, 'timeline', page] as const,
}

export interface FeedItem {
  type: 'review' | 'event' | 'attendance'
  id: string
  created_at: string
  data: ReviewFeedItem | EventFeedItem | AttendanceFeedItem
}

export interface ReviewFeedItem {
  review: { id, rating, title, body, created_at }
  event: { id, name }
  author: { id, display_name, username, avatar_url }
}

export interface EventFeedItem {
  event: { id, name, start_at }
  venue: { id, name, city } | null
}

export interface AttendanceFeedItem {
  user: { id, display_name, username, avatar_url }
  event: { id, name, start_at }
  venue: { id, name, city } | null
  status: 'planned' | 'attended'
}
```

- `useActivityFeed(page?: number)` — `useQuery` that:
  1. Gets current user's followed artist IDs from `useFollowedArtists` (or direct query)
  2. Gets current user's followed venue IDs from `useFollowedVenues` (or direct query)
  3. Gets current user's followed user IDs from `useFollowing` (or direct query)
  4. Queries recent public reviews from followed users (last 30 days)
  5. Queries recent events from followed artists' events (upcoming)
  6. Queries recent attendance from followed users (last 30 days)
  7. Merges and sorts by `created_at` descending
  8. Returns paginated results (20 per page)
- Implementation: single `useQuery` hook that calls `supabase` directly for efficiency, combining the three sub-queries.
- Uses `supabase` client directly for the feed query since it joins multiple data sources.

### 5. `apps/web/src/features/feed/components/FeedCard.tsx` — New component

Renders a single feed item based on its `type`.

```
Three card variants:
- Review card: "User wrote a review for EventName" + rating stars + body excerpt + link to review
- Event card: "EventName at VenueName" + date + link to event  
- Attendance card: "User is going to EventName" + date + link to event

All cards:
- Show relative time (formatRelativeTime) 
- Show user avatar (for review/attendance types)
- Card styling consistent with existing EventCard/Card pattern
- Link titles to relevant detail page
```

### 6. `apps/web/src/features/feed/pages/FeedPage.tsx` — New component

The main feed page at `/feed`.

```
- Protected route (requires auth)
- Uses useActivityFeed() with page parameter
- Header: "Activity Feed" with icon (Rss or Activity from lucide-react)
- Renders FeedCard for each item
- "Load More" button at bottom for pagination (consistent with VenuesPage/ArtistsPage pattern)
- Empty state: "Follow artists, venues, and users to see their activity here"
- Loading state: skeleton cards consistent with EventCardSkeleton pattern
```

### 7. `apps/web/src/app/App.tsx` — Modify

Add the `/feed` route.

- Import `FeedPage` from `@/features/feed/pages/FeedPage`
- Add `<Route path="/feed" element={<FeedPage />} />` inside the `<ProtectedRoute>` block (between `/my-gigs` and `/review/:eventId`)

### 8. `apps/web/src/shared/components/Layout.tsx` — Modify

Add "Feed" link to navigation.

- Add `{ to: '/feed', label: 'Feed', icon: Rss }` to `NAV_LINKS` array (only visible to authenticated users, so it goes in the user-only section instead)
- Since `NAV_LINKS` is public, add Feed to the user-only mobile nav section as well
- For desktop, add it to the user menu area (between "My Gigs" link and profile icon)
- Import `Rss` from `lucide-react`

---

## Task Breakdown

| # | Task | Files | Dependencies |
|---|------|-------|-------------|
| 1 | Create `ReactionButtons` component | `apps/web/src/features/reviews/components/ReactionButtons.tsx` | A-01 hooks |
| 2 | Add ReactionButtons to PublicReviewPage | `apps/web/src/features/reviews/pages/PublicReviewPage.tsx` | Task 1 |
| 3 | Add ReactionButtons to EventDetailPage review cards | `apps/web/src/features/events/pages/EventDetailPage.tsx` | Task 1 |
| 4 | Create feed API hooks | `apps/web/src/features/feed/api/feed.ts` | A-01 hooks |
| 5 | Create FeedCard component | `apps/web/src/features/feed/components/FeedCard.tsx` | Task 4 |
| 6 | Create FeedPage component | `apps/web/src/features/feed/pages/FeedPage.tsx` | Tasks 4, 5 |
| 7 | Add /feed route to App.tsx | `apps/web/src/app/App.tsx` | Task 6 |
| 8 | Add Feed nav link to Layout.tsx | `apps/web/src/shared/components/Layout.tsx` | Task 7 |
| 9 | Run `npm run lint`, `npm run build`, verify no errors | — | Tasks 1-8 |

## Verification

- PublicReviewPage shows reaction buttons (👍 Helpful, ❤️ Love, 🔥 Like) with counts
- Clicking a reaction adds it optimistically; clicking again removes it
- EventDetailPage review cards show compact reaction buttons
- Unauthenticated users see reactions with counts but buttons are disabled
- `/feed` route renders FeedPage with activity items
- Feed shows recent reviews from followed users, events from tracked artists/venues, attendance from followed users
- Feed is empty for new users with appropriate empty state message
- Feed link appears in main nav for authenticated users
- No file overlap with A-02 tasks
- No lint errors, build succeeds