# Plan A-02: Follow UI on Detail Pages + MyGigs Tracked Tabs

**Wave:** 2 (depends on A-01 for hooks)
**Goal:** Add "Track Artist/Venue" toggle buttons to their detail pages, "Follow User" button to PublicProfilePage, and "Tracked Artists/Venues" tabs to MyGigsPage.

---

## Context

- A-01 provides the API hooks: `useFollowArtist`, `useUnfollowArtist`, `useIsFollowingArtist`, `useFollowedArtists`, `useFollowVenue`, `useUnfollowVenue`, `useIsFollowingVenue`, `useFollowedVenues`, `useFollowUser`, `useUnfollowUser`, `useIsFollowingUser`, `useFollowers`, `useFollowing`, `useFollowerCount`, `useFollowingCount`.
- Detail pages follow a consistent pattern: `ArtistDetailPage` and `VenueDetailPage` both use a two-column grid layout (main content + sidebar).
- MyGigsPage currently has tabs: All, Planned, Attended — all filtering `attendance` data.
- PublicProfilePage shows user avatar, display name, username, bio, and their reviews.
- UI components: `Button` (variants: default, secondary, ghost), `Badge`, `Card/CardContent`, `Avatar`, `LoadingPage`.
- Tailwind theme: `primary` (sky blue), `accent` (fuchsia), `surface` (slate). Glassmorphism + glow effects.

## Files to Create/Modify

### 1. `apps/web/src/features/artists/components/FollowArtistButton.tsx` — New component

A button that shows "Track Artist" / "Tracking" toggle with optimistic update.

```
- Uses useIsFollowingArtist(artistId) to read state
- Uses useFollowArtist(artistId) and useUnfollowArtist(artistId) for mutations
- Renders as Button with Heart/Star icon
- Unfollowed state: outlined icon + "Track Artist" text (secondary variant)
- Followed state: filled icon + "Tracking" text (primary/accent variant)
- Uses mutate() on click, which optimistically updates via A-01 hooks
- Disabled state when user is not authenticated (shows "Sign in to track" tooltip)
- Uses useAuth() to check authentication
```

### 2. `apps/web/src/features/venues/components/FollowVenueButton.tsx` — New component

Same pattern as FollowArtistButton but for venues. Uses venue follow hooks from A-01.

### 3. `apps/web/src/features/profile/components/FollowUserButton.tsx` — New component

Follow/unfollow toggle for user profiles.

```
- Uses useIsFollowingUser(userId), useFollowUser(userId), useUnfollowUser(userId)
- Shows follower/following counts via useFollowerCount/useFollowingCount
- Unfollowed state: "Follow" button (primary variant)
- Followed state: "Following" button (secondary variant, muted style)
- Auth check: cannot follow self (compare with auth user id)
```

### 4. `apps/web/src/features/artists/pages/ArtistDetailPage.tsx` — Modify

Add `FollowArtistButton` to the artist header card, positioned next to the artist name/stats.

- Import `FollowArtistButton` from `../components/FollowArtistButton`
- Place the button in the header Card's flex layout, after the artist stats paragraph
- Only render when user is authenticated (use `useAuth`)

### 5. `apps/web/src/features/venues/pages/VenueDetailPage.tsx` — Modify

Same pattern as ArtistDetailPage:

- Import `FollowVenueButton` from `../components/FollowVenueButton`
- Add to the venue header Card, after venue name/city
- Only render when user is authenticated

### 6. `apps/web/src/features/profile/pages/PublicProfilePage.tsx` — Modify

Add follow button and follower/following counts to the profile header.

- Import `FollowUserButton` from `../components/FollowUserButton`
- Add `useFollowerCount(profile.id)` and `useFollowingCount(profile.id)` queries
- Display follower count and following count as Badges next to the existing review count Badge
- Render `FollowUserButton` next to the profile info, only when viewer is authenticated and not viewing own profile
- Hide follow button if viewing own profile

### 7. `apps/web/src/features/reviews/pages/MyGigsPage.tsx` — Modify

Add "Tracked Artists" and "Tracked Venues" tabs alongside existing tabs.

Current tabs: `All | Planned | Attended`
New tabs: `All | Planned | Attended | Tracked Artists | Tracked Venues`

```
- Extend TabType to: 'all' | 'planned' | 'attended' | 'tracked-artists' | 'tracked-venues'
- For 'tracked-artists': use useFollowedArtists() hook from A-01
  - Show list of followed artists with upcoming events
  - Each card: artist avatar (initial), name, link to ArtistDetailPage
  - Show upcoming events count per artist (needs useArtistEvents per artist or a batch query)
- For 'tracked-venues': use useFollowedVenues() hook from A-01
  - Same pattern: venue cards with name, city, upcoming events count
- For 'tracked-*' tabs, show empty state: "Track artists to see their upcoming shows here"
```

### 8. `apps/web/src/features/artists/components/FollowedArtistsList.tsx` — New component

Reusable list component for "Tracked Artists" tab content:

```
- Accepts followed artists data from useFollowedArtists()
- Renders artist cards in a grid (md:grid-cols-2)
- Each card: initial-circle avatar, artist name, link to detail page
- Shows "No tracked artists yet" empty state with link to /artists
```

### 9. `apps/web/src/features/venues/components/FollowedVenuesList.tsx` — New component

Same pattern for venues.

---

## Task Breakdown

| # | Task | Files | Dependencies |
|---|------|-------|-------------|
| 1 | Create `FollowArtistButton` component | `apps/web/src/features/artists/components/FollowArtistButton.tsx` | A-01 hooks |
| 2 | Create `FollowVenueButton` component | `apps/web/src/features/venues/components/FollowVenueButton.tsx` | A-01 hooks |
| 3 | Create `FollowUserButton` component | `apps/web/src/features/profile/components/FollowUserButton.tsx` | A-01 hooks |
| 4 | Add FollowArtistButton to ArtistDetailPage | `apps/web/src/features/artists/pages/ArtistDetailPage.tsx` | Task 1 |
| 5 | Add FollowVenueButton to VenueDetailPage | `apps/web/src/features/venues/pages/VenueDetailPage.tsx` | Task 2 |
| 6 | Add FollowUserButton + counts to PublicProfilePage | `apps/web/src/features/profile/pages/PublicProfilePage.tsx` | Task 3 |
| 7 | Create FollowedArtistsList component | `apps/web/src/features/artists/components/FollowedArtistsList.tsx` | A-01 hooks |
| 8 | Create FollowedVenuesList component | `apps/web/src/features/venues/components/FollowedVenuesList.tsx` | A-01 hooks |
| 9 | Add Tracked tabs to MyGigsPage | `apps/web/src/features/reviews/pages/MyGigsPage.tsx` | Tasks 7, 8 |
| 10 | Run `npm run lint`, `npm run build`, verify no errors | — | Tasks 1-9 |

## Verification

- "Track Artist" button toggles between tracked/untracked states with optimistic update
- "Track Venue" button works identically on VenueDetailPage
- "Follow" button appears on PublicProfilePage for other users; hidden on own profile
- Follower/following counts render correctly on profile
- MyGigsPage shows 5 tabs; "Tracked Artists" and "Tracked Venues" tabs show followed entities
- All components follow Tailwind theme conventions (primary/accent/surface)
- Auth-gated buttons show disabled/login prompt when unauthenticated
- No lint errors, build succeeds