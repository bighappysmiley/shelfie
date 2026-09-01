-- Pine Pro (renamed from Nitro test mode) + per-category/channel permission overrides

ALTER TABLE public.user_profiles
  ADD COLUMN IF NOT EXISTS pro_enabled boolean;

UPDATE public.user_profiles
SET pro_enabled = COALESCE(pro_enabled, nitro_enabled, false);

ALTER TABLE public.user_profiles
  ALTER COLUMN pro_enabled SET DEFAULT false;

UPDATE public.user_profiles
SET profile_ring = 'pro'
WHERE profile_ring = 'nitro';

ALTER TABLE public.user_profiles DROP CONSTRAINT IF EXISTS user_profiles_profile_ring_check;
ALTER TABLE public.user_profiles
  ADD CONSTRAINT user_profiles_profile_ring_check
  CHECK (
    profile_ring IS NULL
    OR profile_ring IN ('holo', 'sparkle', 'ember', 'frost', 'aurora', 'pulse', 'pro', 'nitro')
  );

CREATE TABLE IF NOT EXISTS public.community_permission_overrides (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  server_id uuid NOT NULL REFERENCES public.community_servers(id) ON DELETE CASCADE,
  target_type text NOT NULL CHECK (target_type IN ('category', 'channel')),
  target_id uuid NOT NULL,
  role_id uuid NOT NULL REFERENCES public.community_server_roles(id) ON DELETE CASCADE,
  allow_view boolean,
  allow_send_messages boolean,
  allow_manage_messages boolean,
  allow_manage_channel boolean,
  allow_connect boolean,
  allow_mention_everyone boolean,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (target_type, target_id, role_id)
);

CREATE INDEX IF NOT EXISTS community_permission_overrides_target_idx
  ON public.community_permission_overrides (target_type, target_id);

CREATE INDEX IF NOT EXISTS community_permission_overrides_server_idx
  ON public.community_permission_overrides (server_id);

ALTER TABLE public.community_permission_overrides ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS community_permission_overrides_select ON public.community_permission_overrides;
CREATE POLICY community_permission_overrides_select ON public.community_permission_overrides
  FOR SELECT TO authenticated
  USING (
    public.can_manage_community_server(server_id)
    OR EXISTS (
      SELECT 1 FROM public.community_server_members m
      WHERE m.server_id = community_permission_overrides.server_id
        AND m.user_id = auth.uid()
    )
    OR public.is_app_owner()
  );

DROP POLICY IF EXISTS community_permission_overrides_write ON public.community_permission_overrides;
CREATE POLICY community_permission_overrides_write ON public.community_permission_overrides
  FOR ALL TO authenticated
  USING (public.can_manage_community_server(server_id) OR public.is_app_owner())
  WITH CHECK (public.can_manage_community_server(server_id) OR public.is_app_owner());

CREATE OR REPLACE FUNCTION public._sync_server_channel_membership(p_server_id uuid, p_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  INSERT INTO public.community_group_members (group_id, user_id, role)
  SELECT g.id, p_user_id, 'member'::text
  FROM public.community_groups g
  WHERE g.server_id = p_server_id
    AND g.archived_at IS NULL
  ON CONFLICT (group_id, user_id) DO NOTHING;
END;
$$;

REVOKE ALL ON FUNCTION public._sync_server_channel_membership(uuid, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public._sync_server_channel_membership(uuid, uuid) TO authenticated;

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

  PERFORM public._sync_server_channel_membership(p_server_id, p_user_id);

  UPDATE public.community_servers s
  SET
    member_count = (SELECT count(*)::int FROM public.community_server_members m WHERE m.server_id = p_server_id),
    updated_at = now()
  WHERE s.id = p_server_id;

  PERFORM public._post_server_welcome(p_server_id, p_user_id);
END;
$$;

-- Backfill channel membership for existing server members
DO $$
DECLARE
  r record;
BEGIN
  FOR r IN
    SELECT m.server_id, m.user_id
    FROM public.community_server_members m
  LOOP
    PERFORM public._sync_server_channel_membership(r.server_id, r.user_id);
  END LOOP;
END;
$$;
