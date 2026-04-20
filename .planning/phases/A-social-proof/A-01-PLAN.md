# Plan A-01: Database Schema + API Hooks for All Social Features

**Wave:** 1 (Foundation — must land before A-02/A-03)
**Goal:** Create the database migration and React Query hooks for artist follows, venue follows, user follows, and review reactions.

---

## Context

- All data access goes directly from React → Supabase client (no custom API layer).
- Existing pattern: `supabase.from('table').insert/select/delete` with RLS policies gating access.
- Query key factories are co-located in `api/*.ts` files (see `reviewKeys`, `venueKeys`, `artistKeys`).
- Mutations use `createRateLimiter()` from `shared/lib/throttle.ts` for client-side rate limiting.
- Mutations invalidate related query keys on success via `queryClient.invalidateQueries()`.
- RLS follows the established pattern in `002_rls_policies.sql` (owner CRUD, public read).

## Files to Create/Modify

### 1. `packages/db/migrations/007_social_features.sql`

Create four new tables plus RLS policies and indexes.

#### artist_follows

```sql
CREATE TABLE IF NOT EXISTS public.artist_follows (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  artist_id UUID NOT NULL REFERENCES public.artists(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  UNIQUE(user_id, artist_id)
);
```

- RLS: owner can INSERT/DELETE own rows; public can SELECT all rows.
- Index on `user_id` (user's followed artists), composite index on `(artist_id, created_at DESC)` (feed queries).

#### venue_follows

```sql
CREATE TABLE IF NOT EXISTS public.venue_follows (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  venue_id UUID NOT NULL REFERENCES public.venues(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  UNIQUE(user_id, venue_id)
);
```

- Same RLS pattern as artist_follows.
- Same index pattern.

#### user_follows

```sql
CREATE TABLE IF NOT EXISTS public.user_follows (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  follower_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  following_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  UNIQUE(follower_id, following_id),
  CONSTRAINT no_self_follow CHECK (follower_id != following_id)
);
```

- RLS: users can INSERT rows where `follower_id = auth.uid()`, DELETE where `follower_id = auth.uid()`, SELECT all rows.
- Index on `follower_id` and `following_id`.

#### review_reactions

```sql
CREATE TYPE public.reaction_type AS ENUM ('like', 'helpful', 'love');

CREATE TABLE IF NOT EXISTS public.review_reactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  review_id UUID NOT NULL REFERENCES public.reviews(id) ON DELETE CASCADE,
  reaction_type public.reaction_type NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  UNIQUE(user_id, review_id, reaction_type)
);
```

- RLS: users can INSERT/DELETE own rows (`user_id = auth.uid()`); public can SELECT all.
- Index on `review_id` (fetch reactions for a review), composite on `(user_id, review_id)` (has-user-reacted check).

### 2. `apps/web/src/features/artists/api/artists.ts` — Add follow hooks

Append to existing file:

```typescript
export const artistFollowKeys = {
  all: ['artist-follows'] as const,
  isFollowing: (artistId: string) => [...artistFollowKeys.all, 'is-following', artistId] as const,
  followedArtists: () => [...artistFollowKeys.all, 'followed'] as const,
}

export function useFollowArtist(artistId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')
      const { error } = await supabase.from('artist_follows').insert({ user_id: user.id, artist_id: artistId })
      if (error) throw error
    },
    onMutate: async () => {
      await queryClient.cancelQueries({ queryKey: artistFollowKeys.isFollowing(artistId) })
      const prev = queryClient.getQueryData(artistFollowKeys.isFollowing(artistId))
      queryClient.setQueryData(artistFollowKeys.isFollowing(artistId), true)
      return { prev }
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.prev !== undefined) queryClient.setQueryData(artistFollowKeys.isFollowing(artistId), ctx.prev)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: artistFollowKeys.all })
    },
  })
}
```

- `useUnfollowArtist(artistId)` — same pattern with `.delete().eq('user_id', user.id).eq('artist_id', artistId)` and optimistic `false`.
- `useIsFollowingArtist(artistId)` — `useQuery` selecting `id` from `artist_follows` where `user_id = auth.uid()` and `artist_id = artistId`, returns `true/false`.
- `useFollowedArtists()` — `useQuery` selecting `*, artist:artists(*)` from `artist_follows` where `user_id = auth.uid()`, ordered by `created_at DESC`.

### 3. `apps/web/src/features/venues/api/venues.ts` — Add follow hooks

Same pattern as artist follows, using `venue_follows` table:

- `venueFollowKeys` factory
- `useFollowVenue(venueId)`, `useUnfollowVenue(venueId)`, `useIsFollowingVenue(venueId)`, `useFollowedVenues()`

### 4. `apps/web/src/features/profile/api/follows.ts` — New file for user follow hooks

```typescript
export const userFollowKeys = {
  all: ['user-follows'] as const,
  isFollowing: (userId: string) => [...userFollowKeys.all, 'is-following', userId] as const,
  followers: (userId: string) => [...userFollowKeys.all, 'followers', userId] as const,
  following: (userId: string) => [...userFollowKeys.all, 'following', userId] as const,
  followerCount: (userId: string) => [...userFollowKeys.all, 'follower-count', userId] as const,
  followingCount: (userId: string) => [...userFollowKeys.all, 'following-count', userId] as const,
}
```

- `useFollowUser(userId)` — insert into `user_follows` with `follower_id = auth.uid()`, optimistic update.
- `useUnfollowUser(userId)` — delete from `user_follows`, optimistic.
- `useIsFollowingUser(userId)` — boolean query.
- `useFollowers(userId)` — select `follower:profiles!user_follows_follower_id_fkey(*)` where `following_id = userId`.
- `useFollowing(userId)` — select `following:profiles!user_follows_following_id_fkey(*)` where `follower_id = userId`.
- `useFollowerCount(userId)` — `select('id', count: 'exact')` count query.
- `useFollowingCount(userId)` — same pattern.

### 5. `apps/web/src/features/reviews/api/reviews.ts` — Add reaction hooks

Append to existing file:

```typescript
export const reactionKeys = {
  all: ['review-reactions'] as const,
  forReview: (reviewId: string) => [...reactionKeys.all, 'review', reviewId] as const,
  userReaction: (reviewId: string) => [...reactionKeys.all, 'user', reviewId] as const,
}
```

- `useReactToReview(reviewId)` — mutation: insert into `review_reactions` with `{user_id, review_id, reaction_type}`. Optimistic: add reaction to cached list. Rate-limited at 1s via `createRateLimiter(1000)`.
- `useRemoveReaction(reviewId)` — mutation: delete from `review_reactions` where `user_id = auth.uid()` and matching `reaction_type`. Optimistic update removes the reaction.
- `useReviewReactions(reviewId)` — query: select all reactions for review, group by type, return counts + user's own reactions.
- `useUserReactions(reviewId)` — query: select current user's reactions for a review (which types they've given).

