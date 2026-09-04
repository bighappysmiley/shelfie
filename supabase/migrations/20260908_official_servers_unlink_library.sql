-- Non-official community servers must stay linked to a library.
-- Official (platform) servers are unlinked from personal libraries.

-- Allow null library_id for official servers.
ALTER TABLE public.community_servers
  ALTER COLUMN library_id DROP NOT NULL;

-- Recreate FK so deleting a library only affects servers still linked to it.
ALTER TABLE public.community_servers
  DROP CONSTRAINT IF EXISTS community_servers_library_id_fkey;

ALTER TABLE public.community_servers
  ADD CONSTRAINT community_servers_library_id_fkey
  FOREIGN KEY (library_id) REFERENCES public.libraries(id) ON DELETE CASCADE;

-- Enforce: every non-official server must have a library link.
ALTER TABLE public.community_servers
  DROP CONSTRAINT IF EXISTS community_servers_library_required_unless_official;

ALTER TABLE public.community_servers
  ADD CONSTRAINT community_servers_library_required_unless_official
  CHECK (is_official OR library_id IS NOT NULL);

-- Unlink existing official servers from personal libraries.
UPDATE public.community_servers
SET library_id = NULL,
    updated_at = now()
WHERE is_official = true
  AND library_id IS NOT NULL;

-- Library-owner manage rights only apply when a library link exists.
CREATE OR REPLACE FUNCTION public.can_manage_community_server(p_server_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO public
AS $$
  SELECT
    public.is_app_owner()
    OR EXISTS (
      SELECT 1
      FROM public.community_servers s
      JOIN public.library_members lm ON lm.library_id = s.library_id
      WHERE s.id = p_server_id
        AND s.library_id IS NOT NULL
        AND lm.user_id = auth.uid()
        AND lm.role = 'owner'
    )
    OR EXISTS (
      SELECT 1
      FROM public.community_server_members m
      JOIN public.community_server_roles r ON r.id = m.role_id
      WHERE m.server_id = p_server_id
        AND m.user_id = auth.uid()
        AND (r.can_manage_server OR r.name = 'Owner')
    );
$$;
