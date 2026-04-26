# Plan B-02: Setlist Viewer & Editor UI

**Wave:** 2 (depends on B-01 for hooks and types)
**Goal:** Build the setlist viewer page on event detail and the community wiki editor for adding/editing setlists.

---

## Context

- B-01 provides: `useEventSetlists`, `useSetlist`, `useCreateSetlist`, `useUpdateSetlist`, `useDeleteSetlist`, `useAddSong`, `useRemoveSong`, `useReorderSongs`, `useSongSearch`, `useCreateSong`
- EventDetailPage already has a sidebar with Lineup info and a venue info card.
- The event detail page uses a two-column grid: `lg:grid-cols-3` with main content (2 cols) and sidebar (1 col).
- Setlists should appear in the main content area, below the reviews section.
- The editor should be a modal or inline form that allows drag-to-reorder songs.
- Auth-gated: only authenticated users can create/edit setlists. Only the owner can edit their own setlist.

## Files to Create/Modify

### 1. `apps/web/src/features/setlists/components/SetlistViewer.tsx` — New component

Read-only view of a setlist. Shows an ordered list of songs with position numbers, encore markers, debut markers, and notes.

```
Props:
  setlist: SetlistWithSongs
  isOwner?: boolean
  onEdit?: () => void
  onDelete?: () => void

Layout:
- Header: "Setlist by {username}" with source badge (manual/verified), edit button if owner
- Song list: ordered list with position numbers
  - Encore section: visual divider + "Encore" label before encore songs
  - Debut badge: small accent badge "Debut" next to debut songs
  - Notes: italic text below song name if present
- Footer: "{songCount} songs • Last updated {relativeTime}"
```

### 2. `apps/web/src/features/setlists/components/SetlistCard.tsx` — New component

Compact card for list view on EventDetailPage when there are multiple setlists.

```
Props:
  setlist: SetlistWithSongs (summary only)
  onClick: () => void

Layout:
- Card with hoverable effect
- "{username}'s Setlist" title
- First 3-4 song names as preview, then "...and {n} more"
- Source badge (manual/verified)
- Song count + last updated time
```

### 3. `apps/web/src/features/setlists/components/SetlistEditor.tsx` — New component

Full editor for creating or editing a setlist. Uses song search autocomplete and position management.

```
Props:
  eventId: string
  existingSetlist?: SetlistWithSongs  // undefined = creating new
  onClose: () => void

State:
- songs: array of { songId, name, position, is_encore, is_debut, notes }
- searchQuery: string
- searchResults: from useSongSearch

Header:
- "Add Setlist" or "Edit Setlist" title
- Cancel button

Song search:
- Input with debounced search via useSongSearch
- Dropdown of matching songs (from DB) + "Create '{query}'" option
- On select: add song to list at next position

Song list (editable):
- Each row: drag handle icon, position number, song name, encore toggle, debut toggle, notes input, remove button
- Encore group divider (inserted before first encore song)
- Reorder buttons (move up/move down) for accessibility
- Future: drag-to-reorder (requires dnd library — out of scope for now, use up/down buttons)

Save:
- useCreateSetlist or useUpdateSetlist
- On success: invalidate setlist queries, close editor
- Notes field for the setlist overall notes
```

### 4. `apps/web/src/features/setlists/pages/SetlistPage.tsx` — New page

Dedicated setlist view at `/events/:eventId/setlist` — shows all setlists for an event.

```
- Protected route (requires auth to create, public to view)
- Header: "Setlists for {eventName}"
- Button: "Add Setlist" (opens SetlistEditor modal)
- List of SetlistViewer components for each setlist
- Empty state: "No setlists yet. Be the first to add one!"
- Auth check: show "Add Setlist" only for authenticated users
```

### 5. `apps/web/src/features/events/pages/EventDetailPage.tsx` — Modify

Add a "Setlists" section to the main content area, between reviews and the bottom of the page.

- Import `useEventSetlists` from setlists API
- Add a section header: "Setlists" with `Music` icon and count badge
- If setlists exist: show `SetlistCard` for each, linking to `/events/:eventId/setlist`
- If user is authenticated and has no setlist: show "Add Setlist" button
- If user already has a setlist: show "View Your Setlist" link
- Loading state: skeleton cards

### 6. `apps/web/src/app/App.tsx` — Modify

Add the setlist route:

- `import { SetlistPage } from '@/features/setlists/pages/SetlistPage'` (lazy loaded)
- `<Route path="/events/:eventId/setlist" element={<SetlistPage />} />` — public, inside the Layout route

### 7. `apps/web/src/shared/components/Layout.tsx` — No change needed

Setlist navigation happens via the event detail page, not a standalone nav link.

---

## Task Breakdown

| # | Task | Files | Dependencies |
|---|------|-------|-------------|
| 1 | Create SetlistViewer component | `apps/web/src/features/setlists/components/SetlistViewer.tsx` | B-01 hooks |
| 2 | Create SetlistCard component | `apps/web/src/features/setlists/components/SetlistCard.tsx` | B-01 hooks |
| 3 | Create SetlistEditor component | `apps/web/src/features/setlists/components/SetlistEditor.tsx` | B-01 hooks |
| 4 | Create SetlistPage | `apps/web/src/features/setlists/pages/SetlistPage.tsx` | Tasks 1-3 |
| 5 | Add Setlists section to EventDetailPage | `apps/web/src/features/events/pages/EventDetailPage.tsx` | Tasks 1, 2 |
| 6 | Add /events/:eventId/setlist route to App.tsx | `apps/web/src/app/App.tsx` | Task 4 |
| 7 | Run `npm run lint`, `npm run build`, `npm run test` | — | Tasks 1-6 |

## Verification

- EventDetailPage shows "Setlists" section with setlist cards
- Clicking a setlist card navigates to dedicated setlist page
- SetlistViewer shows song list with position numbers, encore markers, debut badges
- SetlistEditor allows adding songs via autocomplete search
- SetlistEditor can create a new setlist with multiple songs
- Only authenticated users see "Add Setlist" button
- Only setlist owner sees "Edit" button on their setlist
- Song search autocomplete works with typeahead against songs table
- New songs are auto-created in the songs table when user types a name not in DB
- Build passes, 112+ tests pass, 0 lint errors