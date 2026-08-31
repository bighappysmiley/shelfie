-- Fix infinite RLS recursion on library_members (policies must not self-query the same table)
-- Applied via Supabase MCP: fix_library_members_rls_recursion

CREATE OR REPLACE FUNCTION public.is_library_member(p_library_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.library_members
    WHERE library_id = p_library_id AND user_id = auth.uid()
  );
$$;

CREATE OR REPLACE FUNCTION public.is_library_owner(p_library_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.library_members
    WHERE library_id = p_library_id AND user_id = auth.uid() AND role = 'owner'
  );
$$;

CREATE OR REPLACE FUNCTION public.library_has_members(p_library_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (SELECT 1 FROM public.library_members WHERE library_id = p_library_id);
$$;

CREATE OR REPLACE FUNCTION public.has_pending_library_invite(p_library_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.library_invites i
    WHERE i.library_id = p_library_id AND i.status = 'pending'
      AND (
        (i.email IS NOT NULL AND lower(i.email) = lower(coalesce(auth.jwt()->>'email', '')))
        OR (i.phone IS NOT NULL AND i.phone = (
          SELECT up.phone FROM public.user_profiles up WHERE up.user_id = auth.uid()
        ))
      )
  );
$$;
