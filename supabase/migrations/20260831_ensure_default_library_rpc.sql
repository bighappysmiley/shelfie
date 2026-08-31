-- Reliable default library creation for new users (SECURITY DEFINER bypasses RLS edge cases)
CREATE OR REPLACE FUNCTION public.ensure_default_library()
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  lib_id uuid;
  uid uuid := auth.uid();
BEGIN
  IF uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT lm.library_id INTO lib_id
  FROM public.library_members lm
  WHERE lm.user_id = uid
  LIMIT 1;

  IF lib_id IS NOT NULL THEN
    RETURN lib_id;
  END IF;

  INSERT INTO public.libraries (name, owner_id)
  VALUES ('My Library', uid)
  RETURNING id INTO lib_id;

  INSERT INTO public.library_members (library_id, user_id, role)
  VALUES (lib_id, uid, 'owner');

  RETURN lib_id;
END;
$$;

REVOKE ALL ON FUNCTION public.ensure_default_library() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.ensure_default_library() TO authenticated;
