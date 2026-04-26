# Phase D: Profile & Lists — Implementation Prompt

## Project Context

**RateMyGig** is a concert discovery and rating web app. Monorepo with React 19 + Vite + Tailwind on the frontend, Supabase (Postgres, Auth, Storage, RLS) on the backend — no custom API server. All data access is `supabase.from('table')` or `supabase.rpc()` directly from React hooks.

**Repository:** `C:\Users\badir\Documents\ratemygig`

**Current state:** Phases A (Social Proof), B (Setlist Archive), and C (Discovery Intelligence) are complete. 112 unit tests pass, 0 lint errors, build succeeds. The app has auth, event discovery, attendance, reviews with photos, venue/artist rating pages, follow systems, review reactions, activity feed, setlist archive, song statistics, personalized recommendations, geolocation search, and notifications.

**What Phase D adds:** Profile enrichment (avatar upload, social links, gig stats), custom lists/collections (like Letterboxd diaries), review enhancements (draft reviews, comments), and public profile improvements.

---

## Architecture & Conventions

Read these files for full context:
- `.planning/codebase/STACK.md`
- `.planning/codebase/CONVENTIONS.md`
- `.planning/codebase/ARCHITECTURE.md`
- `.planning/codebase/STRUCTURE.md`

Key conventions:
- **Named exports only** (no default exports except App.tsx)
- **Function components** with hooks
- **Feature module pattern:** `features/{name}/api/`, `features/{name}/components/`, `features/{name}/pages/`
- **Path aliases:** `@/`, `@shared/`, `@features/`, `@core/`
- **Query key factories** co-located in `api/*.ts`
- **Optimistic mutations** with `onMutate`/`onError` rollback
- **RLS policies:** owner can CRUD own rows, public can read all
- **Rate limiting** via `createRateLimiter()` from `shared/lib/throttle.ts`
- **Sanitize all user text** with `sanitizeText()` from `shared/lib/sanitize.ts`
- **Icons** from `lucide-react`
- **Route-level code splitting:** `React.lazy()` + `Suspense` for new routes
- **No comments in code** unless explicitly requested

Existing migrations: `001` through `010`. Next: `011`.
Existing storage bucket: `review-photos` only (private, 10MB limit, signed URLs).

---

## Phase D Plans

### D-01 (Wave 1 — Foundation) — MUST BE DONE FIRST

**File:** `.planning/phases/D-profile-lists/D-01-PLAN.md`

Database schema, storage bucket, and all API hooks.

**Deliverables:**

