-- Decorative community profile tags (Discord-style badges; separate from permission roles).

CREATE TABLE IF NOT EXISTS public.community_server_tags (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  server_id uuid NOT NULL REFERENCES public.community_servers(id) ON DELETE CASCADE,
  name text NOT NULL CHECK (char_length(trim(name)) BETWEEN 1 AND 40),
  color text NOT NULL DEFAULT '#5865F2',
  icon_url text,
  position int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS community_server_tags_server_idx
  ON public.community_server_tags (server_id, position, name);

CREATE TABLE IF NOT EXISTS public.community_member_tags (
  server_id uuid NOT NULL REFERENCES public.community_servers(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  tag_id uuid NOT NULL REFERENCES public.community_server_tags(id) ON DELETE CASCADE,
  assigned_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  assigned_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (server_id, user_id, tag_id)
);

CREATE INDEX IF NOT EXISTS community_member_tags_user_idx
  ON public.community_member_tags (server_id, user_id);

ALTER TABLE public.community_server_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.community_member_tags ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS community_server_tags_select ON public.community_server_tags;
CREATE POLICY community_server_tags_select ON public.community_server_tags
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.community_server_members m
      WHERE m.server_id = community_server_tags.server_id
        AND m.user_id = auth.uid()
    )
    OR public.is_staff()
  );

DROP POLICY IF EXISTS community_server_tags_manage ON public.community_server_tags;
CREATE POLICY community_server_tags_manage ON public.community_server_tags
  FOR ALL TO authenticated
  USING (public.can_manage_community_server(server_id))
  WITH CHECK (public.can_manage_community_server(server_id));

DROP POLICY IF EXISTS community_member_tags_select ON public.community_member_tags;
CREATE POLICY community_member_tags_select ON public.community_member_tags
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.community_server_members m
      WHERE m.server_id = community_member_tags.server_id
        AND m.user_id = auth.uid()
    )
    OR public.is_staff()
  );

DROP POLICY IF EXISTS community_member_tags_manage ON public.community_member_tags;
CREATE POLICY community_member_tags_manage ON public.community_member_tags
  FOR ALL TO authenticated
  USING (public.can_manage_community_server(server_id))
  WITH CHECK (public.can_manage_community_server(server_id));

-- Staff-only linked accounts for admin account switcher
CREATE TABLE IF NOT EXISTS public.staff_linked_accounts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  linked_email text NOT NULL,
  label text NOT NULL DEFAULT '',
  linked_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (owner_user_id, linked_email)
);

CREATE INDEX IF NOT EXISTS staff_linked_accounts_owner_idx
  ON public.staff_linked_accounts (owner_user_id);

ALTER TABLE public.staff_linked_accounts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS staff_linked_accounts_own ON public.staff_linked_accounts;
CREATE POLICY staff_linked_accounts_own ON public.staff_linked_accounts
  FOR ALL TO authenticated
  USING (owner_user_id = auth.uid() AND public.is_staff())
  WITH CHECK (owner_user_id = auth.uid() AND public.is_staff());
