-- Allow multiple community servers per library (owner can create more than one)
ALTER TABLE public.community_servers
  DROP CONSTRAINT IF EXISTS community_servers_library_id_key;

CREATE INDEX IF NOT EXISTS community_servers_library_id_idx
  ON public.community_servers (library_id);
