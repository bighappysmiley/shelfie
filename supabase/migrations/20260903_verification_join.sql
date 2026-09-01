-- Enforce server verification levels when joining

CREATE OR REPLACE FUNCTION public._assert_verification_for_join(
  p_verification_level text,
  p_via_invite boolean DEFAULT false,
  p_user_id uuid DEFAULT auth.uid()
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  v_user auth.users%ROWTYPE;
BEGIN
  IF coalesce(p_verification_level, 'none') = 'none' THEN
    RETURN;
  END IF;

  IF p_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT * INTO v_user FROM auth.users WHERE id = p_user_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'User not found';
  END IF;

  IF p_verification_level = 'high' AND NOT p_via_invite THEN
    RAISE EXCEPTION 'This server requires an invite to join.';
  END IF;

  IF p_verification_level IN ('low', 'medium', 'high') THEN
    IF v_user.email_confirmed_at IS NULL AND v_user.phone_confirmed_at IS NULL THEN
      RAISE EXCEPTION 'Verify your email or phone before joining this server.';
    END IF;
  END IF;

  IF p_verification_level IN ('medium', 'high') THEN
    IF v_user.created_at > now() - interval '5 minutes' THEN
      RAISE EXCEPTION 'Your account must be at least 5 minutes old to join this server.';
    END IF;
  END IF;
END;
$$;

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

  PERFORM public._assert_verification_for_join(v_server.verification_level, true);

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

  PERFORM public._assert_verification_for_join(v_server.verification_level, false);

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

  PERFORM public._assert_verification_for_join(v_server.verification_level, false);

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
  v_server public.community_servers%ROWTYPE;
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
    SELECT * INTO v_server FROM public.community_servers WHERE id = v_req.server_id;
    PERFORM public._assert_verification_for_join(v_server.verification_level, true, v_req.user_id);
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
