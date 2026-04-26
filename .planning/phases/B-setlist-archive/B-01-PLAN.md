# Plan B-01: Setlist Data Model & Core API

**Wave:** 1 (Foundation — must land before B-02/B-03)
**Goal:** Create the database migration for songs, setlists, and setlist_songs tables, plus all React Query hooks for CRUD operations and queries.

---

## Context

- Events already have a `lineup` JSONB column with artist names, and an `event_artists` join table with `artist_id` FK.
- The `artists` table has `id, name, provider_artist_id, image_url`.
- Reviews can optionally reference a "best song moment" in the future (Phase D3), but the setlist core is this phase.
- The `supabase` client pattern: hooks in `features/{name}/api/{name}.ts` with query key factories + optimistic mutations.
- RLS pattern: owner can CRUD own rows, public can read all (same as reviews and follows).
- Rate limiting via `createRateLimiter()` from `shared/lib/throttle.ts`.

## Files to Create/Modify

### 1. `packages/db/migrations/008_setlists.sql`

Create three new tables:

```sql
-- SONGS
CREATE TABLE IF NOT EXISTS public.songs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  artist_id UUID REFERENCES public.artists(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  UNIQUE(name, artist_id)  -- same song name can belong to different artists
);
CREATE INDEX idx_songs_artist_id ON public.songs(artist_id);
CREATE INDEX idx_songs_name ON public.songs(name);

-- SETLISTS
CREATE TABLE IF NOT EXISTS public.setlists (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  source TEXT NOT NULL DEFAULT 'manual' CHECK (source IN ('manual', 'verified')),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  UNIQUE(event_id, user_id)  -- one setlist per user per event
);
CREATE INDEX idx_setlists_event_id ON public.setlists(event_id);
CREATE INDEX idx_setlists_user_id ON public.setlists(user_id);
CREATE TRIGGER setlists_updated_at
  BEFORE UPDATE ON public.setlists
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- SETLIST_SONGS
CREATE TABLE IF NOT EXISTS public.setlist_songs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  setlist_id UUID NOT NULL REFERENCES public.setlists(id) ON DELETE CASCADE,
  song_id UUID NOT NULL REFERENCES public.songs(id) ON DELETE CASCADE,
  position INTEGER NOT NULL DEFAULT 0,
  is_encore BOOLEAN NOT NULL DEFAULT false,
  is_debut BOOLEAN NOT NULL DEFAULT false,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  UNIQUE(setlist_id, song_id, position)  -- no duplicate positions
);
CREATE INDEX idx_setlist_songs_setlist_id ON public.setlist_songs(setlist_id);
CREATE INDEX idx_setlist_songs_song_id ON public.setlist_songs(song_id);
```

RLS policies:
- `songs`: public SELECT, authenticated users can INSERT (community wiki approach)
- `setlists`: public SELECT, owner can INSERT/UPDATE/DELETE own rows
- `setlist_songs`: public SELECT, owner of parent setlist can INSERT/UPDATE/DELETE

### 2. `packages/core/src/types/index.ts` — Add setlist types

```typescript
export interface Song {
  id: string
  name: string
  artist_id: string | null
  created_at: string
}

export interface Setlist {
  id: string
  event_id: string
  user_id: string
  source: 'manual' | 'verified'
  notes: string | null
  created_at: string
  updated_at: string
}

export interface SetlistSong {
  id: string
  setlist_id: string
  song_id: string
  position: number
  is_encore: boolean
  is_debut: boolean
  notes: string | null
  created_at: string
}

export interface SetlistWithSongs extends Setlist {
  songs: (SetlistSong & { song: Song })[]
  profile: { id: string; display_name: string | null; username: string | null; avatar_url: string | null } | null
  event: { id: string; name: string; start_at: string } | null
}
```

### 3. `apps/web/src/features/setlists/api/setlists.ts` — New file with all hooks

**Query key factory:**
```typescript
export const setlistKeys = {
  all: ['setlists'] as const,
  byEvent: (eventId: string) => [...setlistKeys.all, 'event', eventId] as const,
  detail: (id: string) => [...setlistKeys.all, 'detail', id] as const,
  byUser: (userId: string) => [...setlistKeys.all, 'user', userId] as const,
}
```

**Query hooks:**
- `useEventSetlists(eventId)` — fetches all setlists for an event with songs + profile joins
- `useSetlist(id)` — fetches single setlist with songs + profile + event
- `useMySetlists()` — fetches current user's setlists (for MyGigs integration)
- `useSongSearch(query, artistId?)` — searches songs by name, optionally filtered by artist, for autocomplete in setlist editor

**Mutation hooks (all with optimistic updates):**
- `useCreateSetlist()` — creates setlist + bulk insert of setlist_songs in one call. Rate-limited (5s).
- `useUpdateSetlist()` — updates notes/source on setlist
- `useDeleteSetlist()` — deletes setlist (cascades to setlist_songs)
- `useAddSong(song)` — adds a song to a setlist at a given position. Auto-creates the song in `songs` table if it doesn't exist (upsert by name+artist_id).
- `useRemoveSong(setlistSongId)` — removes a song from a setlist and re-positions remaining songs
- `useReorderSongs()` — bulk update positions for drag-to-reorder

### 4. `apps/web/src/features/setlists/api/songs.ts` — Song search and creation

- `songKeys` factory
- `useSongSearch(query, artistId?)` — debounced search query against songs table, `.ilike('name', '%query%')`, optional `.eq('artist_id', artistId)`
- `useCreateSong()` — create or find existing song (upsert pattern: check if song exists by name+artist_id, return existing if found)

---

## Task Breakdown

| # | Task | Files | Dependencies |
|---|------|-------|-------------|
| 1 | Write migration `008_setlists.sql` | `packages/db/migrations/008_setlists.sql` | None |
| 2 | Add setlist/song types to `@core/types` | `packages/core/src/types/index.ts` | None |
| 3 | Create song search API hooks | `apps/web/src/features/setlists/api/songs.ts` | Tasks 1, 2 |
| 4 | Create setlist CRUD + query hooks | `apps/web/src/features/setlists/api/setlists.ts` | Tasks 1, 2, 3 |
| 5 | Run `npm run lint`, `npm run build`, `npm run test` | — | Tasks 1-4 |

## Verification

- Migration SQL runs without errors against Supabase
- All TypeScript types compile without errors
- Query key factories follow established pattern
- Mutations use optimistic updates
- Rate limiter applied to setlist creation (5s)
- Build passes, 112+ tests pass, 0 lint errors