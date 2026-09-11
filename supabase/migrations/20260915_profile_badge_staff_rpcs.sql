-- Reliable staff RPCs for profile badges (create / update / delete / assign).

CREATE OR REPLACE FUNCTION public.staff_create_profile_badge(
  p_name text,
  p_color text DEFAULT '#5865F2',
  p_icon_url text DEFAULT NULL
)
RETURNS public.profile_badges
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_next int;
  v_row public.profile_badges;
BEGIN
  IF NOT public.is_staff() THEN
    RAISE EXCEPTION 'Only staff can create badges' USING ERRCODE = '42501';
  END IF;

  IF char_length(trim(p_name)) < 1 OR char_length(trim(p_name)) > 40 THEN
    RAISE EXCEPTION 'Badge name must be 1–40 characters';
  END IF;

  SELECT coalesce(max(position), -1) + 1 INTO v_next FROM public.profile_badges;

  INSERT INTO public.profile_badges (name, color, icon_url, position)
  VALUES (trim(p_name), coalesce(nullif(trim(p_color), ''), '#5865F2'), p_icon_url, v_next)
  RETURNING * INTO v_row;

  RETURN v_row;
END;
$$;

CREATE OR REPLACE FUNCTION public.staff_update_profile_badge(
  p_id uuid,
  p_name text DEFAULT NULL,
  p_color text DEFAULT NULL,
  p_icon_url text DEFAULT NULL,
  p_clear_icon boolean DEFAULT false
)
RETURNS public.profile_badges
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_row public.profile_badges;
BEGIN
  IF NOT public.is_staff() THEN
    RAISE EXCEPTION 'Only staff can update badges' USING ERRCODE = '42501';
  END IF;

  UPDATE public.profile_badges
  SET
    name = coalesce(nullif(trim(p_name), ''), name),
    color = coalesce(nullif(trim(p_color), ''), color),
    icon_url = CASE
      WHEN p_clear_icon THEN NULL
      WHEN p_icon_url IS NOT NULL THEN p_icon_url
      ELSE icon_url
    END,
    updated_at = now()
  WHERE id = p_id
  RETURNING * INTO v_row;

  IF v_row.id IS NULL THEN
    RAISE EXCEPTION 'Badge not found';
  END IF;

  RETURN v_row;
END;
$$;

CREATE OR REPLACE FUNCTION public.staff_delete_profile_badge(p_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NOT public.is_staff() THEN
    RAISE EXCEPTION 'Only staff can delete badges' USING ERRCODE = '42501';
  END IF;
  DELETE FROM public.profile_badges WHERE id = p_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.staff_set_user_profile_badges(
  p_user_id uuid,
  p_badge_ids uuid[]
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NOT public.is_staff() THEN
    RAISE EXCEPTION 'Only staff can assign badges' USING ERRCODE = '42501';
  END IF;

  DELETE FROM public.user_profile_badges WHERE user_id = p_user_id;

  IF p_badge_ids IS NULL OR coalesce(array_length(p_badge_ids, 1), 0) = 0 THEN
    RETURN;
  END IF;

  INSERT INTO public.user_profile_badges (user_id, badge_id, assigned_by)
  SELECT DISTINCT p_user_id, badge_id, auth.uid()
  FROM unnest(p_badge_ids) AS badge_id
  ON CONFLICT (user_id, badge_id) DO NOTHING;
END;
$$;

GRANT EXECUTE ON FUNCTION public.staff_create_profile_badge(text, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.staff_update_profile_badge(uuid, text, text, text, boolean) TO authenticated;
GRANT EXECUTE ON FUNCTION public.staff_delete_profile_badge(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.staff_set_user_profile_badges(uuid, uuid[]) TO authenticated;
