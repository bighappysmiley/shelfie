-- Discord-style channel kinds: text, forum, voice, announcement (replace chat/suggestions/both).

ALTER TABLE public.community_groups
  DROP CONSTRAINT IF EXISTS community_groups_kind_check;

UPDATE public.community_groups
SET kind = 'text'
WHERE kind IN ('chat', 'both');

UPDATE public.community_groups
SET kind = 'forum'
WHERE kind = 'suggestions';

ALTER TABLE public.community_groups
  ALTER COLUMN kind SET DEFAULT 'text';

ALTER TABLE public.community_groups
  ADD CONSTRAINT community_groups_kind_check
  CHECK (kind IN ('text', 'forum', 'voice', 'announcement'));
