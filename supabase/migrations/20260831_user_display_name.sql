-- Display name for team recognition; teammates can read names in shared libraries
ALTER TABLE public.user_profiles
  ADD COLUMN IF NOT EXISTS display_name text;

CREATE OR REPLACE FUNCTION public.shares_library_with(p_other_user_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.library_members a
    JOIN public.library_members b ON a.library_id = b.library_id
    WHERE a.user_id = auth.uid() AND b.user_id = p_other_user_id
  );
$$;

REVOKE ALL ON FUNCTION public.shares_library_with(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.shares_library_with(uuid) TO authenticated;

DROP POLICY IF EXISTS user_profiles_select ON public.user_profiles;
CREATE POLICY user_profiles_select ON public.user_profiles
  FOR SELECT USING (user_id = auth.uid() OR public.shares_library_with(user_id));