### 6. `packages/core/src/types/index.ts` — Add TypeScript types

Add types for the new entities:

```typescript
export type ReactionType = 'like' | 'helpful' | 'love'

export interface ArtistFollow {
  id: string
  user_id: string
  artist_id: string
  created_at: string
}

export interface VenueFollow {
  id: string
  user_id: string
  venue_id: string
  created_at: string
}

export interface UserFollow {
  id: string
  follower_id: string
  following_id: string
  created_at: string
}

export interface ReviewReaction {
  id: string
  user_id: string
  review_id: string
  reaction_type: ReactionType
  created_at: string
}
```

---

## Task Breakdown

| # | Task | Files | Dependencies |
|---|------|-------|-------------|
| 1 | Write migration `007_social_features.sql` with 4 tables, RLS policies, indexes | `packages/db/migrations/007_social_features.sql` | None |
| 2 | Add domain types to `@core/types` | `packages/core/src/types/index.ts` | None |
| 3 | Add artist follow hooks to artists API | `apps/web/src/features/artists/api/artists.ts` | Task 1 |
| 4 | Add venue follow hooks to venues API | `apps/web/src/features/venues/api/venues.ts` | Task 1 |
| 5 | Create user follow hooks | `apps/web/src/features/profile/api/follows.ts` | Task 1 |
| 6 | Add reaction hooks to reviews API | `apps/web/src/features/reviews/api/reviews.ts` | Task 1 |
| 7 | Run `npm run lint`, `npm run build` to verify | — | Tasks 1-6 |

## Verification

- Migration SQL runs without errors against Supabase.
- All new hooks export correctly and TypeScript compiles without errors.
- Query key factories follow established pattern (entity keys, detail/list sub-keys).
- All mutations use optimistic updates for responsive UX.
- `useFollowArtist`/`useUnfollowArtist` correctly invalidate `artistFollowKeys.all` on success.
- Rate limiter applied to `useReactToReview` (1s).
- No lint errors, no type errors, build succeeds.