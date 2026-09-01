-- Join modes, join requests, and invite-code join RPC (bypasses private-server RLS)

ALTER TABLE public.community_servers
  ADD COLUMN IF NOT EXISTS join_mode text NOT NULL DEFAULT 'open';

UPDATE public.community_servers
SET join_mode = CASE
  WHEN is_public OR is_official THEN 'open'
  ELSE 'invite'
END
WHERE join_mode IS NULL OR join_mode = 'open';

ALTER TABLE public.community_servers
  DROP CONSTRAINT IF EXISTS community_servers_join_mode_check;

ALTER TABLE public.community_servers
  ADD CONSTRAINT community_servers_join_mode_check
  CHECK (join_mode IN ('open', 'request', 'invite'));

CREATE TABLE IF NOT EXISTS public.community_server_join_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  server_id uuid NOT NULL REFERENCES public.community_servers(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'approved', 'rejected', 'cancelled')),
  message text,
  reviewed_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  reviewed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (server_id, user_id)
);

CREATE INDEX IF NOT EXISTS community_server_join_requests_server_status_idx
  ON public.community_server_join_requests (server_id, status);

CREATE INDEX IF NOT EXISTS community_server_join_requests_user_idx
  ON public.community_server_join_requests (user_id);

ALTER TABLE public.community_server_join_requests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS community_join_requests_select ON public.community_server_join_requests;
CREATE POLICY community_join_requests_select ON public.community_server_join_requests
  FOR SELECT TO authenticated
  USING (
    user_id = auth.uid()
    OR public.can_manage_community_server(server_id)
    OR public.is_app_owner()
  );

DROP POLICY IF EXISTS community_join_requests_insert ON public.community_server_join_requests;
CREATE POLICY community_join_requests_insert ON public.community_server_join_requests
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS community_join_requests_update ON public.community_server_join_requests;
CREATE POLICY community_join_requests_update ON public.community_server_join_requests
  FOR UPDATE TO authenticated
  USING (
    public.can_manage_community_server(server_id)
    OR public.is_app_owner()
    OR (user_id = auth.uid() AND status = 'pending')
  );

DROP POLICY IF EXISTS community_join_requests_delete ON public.community_server_join_requests;
CREATE POLICY community_join_requests_delete ON public.community_server_join_requests
  FOR DELETE TO authenticated
  USING (
    public.can_manage_community_server(server_id)
    OR public.is_app_owner()
    OR user_id = auth.uid()
  );

