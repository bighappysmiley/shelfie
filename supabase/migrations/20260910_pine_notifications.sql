-- Stop returning access codes to staff; Pine branding; enable notification realtime.

CREATE OR REPLACE FUNCTION public.request_library_access_code(p_library_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_owner uuid;
  v_code text;
  v_id uuid;
  v_lib_name text;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  IF NOT public.is_staff() THEN RAISE EXCEPTION 'Not allowed'; END IF;

  SELECT name INTO v_lib_name FROM public.libraries WHERE id = p_library_id;
  IF v_lib_name IS NULL THEN RAISE EXCEPTION 'Library not found'; END IF;

  SELECT user_id INTO v_owner
  FROM public.library_members
  WHERE library_id = p_library_id AND role = 'owner'
  LIMIT 1;

  IF v_owner IS NULL THEN RAISE EXCEPTION 'Library has no owner'; END IF;

  v_code := upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 8));

  INSERT INTO public.library_access_codes (
    library_id, code, requested_by, status, expires_at
  ) VALUES (
    p_library_id, v_code, v_uid, 'sent', now() + interval '24 hours'
  ) RETURNING id INTO v_id;

  INSERT INTO public.app_notifications (user_id, kind, title, body, payload)
  VALUES (
    v_owner,
    'library_access_code',
    'Support access request',
    'Pine Support requested temporary edit access to “' || v_lib_name ||
      '”. Share this one-time code with support only if you approve: ' || v_code,
    jsonb_build_object(
      'libraryId', p_library_id,
      'code', v_code,
      'accessCodeId', v_id,
      'expiresAt', (now() + interval '24 hours')
    )
  );

  INSERT INTO public.admin_audit_log (actor_id, action, target_library_id, detail)
  VALUES (v_uid, 'library_access_code_requested', p_library_id, v_id::text);

  -- Never return the code to the requester (owner receives it via notification).
  RETURN jsonb_build_object(
    'id', v_id,
    'libraryId', p_library_id,
    'ownerUserId', v_owner,
    'expiresAt', (now() + interval '24 hours')
  );
END;
$$;

-- Realtime inserts for in-app notification toasts
DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.app_notifications;
EXCEPTION
  WHEN duplicate_object THEN NULL;
  WHEN undefined_object THEN NULL;
END $$;
