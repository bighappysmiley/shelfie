-- Link Shelfie / Pine accounts to Synk ID (face or Synk code sign-in).
CREATE TABLE IF NOT EXISTS public.synk_identities (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  synk_profile_id text NOT NULL UNIQUE,
  synk_code text,
  display_name text,
  photo_url text,
  linked_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS synk_identities_profile_id_idx
  ON public.synk_identities (synk_profile_id);

ALTER TABLE public.synk_identities ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS synk_identities_select_own ON public.synk_identities;
CREATE POLICY synk_identities_select_own ON public.synk_identities
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS synk_identities_delete_own ON public.synk_identities;
CREATE POLICY synk_identities_delete_own ON public.synk_identities
  FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

COMMENT ON TABLE public.synk_identities IS
  'Maps Supabase users to Synk ID profiles for passwordless face / Synk code sign-in.';
