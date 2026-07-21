-- ============================================
-- Live Notifications: DB triggers + preference gates
-- Migration: 013_notification_triggers.sql
-- ============================================
-- Makes the notification center actually receive notifications.
-- All trigger functions are SECURITY DEFINER so they can insert
-- notifications for OTHER users (the notifications INSERT policy is
-- WITH CHECK (auth.uid() = user_id), which would otherwise reject them).
--
-- Ingest-order note: packages/jobs SyncService inserts the events row
-- first and links event_artists afterwards. An AFTER INSERT trigger on
-- events can therefore never see artist links (the FK guarantees they
-- cannot exist yet). Artist fan-out is handled by a trigger on
-- event_artists instead; the events trigger handles venue fan-out
-- (venue_id lives on the events row).

-- ============================================
-- 1. Extend notification type constraint
-- ============================================
ALTER TABLE public.notifications DROP CONSTRAINT IF EXISTS notifications_type_check;
ALTER TABLE public.notifications ADD CONSTRAINT notifications_type_check
  CHECK (type IN ('event_reminder', 'new_review', 'artist_event', 'venue_event',
                  'new_comment', 'review_reaction', 'friend_attendance'));

-- ============================================
-- 2. Dedupe: one notification per (user, type, link)
-- ============================================
CREATE UNIQUE INDEX IF NOT EXISTS idx_notifications_dedupe
  ON public.notifications(user_id, type, link);

-- ============================================
-- 3. Preference gates on user_preferences
-- ============================================
ALTER TABLE public.user_preferences ADD COLUMN IF NOT EXISTS notify_artist_events BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE public.user_preferences ADD COLUMN IF NOT EXISTS notify_venue_events BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE public.user_preferences ADD COLUMN IF NOT EXISTS notify_new_reviews BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE public.user_preferences ADD COLUMN IF NOT EXISTS notify_comments BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE public.user_preferences ADD COLUMN IF NOT EXISTS notify_reactions BOOLEAN NOT NULL DEFAULT true;

-- ============================================
-- 4a. trg_notify_on_event — venue fan-out on new events
-- ============================================
CREATE OR REPLACE FUNCTION public.trg_notify_on_event()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Skip past events
  IF NEW.start_at < NOW() THEN
    RETURN NEW;
  END IF;

  -- venue_event: notify followers of the event's venue
  IF NEW.venue_id IS NOT NULL THEN
    INSERT INTO public.notifications (user_id, type, title, body, link)
    SELECT
      vf.user_id,
      'venue_event',
      'New event at ' || v.name,
      NEW.name || ' · ' || NEW.city,
      '/events/' || NEW.id
    FROM public.venue_follows vf
    JOIN public.venues v ON v.id = vf.venue_id
    LEFT JOIN public.user_preferences up ON up.user_id = vf.user_id
    WHERE vf.venue_id = NEW.venue_id
      AND COALESCE(up.notify_venue_events, true)
      AND NOT EXISTS (
        SELECT 1 FROM public.notifications n
        WHERE n.user_id = vf.user_id
          AND n.type = 'venue_event'
          AND n.link = '/events/' || NEW.id
      )
    ON CONFLICT DO NOTHING;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS notify_on_event ON public.events;
CREATE TRIGGER notify_on_event
  AFTER INSERT ON public.events
  FOR EACH ROW EXECUTE FUNCTION public.trg_notify_on_event();

-- ============================================
-- 4b. trg_notify_on_event_artist — artist fan-out on lineup links
-- ============================================
CREATE OR REPLACE FUNCTION public.trg_notify_on_event_artist()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  ev RECORD;
  artist_name TEXT;
BEGIN
  SELECT id, name, city, start_at INTO ev
  FROM public.events
  WHERE id = NEW.event_id;

  -- Skip missing or past events
  IF NOT FOUND OR ev.start_at < NOW() THEN
    RETURN NEW;
  END IF;

  SELECT name INTO artist_name FROM public.artists WHERE id = NEW.artist_id;

  -- artist_event: notify followers of the linked artist
  INSERT INTO public.notifications (user_id, type, title, body, link)
  SELECT
    af.user_id,
    'artist_event',
    'New event from ' || COALESCE(artist_name, 'an artist you follow'),
    ev.name || ' · ' || ev.city,
    '/events/' || ev.id
  FROM public.artist_follows af
  LEFT JOIN public.user_preferences up ON up.user_id = af.user_id
  WHERE af.artist_id = NEW.artist_id
    AND COALESCE(up.notify_artist_events, true)
    AND NOT EXISTS (
      SELECT 1 FROM public.notifications n
      WHERE n.user_id = af.user_id
        AND n.type = 'artist_event'
        AND n.link = '/events/' || ev.id
    )
  ON CONFLICT DO NOTHING;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS notify_on_event_artist ON public.event_artists;