CREATE OR REPLACE FUNCTION public._everyone_role_id(p_server_id uuid)
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT id FROM public.community_server_roles
  WHERE server_id = p_server_id AND is_everyone = true
  LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public._add_server_member(p_server_id uuid, p_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  INSERT INTO public.community_server_members (server_id, user_id, role_id)
  VALUES (p_server_id, p_user_id, public._everyone_role_id(p_server_id))
  ON CONFLICT (server_id, user_id) DO NOTHING;

  UPDATE public.community_servers s
  SET
    member_count = (SELECT count(*)::int FROM public.community_server_members m WHERE m.server_id = p_server_id),
    updated_at = now()
  WHERE s.id = p_server_id;
END;
$$;

CREATE OR REPLACE FUNCTION public._server_public_json(p_server public.community_servers)
RETURNS jsonb
LANGUAGE sql
STABLE
AS $$
  SELECT jsonb_build_object(
    'id', p_server.id,
    'library_id', p_server.library_id,
    'name', p_server.name,
    'description', p_server.description,
    'icon_url', p_server.icon_url,
    'is_public', p_server.is_public,
    'is_official', p_server.is_official,
    'official_position', p_server.official_position,
    'invite_code', NULL,
    'join_mode', p_server.join_mode,
    'member_count', p_server.member_count,
    'message_count', p_server.message_count,
    'activity_score', p_server.activity_score,
    'last_activity_at', p_server.last_activity_at,
    'created_by', p_server.created_by,
    'created_at', p_server.created_at,
    'updated_at', p_server.updated_at
  );
$$;

-- Join via invite code (works for private servers)
CREATE OR REPLACE FUNCTION public.join_server_by_invite_code(p_code text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_server public.community_servers%ROWTYPE;
  v_code text := upper(trim(coalesce(p_code, '')));
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;
  IF v_code = '' THEN
    RAISE EXCEPTION 'Invalid invite code';
  END IF;

  SELECT * INTO v_server
  FROM public.community_servers
  WHERE upper(invite_code) = v_code
  LIMIT 1;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Invalid invite code';
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.community_server_members
    WHERE server_id = v_server.id AND user_id = v_uid
  ) THEN
    RETURN jsonb_build_object(
      'status', 'already_member',
      'server', public._server_public_json(v_server)
    );
  END IF;

  IF v_server.join_mode = 'request' THEN
    INSERT INTO public.community_server_join_requests (server_id, user_id, status, message)
    VALUES (v_server.id, v_uid, 'pending', NULL)
    ON CONFLICT (server_id, user_id) DO UPDATE
      SET status = 'pending',
          message = EXCLUDED.message,
          reviewed_by = NULL,
          reviewed_at = NULL,
          created_at = now();

    RETURN jsonb_build_object(
      'status', 'requested',
      'server', public._server_public_json(v_server)
    );
  END IF;

  PERFORM public._add_server_member(v_server.id, v_uid);
  SELECT * INTO v_server FROM public.community_servers WHERE id = v_server.id;

  RETURN jsonb_build_object(
    'status', 'joined',
    'server', public._server_public_json(v_server)
  );
END;
$$;

-- Instant join for open public/official servers
CREATE OR REPLACE FUNCTION public.join_community_server(p_server_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_server public.community_servers%ROWTYPE;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT * INTO v_server FROM public.community_servers WHERE id = p_server_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Server not found';
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.community_server_members
    WHERE server_id = v_server.id AND user_id = v_uid
  ) THEN
    RETURN jsonb_build_object('status', 'already_member', 'server', public._server_public_json(v_server));
  END IF;

  IF v_server.join_mode = 'invite' THEN
    RAISE EXCEPTION 'This server is invite-only. Enter an invite code to join.';
  END IF;

  IF v_server.join_mode = 'request' THEN
    RAISE EXCEPTION 'This server requires a join request.';
  END IF;

  IF NOT (v_server.is_public OR v_server.is_official OR public.is_app_owner()) THEN
    RAISE EXCEPTION 'This server is private.';
  END IF;

  PERFORM public._add_server_member(v_server.id, v_uid);
  SELECT * INTO v_server FROM public.community_servers WHERE id = v_server.id;

  RETURN jsonb_build_object('status', 'joined', 'server', public._server_public_json(v_server));
END;
$$;

CREATE OR REPLACE FUNCTION public.request_join_community_server(p_server_id uuid, p_message text DEFAULT NULL)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_server public.community_servers%ROWTYPE;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT * INTO v_server FROM public.community_servers WHERE id = p_server_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Server not found';
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.community_server_members
    WHERE server_id = v_server.id AND user_id = v_uid
  ) THEN
    RETURN jsonb_build_object('status', 'already_member', 'server', public._server_public_json(v_server));
  END IF;

  IF v_server.join_mode <> 'request' THEN
    RAISE EXCEPTION 'This server is not accepting join requests.';
  END IF;

  IF NOT (v_server.is_public OR v_server.is_official OR public.is_app_owner()) THEN
    RAISE EXCEPTION 'This server is private. Use an invite code.';
  END IF;

  INSERT INTO public.community_server_join_requests (server_id, user_id, status, message)
  VALUES (v_server.id, v_uid, 'pending', nullif(trim(coalesce(p_message, '')), ''))
  ON CONFLICT (server_id, user_id) DO UPDATE
    SET status = 'pending',
        message = EXCLUDED.message,
        reviewed_by = NULL,
        reviewed_at = NULL,
        created_at = now();

  RETURN jsonb_build_object('status', 'requested', 'server', public._server_public_json(v_server));
END;
$$;

CREATE OR REPLACE FUNCTION public.review_join_request(p_request_id uuid, p_approve boolean)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_req public.community_server_join_requests%ROWTYPE;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT * INTO v_req FROM public.community_server_join_requests WHERE id = p_request_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Request not found';
  END IF;

  IF NOT (public.can_manage_community_server(v_req.server_id) OR public.is_app_owner()) THEN
    RAISE EXCEPTION 'Not allowed to review join requests';
  END IF;

  IF v_req.status <> 'pending' THEN
    RAISE EXCEPTION 'Request is no longer pending';
  END IF;

  IF p_approve THEN
    PERFORM public._add_server_member(v_req.server_id, v_req.user_id);
    UPDATE public.community_server_join_requests
    SET status = 'approved', reviewed_by = v_uid, reviewed_at = now()
    WHERE id = p_request_id;
    RETURN jsonb_build_object('status', 'approved');
  END IF;

  UPDATE public.community_server_join_requests
  SET status = 'rejected', reviewed_by = v_uid, reviewed_at = now()
  WHERE id = p_request_id;

  RETURN jsonb_build_object('status', 'rejected');
END;
$$;

GRANT EXECUTE ON FUNCTION public.join_server_by_invite_code(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.join_community_server(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.request_join_community_server(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.review_join_request(uuid, boolean) TO authenticated;
