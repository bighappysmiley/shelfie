-- Community groups for chat & suggestions; app Owner (staff admin) can create groups
-- hillelfrankel0@icloud.com promoted to Owner in staff

INSERT INTO public.staff (email, display_name, title, role)
VALUES ('hillelfrankel0@icloud.com', 'Hillel Frankel', 'Owner', 'admin')
ON CONFLICT (email) DO UPDATE
SET display_name = EXCLUDED.display_name,
    title = EXCLUDED.title,
    role = EXCLUDED.role;

CREATE TABLE IF NOT EXISTS public.community_groups (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  kind text NOT NULL DEFAULT 'both'
    CHECK (kind IN ('chat', 'suggestions', 'both')),
  created_by uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  archived_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.community_group_members (
  group_id uuid NOT NULL REFERENCES public.community_groups(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role text NOT NULL DEFAULT 'member'
    CHECK (role IN ('admin', 'moderator', 'member')),
  joined_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (group_id, user_id)
);

CREATE TABLE IF NOT EXISTS public.community_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id uuid NOT NULL REFERENCES public.community_groups(id) ON DELETE CASCADE,
  author_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  body text NOT NULL,
  kind text NOT NULL DEFAULT 'chat'
    CHECK (kind IN ('chat', 'suggestion', 'system')),
  suggestion_status text
    CHECK (suggestion_status IS NULL OR suggestion_status IN ('open', 'accepted', 'declined', 'implemented')),
  author_name text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS community_messages_group_created_idx
  ON public.community_messages (group_id, created_at);
CREATE INDEX IF NOT EXISTS community_group_members_user_idx
  ON public.community_group_members (user_id);

ALTER TABLE public.community_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.community_group_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.community_messages ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.is_app_owner()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.staff s
    WHERE lower(s.email) = lower(coalesce(auth.jwt() ->> 'email', ''))
      AND s.role = 'admin'
  );
$$;

CREATE OR REPLACE FUNCTION public.is_community_group_member(p_group_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.community_group_members m
    WHERE m.group_id = p_group_id AND m.user_id = auth.uid()
  ) OR public.is_app_owner();
$$;

CREATE OR REPLACE FUNCTION public.community_member_role(p_group_id uuid)
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT CASE
    WHEN public.is_app_owner() THEN 'admin'
    ELSE (
      SELECT m.role FROM public.community_group_members m
      WHERE m.group_id = p_group_id AND m.user_id = auth.uid()
      LIMIT 1
    )
  END;
$$;

CREATE OR REPLACE FUNCTION public.can_moderate_community_group(p_group_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.community_member_role(p_group_id) IN ('admin', 'moderator');
$$;

REVOKE ALL ON FUNCTION public.is_app_owner() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.is_community_group_member(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.community_member_role(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.can_moderate_community_group(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_app_owner() TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_community_group_member(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.community_member_role(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.can_moderate_community_group(uuid) TO authenticated;

DROP POLICY IF EXISTS community_groups_select ON public.community_groups;
CREATE POLICY community_groups_select ON public.community_groups
  FOR SELECT TO authenticated
  USING (public.is_community_group_member(id) OR public.is_app_owner());

DROP POLICY IF EXISTS community_groups_insert ON public.community_groups;
CREATE POLICY community_groups_insert ON public.community_groups
  FOR INSERT TO authenticated
  WITH CHECK (public.is_app_owner() AND created_by = auth.uid());

DROP POLICY IF EXISTS community_groups_update ON public.community_groups;
CREATE POLICY community_groups_update ON public.community_groups
  FOR UPDATE TO authenticated
  USING (public.is_app_owner() OR public.community_member_role(id) = 'admin');

DROP POLICY IF EXISTS community_groups_delete ON public.community_groups;
CREATE POLICY community_groups_delete ON public.community_groups
  FOR DELETE TO authenticated
  USING (public.is_app_owner());

DROP POLICY IF EXISTS community_members_select ON public.community_group_members;
CREATE POLICY community_members_select ON public.community_group_members
  FOR SELECT TO authenticated
  USING (public.is_community_group_member(group_id));

DROP POLICY IF EXISTS community_members_insert ON public.community_group_members;
CREATE POLICY community_members_insert ON public.community_group_members
  FOR INSERT TO authenticated
  WITH CHECK (
    public.is_app_owner()
    OR public.community_member_role(group_id) = 'admin'
  );

DROP POLICY IF EXISTS community_members_update ON public.community_group_members;
CREATE POLICY community_members_update ON public.community_group_members
  FOR UPDATE TO authenticated
  USING (public.is_app_owner() OR public.community_member_role(group_id) = 'admin');

DROP POLICY IF EXISTS community_members_delete ON public.community_group_members;
CREATE POLICY community_members_delete ON public.community_group_members
  FOR DELETE TO authenticated
  USING (
    public.is_app_owner()
    OR public.community_member_role(group_id) = 'admin'
    OR user_id = auth.uid()
  );

DROP POLICY IF EXISTS community_messages_select ON public.community_messages;
CREATE POLICY community_messages_select ON public.community_messages
  FOR SELECT TO authenticated
  USING (public.is_community_group_member(group_id));

DROP POLICY IF EXISTS community_messages_insert ON public.community_messages;
CREATE POLICY community_messages_insert ON public.community_messages
  FOR INSERT TO authenticated
  WITH CHECK (
    public.is_community_group_member(group_id)
    AND (author_id = auth.uid() OR kind = 'system')
  );

DROP POLICY IF EXISTS community_messages_update ON public.community_messages;
CREATE POLICY community_messages_update ON public.community_messages
  FOR UPDATE TO authenticated
  USING (
    public.can_moderate_community_group(group_id)
    OR author_id = auth.uid()
  );

DROP POLICY IF EXISTS community_messages_delete ON public.community_messages;
CREATE POLICY community_messages_delete ON public.community_messages
  FOR DELETE TO authenticated
  USING (
    public.can_moderate_community_group(group_id)
    OR author_id = auth.uid()
  );
