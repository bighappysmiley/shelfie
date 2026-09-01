-- Invite codes for joining community servers
ALTER TABLE public.community_servers
  ADD COLUMN IF NOT EXISTS invite_code text;

UPDATE public.community_servers
SET invite_code = upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 8))
WHERE invite_code IS NULL;

ALTER TABLE public.community_servers
  ALTER COLUMN invite_code SET NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS community_servers_invite_code_idx
  ON public.community_servers (upper(invite_code));
