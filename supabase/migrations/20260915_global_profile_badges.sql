-- Global profile badges (admin-managed). Replaces per-server community_*_tags.
-- Server permission roles + role icons stay on community_server_roles.

CREATE TABLE IF NOT EXISTS public.profile_badges (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL CHECK (char_length(trim(name)) BETWEEN 1 AND 40),
  color text NOT NULL DEFAULT '#5865F2',
  icon_url text,
  position int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS profile_badges_name_unique_idx
  ON public.profile_badges (lower(trim(name)));

CREATE INDEX IF NOT EXISTS profile_badges_position_idx
  ON public.profile_badges (position, name);

CREATE TABLE IF NOT EXISTS public.user_profile_badges (
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  badge_id uuid NOT NULL REFERENCES public.profile_badges(id) ON DELETE CASCADE,
  assigned_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  assigned_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, badge_id)
);

CREATE INDEX IF NOT EXISTS user_profile_badges_badge_idx
  ON public.user_profile_badges (badge_id);

ALTER TABLE public.profile_badges ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_profile_badges ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS profile_badges_select ON public.profile_badges;
CREATE POLICY profile_badges_select ON public.profile_badges
  FOR SELECT TO authenticated
  USING (true);

DROP POLICY IF EXISTS profile_badges_manage ON public.profile_badges;
CREATE POLICY profile_badges_manage ON public.profile_badges
  FOR ALL TO authenticated
  USING (public.is_staff())
  WITH CHECK (public.is_staff());

DROP POLICY IF EXISTS user_profile_badges_select ON public.user_profile_badges;
CREATE POLICY user_profile_badges_select ON public.user_profile_badges
  FOR SELECT TO authenticated
  USING (true);

DROP POLICY IF EXISTS user_profile_badges_manage ON public.user_profile_badges;
CREATE POLICY user_profile_badges_manage ON public.user_profile_badges
  FOR ALL TO authenticated
  USING (public.is_staff())
  WITH CHECK (public.is_staff());

-- Seed starter badges (idempotent)
INSERT INTO public.profile_badges (name, color, position)
SELECT v.name, v.color, v.position
FROM (
  VALUES
    ('Owner', 'gradient:#F59E0B,#EF4444,#8B5CF6', 0),
    ('Staff', '#3B82F6', 10),
    ('Bookworm', '#10B981', 20),
    ('Early Reader', '#F472B6', 30)
) AS v(name, color, position)
WHERE NOT EXISTS (
  SELECT 1 FROM public.profile_badges b WHERE lower(b.name) = lower(v.name)
);

-- Best-effort migrate distinct server tags → global badges, then drop old tables.
DO $$
BEGIN
  IF to_regclass('public.community_server_tags') IS NOT NULL THEN
    INSERT INTO public.profile_badges (name, color, icon_url, position)
    SELECT DISTINCT ON (lower(trim(t.name)))
      trim(t.name),
      coalesce(nullif(trim(t.color), ''), '#5865F2'),
      t.icon_url,
      coalesce(t.position, 100)
    FROM public.community_server_tags t
    WHERE NOT EXISTS (
      SELECT 1 FROM public.profile_badges b WHERE lower(b.name) = lower(trim(t.name))
    )
    ORDER BY lower(trim(t.name)), t.created_at;

    IF to_regclass('public.community_member_tags') IS NOT NULL THEN
      INSERT INTO public.user_profile_badges (user_id, badge_id, assigned_by, assigned_at)
      SELECT DISTINCT ON (mt.user_id, lower(trim(t.name)))
        mt.user_id,
        b.id,
        mt.assigned_by,
        mt.assigned_at
      FROM public.community_member_tags mt
      JOIN public.community_server_tags t ON t.id = mt.tag_id
      JOIN public.profile_badges b ON lower(b.name) = lower(trim(t.name))
      ON CONFLICT (user_id, badge_id) DO NOTHING;
    END IF;
  END IF;
END $$;

DROP TABLE IF EXISTS public.community_member_tags;
DROP TABLE IF EXISTS public.community_server_tags;
