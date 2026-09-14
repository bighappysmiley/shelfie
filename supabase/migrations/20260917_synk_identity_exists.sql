-- Allow unauthenticated Synk sign-in to check whether a Synk profile is already
-- linked to a Pine account, without exposing user ids.
CREATE OR REPLACE FUNCTION public.synk_identity_is_linked(p_synk_profile_id text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.synk_identities
    WHERE synk_profile_id = p_synk_profile_id
  );
$$;

REVOKE ALL ON FUNCTION public.synk_identity_is_linked(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.synk_identity_is_linked(text) TO anon, authenticated, service_role;

COMMENT ON FUNCTION public.synk_identity_is_linked(text) IS
  'Returns true when a Synk profile id is already linked to a Pine user.';
