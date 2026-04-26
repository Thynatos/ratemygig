# Plan B-03: Setlist Statistics & Artist Song Pages

**Wave:** 2 (depends on B-01 for hooks; parallel to B-02 with no file overlap on components)
**Goal:** Add statistics pages showing most-played songs per artist, setlist length trends, and a song detail view.

---

## Context

- B-01 provides the `songs`, `setlists`, and `setlist_songs` data model and hooks.
- Artist detail pages already exist at `/artists/:artistId` with a sidebar showing recent events.
- Venue detail pages follow similar patterns.
- Existing patterns: `TopArtistsPage` and `TopVenuesPage` use Supabase RPC for aggregated data.

## Files to Create/Modify

### 1. `packages/db/migrations/009_setlist_stats_rpc.sql` — New RPC functions

Create Supabase RPC functions for setlist statistics:

```sql
-- Get most-played songs for an artist
CREATE OR REPLACE FUNCTION get_artist_song_stats(p_artist_id UUID, p_limit INTEGER DEFAULT 20)
RETURNS TABLE(song_id UUID, song_name TEXT, play_count BIGINT, last_played TIMESTAMPTZ)
LANGUAGE plpgsql STABLE AS $$
BEGIN
  RETURN QUERY
  SELECT
    s.id AS song_id,
    s.name AS song_name,
    COUNT(ss.id)::BIGINT AS play_count,
    MAX(sl.created_at) AS last_played
  FROM setlist_songs ss
  JOIN songs s ON s.id = ss.song_id
  JOIN setlists sl ON sl.id = ss.setlist_id
  JOIN events e ON e.id = sl.event_id
  JOIN event_artists ea ON ea.event_id = e.id
  WHERE ea.artist_id = p_artist_id
    AND s.artist_id = p_artist_id
  GROUP BY s.id, s.name
  ORDER BY play_count DESC, last_played DESC
  LIMIT p_limit;
END;
$$;

-- Get setlist count and average length for an artist
CREATE OR REPLACE FUNCTION get_artist_setlist_stats(p_artist_id UUID)
RETURNS TABLE(setlist_count BIGINT, avg_song_count NUMERIC, total_unique_songs BIGINT)
LANGUAGE plpgsql STABLE AS $$
BEGIN
  RETURN QUERY
  SELECT
    COUNT(DISTINCT sl.id)::BIGINT AS setlist_count,
    ROUND(AVG(song_count), 1) AS avg_song_count,
    COUNT(DISTINCT ss.song_id)::BIGINT AS total_unique_songs
  FROM setlists sl
  JOIN event_artists ea ON ea.event_id = sl.event_id
  JOIN (
    SELECT setlist_id, COUNT(*) AS song_count
    FROM setlist_songs
    GROUP BY setlist_id
  ) ss ON ss.setlist_id = sl.id
  WHERE ea.artist_id = p_artist_id;
END;
$$;

-- Get artists for a song (reverse lookup)
CREATE OR REPLACE FUNCTION get_song_stats(p_song_id UUID)
RETURNS TABLE(artist_id UUID, artist_name TEXT, play_count BIGINT, first_played TIMESTAMPTZ, last_played TIMESTAMPTZ)
LANGUAGE plpgsql STABLE AS $$
BEGIN
  RETURN QUERY
  SELECT
    a.id AS artist_id,
    a.name AS artist_name,
    COUNT(ss.id)::BIGINT AS play_count,
    MIN(sl.created_at) AS first_played,
    MAX(sl.created_at) AS last_played
  FROM setlist_songs ss
  JOIN setlists sl ON sl.id = ss.setlist_id
  JOIN events e ON e.id = sl.event_id
  JOIN event_artists ea ON ea.event_id = e.id
  JOIN artists a ON a.id = ea.artist_id
  WHERE ss.song_id = p_song_id
  GROUP BY a.id, a.name
  ORDER BY play_count DESC;
END;
$$;
```

### 2. `apps/web/src/features/setlists/api/stats.ts` — New file

