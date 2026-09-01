-- Strict family-safe filtering is always on; enable AutoMod keyword layer by default

ALTER TABLE public.community_servers
  ALTER COLUMN automod_enabled SET DEFAULT true;

UPDATE public.community_servers
SET automod_enabled = true
WHERE automod_enabled = false;
