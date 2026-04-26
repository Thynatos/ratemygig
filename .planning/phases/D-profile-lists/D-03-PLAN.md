# Plan D-03: Lists & Comments UI

**Wave:** 2 (depends on D-01 for hooks and types; parallel to D-02 with no file overlap)
**Goal:** Custom lists UI, comment system, draft reviews, and the AddToList flow on event pages.

---

## Files to Create/Modify

### 1. `apps/web/src/features/lists/components/ListCard.tsx` — New component

```
Props:
  list: ListWithItems (or a lighter version with item_count)
  onClick: () => void

Layout:
  - Glass card style
  - List name (bold, white)
  - Description (clamped to 2 lines, surface-400)
  - Event count badge
  - Public/private indicator (Globe or Lock icon)
  - First 3 event names as preview chips
  - Created date (relative time)
  - Clickable → navigates to /lists/:listId
```

### 2. `apps/web/src/features/lists/pages/ListPage.tsx` — New page

```
Route: /lists/:listId

Layout:
  - Back link
  - List header: name, description, owner avatar + name, date
  - Public/private badge
  - Edit/Delete buttons for owner
  - Ordered list of events with notes
  - Each event links to /events/:eventId
  - Empty state: "This list is empty. Add events from any event page."
  - 404 state if list not found or not public
```

### 3. `apps/web/src/features/lists/components/CreateListModal.tsx` — New component

```
Props:
  isOpen: boolean
  onClose: () => void
  onCreated: (listId: string) => void

Layout:
  - Modal overlay with glass-card content
  - Name input (required)
  - Description textarea (optional)
  - Public/private toggle
  - Cancel + Create buttons
  - Uses useCreateList mutation with rate limiting
```

### 4. `apps/web/src/features/lists/components/AddToListButton.tsx` — New component

```
Props:
  eventId: string

Behavior:
  - Button that opens a dropdown/popover showing user's lists
  - Each list has a checkmark if event is already in it
  - Clicking an unchecked list adds the event via useAddEventToList
  - Clicking a checked list removes the event via useRemoveEventFromList
  - "+ New List" option at bottom opens CreateListModal
  - Only shown when authenticated
  - Uses useUserLists(userId) to get lists
  - Uses ListPlus icon from lucide-react
```

### 5. `apps/web/src/features/comments/components/CommentSection.tsx` — New component

```
Props:
  reviewId: string

Layout:
  - "Comments" header with count
  - Comment input form at top (when authenticated):
    - Textarea for body
    - Submit button (rate-limited 3s)
    - Uses useCreateComment
  - List of comments below:
    - Author avatar + name
    - Body text (sanitized)
    - Relative timestamp
    - Delete button for own comments
  - Uses useComments(reviewId)
  - Loading skeleton state
  - Empty state: "No comments yet. Be the first!"
```

### 6. `apps/web/src/features/comments/components/CommentItem.tsx` — New component

```
Props:
  comment: Comment with embedded profile
  onDelete: (id: string) => void
  canDelete: boolean

Layout:
  - Small avatar (32x32) + display_name/username
  - Sanitized body text
  - Relative time (formatRelativeTime)
  - Delete icon button (only shown if canDelete)
```

### 7. `apps/web/src/features/reviews/components/DraftReviewsSection.tsx` — New component

```
Props:
  (none — uses useDrafts and useAuth internally)

Layout:
  - "Draft Reviews" header with Pencil icon
  - List of draft reviews with:
    - Event name
    - Review title or "(untitled)"
    - "Last edited X ago" relative time
    - Edit button → navigates to /review/:eventId/edit
    - Publish button → confirms then usePublishDraft
    - Delete button → confirms then useDeleteReview
  - Empty state: "No draft reviews"
  - Only shown on MyGigsPage when authenticated
```

### 8. `apps/web/src/features/events/pages/EventDetailPage.tsx` — Modify

- Add `AddToListButton` component next to the attendance/seat info section
- Import and render the button with the current eventId

### 9. `apps/web/src/features/reviews/pages/PublicReviewPage.tsx` — Modify

- Add `CommentSection` component below the review content, after the reaction buttons

### 10. `apps/web/src/features/reviews/pages/MyGigsPage.tsx` — Modify

- Add `DraftReviewsSection` above the attended events section

### 11. `apps/web/src/app/App.tsx` — Modify

- Add lazy-loaded route: `const ListPage = lazy(...)`
- Add route: `<Route path="/lists/:listId" element={<ListPage />} />` in the public routes

---

## Task Breakdown

| # | Task | Files | Dependencies |
|---|------|-------|-------------|
| 1 | Create ListCard | `apps/web/src/features/lists/components/ListCard.tsx` | D-01 |
| 2 | Create CreateListModal | `apps/web/src/features/lists/components/CreateListModal.tsx` | D-01 |
| 3 | Create AddToListButton | `apps/web/src/features/lists/components/AddToListButton.tsx` | D-01, Task 2 |
| 4 | Create ListPage | `apps/web/src/features/lists/pages/ListPage.tsx` | D-01, Task 1 |
| 5 | Create CommentItem | `apps/web/src/features/comments/components/CommentItem.tsx` | D-01 |
| 6 | Create CommentSection | `apps/web/src/features/comments/components/CommentSection.tsx` | D-01, Task 5 |
| 7 | Create DraftReviewsSection | `apps/web/src/features/reviews/components/DraftReviewsSection.tsx` | D-01 |
| 8 | Modify EventDetailPage | `apps/web/src/features/events/pages/EventDetailPage.tsx` | Task 3 |
| 9 | Modify PublicReviewPage | `apps/web/src/features/reviews/pages/PublicReviewPage.tsx` | Task 6 |
| 10 | Modify MyGigsPage | `apps/web/src/features/reviews/pages/MyGigsPage.tsx` | Task 7 |
| 11 | Add list route to App.tsx | `apps/web/src/app/App.tsx` | Task 4 |
| 12 | Run `npm run lint`, `npm run build`, `npm run test` | — | Tasks 1-11 |

## Verification

- List creation works, rate-limited at 5s
- Add to list dropdown shows user's lists, can add/remove events
- List page displays events in order with notes
- Comments can be created and deleted, rate-limited at 3s
- Comment body is sanitized with sanitizeText()
- Draft reviews section shows on MyGigsPage
- Draft reviews can be published or deleted
- AddToListButton appears on EventDetailPage
- CommentSection appears on PublicReviewPage
- List page lazy-loaded via React.lazy()
- Build passes, tests pass, 0 lint errors