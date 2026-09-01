-- Discord-style community categories + channel configuration
CREATE TABLE IF NOT EXISTS public.community_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  position int NOT NULL DEFAULT 0,
  is_official boolean NOT NULL DEFAULT false,
  is_collapsed_default boolean NOT NULL DEFAULT false,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.community_groups
  ADD COLUMN IF NOT EXISTS category_id uuid REFERENCES public.community_categories(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS topic text,
  ADD COLUMN IF NOT EXISTS position int NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS is_official boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS icon text DEFAULT 'hash';

INSERT INTO public.community_categories (name, position, is_official)
SELECT 'Official', 0, true
WHERE NOT EXISTS (SELECT 1 FROM public.community_categories WHERE is_official = true);

INSERT INTO public.community_categories (name, position, is_official)
SELECT 'Text Channels', 10, false
WHERE NOT EXISTS (
  SELECT 1 FROM public.community_categories WHERE name = 'Text Channels' AND is_official = false
);

UPDATE public.community_groups g
SET category_id = c.id
FROM public.community_categories c
WHERE g.category_id IS NULL
  AND c.is_official = false
  AND c.name = 'Text Channels';

ALTER TABLE public.community_categories ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS community_categories_select ON public.community_categories;
CREATE POLICY community_categories_select ON public.community_categories
  FOR SELECT TO authenticated
  USING (true);

DROP POLICY IF EXISTS community_categories_insert ON public.community_categories;
CREATE POLICY community_categories_insert ON public.community_categories
  FOR INSERT TO authenticated
  WITH CHECK (public.is_app_owner() AND is_official = false);

DROP POLICY IF EXISTS community_categories_update ON public.community_categories;
CREATE POLICY community_categories_update ON public.community_categories
  FOR UPDATE TO authenticated
  USING (public.is_app_owner());

DROP POLICY IF EXISTS community_categories_delete ON public.community_categories;
CREATE POLICY community_categories_delete ON public.community_categories
  FOR DELETE TO authenticated
  USING (public.is_app_owner() AND is_official = false);

DROP POLICY IF EXISTS community_groups_select ON public.community_groups;
CREATE POLICY community_groups_select ON public.community_groups
  FOR SELECT TO authenticated
  USING (is_official = true OR public.is_community_group_member(id) OR public.is_app_owner());

-- Official channels are readable/postable by every signed-in user
CREATE OR REPLACE FUNCTION public.is_community_group_member(p_group_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    public.is_app_owner()
    OR EXISTS (
      SELECT 1 FROM public.community_group_members m
      WHERE m.group_id = p_group_id AND m.user_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM public.community_groups g
      WHERE g.id = p_group_id
        AND g.is_official = true
        AND g.archived_at IS NULL
        AND auth.uid() IS NOT NULL
    );
$$;
