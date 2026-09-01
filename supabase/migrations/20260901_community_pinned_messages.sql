-- Pinned messages per channel
CREATE TABLE IF NOT EXISTS public.community_pinned_messages (
  group_id uuid NOT NULL REFERENCES public.community_groups(id) ON DELETE CASCADE,
  message_id uuid NOT NULL REFERENCES public.community_messages(id) ON DELETE CASCADE,
  pinned_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  pinned_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (group_id, message_id)
);

CREATE INDEX IF NOT EXISTS community_pinned_messages_group_idx
  ON public.community_pinned_messages (group_id, pinned_at DESC);

ALTER TABLE public.community_pinned_messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS community_pinned_select ON public.community_pinned_messages;
CREATE POLICY community_pinned_select ON public.community_pinned_messages
  FOR SELECT TO authenticated
  USING (true);

DROP POLICY IF EXISTS community_pinned_insert ON public.community_pinned_messages;
CREATE POLICY community_pinned_insert ON public.community_pinned_messages
  FOR INSERT TO authenticated
  WITH CHECK (pinned_by = auth.uid());

DROP POLICY IF EXISTS community_pinned_delete ON public.community_pinned_messages;
CREATE POLICY community_pinned_delete ON public.community_pinned_messages
  FOR DELETE TO authenticated
  USING (pinned_by = auth.uid());