1. `packages/db/migrations/011_profile_lists.sql` — Migration adding:
   - `avatar-photos` storage bucket (public, 5MB limit, image/* MIME types)
   - RLS policies for avatar-photos: users can upload/read own avatars, public can read all
   - `comments` table (id UUID PK, review_id FK→reviews, user_id FK→auth.users, body TEXT NOT NULL, created_at TIMESTAMPTZ, updated_at TIMESTAMPTZ) with RLS (public read, owner create/update/delete)
   - `lists` table (id UUID PK, user_id FK→auth.users, name TEXT NOT NULL, description TEXT, is_public BOOLEAN DEFAULT true, created_at TIMESTAMPTZ, updated_at TIMESTAMPTZ) with RLS
   - `list_items` table (id UUID PK, list_id FK→lists, event_id FK→events, notes TEXT, position INTEGER DEFAULT 0, created_at TIMESTAMPTZ, UNIQUE(list_id, event_id)) with RLS (public read if list is public, owner CRUD)
   - Add `status TEXT DEFAULT 'published' CHECK (status IN ('draft', 'published'))` column to `reviews` table (migration ALTER TABLE)
   - Add `website_url TEXT`, `twitter_handle TEXT`, `instagram_handle TEXT` columns to `profiles` table
   - Indexes on `comments(review_id, created_at)`, `lists(user_id)`, `list_items(list_id, position)`

2. Domain types in `packages/core/src/types/index.ts`:
   - `Comment` interface
   - `List` and `ListItem` interfaces
   - `Profile` updated with new social link fields

3. Storage utilities:
   - `apps/web/src/shared/lib/avatar-storage.ts` — Upload, delete, and get public URL for avatars (separate from review photos since it's a public bucket with different path pattern: `avatars/{userId}/avatar.{ext}`)

4. `apps/web/src/features/profile/api/avatar.ts` — `useUploadAvatar()` mutation that uploads to `avatar-photos` bucket, resizes/crops on client side, and updates `profiles.avatar_url`

5. `apps/web/src/features/comments/api/comments.ts` — `useComments(reviewId)`, `useCreateComment()`, `useDeleteComment()` hooks with query key factory

6. `apps/web/src/features/lists/api/lists.ts` — `useUserLists(userId)`, `useList(listId)`, `useCreateList()`, `useUpdateList()`, `useDeleteList()`, `useAddEventToList()`, `useRemoveEventFromList()`, `useReorderListItems()` with query key factory and optimistic mutations

7. `apps/web/src/features/reviews/api/drafts.ts` — `useSaveDraft(reviewId?)`, `usePublishDraft(reviewId)`, `useDrafts()` hooks; update `useCreateReview` to support `status: 'draft'`

### D-02 (Wave 2 — Profile Enrichment UI, depends on D-01)

**File:** `.planning/phases/D-profile-lists/D-02-PLAN.md`

**Deliverables:**

1. `AvatarUpload.tsx` — Avatar upload component with drag-and-drop, client-side crop/resize (to 256x256), preview, remove avatar
2. `SocialLinksForm.tsx` — Form for website URL, Twitter handle, Instagram handle with validation
3. `GigStatsCard.tsx` — Compact card showing: events attended, reviews written, followers, following counts
4. `ProfilePage.tsx` — Modify to add avatar upload, social links, gig stats summary
5. `PublicProfilePage.tsx` — Modify to add social links display, gig stats, tabs for Reviews/Lists/Following

### D-03 (Wave 2 — Lists & Comments UI, parallel to D-02)

**File:** `.planning/phases/D-profile-lists/D-03-PLAN.md`

**Deliverables:**

1. `ListCard.tsx` — Compact card for list preview
2. `ListPage.tsx` — Page at `/lists/:listId` showing list details and events
3. `CreateListModal.tsx` — Modal for creating a new list
4. `AddToListButton.tsx` — Button on EventDetailPage to add event to a list (dropdown of user's lists + "Create new list")
5. `CommentSection.tsx` — Comment list and form under reviews on PublicReviewPage
6. `DraftReviewsSection.tsx` — Section on MyGigsPage showing draft reviews with edit/publish actions
7. Add `/lists/:listId` lazy route to `App.tsx`

---

## Execution Order

1. **D-01 first** — Migration, types, storage, all API hooks
2. **D-02 and D-03 in parallel** — Profile UI and Lists/Comments UI (no file overlap)
3. **After each plan:** Run `npm run lint`, `npm run test`, `npm run build`
4. **After all plans:** Update `.planning/ROADMAP.md`, `.planning/STATE.md`, `.planning/codebase/CONCERNS.md`

---

## Verification Checklist

- [ ] `npm run lint` — 0 errors (2 pre-existing warnings OK)
- [ ] `npm run test` — All tests pass (112+)
- [ ] `npm run build` — Build succeeds
- [ ] All new TypeScript types compile
- [ ] All migrations are valid SQL
- [ ] All hooks follow established pattern (query key factory, optimistic mutations, `useAuth`)
- [ ] New route components are lazy-loaded via `React.lazy()`
- [ ] No unnecessary comments
- [ ] User text sanitized with `sanitizeText()`
- [ ] Rate limiters on creation mutations
- [ ] Avatar uploads are size-limited and type-checked
- [ ] Draft reviews are only visible to their owner (RLS)

---

## Important Files to Read

| File | Why |
|------|-----|
| `packages/db/migrations/005_review_photos.sql` | Pattern for storage bucket + RLS policies |
| `apps/web/src/features/reviews/components/PhotoUploader.tsx` | Pattern for file upload UI |
| `apps/web/src/shared/lib/storage.ts` | Existing storage utilities to extend |
| `apps/web/src/features/profile/pages/ProfilePage.tsx` | Where avatar upload and social links go |
| `apps/web/src/features/profile/pages/PublicProfilePage.tsx` | Where lists tab and social links display go |
| `apps/web/src/features/reviews/pages/WriteReviewPage.tsx` | Where draft support needs to be added |
| `apps/web/src/features/reviews/pages/PublicReviewPage.tsx` | Where comment section goes |
| `apps/web/src/features/reviews/api/reviews.ts` | Where draft-related hooks go |
| `apps/web/src/features/setlists/api/setlists.ts` | Pattern for reorder/position-based CRUD |