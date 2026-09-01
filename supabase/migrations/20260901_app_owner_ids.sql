-- Resolve app owner user IDs for community chat badges (staff title Owner).

CREATE OR REPLACE FUNCTION public.is_user_app_owner(p_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM auth.users u
    INNER JOIN public.staff s ON lower(s.email) = lower(u.email)
    WHERE u.id = p_user_id
      AND (
        lower(coalesce(s.title, '')) = 'owner'
        OR lower(s.email) = 'hillelfrankel0@icloud.com'
      )
  );
$$;

CREATE OR REPLACE FUNCTION public.list_app_owner_user_ids()
RETURNS SETOF uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT u.id
  FROM auth.users u
  INNER JOIN public.staff s ON lower(s.email) = lower(u.email)
  WHERE lower(coalesce(s.title, '')) = 'owner'
     OR lower(s.email) = 'hillelfrankel0@icloud.com';
$$;

GRANT EXECUTE ON FUNCTION public.is_user_app_owner(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.list_app_owner_user_ids() TO authenticated;
