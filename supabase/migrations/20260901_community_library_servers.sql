-- Per-library Discord-style community servers
CREATE TABLE IF NOT EXISTS public.community_servers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  library_id uuid NOT NULL UNIQUE REFERENCES public.libraries(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  icon_url text,
  is_public boolean NOT NULL DEFAULT false,
  is_official boolean NOT NULL DEFAULT false,
  official_position int,
  member_count int NOT NULL DEFAULT 0,
  message_count int NOT NULL DEFAULT 0,
  activity_score numeric NOT NULL DEFAULT 0,
  last_activity_at timestamptz,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.community_server_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  server_id uuid NOT NULL REFERENCES public.community_servers(id) ON DELETE CASCADE,
  name text NOT NULL,
  position int NOT NULL DEFAULT 0,
  color text NOT NULL DEFAULT '#6B7280',
  icon_url text,
  can_manage_server boolean NOT NULL DEFAULT false,
  can_manage_channels boolean NOT NULL DEFAULT false,
  can_moderate boolean NOT NULL DEFAULT false,
  is_everyone boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (server_id, name)
);

CREATE TABLE IF NOT EXISTS public.community_server_members (
  server_id uuid NOT NULL REFERENCES public.community_servers(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role_id uuid REFERENCES public.community_server_roles(id) ON DELETE SET NULL,
  joined_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (server_id, user_id)
);

CREATE INDEX IF NOT EXISTS community_servers_public_popularity_idx
  ON public.community_servers (is_public, activity_score DESC, member_count DESC)
  WHERE is_public = true AND is_official = false;

CREATE INDEX IF NOT EXISTS community_servers_official_idx
  ON public.community_servers (is_official, official_position)
  WHERE is_official = true;

ALTER TABLE public.community_categories
  ADD COLUMN IF NOT EXISTS server_id uuid REFERENCES public.community_servers(id) ON DELETE CASCADE;

ALTER TABLE public.community_groups
  ADD COLUMN IF NOT EXISTS server_id uuid REFERENCES public.community_servers(id) ON DELETE CASCADE;
