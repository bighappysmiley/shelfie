-- Extended Discord-style server settings: safety, moderation, role permissions, bans, audit log

ALTER TABLE public.community_servers
  ADD COLUMN IF NOT EXISTS rules text,
  ADD COLUMN IF NOT EXISTS welcome_message text,
  ADD COLUMN IF NOT EXISTS verification_level text NOT NULL DEFAULT 'none',
  ADD COLUMN IF NOT EXISTS explicit_content_filter text NOT NULL DEFAULT 'disabled',
  ADD COLUMN IF NOT EXISTS default_notifications text NOT NULL DEFAULT 'all',
  ADD COLUMN IF NOT EXISTS system_channel_id uuid REFERENCES public.community_groups(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS rules_channel_id uuid REFERENCES public.community_groups(id) ON DELETE SET NULL;

ALTER TABLE public.community_servers
  DROP CONSTRAINT IF EXISTS community_servers_verification_level_check;
ALTER TABLE public.community_servers
  ADD CONSTRAINT community_servers_verification_level_check
  CHECK (verification_level IN ('none', 'low', 'medium', 'high'));

ALTER TABLE public.community_servers
  DROP CONSTRAINT IF EXISTS community_servers_explicit_content_filter_check;
ALTER TABLE public.community_servers
  ADD CONSTRAINT community_servers_explicit_content_filter_check
  CHECK (explicit_content_filter IN ('disabled', 'no_role', 'all'));

ALTER TABLE public.community_servers
  DROP CONSTRAINT IF EXISTS community_servers_default_notifications_check;
ALTER TABLE public.community_servers
  ADD CONSTRAINT community_servers_default_notifications_check
  CHECK (default_notifications IN ('all', 'mentions'));

ALTER TABLE public.community_server_roles
  ADD COLUMN IF NOT EXISTS can_kick_members boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS can_ban_members boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS can_manage_messages boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS can_invite_users boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS hoist boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS mentionable boolean NOT NULL DEFAULT true;

CREATE TABLE IF NOT EXISTS public.community_server_bans (
  server_id uuid NOT NULL REFERENCES public.community_servers(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  reason text,
  banned_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (server_id, user_id)
);

CREATE INDEX IF NOT EXISTS community_server_bans_server_idx
  ON public.community_server_bans (server_id, created_at DESC);

CREATE TABLE IF NOT EXISTS public.community_server_audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  server_id uuid NOT NULL REFERENCES public.community_servers(id) ON DELETE CASCADE,
  actor_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  action text NOT NULL,
  target_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  target_label text,
  details jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS community_server_audit_log_server_idx
  ON public.community_server_audit_log (server_id, created_at DESC);

-- Manager check: library owner, server role with can_manage_server, or app owner
CREATE OR REPLACE FUNCTION public.can_manage_community_server(p_server_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO public
AS $$
  SELECT
    public.is_app_owner()
    OR EXISTS (
      SELECT 1
      FROM public.community_servers s
      JOIN public.library_members lm ON lm.library_id = s.library_id
      WHERE s.id = p_server_id
        AND lm.user_id = auth.uid()
        AND lm.role = 'owner'
    )
    OR EXISTS (
      SELECT 1
      FROM public.community_server_members m
      JOIN public.community_server_roles r ON r.id = m.role_id
      WHERE m.server_id = p_server_id
        AND m.user_id = auth.uid()
        AND (r.can_manage_server OR r.name = 'Owner')
    );
$$;

REVOKE ALL ON FUNCTION public.can_manage_community_server(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.can_manage_community_server(uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public._log_server_audit(
  p_server_id uuid,
  p_action text,
  p_target_user_id uuid DEFAULT NULL,
  p_target_label text DEFAULT NULL,
  p_details jsonb DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO public
AS $$
BEGIN
  INSERT INTO public.community_server_audit_log (
    server_id, actor_id, action, target_user_id, target_label, details
  ) VALUES (
    p_server_id, auth.uid(), p_action, p_target_user_id, p_target_label, p_details
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.assign_server_member_role(
  p_server_id uuid,
  p_user_id uuid,
  p_role_id uuid
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO public
AS $$
DECLARE
  v_role_name text;
BEGIN
  IF NOT public.can_manage_community_server(p_server_id) THEN
    RAISE EXCEPTION 'Not allowed';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM public.community_server_roles
    WHERE id = p_role_id AND server_id = p_server_id
  ) THEN
    RAISE EXCEPTION 'Invalid role';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM public.community_server_members
    WHERE server_id = p_server_id AND user_id = p_user_id
  ) THEN
    RAISE EXCEPTION 'Not a member';
  END IF;

  SELECT name INTO v_role_name FROM public.community_server_roles WHERE id = p_role_id;

  UPDATE public.community_server_members
  SET role_id = p_role_id
  WHERE server_id = p_server_id AND user_id = p_user_id;

  PERFORM public._log_server_audit(
    p_server_id,
    'member_role_update',
    p_user_id,
    v_role_name,
    jsonb_build_object('role_id', p_role_id)
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.kick_server_member(p_server_id uuid, p_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO public
AS $$
BEGIN
  IF NOT public.can_manage_community_server(p_server_id) THEN
    RAISE EXCEPTION 'Not allowed';
  END IF;
  IF p_user_id = auth.uid() THEN
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
BEGIN
  IF NOT public.can_manage_community_server(p_server_id) THEN
    RAISE EXCEPTION 'Not allowed';
  END IF;
  IF p_user_id = auth.uid() THEN
    RAISE EXCEPTION 'Cannot ban yourself';
  END IF;

  INSERT INTO public.community_server_bans (server_id, user_id, reason, banned_by)
  VALUES (p_server_id, p_user_id, nullif(trim(coalesce(p_reason, '')), ''), auth.uid())
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

CREATE OR REPLACE FUNCTION public.unban_server_member(p_server_id uuid, p_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO public
AS $$
BEGIN
  IF NOT public.can_manage_community_server(p_server_id) THEN
    RAISE EXCEPTION 'Not allowed';
  END IF;

  DELETE FROM public.community_server_bans
  WHERE server_id = p_server_id AND user_id = p_user_id;

  PERFORM public._log_server_audit(p_server_id, 'member_unban', p_user_id, NULL, NULL);
END;
$$;

GRANT EXECUTE ON FUNCTION public.assign_server_member_role(uuid, uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.kick_server_member(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.ban_server_member(uuid, uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.unban_server_member(uuid, uuid) TO authenticated;

ALTER TABLE public.community_server_bans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.community_server_audit_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS community_server_bans_select ON public.community_server_bans;
CREATE POLICY community_server_bans_select ON public.community_server_bans
  FOR SELECT TO authenticated
  USING (public.can_manage_community_server(server_id) OR public.is_app_owner());

DROP POLICY IF EXISTS community_server_audit_select ON public.community_server_audit_log;
CREATE POLICY community_server_audit_select ON public.community_server_audit_log
  FOR SELECT TO authenticated
  USING (public.can_manage_community_server(server_id) OR public.is_app_owner());
