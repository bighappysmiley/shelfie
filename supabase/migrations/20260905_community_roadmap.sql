-- Community roadmap: notification prefs, webhook logs, DM blocks, server banner/vanity,
-- forum fields, message attachments, permission-aware message read, DM unread

ALTER TABLE public.community_servers
  ADD COLUMN IF NOT EXISTS banner_url text,
  ADD COLUMN IF NOT EXISTS vanity_slug text;

CREATE UNIQUE INDEX IF NOT EXISTS community_servers_vanity_slug_idx
  ON public.community_servers (lower(vanity_slug))
  WHERE vanity_slug IS NOT NULL AND trim(vanity_slug) <> '';

ALTER TABLE public.community_messages
  ADD COLUMN IF NOT EXISTS forum_title text,
  ADD COLUMN IF NOT EXISTS forum_tags text[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS forum_locked boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS forum_pinned boolean NOT NULL DEFAULT false;

CREATE TABLE IF NOT EXISTS public.community_channel_notification_prefs (
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  channel_id uuid NOT NULL REFERENCES public.community_groups(id) ON DELETE CASCADE,
  level text NOT NULL CHECK (level IN ('all', 'mentions', 'mute')),
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, channel_id)
);

ALTER TABLE public.community_channel_notification_prefs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS community_notif_prefs_own ON public.community_channel_notification_prefs;
CREATE POLICY community_notif_prefs_own ON public.community_channel_notification_prefs
  FOR ALL TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE TABLE IF NOT EXISTS public.community_webhook_deliveries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  webhook_id uuid NOT NULL REFERENCES public.community_server_webhooks(id) ON DELETE CASCADE,
  event text NOT NULL,
  status_code int,
  success boolean NOT NULL DEFAULT false,
  error_message text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS community_webhook_deliveries_webhook_idx
  ON public.community_webhook_deliveries (webhook_id, created_at DESC);

ALTER TABLE public.community_webhook_deliveries ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS community_webhook_deliveries_select ON public.community_webhook_deliveries;
CREATE POLICY community_webhook_deliveries_select ON public.community_webhook_deliveries
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.community_server_webhooks w
      JOIN public.community_server_members m ON m.server_id = w.server_id
      WHERE w.id = community_webhook_deliveries.webhook_id
        AND m.user_id = auth.uid()
    )
  );

CREATE TABLE IF NOT EXISTS public.community_dm_blocks (
  blocker_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  blocked_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (blocker_id, blocked_id)
);

ALTER TABLE public.community_dm_blocks ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS community_dm_blocks_own ON public.community_dm_blocks;
CREATE POLICY community_dm_blocks_own ON public.community_dm_blocks
  FOR ALL TO authenticated
  USING (blocker_id = auth.uid())
  WITH CHECK (blocker_id = auth.uid());

CREATE TABLE IF NOT EXISTS public.community_message_attachments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id uuid NOT NULL REFERENCES public.community_messages(id) ON DELETE CASCADE,
  url text NOT NULL,
  file_name text,
  content_type text,
  size_bytes int,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS community_message_attachments_message_idx
  ON public.community_message_attachments (message_id);

ALTER TABLE public.community_message_attachments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS community_message_attachments_select ON public.community_message_attachments;
CREATE POLICY community_message_attachments_select ON public.community_message_attachments
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.community_messages m
      JOIN public.community_group_members gm ON gm.group_id = m.group_id
      WHERE m.id = community_message_attachments.message_id
        AND gm.user_id = auth.uid()
    )
  );

-- Resolve whether a user can view a channel (role + overrides)
CREATE OR REPLACE FUNCTION public._resolved_channel_view(
  p_server_id uuid,
  p_channel_id uuid,
  p_category_id uuid,
  p_user_id uuid
)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_role_id uuid;
  v_role record;
  v_view boolean := true;
  v_cat_override boolean;
  v_ch_override boolean;
BEGIN
  IF public.can_manage_community_server(p_server_id) OR public.is_app_owner() THEN
    RETURN true;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.community_server_members
    WHERE server_id = p_server_id AND user_id = p_user_id
  ) THEN
    RETURN false;
  END IF;

  SELECT m.role_id INTO v_role_id
  FROM public.community_server_members m
  WHERE m.server_id = p_server_id AND m.user_id = p_user_id;

  IF v_role_id IS NULL THEN
    SELECT id INTO v_role_id FROM public.community_server_roles
    WHERE server_id = p_server_id AND is_everyone LIMIT 1;
  END IF;

  SELECT * INTO v_role FROM public.community_server_roles WHERE id = v_role_id;

  IF v_role.can_manage_server OR v_role.can_manage_channels OR v_role.can_moderate THEN
    RETURN true;
  END IF;

  IF p_category_id IS NOT NULL THEN
    SELECT allow_view INTO v_cat_override
    FROM public.community_permission_overrides
    WHERE target_type = 'category' AND target_id = p_category_id AND role_id = v_role_id;
    IF v_cat_override IS NOT NULL THEN v_view := v_cat_override; END IF;
  END IF;

  SELECT allow_view INTO v_ch_override
  FROM public.community_permission_overrides
  WHERE target_type = 'channel' AND target_id = p_channel_id AND role_id = v_role_id;
  IF v_ch_override IS NOT NULL THEN v_view := v_ch_override; END IF;

  RETURN v_view;
END;
$$;

CREATE OR REPLACE FUNCTION public.count_dm_unread()
RETURNS int
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_count int := 0;
BEGIN
  IF v_uid IS NULL THEN RETURN 0; END IF;

  SELECT count(*)::int INTO v_count
  FROM public.community_dm_messages m
  JOIN public.community_dm_participants p ON p.thread_id = m.thread_id
  WHERE p.user_id = v_uid
    AND m.author_id <> v_uid
    AND (p.last_read_at IS NULL OR m.created_at > p.last_read_at);

  RETURN v_count;
END;
$$;

GRANT EXECUTE ON FUNCTION public.count_dm_unread() TO authenticated;

CREATE OR REPLACE FUNCTION public.mark_dm_thread_read(p_thread_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  UPDATE public.community_dm_participants
  SET last_read_at = now()
  WHERE thread_id = p_thread_id AND user_id = v_uid;
END;
$$;

GRANT EXECUTE ON FUNCTION public.mark_dm_thread_read(uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.test_server_webhook(p_webhook_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_hook record;
BEGIN
  SELECT * INTO v_hook FROM public.community_server_webhooks WHERE id = p_webhook_id;
  IF v_hook IS NULL THEN RAISE EXCEPTION 'Webhook not found'; END IF;
  IF NOT public.can_manage_community_server(v_hook.server_id) AND NOT public.is_app_owner() THEN
    RAISE EXCEPTION 'Not allowed';
  END IF;
  RETURN jsonb_build_object('ok', true, 'webhookId', p_webhook_id, 'event', 'test.ping');
END;
$$;

GRANT EXECUTE ON FUNCTION public.test_server_webhook(uuid) TO authenticated;
