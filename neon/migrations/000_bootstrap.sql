-- Neon bootstrap: role aliases + base tables missing from Supabase migrations

CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Role aliases used by legacy Supabase migrations
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN
    CREATE ROLE anon NOLOGIN;
    GRANT anonymous TO anon;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'service_role') THEN
    CREATE ROLE service_role NOLOGIN BYPASSRLS;
  END IF;
EXCEPTION WHEN insufficient_privilege THEN
  RAISE NOTICE 'Skipping role creation (insufficient privilege)';
END $$;

GRANT USAGE ON SCHEMA public TO anonymous, authenticated;
GRANT USAGE ON SCHEMA neon_auth TO anonymous, authenticated;

-- Base staff / support tables (existed outside numbered migrations on Supabase)
CREATE TABLE IF NOT EXISTS public.staff (
  email text PRIMARY KEY,
  display_name text NOT NULL,
  title text,
  role text NOT NULL DEFAULT 'staff' CHECK (role IN ('admin', 'staff')),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.tickets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL REFERENCES neon_auth."user"(id) ON DELETE CASCADE,
  contact_email text NOT NULL,
  subject text NOT NULL,
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'closed')),
  created_at timestamptz NOT NULL DEFAULT now(),
  closed_at timestamptz
);

CREATE TABLE IF NOT EXISTS public.ticket_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id uuid NOT NULL REFERENCES public.tickets(id) ON DELETE CASCADE,
  author_id uuid REFERENCES neon_auth."user"(id) ON DELETE SET NULL,
  body text NOT NULL,
  kind text NOT NULL DEFAULT 'user' CHECK (kind IN ('user', 'staff', 'system')),
  author_name text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS ticket_messages_ticket_created_idx
  ON public.ticket_messages (ticket_id, created_at);

ALTER TABLE public.staff ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ticket_messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS staff_select_authenticated ON public.staff;
CREATE POLICY staff_select_authenticated ON public.staff
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS tickets_owner_all ON public.tickets;
CREATE POLICY tickets_owner_all ON public.tickets
  FOR ALL TO authenticated
  USING (owner_id = auth.uid() OR EXISTS (
    SELECT 1 FROM public.staff s
    WHERE lower(s.email) = lower(coalesce(auth.jwt()->>'email',''))
  ))
  WITH CHECK (owner_id = auth.uid() OR EXISTS (
    SELECT 1 FROM public.staff s
    WHERE lower(s.email) = lower(coalesce(auth.jwt()->>'email',''))
  ));

DROP POLICY IF EXISTS ticket_messages_via_ticket ON public.ticket_messages;
CREATE POLICY ticket_messages_via_ticket ON public.ticket_messages
  FOR ALL TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.tickets t
    WHERE t.id = ticket_id AND (
      t.owner_id = auth.uid() OR EXISTS (
        SELECT 1 FROM public.staff s
        WHERE lower(s.email) = lower(coalesce(auth.jwt()->>'email',''))
      )
    )
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.tickets t
    WHERE t.id = ticket_id AND (
      t.owner_id = auth.uid() OR EXISTS (
        SELECT 1 FROM public.staff s
        WHERE lower(s.email) = lower(coalesce(auth.jwt()->>'email',''))
      )
    )
  ));

INSERT INTO public.staff (email, display_name, title, role)
VALUES ('hillelfrankel0@icloud.com', 'Hillel Frankel', 'Owner', 'admin')
ON CONFLICT (email) DO UPDATE
SET display_name = EXCLUDED.display_name,
    title = EXCLUDED.title,
    role = EXCLUDED.role;

-- Helpers that existed outside numbered Supabase migrations
CREATE OR REPLACE FUNCTION public.is_staff()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.staff s
    WHERE lower(s.email) = lower(coalesce(auth.jwt()->>'email', ''))
  );
$$;

CREATE OR REPLACE FUNCTION public.is_app_owner()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.staff s
    WHERE lower(s.email) = lower(coalesce(auth.jwt()->>'email', ''))
      AND s.role = 'admin'
  );
$$;

GRANT EXECUTE ON FUNCTION public.is_staff() TO authenticated, anonymous;
GRANT EXECUTE ON FUNCTION public.is_app_owner() TO authenticated, anonymous;

GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO authenticated, anonymous;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO authenticated, anonymous;
GRANT SELECT ON neon_auth."user" TO authenticated, anonymous;

ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO authenticated, anonymous;
