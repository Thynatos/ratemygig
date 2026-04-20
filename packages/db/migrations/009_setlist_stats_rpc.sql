-- ============================================
-- Setlist Statistics RPC Functions
-- Migration: 009_setlist_stats_rpc.sql
-- ============================================

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