-- Rename the hall bot from "Pine" to "Pine Hall" so a human "Pine" official
-- account can exist separately. Safe / idempotent.

UPDATE public.community_messages
SET author_name = 'Pine Hall',
    edited_at = COALESCE(edited_at, now())
WHERE author_id IS NULL
  AND lower(author_name) = 'pine';
