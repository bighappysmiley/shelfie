-- Ship-readiness: ban enforcement, role-scoped kick/ban, leave system message, DM tables

-- Block banned users from joining
CREATE OR REPLACE FUNCTION public._assert_not_banned(p_server_id uuid, p_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM public.community_server_bans
    WHERE server_id = p_server_id AND user_id = p_user_id
  ) THEN
    RAISE EXCEPTION 'You are banned from this server.';
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public._add_server_member(p_server_id uuid, p_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  PERFORM public._assert_not_banned(p_server_id, p_user_id);

  INSERT INTO public.community_server_members (server_id, user_id, role_id)
  VALUES (p_server_id, p_user_id, public._everyone_role_id(p_server_id))
  ON CONFLICT (server_id, user_id) DO NOTHING;

  PERFORM public._sync_server_channel_membership(p_server_id, p_user_id);

  UPDATE public.community_servers s
  SET
    member_count = (SELECT count(*)::int FROM public.community_server_members m WHERE m.server_id = p_server_id),
    updated_at = now()
  WHERE s.id = p_server_id;

  PERFORM public._post_server_welcome(p_server_id, p_user_id);
END;
$$;

CREATE OR REPLACE FUNCTION public._post_server_leave(p_server_id uuid, p_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_channel uuid;
  v_name text;
BEGIN
  SELECT system_channel_id INTO v_channel
  FROM public.community_servers WHERE id = p_server_id;

  IF v_channel IS NULL THEN
    RETURN;
  END IF;

  SELECT coalesce(
    nullif(trim(community_display_name), ''),
    nullif(trim(display_name), ''),
    'A member'
  )
  INTO v_name
  FROM public.user_profiles WHERE user_id = p_user_id;

  INSERT INTO public.community_messages (group_id, author_id, body, kind, author_name)
  VALUES (v_channel, NULL, coalesce(v_name, 'A member') || ' left the server.', 'system', 'Server');
END;
$$;

CREATE OR REPLACE FUNCTION public.kick_server_member(p_server_id uuid, p_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO public
AS $$
DECLARE
  v_actor uuid := auth.uid();
BEGIN
  IF v_actor IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  IF NOT (
    public.can_manage_community_server(p_server_id)
    OR public.is_app_owner()
    OR EXISTS (
      SELECT 1
      FROM public.community_server_members m
      JOIN public.community_server_roles r ON r.id = m.role_id
      WHERE m.server_id = p_server_id
        AND m.user_id = v_actor
        AND r.can_kick_members
    )
  ) THEN
    RAISE EXCEPTION 'Not allowed';
  END IF;

  IF p_user_id = v_actor THEN
    RAISE EXCEPTION 'Cannot kick yourself';
  END IF;

  DELETE FROM public.community_server_members
  WHERE server_id = p_server_id AND user_id = p_user_id;

  UPDATE public.community_servers s
  SET
    member_count = (SELECT count(*)::int FROM public.community_server_members m WHERE m.server_id = p_server_id),
    updated_at = now()
  WHERE s.id = p_server_id;

  PERFORM public._log_server_audit(p_server_id, 'member_kick', p_user_id, NULL, NULL);
END;
$$;

CREATE OR REPLACE FUNCTION public.ban_server_member(
  p_server_id uuid,
  p_user_id uuid,
  p_reason text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO public
AS $$
DECLARE
  v_actor uuid := auth.uid();
BEGIN
  IF v_actor IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  IF NOT (
    public.can_manage_community_server(p_server_id)
    OR public.is_app_owner()
    OR EXISTS (
      SELECT 1
      FROM public.community_server_members m
      JOIN public.community_server_roles r ON r.id = m.role_id
      WHERE m.server_id = p_server_id
        AND m.user_id = v_actor
        AND r.can_ban_members
    )
  ) THEN
    RAISE EXCEPTION 'Not allowed';
  END IF;

  IF p_user_id = v_actor THEN
    RAISE EXCEPTION 'Cannot ban yourself';
  END IF;

  INSERT INTO public.community_server_bans (server_id, user_id, reason, banned_by)
  VALUES (p_server_id, p_user_id, nullif(trim(coalesce(p_reason, '')), ''), v_actor)
  ON CONFLICT (server_id, user_id) DO UPDATE
    SET reason = EXCLUDED.reason,
        banned_by = EXCLUDED.banned_by,
        created_at = now();

  DELETE FROM public.community_server_members
  WHERE server_id = p_server_id AND user_id = p_user_id;

  UPDATE public.community_servers s
  SET
    member_count = (SELECT count(*)::int FROM public.community_server_members m WHERE m.server_id = p_server_id),
    updated_at = now()
  WHERE s.id = p_server_id;

  PERFORM public._log_server_audit(
    p_server_id,
    'member_ban',
    p_user_id,
    p_reason,
    NULL
  );
END;
$$;

-- Direct messages (1:1)
CREATE TABLE IF NOT EXISTS public.community_dm_threads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.community_dm_participants (
  thread_id uuid NOT NULL REFERENCES public.community_dm_threads(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  last_read_at timestamptz,
  joined_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (thread_id, user_id)
);

CREATE INDEX IF NOT EXISTS community_dm_participants_user_idx
  ON public.community_dm_participants (user_id);

CREATE TABLE IF NOT EXISTS public.community_dm_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  thread_id uuid NOT NULL REFERENCES public.community_dm_threads(id) ON DELETE CASCADE,
  author_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  body text NOT NULL CHECK (char_length(trim(body)) >= 1 AND char_length(body) <= 4000),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS community_dm_messages_thread_idx
  ON public.community_dm_messages (thread_id, created_at);

ALTER TABLE public.community_dm_threads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.community_dm_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.community_dm_messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS community_dm_threads_select ON public.community_dm_threads;
CREATE POLICY community_dm_threads_select ON public.community_dm_threads
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.community_dm_participants p
      WHERE p.thread_id = community_dm_threads.id AND p.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS community_dm_participants_select ON public.community_dm_participants;
CREATE POLICY community_dm_participants_select ON public.community_dm_participants
  FOR SELECT TO authenticated
  USING (
    user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.community_dm_participants p
      WHERE p.thread_id = community_dm_participants.thread_id AND p.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS community_dm_messages_select ON public.community_dm_messages;
CREATE POLICY community_dm_messages_select ON public.community_dm_messages
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.community_dm_participants p
      WHERE p.thread_id = community_dm_messages.thread_id AND p.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS community_dm_messages_insert ON public.community_dm_messages;
CREATE POLICY community_dm_messages_insert ON public.community_dm_messages
  FOR INSERT TO authenticated
  WITH CHECK (
    author_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.community_dm_participants p
      WHERE p.thread_id = community_dm_messages.thread_id AND p.user_id = auth.uid()
    )
  );

CREATE OR REPLACE FUNCTION public.get_or_create_dm_thread(p_other_user_id uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_thread_id uuid;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;
  IF p_other_user_id IS NULL OR p_other_user_id = v_uid THEN
    RAISE EXCEPTION 'Invalid user';
  END IF;

  SELECT p1.thread_id INTO v_thread_id
  FROM public.community_dm_participants p1
  JOIN public.community_dm_participants p2 ON p2.thread_id = p1.thread_id
  WHERE p1.user_id = v_uid AND p2.user_id = p_other_user_id
  LIMIT 1;

  IF v_thread_id IS NOT NULL THEN
    RETURN v_thread_id;
  END IF;

  INSERT INTO public.community_dm_threads DEFAULT VALUES RETURNING id INTO v_thread_id;
  INSERT INTO public.community_dm_participants (thread_id, user_id)
  VALUES (v_thread_id, v_uid), (v_thread_id, p_other_user_id);

  RETURN v_thread_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_or_create_dm_thread(uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.list_my_dm_threads()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  RETURN coalesce(
    (
      SELECT jsonb_agg(row_to_json(t)::jsonb ORDER BY t.updated_at DESC)
      FROM (
        SELECT
          th.id AS thread_id,
          th.updated_at,
          (
            SELECT jsonb_build_object(
              'userId', p2.user_id,
              'displayName', coalesce(up.community_display_name, up.display_name),
              'username', up.community_username
            )
            FROM public.community_dm_participants p2
            LEFT JOIN public.user_profiles up ON up.user_id = p2.user_id
            WHERE p2.thread_id = th.id AND p2.user_id <> v_uid
            LIMIT 1
          ) AS other_user,
          (
            SELECT jsonb_build_object('body', m.body, 'createdAt', m.created_at, 'authorId', m.author_id)
            FROM public.community_dm_messages m
            WHERE m.thread_id = th.id
            ORDER BY m.created_at DESC
            LIMIT 1
          ) AS last_message
        FROM public.community_dm_threads th
        JOIN public.community_dm_participants p ON p.thread_id = th.id
        WHERE p.user_id = v_uid
      ) t
    ),
    '[]'::jsonb
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.list_my_dm_threads() TO authenticated;

CREATE OR REPLACE FUNCTION public.leave_community_server(p_server_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  PERFORM public._post_server_leave(p_server_id, v_uid);

  DELETE FROM public.community_server_members
  WHERE server_id = p_server_id AND user_id = v_uid;

  UPDATE public.community_servers s
  SET
    member_count = (SELECT count(*)::int FROM public.community_server_members m WHERE m.server_id = p_server_id),
    updated_at = now()
  WHERE s.id = p_server_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.leave_community_server(uuid) TO authenticated;
