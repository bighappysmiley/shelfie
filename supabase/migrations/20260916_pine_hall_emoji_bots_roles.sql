-- Pine Hall polish helpers + idempotent server upgrade.
-- Channel renames / bot posts / role overrides are safe to re-run.

CREATE OR REPLACE FUNCTION public.pine_channel_key(p_name text)
RETURNS text
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT trim(both '-' FROM regexp_replace(
    lower(regexp_replace(coalesce(p_name, ''), '^[^A-Za-z0-9]+', '', 'g')),
    '[^a-z0-9]+', '-', 'g'
  ));
$$;

CREATE OR REPLACE FUNCTION public.pine_upsert_bot_message(
  p_server_id uuid,
  p_channel_key text,
  p_bot_name text,
  p_marker text,
  p_body text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_group_id uuid;
  v_msg_id uuid;
BEGIN
  SELECT id INTO v_group_id
  FROM public.community_groups
  WHERE server_id = p_server_id
    AND archived_at IS NULL
    AND public.pine_channel_key(name) = p_channel_key
  ORDER BY created_at ASC
  LIMIT 1;

  IF v_group_id IS NULL THEN
    RETURN;
  END IF;

  SELECT id INTO v_msg_id
  FROM public.community_messages
  WHERE group_id = v_group_id
    AND body ILIKE '%' || p_marker || '%'
  ORDER BY created_at ASC
  LIMIT 1;

  IF v_msg_id IS NOT NULL THEN
    UPDATE public.community_messages
    SET body = p_body,
        author_name = p_bot_name,
        kind = 'chat',
        edited_at = now()
    WHERE id = v_msg_id;
  ELSE
    INSERT INTO public.community_messages (group_id, author_id, body, kind, author_name)
    VALUES (v_group_id, NULL, p_body, 'chat', p_bot_name);
  END IF;
END;
$$;

COMMENT ON FUNCTION public.pine_channel_key(text) IS
  'Normalize community channel names (emoji | Title) to a stable slug key.';
COMMENT ON FUNCTION public.pine_upsert_bot_message(uuid, text, text, text, text) IS
  'Upsert a Pine/Suggestions/Support bot chat message in a Pine Hall channel.';
