-- Official Pine Hall community server + helper RPC for app owners.
-- Categories/channels are also seeded from the client (ensureOfficialPineHall)
-- so the layout stays in sync with the TypeScript template.

CREATE OR REPLACE FUNCTION public.ensure_pine_hall_server()
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_server_id uuid;
  v_owner_role_id uuid;
  v_invite text;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Sign in required';
  END IF;

  IF NOT public.is_app_owner() THEN
    RAISE EXCEPTION 'Only the app owner can ensure Pine Hall';
  END IF;

  -- Rename legacy General seed if present
  UPDATE public.community_servers
  SET name = 'Pine Hall',
      updated_at = now()
  WHERE name = 'General'
    AND (is_official = true OR created_by = v_uid);

  SELECT id INTO v_server_id
  FROM public.community_servers
  WHERE lower(name) = lower('Pine Hall')
  ORDER BY created_at ASC
  LIMIT 1;

  IF v_server_id IS NULL THEN
    v_invite := upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 8));

    INSERT INTO public.community_servers (
      library_id,
      name,
      description,
      is_public,
      is_official,
      official_position,
      invite_code,
      join_mode,
      created_by,
      rules,
      welcome_message,
      vanity_slug,
      verification_level
    ) VALUES (
      NULL,
      'Pine Hall',
      'Pine''s official reading community — share what you''re reading, swap recommendations, and hang out with fellow book people.',
      true,
      true,
      0,
      v_invite,
      'open',
      v_uid,
      $rules$1. Be kind — treat readers and their tastes with respect.
2. No spoilers without a clear warning in the first line.
3. Keep discussion bookish or friendly; spam and harassment get removed.
4. Don't share pirated books or illegal download links.
5. Have fun — this hall is for discovering the next great read.$rules$,
      'Welcome to Pine Hall! Say hi in #introductions, check #announcements, and tell us what you''re reading.',
      'pine-hall',
      'low'
    )
    RETURNING id INTO v_server_id;
  ELSE
    UPDATE public.community_servers
    SET
      name = 'Pine Hall',
      is_public = true,
      is_official = true,
      official_position = COALESCE(official_position, 0),
      library_id = NULL,
      join_mode = 'open',
      vanity_slug = COALESCE(NULLIF(trim(vanity_slug), ''), 'pine-hall'),
      description = COALESCE(
        NULLIF(trim(description), ''),
        'Pine''s official reading community — share what you''re reading, swap recommendations, and hang out with fellow book people.'
      ),
      rules = COALESCE(
        NULLIF(trim(rules), ''),
        $rules$1. Be kind — treat readers and their tastes with respect.
2. No spoilers without a clear warning in the first line.
3. Keep discussion bookish or friendly; spam and harassment get removed.
4. Don't share pirated books or illegal download links.
5. Have fun — this hall is for discovering the next great read.$rules$
      ),
      welcome_message = COALESCE(
        NULLIF(trim(welcome_message), ''),
        'Welcome to Pine Hall! Say hi in #introductions, check #announcements, and tell us what you''re reading.'
      ),
      updated_at = now()
    WHERE id = v_server_id;
  END IF;

  -- Default roles (ignore if already present)
  INSERT INTO public.community_server_roles (
    server_id, name, position, color,
    can_manage_server, can_manage_channels, can_moderate,
    can_kick_members, can_ban_members, can_manage_messages, can_invite_users,
    hoist, mentionable, is_everyone
  )
  VALUES
    (v_server_id, 'Owner', 0, '#E11D48', true, true, true, true, true, true, true, true, true, false),
    (v_server_id, 'Admin', 10, '#F59E0B', true, true, true, true, true, true, true, true, true, false),
    (v_server_id, 'Moderator', 20, '#3B82F6', false, false, true, true, true, true, true, true, true, false),
    (v_server_id, 'Member', 100, '#6B7280', false, false, false, false, false, false, true, false, true, true)
  ON CONFLICT (server_id, name) DO NOTHING;

  SELECT id INTO v_owner_role_id
  FROM public.community_server_roles
  WHERE server_id = v_server_id AND name = 'Owner'
  LIMIT 1;

  INSERT INTO public.community_server_members (server_id, user_id, role_id)
  VALUES (v_server_id, v_uid, v_owner_role_id)
  ON CONFLICT (server_id, user_id) DO UPDATE
  SET role_id = COALESCE(EXCLUDED.role_id, public.community_server_members.role_id);

  RETURN v_server_id;
END;
$$;

REVOKE ALL ON FUNCTION public.ensure_pine_hall_server() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.ensure_pine_hall_server() TO authenticated;
