-- Message edits + welcome message on join

ALTER TABLE public.community_messages
  ADD COLUMN IF NOT EXISTS edited_at timestamptz;

CREATE OR REPLACE FUNCTION public._post_server_welcome(p_server_id uuid, p_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_welcome text;
  v_channel uuid;
  v_name text;
  v_body text;
BEGIN
  SELECT welcome_message, system_channel_id
  INTO v_welcome, v_channel
  FROM public.community_servers
  WHERE id = p_server_id;

  IF v_welcome IS NULL OR trim(v_welcome) = '' OR v_channel IS NULL THEN
    RETURN;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.community_groups
    WHERE id = v_channel AND server_id = p_server_id AND archived_at IS NULL
  ) THEN
    RETURN;
  END IF;

  SELECT coalesce(community_display_name, display_name, community_username, 'Someone')
  INTO v_name
  FROM public.user_profiles
  WHERE user_id = p_user_id;

  v_body := replace(v_welcome, '{user}', coalesce(v_name, 'Someone'));

  INSERT INTO public.community_messages (group_id, author_id, body, kind, author_name)
  VALUES (v_channel, NULL, v_body, 'system', 'Pine');
END;
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

  PERFORM public._post_server_welcome(p_server_id, p_user_id);
END;
$$;
