# Plan D-01: Profile & Lists Data Model & Core API

**Wave:** 1 (Foundation — must land before D-02/D-03)
**Goal:** Create database migration for avatars, comments, lists, draft reviews, social links; storage utilities; and all React Query hooks.

---

## Files to Create/Modify

### 1. `packages/db/migrations/011_profile_lists.sql`

```sql
-- Avatar storage bucket
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'avatar-photos',
  'avatar-photos',
  true,                    -- public bucket (no signed URLs needed)
  5242880,                 -- 5MB
  ARRAY['image/jpeg', 'image/png', 'image/webp']
);

-- Avatar storage RLS policies
CREATE POLICY "Anyone can view avatars"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'avatar-photos');

CREATE POLICY "Users can upload their own avatar"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'avatar-photos' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can update their own avatar"
  ON storage.objects FOR UPDATE
  USING (bucket_id = 'avatar-photos' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can delete their own avatar"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'avatar-photos' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Comments table
CREATE TABLE IF NOT EXISTS public.comments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  review_id UUID NOT NULL REFERENCES public.reviews(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  body TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE INDEX idx_comments_review_id ON public.comments(review_id, created_at);
CREATE INDEX idx_comments_user_id ON public.comments(user_id);

CREATE TRIGGER comments_updated_at
  BEFORE UPDATE ON public.comments
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.comments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Comments are viewable by everyone"
  ON public.comments FOR SELECT USING (true);

CREATE POLICY "Authenticated users can create comments"
  ON public.comments FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own comments"
  ON public.comments FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own comments"
  ON public.comments FOR DELETE
  USING (auth.uid() = user_id);

-- Lists table
CREATE TABLE IF NOT EXISTS public.lists (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  is_public BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE INDEX idx_lists_user_id ON public.lists(user_id);

CREATE TRIGGER lists_updated_at
  BEFORE UPDATE ON public.lists
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.lists ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public lists are viewable by everyone"
  ON public.lists FOR SELECT
  USING (is_public = true OR auth.uid() = user_id);

CREATE POLICY "Users can create lists"
  ON public.lists FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own lists"
  ON public.lists FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own lists"
  ON public.lists FOR DELETE
  USING (auth.uid() = user_id);

-- List items table
CREATE TABLE IF NOT EXISTS public.list_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  list_id UUID NOT NULL REFERENCES public.lists(id) ON DELETE CASCADE,
  event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  notes TEXT,
  position INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  UNIQUE(list_id, event_id)
);

CREATE INDEX idx_list_items_list_id ON public.list_items(list_id, position);
CREATE INDEX idx_list_items_event_id ON public.list_items(event_id);

ALTER TABLE public.list_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "List items are viewable if list is public or owned"
  ON public.list_items FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.lists
      WHERE lists.id = list_items.list_id
      AND (lists.is_public = true OR lists.user_id = auth.uid())
    )
  );

CREATE POLICY "List owners can add items"
  ON public.list_items FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.lists
      WHERE lists.id = list_items.list_id
      AND lists.user_id = auth.uid()
    )
  );

CREATE POLICY "List owners can update items"
  ON public.list_items FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.lists
      WHERE lists.id = list_items.list_id
      AND lists.user_id = auth.uid()
    )
  );

CREATE POLICY "List owners can delete items"
  ON public.list_items FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.lists
      WHERE lists.id = list_items.list_id
      AND lists.user_id = auth.uid()
    )
  );

-- Add draft review support
ALTER TABLE public.reviews ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'published' CHECK (status IN ('draft', 'published'));

-- Add social link columns to profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS website_url TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS twitter_handle TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS instagram_handle TEXT;
```

### 2. `packages/core/src/types/index.ts` — Add types

