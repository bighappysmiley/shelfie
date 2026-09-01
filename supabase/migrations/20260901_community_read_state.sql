-- Channel read state for unread badges
CREATE TABLE IF NOT EXISTS public.community_group_read_state (
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  group_id uuid NOT NULL REFERENCES public.community_groups(id) ON DELETE CASCADE,
  last_read_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, group_id)
);

CREATE INDEX IF NOT EXISTS community_group_read_state_group_idx
  ON public.community_group_read_state (group_id);

ALTER TABLE public.community_group_read_state ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS community_read_state_select ON public.community_group_read_state;
CREATE POLICY community_read_state_select ON public.community_group_read_state
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS community_read_state_upsert ON public.community_group_read_state;
CREATE POLICY community_read_state_upsert ON public.community_group_read_state
  FOR ALL TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());
