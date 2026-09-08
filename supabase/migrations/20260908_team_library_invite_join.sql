-- Invitees should not get a forced personal library; harden invite accept + phone matching.

CREATE OR REPLACE FUNCTION public.ensure_default_library()
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  lib_id uuid;
  uid uuid := auth.uid();
  jwt_email text := lower(coalesce(auth.jwt()->>'email', ''));
  jwt_phone text := coalesce(auth.jwt()->>'phone', '');
  profile_phone text;
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

  SELECT up.phone INTO profile_phone
  FROM public.user_profiles up
  WHERE up.user_id = uid;

  -- Pending team invite: do not auto-create a personal library.
  IF EXISTS (
    SELECT 1
    FROM public.library_invites i
    WHERE i.status = 'pending'
      AND (
        (i.email IS NOT NULL AND lower(i.email) = jwt_email AND jwt_email <> '')
        OR (
          i.phone IS NOT NULL
          AND (
            (profile_phone IS NOT NULL AND i.phone = profile_phone)
            OR (jwt_phone <> '' AND i.phone = jwt_phone)
          )
        )
      )
  ) THEN
    RETURN NULL;
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

-- Accept by invite id with contact checks (email / auth phone / profile phone).
CREATE OR REPLACE FUNCTION public.accept_library_invite(p_invite_id uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  uid uuid := auth.uid();
  inv public.library_invites%ROWTYPE;
  jwt_email text := lower(coalesce(auth.jwt()->>'email', ''));
  jwt_phone text := coalesce(auth.jwt()->>'phone', '');
  profile_phone text;
  matched boolean := false;
  empty_default uuid;
BEGIN
  IF uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT * INTO inv
  FROM public.library_invites
  WHERE id = p_invite_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Invite not found' USING ERRCODE = 'P0002';
  END IF;

  IF inv.status <> 'pending' THEN
    RAISE EXCEPTION 'Invite is no longer pending' USING ERRCODE = 'P0001';
  END IF;

  SELECT up.phone INTO profile_phone
  FROM public.user_profiles up
  WHERE up.user_id = uid;

  IF inv.email IS NOT NULL AND jwt_email <> '' AND lower(inv.email) = jwt_email THEN
    matched := true;
  END IF;

  IF inv.phone IS NOT NULL AND (
    (profile_phone IS NOT NULL AND inv.phone = profile_phone)
    OR (jwt_phone <> '' AND inv.phone = jwt_phone)
  ) THEN
    matched := true;
  END IF;

  IF NOT matched THEN
    RAISE EXCEPTION 'Invite does not match this account' USING ERRCODE = 'P0001';
  END IF;

  INSERT INTO public.library_members (library_id, user_id, role)
  VALUES (inv.library_id, uid, 'member')
  ON CONFLICT DO NOTHING;

  UPDATE public.library_invites
  SET status = 'accepted'
  WHERE id = inv.id;

  -- Drop an empty forced "My Library" once the user has a shared library.
  FOR empty_default IN
    SELECT l.id
    FROM public.libraries l
    JOIN public.library_members lm ON lm.library_id = l.id AND lm.user_id = uid AND lm.role = 'owner'
    WHERE l.owner_id = uid
      AND l.name = 'My Library'
      AND l.id <> inv.library_id
      AND NOT EXISTS (
        SELECT 1 FROM public.library_members lm2
        WHERE lm2.library_id = l.id AND lm2.user_id <> uid
      )
  LOOP
    DELETE FROM public.library_members WHERE library_id = empty_default;
    DELETE FROM public.libraries WHERE id = empty_default AND owner_id = uid;
  END LOOP;

  RETURN inv.library_id;
END;
$$;

REVOKE ALL ON FUNCTION public.accept_library_invite(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.accept_library_invite(uuid) TO authenticated;

-- Match phone invites via JWT phone as well as user_profiles.phone.
CREATE OR REPLACE FUNCTION public.has_pending_library_invite(p_library_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.library_invites i
    WHERE i.library_id = p_library_id
      AND i.status = 'pending'
      AND (
        (i.email IS NOT NULL AND lower(i.email) = lower(coalesce(auth.jwt()->>'email', '')))
        OR (
          i.phone IS NOT NULL
          AND (
            i.phone = (SELECT up.phone FROM public.user_profiles up WHERE up.user_id = auth.uid())
            OR i.phone = coalesce(auth.jwt()->>'phone', '')
          )
        )
      )
  );
$$;

DROP POLICY IF EXISTS library_invites_select ON public.library_invites;
CREATE POLICY library_invites_select ON public.library_invites
  FOR SELECT USING (
    is_library_owner(library_id)
    OR (email IS NOT NULL AND lower(email) = lower(coalesce(auth.jwt()->>'email', '')))
    OR (
      phone IS NOT NULL
      AND (
        phone = (SELECT up.phone FROM public.user_profiles up WHERE up.user_id = auth.uid())
        OR phone = coalesce(auth.jwt()->>'phone', '')
      )
    )
  );

DROP POLICY IF EXISTS library_invites_update ON public.library_invites;
CREATE POLICY library_invites_update ON public.library_invites
  FOR UPDATE USING (
    is_library_owner(library_id)
    OR (email IS NOT NULL AND lower(email) = lower(coalesce(auth.jwt()->>'email', '')))
    OR (
      phone IS NOT NULL
      AND (
        phone = (SELECT up.phone FROM public.user_profiles up WHERE up.user_id = auth.uid())
        OR phone = coalesce(auth.jwt()->>'phone', '')
      )
    )
  );
