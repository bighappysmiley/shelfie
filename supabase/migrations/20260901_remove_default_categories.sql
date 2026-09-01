-- Remove pre-made "Text Channels" and "Official" categories (legacy + per-server seeds).
-- Channels in those categories become uncategorized.

UPDATE public.community_groups g
SET category_id = NULL
FROM public.community_categories c
WHERE g.category_id = c.id
  AND lower(trim(c.name)) IN ('text channels', 'official');

DELETE FROM public.community_categories
WHERE lower(trim(name)) IN ('text channels', 'official');
