-- Per-channel slow mode (seconds between messages per user; 0 = off)
ALTER TABLE public.community_groups
  ADD COLUMN IF NOT EXISTS slow_mode_seconds integer NOT NULL DEFAULT 0;

ALTER TABLE public.community_groups
  DROP CONSTRAINT IF EXISTS community_groups_slow_mode_nonneg;

ALTER TABLE public.community_groups
  ADD CONSTRAINT community_groups_slow_mode_nonneg CHECK (slow_mode_seconds >= 0);