```typescript
export interface Comment {
  id: string;
  review_id: string;
  user_id: string;
  body: string;
  created_at: string;
  updated_at: string;
}

export interface List {
  id: string;
  user_id: string;
  name: string;
  description: string | null;
  is_public: boolean;
  created_at: string;
  updated_at: string;
}

export interface ListItem {
  id: string;
  list_id: string;
  event_id: string;
  notes: string | null;
  position: number;
  created_at: string;
}

export interface ListWithItems extends List {
  items: (ListItem & { event: Event })[];
  profile: { id: string; display_name: string | null; username: string | null; avatar_url: string | null } | null;
}
```

Update `Profile` interface to add new fields:
```typescript
website_url: string | null;
twitter_handle: string | null;
instagram_handle: string | null;
```

### 3. `apps/web/src/shared/lib/avatar-storage.ts`

- `uploadAvatar(userId: string, file: File): Promise<string>` — Resize to 256x256 using canvas, upload to `avatar-photos/{userId}/avatar.{ext}`, return public URL
- `deleteAvatar(userId: string): Promise<void>` — Delete existing avatar from storage
- `getAvatarUrl(path: string): string` — Get public URL from `avatar-photos` bucket

### 4. `apps/web/src/features/profile/api/avatar.ts`

- `useUploadAvatar()` — Mutation that: uploads file via avatar-storage, then updates `profiles.avatar_url` with the public URL
- `useRemoveAvatar()` — Mutation that: deletes from storage, then sets `profiles.avatar_url` to null

### 5. `apps/web/src/features/comments/api/comments.ts`

- `commentKeys` factory: `all`, `byReview(reviewId)`, `byUser(userId)`
- `useComments(reviewId)` — fetches comments for a review, ordered by created_at, with profile embedding
- `useCreateComment()` — mutation with `sanitizeText(body)`, rate-limited (3s)
- `useDeleteComment()` — mutation, owner-only enforced by RLS

### 6. `apps/web/src/features/lists/api/lists.ts`

- `listKeys` factory: `all`, `byUser(userId)`, `detail(id)`
- `useUserLists(userId)` — fetches public lists (or all if own user), with item count
- `useList(id)` — fetches single list with items + events + profile
- `useCreateList()` — mutation with rate limiter (5s)
- `useUpdateList()` — mutation for name/description/isPublic
- `useDeleteList()` — mutation
- `useAddEventToList()` — mutation
- `useRemoveEventFromList()` — mutation
- `useReorderListItems()` — mutation with optimistic update

### 7. `apps/web/src/features/reviews/api/drafts.ts`

- `useDrafts()` — fetches current user's draft reviews (`status = 'draft'`)
- `useSaveDraft()` — creates or updates a review with `status: 'draft'`
- `usePublishDraft(reviewId)` — updates `status` from 'draft' to 'published'

---

## Task Breakdown

| # | Task | Files | Dependencies |
|---|------|-------|-------------|
| 1 | Write migration `011_profile_lists.sql` | `packages/db/migrations/011_profile_lists.sql` | None |
| 2 | Add domain types to `@core/types` | `packages/core/src/types/index.ts` | None |
| 3 | Create avatar-storage utility | `apps/web/src/shared/lib/avatar-storage.ts` | Task 1 |
| 4 | Create avatar API hooks | `apps/web/src/features/profile/api/avatar.ts` | Tasks 1, 3 |
| 5 | Create comments API hooks | `apps/web/src/features/comments/api/comments.ts` | Tasks 1, 2 |
| 6 | Create lists API hooks | `apps/web/src/features/lists/api/lists.ts` | Tasks 1, 2 |
| 7 | Create drafts API hooks | `apps/web/src/features/reviews/api/drafts.ts` | Task 1 |
| 8 | Update `Profile` type with new fields | `packages/core/src/types/index.ts` | None |
| 9 | Run `npm run lint`, `npm run build`, `npm run test` | — | Tasks 1-8 |

## Verification

- Migration SQL runs without errors
- All TypeScript types compile
- Query key factories follow established pattern
- Rate limiters on creation mutations (comments 3s, lists 5s)
- Storage bucket and RLS policies correct
- Draft reviews only visible to owner via RLS