-- ============================================
-- Setlist Archive: Songs, Setlists, Setlist Songs
-- Migration: 008_setlists.sql
-- ============================================

-- ============================================
-- SONGS
-- ============================================
CREATE TABLE IF NOT EXISTS public.songs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  artist_id UUID REFERENCES public.artists(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  UNIQUE(name, artist_id)
);

CREATE INDEX idx_songs_artist_id ON public.songs(artist_id);
CREATE INDEX idx_songs_name ON public.songs(name);

ALTER TABLE public.songs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Songs are viewable by everyone"
  ON public.songs FOR SELECT
  USING (true);

CREATE POLICY "Authenticated users can insert songs"
  ON public.songs FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

-- ============================================
-- SETLISTS
-- ============================================
CREATE TABLE IF NOT EXISTS public.setlists (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  source TEXT NOT NULL DEFAULT 'manual' CHECK (source IN ('manual', 'verified')),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  UNIQUE(event_id, user_id)
);

CREATE INDEX idx_setlists_event_id ON public.setlists(event_id);
CREATE INDEX idx_setlists_user_id ON public.setlists(user_id);

CREATE TRIGGER setlists_updated_at
  BEFORE UPDATE ON public.setlists
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.setlists ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Setlists are viewable by everyone"
  ON public.setlists FOR SELECT
  USING (true);

CREATE POLICY "Users can insert own setlists"
  ON public.setlists FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own setlists"
  ON public.setlists FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own setlists"
  ON public.setlists FOR DELETE
  USING (auth.uid() = user_id);

-- ============================================
-- SETLIST SONGS
-- ============================================
CREATE TABLE IF NOT EXISTS public.setlist_songs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  setlist_id UUID NOT NULL REFERENCES public.setlists(id) ON DELETE CASCADE,
  song_id UUID NOT NULL REFERENCES public.songs(id) ON DELETE CASCADE,
  position INTEGER NOT NULL DEFAULT 0,
  is_encore BOOLEAN NOT NULL DEFAULT false,
  is_debut BOOLEAN NOT NULL DEFAULT false,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  UNIQUE(setlist_id, song_id, position)
);

CREATE INDEX idx_setlist_songs_setlist_id ON public.setlist_songs(setlist_id);
CREATE INDEX idx_setlist_songs_song_id ON public.setlist_songs(song_id);

ALTER TABLE public.setlist_songs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Setlist songs are viewable by everyone"
  ON public.setlist_songs FOR SELECT
  USING (true);

CREATE POLICY "Setlist owners can insert songs"
  ON public.setlist_songs FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.setlists
      WHERE setlists.id = setlist_songs.setlist_id
      AND setlists.user_id = auth.uid()
    )
  );

CREATE POLICY "Setlist owners can update songs"
  ON public.setlist_songs FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.setlists
      WHERE setlists.id = setlist_songs.setlist_id
      AND setlists.user_id = auth.uid()
    )
  );

CREATE POLICY "Setlist owners can delete songs"
  ON public.setlist_songs FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.setlists
      WHERE setlists.id = setlist_songs.setlist_id
      AND setlists.user_id = auth.uid()
    )
  );