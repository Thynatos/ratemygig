-- ============================================
-- Friends Going: batched friends' attendance RPC
-- Migration: 014_friends_attendance.sql
-- ============================================
-- Powers the "N friends going" badge on event cards and the event detail
-- page. Batch-oriented: one call returns rows for all visible event ids.
--
-- Why SECURITY DEFINER: attendance RLS is owner-only ("Users can view own
-- attendance" is USING (auth.uid() = user_id), see 002_rls_policies.sql),
-- so reading FRIENDS' attendance rows is impossible under RLS.
--
-- Security note: because SECURITY DEFINER bypasses RLS, this function
-- deliberately scopes the social graph to the CALLER
-- (user_follows.follower_id = auth.uid()), NOT to p_user_id. p_user_id is
-- kept only for signature compatibility with the original spec and is
-- ignored — passing another user's id returns only the caller's friends'
-- rows, never that user's social graph.
--
-- Privacy note: profile display fields are returned for any followed user
-- with matching attendance, regardless of is_profile_public — showing
-- friends' names/avatars is the purpose of the feature.

CREATE OR REPLACE FUNCTION public.get_friends_attendance(p_user_id UUID, p_event_ids UUID[])
RETURNS TABLE(event_id UUID, user_id UUID, display_name TEXT, avatar_url TEXT)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT
    a.event_id,
    a.user_id,
    COALESCE(p.display_name, p.username) AS display_name,
    p.avatar_url
  FROM public.user_follows uf
  JOIN public.attendance a ON a.user_id = uf.following_id
  LEFT JOIN public.profiles p ON p.id = a.user_id
  WHERE uf.follower_id = auth.uid()
    AND a.event_id = ANY(p_event_ids)
    AND a.status IN ('planned', 'attended');
END;
$$;

-- ============================================
-- MANUAL VERIFICATION (paste into Supabase SQL editor)
-- ============================================
-- Replace <USER_UUID> (the caller), <FRIEND_UUID>, <STRANGER_UUID> and
-- <EVENT_UUID> with real rows from your project first. auth.uid() is
-- simulated in the SQL editor via set_config('request.jwt.claim.sub', ...).
--
-- 1) Caller follows friend; friend marks the event as planned:
--
--    INSERT INTO public.user_follows (follower_id, following_id)
--    VALUES ('<USER_UUID>', '<FRIEND_UUID>')
--    ON CONFLICT DO NOTHING;
--
--    INSERT INTO public.attendance (user_id, event_id, status)
--    VALUES ('<FRIEND_UUID>', '<EVENT_UUID>', 'planned')
--    ON CONFLICT (user_id, event_id) DO UPDATE SET status = 'planned';
--
-- 2) Call the RPC as the caller — exactly one row, for <EVENT_UUID> and
--    <FRIEND_UUID>:
--
--    SELECT set_config('request.jwt.claim.sub', '<USER_UUID>', true);
--
--    SELECT * FROM public.get_friends_attendance(
--      '<USER_UUID>', ARRAY['<EVENT_UUID>']::UUID[]
--    );
--
-- 3) Anti-enumeration check: passing a DIFFERENT user as p_user_id must
--    still return only the caller's (<USER_UUID>) friends' rows — never
--    <STRANGER_UUID>'s graph. Result must be identical to step 2:
--
--    SELECT * FROM public.get_friends_attendance(
--      '<STRANGER_UUID>', ARRAY['<EVENT_UUID>']::UUID[]
--    );
--
-- 4) Other statuses and other events are excluded. Insert a 'cancelled'-
--    style mismatch by using an unrelated event id — zero rows:
--
--    SELECT * FROM public.get_friends_attendance(
--      '<USER_UUID>', ARRAY['00000000-0000-0000-0000-000000000000']::UUID[]
--    );
--
-- 5) Unauthenticated call returns zero rows (auth.uid() is NULL):
--
--    SELECT set_config('request.jwt.claim.sub', '', true);
--    SELECT * FROM public.get_friends_attendance(
--      '<USER_UUID>', ARRAY['<EVENT_UUID>']::UUID[]
--    );
--
-- 6) Cleanup:
--
--    DELETE FROM public.attendance WHERE user_id = '<FRIEND_UUID>' AND event_id = '<EVENT_UUID>';
--    DELETE FROM public.user_follows WHERE follower_id = '<USER_UUID>' AND following_id = '<FRIEND_UUID>';
