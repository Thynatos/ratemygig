# Plan C-03: Preferences & Notifications UI

**Wave:** 2 (depends on C-01 for hooks; parallel to C-02 with no file overlap)
**Goal:** Add user preference management, a notification bell in the nav, and a notifications page.

---

## Context

- C-01 provides `useUserPreferences`, `useUpdatePreferences`, `useNotifications`, `useUnreadNotificationCount`, `useMarkNotificationRead`, `useMarkAllNotificationsRead` hooks.
- ProfilePage currently has: display name, username, bio, is_profile_public toggle.
- Layout.tsx has a nav bar with links: Discover, Venues, Top Venues, Artists, Top Artists, and auth-dependent links (My Gigs, Profile, Sign Out).
- No notification system exists currently — notifications will be seed data via the RPC functions for now (no real-time push yet).

## Files to Create/Modify

### 1. `apps/web/src/features/profile/components/PreferencesForm.tsx` — New component

Preferences form for user location and discovery settings.

```
Props:
  (none — uses useUserPreferences and useUpdatePreferences internally)

State:
  - preferredCity: string
  - isSaving: boolean (from mutation)

Layout:
  - Section header: "Discovery Preferences" with MapPin icon
  - Preferred City: text input with city autocomplete suggestions
    - Suggestions come from existing venue cities (via supabase.from('venues').select('city').ilike('city', '%query%'))
    - When a city is selected or typed, saves to preferences
  - "Use My Current Location" button:
    - Calls navigator.geolocation to get lat/lng
    - Reverse geocodes city name from lat/lng (or saves lat/lng without city)
    - Saves to preferences via useUpdatePreferences
  - Current preference displayed: "Your preferred city: London" or "Using your current location"
  - Reset button to clear preferences
```

### 2. `apps/web/src/features/profile/pages/ProfilePage.tsx` — Modify

Add preferences section to the existing profile page.

- Import `PreferencesForm` from `/features/profile/components/PreferencesForm`
- Import `useIsFollowingArtist` and `useIsFollowingVenue` hooks (already exist)
- Add `PreferencesForm` as a new Card section below the profile info
- Add a "Followed Artists" count section with link to search/artists
- Add a "Followed Venues" count section with link to search/venues
- All existing profile editing functionality preserved

### 3. `apps/web/src/features/notifications/components/NotificationBell.tsx` — New component

Bell icon in the nav bar with unread count badge.

```
Props:
  (none — uses useUnreadNotificationCount and useNotifications internally)

State:
  - isOpen: boolean (dropdown visibility)

Layout:
  - Bell icon with small red badge showing unread count (only when > 0)
  - Position: relative container for dropdown
  - Click toggles dropdown panel
  - Dropdown panel:
    - Header: "Notifications" with "Mark all read" button
    - List of recent notifications (latest 5)
    - Each notification: icon based on type, title, relative time, link on click
    - "View all" link at bottom → /notifications
  - Click outside closes dropdown
  - Only rendered when user is authenticated
```

### 4. `apps/web/src/features/notifications/components/NotificationItem.tsx` — New component

Single notification row component.

```
Props:
  notification: Notification
  onMarkRead: (id: string) => void

Layout:
  - Icon based on type:
    - event_reminder: Calendar icon (blue)
    - new_review: Star icon (yellow)
    - artist_event: Users icon (accent/fuchsia)
    - venue_event: MapPin icon (primary/sky)
  - Title text (bold if unread)
  - Body text (gray, truncated)
  - Relative time (formatRelativeTime)
  - Unread indicator (small dot)
  - Click marks as read and navigates to link
```

### 5. `apps/web/src/features/notifications/pages/NotificationsPage.tsx` — New page

Full notifications list at `/notifications`.

```
Layout:
  - Header: "Notifications" with "Mark all as read" button
  - Grouped by date: Today, Yesterday, This Week, Older
  - Each group: list of NotificationItem components
  - Empty state: "No notifications yet" with bell icon
  - Loading: skeleton items
  - Protected route (requires authentication)
```

### 6. `apps/web/src/app/App.tsx` — Modify

Add the notifications route:
- `const NotificationsPage = lazy(() => import('@/features/notifications/pages/NotificationsPage').then(m => ({ default: m.NotificationsPage })))`
- `<Route path="/notifications" element={<NotificationsPage />} />` inside the ProtectedRoute group

### 7. `apps/web/src/shared/components/Layout.tsx` — Modify

Add `NotificationBell` to the navigation:
- Import `NotificationBell` from `@/features/notifications/components/NotificationBell`
- Add it to the auth-dependent nav section (desktop and mobile menus)
- Position: between "My Gigs" and "Profile" links
- Only rendered when user is authenticated

---

## Task Breakdown

| # | Task | Files | Dependencies |
|---|------|-------|-------------|
| 1 | Create PreferencesForm | `apps/web/src/features/profile/components/PreferencesForm.tsx` | C-01 hooks |
| 2 | Update ProfilePage | `apps/web/src/features/profile/pages/ProfilePage.tsx` | Task 1 |
| 3 | Create NotificationItem | `apps/web/src/features/notifications/components/NotificationItem.tsx` | C-01 hooks |
| 4 | Create NotificationBell | `apps/web/src/features/notifications/components/NotificationBell.tsx` | Tasks 3, C-01 hooks |
| 5 | Create NotificationsPage | `apps/web/src/features/notifications/pages/NotificationsPage.tsx` | Tasks 3, C-01 hooks |
| 6 | Add /notifications route to App.tsx | `apps/web/src/app/App.tsx` | Task 5 |
| 7 | Add NotificationBell to Layout | `apps/web/src/shared/components/Layout.tsx` | Task 4 |
| 8 | Run `npm run lint`, `npm run build`, `npm run test` | — | Tasks 1-7 |

## Verification

- ProfilePage shows Discovery Preferences section with city input and geolocation button
- Preferences persist across page reloads (stored in Supabase)
- NotificationBell appears in nav when authenticated
- NotificationBell shows unread count badge
- NotificationBell dropdown shows recent notifications
- Clicking a notification marks it as read and navigates to link
- NotificationsPage shows full grouped notification list
- NotificationsPage is auth-protected
- Build passes, 112+ tests pass, 0 lint errors