CREATE TRIGGER notify_on_event_artist
  AFTER INSERT ON public.event_artists
  FOR EACH ROW EXECUTE FUNCTION public.trg_notify_on_event_artist();

-- ============================================
-- 4c. trg_notify_on_review — followers notified on publish
-- ============================================
CREATE OR REPLACE FUNCTION public.trg_notify_on_review()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  author_name TEXT;
BEGIN
  -- Only public, published reviews notify
  IF NEW.status <> 'published' OR NEW.is_public <> true THEN
    RETURN NEW;
  END IF;
  -- On update, only fire on the transition into 'published'
  IF TG_OP = 'UPDATE' AND OLD.status IS NOT DISTINCT FROM 'published' THEN
    RETURN NEW;
  END IF;

  SELECT COALESCE(display_name, username) INTO author_name
  FROM public.profiles
  WHERE id = NEW.user_id;

  -- new_review: notify everyone who follows the review author
  INSERT INTO public.notifications (user_id, type, title, body, link)
  SELECT
    uf.follower_id,
    'new_review',
    COALESCE(author_name, 'Someone you follow') || ' posted a new review',
    COALESCE(NEW.title, left(NEW.body, 80)),
    '/r/' || NEW.id
  FROM public.user_follows uf
  LEFT JOIN public.user_preferences up ON up.user_id = uf.follower_id
  WHERE uf.following_id = NEW.user_id
    AND COALESCE(up.notify_new_reviews, true)
    AND NOT EXISTS (
      SELECT 1 FROM public.notifications n
      WHERE n.user_id = uf.follower_id
        AND n.type = 'new_review'
        AND n.link = '/r/' || NEW.id
    )
  ON CONFLICT DO NOTHING;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS notify_on_review ON public.reviews;
CREATE TRIGGER notify_on_review
  AFTER INSERT OR UPDATE OF status ON public.reviews
  FOR EACH ROW EXECUTE FUNCTION public.trg_notify_on_review();

-- ============================================
-- 4d. trg_notify_on_comment — review owner notified on comments
-- ============================================
CREATE OR REPLACE FUNCTION public.trg_notify_on_comment()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  review_owner UUID;
  commenter_name TEXT;
BEGIN
  SELECT user_id INTO review_owner FROM public.reviews WHERE id = NEW.review_id;

  -- Never notify yourself about your own comment
  IF NOT FOUND OR review_owner = NEW.user_id THEN
    RETURN NEW;
  END IF;

  -- Preference gate (default: send when no preferences row exists)
  IF NOT COALESCE(
    (SELECT up.notify_comments FROM public.user_preferences up WHERE up.user_id = review_owner),
    true
  ) THEN
    RETURN NEW;
  END IF;

  SELECT COALESCE(display_name, username) INTO commenter_name
  FROM public.profiles
  WHERE id = NEW.user_id;

  INSERT INTO public.notifications (user_id, type, title, body, link)
  VALUES (
    review_owner,
    'new_comment',
    COALESCE(commenter_name, 'Someone') || ' commented on your review',
    left(NEW.body, 100),
    '/r/' || NEW.review_id
  )
  ON CONFLICT DO NOTHING;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS notify_on_comment ON public.comments;
CREATE TRIGGER notify_on_comment
  AFTER INSERT ON public.comments
  FOR EACH ROW EXECUTE FUNCTION public.trg_notify_on_comment();

-- ============================================
-- 4e. trg_notify_on_reaction — review owner notified on reactions
-- ============================================
CREATE OR REPLACE FUNCTION public.trg_notify_on_reaction()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  review_owner UUID;
  reactor_name TEXT;