Stats query hooks:

```typescript
export const setlistStatsKeys = {
  artistSongs: (artistId: string) => [...setlistKeys.all, 'artist-songs', artistId] as const,
  artistStats: (artistId: string) => [...setlistKeys.all, 'artist-stats', artistId] as const,
  songStats: (songId: string) => [...setlistKeys.all, 'song-stats', songId] as const,
}

export function useArtistSongStats(artistId: string)
// Calls get_artist_song_stats RPC

export function useArtistSetlistStats(artistId: string)
// Calls get_artist_setlist_stats RPC

export function useSongStats(songId: string)
// Calls get_song_stats RPC
```

### 3. `apps/web/src/features/setlists/components/SongStatsList.tsx` — New component

Table-like list showing an artist's most-played songs:

```
Props:
  artistId: string

Layout:
- Table layout: #, Song Name, Times Played, Last Played
- Each song name is a link to `/songs/:songId` (opens SongPage)
- If no data: "No setlist data yet for this artist"
- Loading skeleton
- Limit to top 20 songs
```

### 4. `apps/web/src/features/setlists/components/ArtistSetlistSummary.tsx` — New component

Compact stats card for artist detail page:

```
Props:
  artistId: string

Layout:
- Shows: setlist count, average setlist length, total unique songs
- Link: "View full song statistics →" linking to artist detail tab/statistics section
- Only renders if data exists (not shown for artists with no setlists)
```

### 5. `apps/web/src/features/setlists/pages/SongPage.tsx` — New page

Dedicated song detail page at `/songs/:songId`:

```
- Shows song name, artist name(s) who play it
- Stats: total times played, first/last played dates
- List of events where this song was played (with dates and links)
- Empty state: "This song hasn't been added to any setlists yet"
```

### 6. `apps/web/src/features/artists/pages/ArtistDetailPage.tsx` — Modify

Add a "Song Statistics" section/tab to the artist detail page:

- Import `useArtistSongStats`, `useArtistSetlistStats` from setlists API
- Add a section below the events list (or as a tab) with `ArtistSetlistSummary` and `SongStatsList`
- Only renders if API returns data (gracefully hidden for artists with no setlists)

### 7. `apps/web/src/app/App.tsx` — Modify

Add the song page route:

- Lazy import: `const SongPage = lazy(() => import('@/features/setlists/pages/SongPage').then(m => ({ default: m.SongPage })))`
- `<Route path="/songs/:songId" element={<SongPage />} />` inside the Layout route

---

## Task Breakdown

| # | Task | Files | Dependencies |
|---|------|-------|-------------|
| 1 | Write stats RPC migration | `packages/db/migrations/009_setlist_stats_rpc.sql` | B-01 (tables must exist) |
| 2 | Create stats API hooks | `apps/web/src/features/setlists/api/stats.ts` | Tasks 1 |
| 3 | Create SongStatsList component | `apps/web/src/features/setlists/components/SongStatsList.tsx` | Task 2 |
| 4 | Create ArtistSetlistSummary component | `apps/web/src/features/setlists/components/ArtistSetlistSummary.tsx` | Task 2 |
| 5 | Create SongPage | `apps/web/src/features/setlists/pages/SongPage.tsx` | Task 2 |
| 6 | Add song stats to ArtistDetailPage | `apps/web/src/features/artists/pages/ArtistDetailPage.tsx` | Tasks 3, 4 |
| 7 | Add /songs/:songId route to App.tsx | `apps/web/src/app/App.tsx` | Task 5 |
| 8 | Run `npm run lint`, `npm run build`, `npm run test` | — | Tasks 1-7 |

## Verification

- Artist detail page shows "Song Statistics" section when setlist data exists
- Song statistics table shows most-played songs with play counts
- Clicking a song name navigates to `/songs/:songId`
- SongPage shows song details, play count, and events where it was played
- Stats gracefully hidden for artists with no setlist data
- RPC functions return correct aggregated data
- Build passes, 112+ tests pass, 0 lint errors