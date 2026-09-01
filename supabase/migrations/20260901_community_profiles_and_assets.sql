-- Community member profiles, server emoji/stickers/webhooks, and AutoMod

ALTER TABLE public.user_profiles
  ADD COLUMN IF NOT EXISTS community_bio text,
  ADD COLUMN IF NOT EXISTS community_avatar_url text,
  ADD COLUMN IF NOT EXISTS community_banner_url text,
  ADD COLUMN IF NOT EXISTS community_status_emoji text,
  ADD COLUMN IF NOT EXISTS community_status_text text,
  ADD COLUMN IF NOT EXISTS books_read_count integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS current_reading_title text,
  ADD COLUMN IF NOT EXISTS current_reading_author text;

ALTER TABLE public.user_profiles
  DROP CONSTRAINT IF EXISTS user_profiles_community_bio_length;
ALTER TABLE public.user_profiles
  ADD CONSTRAINT user_profiles_community_bio_length
  CHECK (community_bio IS NULL OR char_length(community_bio) <= 500);

ALTER TABLE public.user_profiles
  DROP CONSTRAINT IF EXISTS user_profiles_community_status_text_length;
ALTER TABLE public.user_profiles
  ADD CONSTRAINT user_profiles_community_status_text_length
  CHECK (community_status_text IS NULL OR char_length(community_status_text) <= 128);

CREATE OR REPLACE FUNCTION public.shares_community_server_with(p_other_user_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.community_server_members a
    JOIN public.community_server_members b ON a.server_id = b.server_id
    WHERE a.user_id = auth.uid() AND b.user_id = p_other_user_id
  );
$$;

REVOKE ALL ON FUNCTION public.shares_community_server_with(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.shares_community_server_with(uuid) TO authenticated;

DROP POLICY IF EXISTS user_profiles_select ON public.user_profiles;
CREATE POLICY user_profiles_select ON public.user_profiles
  FOR SELECT USING (
    user_id = auth.uid()
    OR public.shares_library_with(user_id)
    OR public.shares_community_server_with(user_id)
  );

-- Server customization & moderation
ALTER TABLE public.community_servers
  ADD COLUMN IF NOT EXISTS automod_enabled boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS automod_keywords text[] NOT NULL DEFAULT '{}';

CREATE TABLE IF NOT EXISTS public.community_server_emoji (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  server_id uuid NOT NULL REFERENCES public.community_servers(id) ON DELETE CASCADE,
  name text NOT NULL,
  image_url text NOT NULL,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS community_server_emoji_server_name_idx
  ON public.community_server_emoji (server_id, lower(name));

CREATE INDEX IF NOT EXISTS community_server_emoji_server_idx
  ON public.community_server_emoji (server_id, created_at);

CREATE TABLE IF NOT EXISTS public.community_server_stickers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  server_id uuid NOT NULL REFERENCES public.community_servers(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  image_url text NOT NULL,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS community_server_stickers_server_name_idx
  ON public.community_server_stickers (server_id, lower(name));

CREATE INDEX IF NOT EXISTS community_server_stickers_server_idx
  ON public.community_server_stickers (server_id, created_at);

CREATE TABLE IF NOT EXISTS public.community_server_webhooks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  server_id uuid NOT NULL REFERENCES public.community_servers(id) ON DELETE CASCADE,
  name text NOT NULL,
  url text NOT NULL,
  events text[] NOT NULL DEFAULT '{message.created}',
  secret text,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS community_server_webhooks_server_idx
  ON public.community_server_webhooks (server_id, created_at);

ALTER TABLE public.community_server_emoji ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.community_server_stickers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.community_server_webhooks ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS community_emoji_select ON public.community_server_emoji;
CREATE POLICY community_emoji_select ON public.community_server_emoji
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.community_server_members m
      WHERE m.server_id = community_server_emoji.server_id AND m.user_id = auth.uid()
    )
    OR public.is_app_owner()
  );

DROP POLICY IF EXISTS community_emoji_manage ON public.community_server_emoji;
CREATE POLICY community_emoji_manage ON public.community_server_emoji
  FOR ALL TO authenticated
  USING (public.can_manage_community_server(server_id) OR public.is_app_owner())
  WITH CHECK (public.can_manage_community_server(server_id) OR public.is_app_owner());

DROP POLICY IF EXISTS community_stickers_select ON public.community_server_stickers;
CREATE POLICY community_stickers_select ON public.community_server_stickers
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.community_server_members m
      WHERE m.server_id = community_server_stickers.server_id AND m.user_id = auth.uid()
    )
    OR public.is_app_owner()
  );

DROP POLICY IF EXISTS community_stickers_manage ON public.community_server_stickers;
CREATE POLICY community_stickers_manage ON public.community_server_stickers
  FOR ALL TO authenticated
  USING (public.can_manage_community_server(server_id) OR public.is_app_owner())
  WITH CHECK (public.can_manage_community_server(server_id) OR public.is_app_owner());

DROP POLICY IF EXISTS community_webhooks_select ON public.community_server_webhooks;
CREATE POLICY community_webhooks_select ON public.community_server_webhooks
  FOR SELECT TO authenticated
  USING (public.can_manage_community_server(server_id) OR public.is_app_owner());

DROP POLICY IF EXISTS community_webhooks_manage ON public.community_server_webhooks;
CREATE POLICY community_webhooks_manage ON public.community_server_webhooks
  FOR ALL TO authenticated
  USING (public.can_manage_community_server(server_id) OR public.is_app_owner())
  WITH CHECK (public.can_manage_community_server(server_id) OR public.is_app_owner());