BEGIN
  SELECT user_id INTO review_owner FROM public.reviews WHERE id = NEW.review_id;

  -- Never notify yourself about your own reaction
  IF NOT FOUND OR review_owner = NEW.user_id THEN
    RETURN NEW;
  END IF;

  -- Preference gate (default: send when no preferences row exists)
  IF NOT COALESCE(
    (SELECT up.notify_reactions FROM public.user_preferences up WHERE up.user_id = review_owner),
    true
  ) THEN
    RETURN NEW;
  END IF;

  SELECT COALESCE(display_name, username) INTO reactor_name
  FROM public.profiles
  WHERE id = NEW.user_id;

  INSERT INTO public.notifications (user_id, type, title, body, link)
  VALUES (
    review_owner,
    'review_reaction',
    COALESCE(reactor_name, 'Someone') || ' reacted to your review',
    'Reaction: ' || NEW.reaction_type::TEXT,
    '/r/' || NEW.review_id
  )
  ON CONFLICT DO NOTHING;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS notify_on_reaction ON public.review_reactions;
CREATE TRIGGER notify_on_reaction
  AFTER INSERT ON public.review_reactions
  FOR EACH ROW EXECUTE FUNCTION public.trg_notify_on_reaction();

-- ============================================
-- MANUAL VERIFICATION (paste into Supabase SQL editor)
-- ============================================
-- Replace <USER_UUID> (a real auth user), <OTHER_USER_UUID>, <ARTIST_UUID>
-- and <VENUE_UUID> with real rows from your project first.
--
-- 1) Follow an artist, then insert a future event featuring them:
--
--    INSERT INTO public.artist_follows (user_id, artist_id)
--    VALUES ('<USER_UUID>', '<ARTIST_UUID>')
--    ON CONFLICT DO NOTHING;
--
--    INSERT INTO public.events (provider, provider_event_id, name, start_at, city, country)
--    VALUES ('manual-test', 'verify-001', 'Trigger Test Show', NOW() + interval '30 days', 'London', 'UK');
--
--    INSERT INTO public.event_artists (event_id, artist_id)
--    SELECT id, '<ARTIST_UUID>' FROM public.events
--    WHERE provider = 'manual-test' AND provider_event_id = 'verify-001';
--
-- 2) Assert exactly one unread notification was created:
--
--    SELECT COUNT(*) AS should_be_1 FROM public.notifications
--    WHERE user_id = '<USER_UUID>' AND type = 'artist_event' AND is_read = false;
--
-- 3) Re-run the same inserts (re-ingest path) — nothing may duplicate.
--    The events row conflicts (no insert, trigger does not fire); the link
--    row conflicts too. The count from step 2 must stay 1:
--
--    INSERT INTO public.events (provider, provider_event_id, name, start_at, city, country)
--    VALUES ('manual-test', 'verify-001', 'Trigger Test Show', NOW() + interval '30 days', 'London', 'UK')
--    ON CONFLICT DO NOTHING;
--
--    INSERT INTO public.event_artists (event_id, artist_id)
--    SELECT id, '<ARTIST_UUID>' FROM public.events
--    WHERE provider = 'manual-test' AND provider_event_id = 'verify-001'
--    ON CONFLICT DO NOTHING;
--
--    SELECT COUNT(*) AS should_still_be_1 FROM public.notifications
--    WHERE user_id = '<USER_UUID>' AND type = 'artist_event';
--
-- 4) Opt out, then repeat with a new event — no new row may appear:
--
--    INSERT INTO public.user_preferences (user_id, notify_artist_events)
--    VALUES ('<USER_UUID>', false)
--    ON CONFLICT (user_id) DO UPDATE SET notify_artist_events = false;
--
--    INSERT INTO public.events (provider, provider_event_id, name, start_at, city, country)
--    VALUES ('manual-test', 'verify-002', 'Opted Out Show', NOW() + interval '30 days', 'Leeds', 'UK');
--
--    INSERT INTO public.event_artists (event_id, artist_id)
--    SELECT id, '<ARTIST_UUID>' FROM public.events
--    WHERE provider = 'manual-test' AND provider_event_id = 'verify-002';
--
--    SELECT COUNT(*) AS should_still_be_1 FROM public.notifications
--    WHERE user_id = '<USER_UUID>' AND type = 'artist_event';
--
-- 5) Self-activity never notifies: have <USER_UUID> comment on their own
--    review and confirm no new_comment row appears for them.
--
-- 6) Cleanup:
--
--    DELETE FROM public.notifications WHERE user_id = '<USER_UUID>';
--    DELETE FROM public.event_artists WHERE event_id IN
--      (SELECT id FROM public.events WHERE provider = 'manual-test');
--    DELETE FROM public.events WHERE provider = 'manual-test';
--    DELETE FROM public.artist_follows WHERE user_id = '<USER_UUID>' AND artist_id = '<ARTIST_UUID>';
--    DELETE FROM public.user_preferences WHERE user_id = '<USER_UUID>';
