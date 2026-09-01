-- Message replies and emoji reactions (Discord-style)

ALTER TABLE public.community_messages
  ADD COLUMN IF NOT EXISTS reply_to_id uuid REFERENCES public.community_messages(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS community_messages_reply_to_idx
  ON public.community_messages (reply_to_id)
  WHERE reply_to_id IS NOT NULL;

CREATE TABLE IF NOT EXISTS public.community_message_reactions (
  message_id uuid NOT NULL REFERENCES public.community_messages(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  emoji text NOT NULL CHECK (char_length(emoji) BETWEEN 1 AND 16),
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (message_id, user_id, emoji)
);

CREATE INDEX IF NOT EXISTS community_message_reactions_message_idx
  ON public.community_message_reactions (message_id);

ALTER TABLE public.community_message_reactions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS community_reactions_select ON public.community_message_reactions;
CREATE POLICY community_reactions_select ON public.community_message_reactions
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS community_reactions_insert ON public.community_message_reactions;
CREATE POLICY community_reactions_insert ON public.community_message_reactions
  FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS community_reactions_delete ON public.community_message_reactions;
CREATE POLICY community_reactions_delete ON public.community_message_reactions
  FOR DELETE TO authenticated USING (user_id = auth.uid());
