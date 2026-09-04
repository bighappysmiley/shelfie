-- Reliable staff profile lookup for the signed-in user (bypasses brittle client filters).
-- Also keeps the platform owner row pinned for hillelfrankel0@icloud.com.

INSERT INTO public.staff (email, display_name, title, role)
VALUES ('hillelfrankel0@icloud.com', 'Hillel Frankel', 'Owner', 'admin')
ON CONFLICT (email) DO UPDATE
SET display_name = EXCLUDED.display_name,
    title = 'Owner',
    role = 'admin';

CREATE OR REPLACE FUNCTION public.get_my_staff_profile()
RETURNS TABLE (
  email text,
  display_name text,
  title text,
  role text
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT s.email::text, s.display_name::text, s.title::text, s.role::text
  FROM public.staff s
  WHERE lower(s.email) = lower(coalesce(
    (SELECT u.email FROM auth.users u WHERE u.id = auth.uid()),
    auth.jwt() ->> 'email',
    ''
  ))
  LIMIT 1;
$$;

GRANT EXECUTE ON FUNCTION public.get_my_staff_profile() TO authenticated;
