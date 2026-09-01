-- Pine Nitro (test mode) and server boosts — no billing/subscriptions

ALTER TABLE public.user_profiles
  ADD COLUMN IF NOT EXISTS nitro_enabled boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS profile_ring text;

ALTER TABLE public.user_profiles
  DROP CONSTRAINT IF EXISTS user_profiles_profile_ring_check;
ALTER TABLE public.user_profiles
  ADD CONSTRAINT user_profiles_profile_ring_check
  CHECK (
    profile_ring IS NULL
    OR profile_ring IN ('holo', 'sparkle', 'ember', 'frost', 'aurora', 'pulse', 'nitro')
  );

ALTER TABLE public.community_servers
  ADD COLUMN IF NOT EXISTS boost_count integer NOT NULL DEFAULT 0;

CREATE TABLE IF NOT EXISTS public.community_server_boosts (
  server_id uuid NOT NULL REFERENCES public.community_servers(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  boosted_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (server_id, user_id)
);

CREATE INDEX IF NOT EXISTS community_server_boosts_server_idx
  ON public.community_server_boosts (server_id, boosted_at DESC);

ALTER TABLE public.community_server_boosts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS community_boosts_select ON public.community_server_boosts;
CREATE POLICY community_boosts_select ON public.community_server_boosts
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.community_server_members m
      WHERE m.server_id = community_server_boosts.server_id AND m.user_id = auth.uid()
    )
    OR public.is_app_owner()
  );

DROP POLICY IF EXISTS community_boosts_insert ON public.community_server_boosts;
CREATE POLICY community_boosts_insert ON public.community_server_boosts
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS community_boosts_delete ON public.community_server_boosts;
CREATE POLICY community_boosts_delete ON public.community_server_boosts
  FOR DELETE TO authenticated
  USING (user_id = auth.uid());

CREATE OR REPLACE FUNCTION public.sync_server_boost_count(p_server_id uuid)
RETURNS void
LANGUAGE sql SECURITY DEFINER SET search_path = public
AS $$
  UPDATE public.community_servers s
  SET
    boost_count = (SELECT count(*)::int FROM public.community_server_boosts b WHERE b.server_id = p_server_id),
    updated_at = now()
  WHERE s.id = p_server_id;
$$;

REVOKE ALL ON FUNCTION public.sync_server_boost_count(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.sync_server_boost_count(uuid) TO authenticated;
