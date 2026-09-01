-- Community identity separate from library / team display name
ALTER TABLE public.user_profiles
  ADD COLUMN IF NOT EXISTS community_username text,
  ADD COLUMN IF NOT EXISTS community_display_name text;

CREATE UNIQUE INDEX IF NOT EXISTS user_profiles_community_username_lower_idx
  ON public.user_profiles (lower(community_username))
  WHERE community_username IS NOT NULL;

ALTER TABLE public.user_profiles
  DROP CONSTRAINT IF EXISTS user_profiles_community_username_format;

ALTER TABLE public.user_profiles
  ADD CONSTRAINT user_profiles_community_username_format
  CHECK (
    community_username IS NULL
    OR (
      char_length(community_username) BETWEEN 3 AND 24
      AND community_username ~ '^[a-zA-Z0-9_]+$'
    )
  );
