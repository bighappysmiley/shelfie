-- Admin panel: tiers, usage, bans, library access codes, enterprise leads, notifications

-- Subscription / entitlement fields on profiles
ALTER TABLE public.user_profiles
  ADD COLUMN IF NOT EXISTS subscription_tier text NOT NULL DEFAULT 'free'
    CHECK (subscription_tier IN ('free', 'pro', 'pro_plus', 'premium', 'enterprise')),
  ADD COLUMN IF NOT EXISTS stripe_customer_id text,
  ADD COLUMN IF NOT EXISTS stripe_subscription_id text,
  ADD COLUMN IF NOT EXISTS subscription_status text DEFAULT 'none',
  ADD COLUMN IF NOT EXISTS subscription_period_end timestamptz,
  ADD COLUMN IF NOT EXISTS book_limit_override int,
  ADD COLUMN IF NOT EXISTS shelf_scan_limit_override int,
  ADD COLUMN IF NOT EXISTS banned_at timestamptz,
  ADD COLUMN IF NOT EXISTS ban_reason text;

-- Sync pro_enabled from paid tiers
UPDATE public.user_profiles
SET pro_enabled = true
WHERE subscription_tier IN ('pro', 'pro_plus', 'premium', 'enterprise')
  AND COALESCE(pro_enabled, false) = false;

-- Usage metering (monthly shelf scans)
CREATE TABLE IF NOT EXISTS public.user_usage_counters (
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  metric text NOT NULL CHECK (metric IN ('shelf_scans', 'cover_scans')),
  period_ym text NOT NULL, -- YYYY-MM
  count int NOT NULL DEFAULT 0,
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, metric, period_ym)
);

ALTER TABLE public.user_usage_counters ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS user_usage_select_own ON public.user_usage_counters;
CREATE POLICY user_usage_select_own ON public.user_usage_counters
  FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.is_staff());

DROP POLICY IF EXISTS user_usage_staff_all ON public.user_usage_counters;
CREATE POLICY user_usage_staff_all ON public.user_usage_counters
  FOR ALL TO authenticated
  USING (public.is_staff())
  WITH CHECK (public.is_staff());

DROP POLICY IF EXISTS user_usage_upsert_own ON public.user_usage_counters;
CREATE POLICY user_usage_upsert_own ON public.user_usage_counters
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS user_usage_update_own ON public.user_usage_counters;
CREATE POLICY user_usage_update_own ON public.user_usage_counters
  FOR UPDATE TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Platform bans mirror for auth checks
CREATE TABLE IF NOT EXISTS public.platform_bans (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  reason text,
  banned_by uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.platform_bans ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS platform_bans_staff ON public.platform_bans;
CREATE POLICY platform_bans_staff ON public.platform_bans
  FOR ALL TO authenticated
  USING (public.is_staff())
  WITH CHECK (public.is_staff());

-- One-time library access codes (owner grants admin temporary edit access)
CREATE TABLE IF NOT EXISTS public.library_access_codes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  library_id uuid NOT NULL REFERENCES public.libraries(id) ON DELETE CASCADE,
  code text NOT NULL,
  requested_by uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  granted_to_staff_id uuid REFERENCES auth.users(id),
  created_by_owner_id uuid REFERENCES auth.users(id),
  status text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'sent', 'used', 'expired', 'revoked')),
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '24 hours'),
  used_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS library_access_codes_library_idx
  ON public.library_access_codes (library_id, status);

CREATE UNIQUE INDEX IF NOT EXISTS library_access_codes_code_idx
  ON public.library_access_codes (code)
  WHERE status IN ('pending', 'sent');

ALTER TABLE public.library_access_codes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS library_access_codes_staff ON public.library_access_codes;
CREATE POLICY library_access_codes_staff ON public.library_access_codes
  FOR ALL TO authenticated
  USING (public.is_staff())
  WITH CHECK (public.is_staff());

DROP POLICY IF EXISTS library_access_codes_owner ON public.library_access_codes;
CREATE POLICY library_access_codes_owner ON public.library_access_codes
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.library_members m
      WHERE m.library_id = library_access_codes.library_id
        AND m.user_id = auth.uid()
        AND m.role = 'owner'
    )
  );

-- Active admin edit sessions (after redeeming a code)
CREATE TABLE IF NOT EXISTS public.library_admin_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  library_id uuid NOT NULL REFERENCES public.libraries(id) ON DELETE CASCADE,
  staff_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  access_code_id uuid REFERENCES public.library_access_codes(id) ON DELETE SET NULL,
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '4 hours'),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS library_admin_sessions_active_idx
  ON public.library_admin_sessions (library_id, staff_user_id, expires_at);

ALTER TABLE public.library_admin_sessions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS library_admin_sessions_staff ON public.library_admin_sessions;
CREATE POLICY library_admin_sessions_staff ON public.library_admin_sessions
  FOR ALL TO authenticated
  USING (public.is_staff())
  WITH CHECK (public.is_staff());

-- In-app notifications (access codes, admin messages, etc.)
CREATE TABLE IF NOT EXISTS public.app_notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  kind text NOT NULL,
  title text NOT NULL,
  body text NOT NULL,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  read_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS app_notifications_user_idx
  ON public.app_notifications (user_id, created_at DESC);

ALTER TABLE public.app_notifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS app_notifications_own ON public.app_notifications;
CREATE POLICY app_notifications_own ON public.app_notifications
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS app_notifications_own_update ON public.app_notifications;
CREATE POLICY app_notifications_own_update ON public.app_notifications
  FOR UPDATE TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS app_notifications_staff_insert ON public.app_notifications;
CREATE POLICY app_notifications_staff_insert ON public.app_notifications
  FOR INSERT TO authenticated
  WITH CHECK (public.is_staff() OR user_id = auth.uid());

-- Enterprise contact leads
CREATE TABLE IF NOT EXISTS public.enterprise_leads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  email text NOT NULL,
  company text,
  team_size text,
  message text NOT NULL,
  status text NOT NULL DEFAULT 'new'
    CHECK (status IN ('new', 'contacted', 'closed')),
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.enterprise_leads ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS enterprise_leads_insert ON public.enterprise_leads;
CREATE POLICY enterprise_leads_insert ON public.enterprise_leads
  FOR INSERT TO authenticated
  WITH CHECK (true);

DROP POLICY IF EXISTS enterprise_leads_staff ON public.enterprise_leads;
CREATE POLICY enterprise_leads_staff ON public.enterprise_leads
  FOR ALL TO authenticated
  USING (public.is_staff())
  WITH CHECK (public.is_staff());

-- Admin audit log
CREATE TABLE IF NOT EXISTS public.admin_audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  action text NOT NULL,
  target_user_id uuid,
  target_library_id uuid,
  detail text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.admin_audit_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS admin_audit_staff ON public.admin_audit_log;
CREATE POLICY admin_audit_staff ON public.admin_audit_log
  FOR ALL TO authenticated
  USING (public.is_staff())
  WITH CHECK (public.is_staff());

-- Helper: generate access code
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
    'Shelfie Support requested temporary edit access to “' || v_lib_name ||
      '”. Share this one-time code with support only if you approve: ' || v_code,
    jsonb_build_object(
      'libraryId', p_library_id,
      'code', v_code,
      'accessCodeId', v_id,
      'expiresAt', (now() + interval '24 hours')
    )
  );

  INSERT INTO public.admin_audit_log (actor_id, action, target_library_id, detail)
  VALUES (v_uid, 'library_access_code_requested', p_library_id, v_code);

  RETURN jsonb_build_object(
    'id', v_id,
    'code', v_code,
    'libraryId', p_library_id,
    'ownerUserId', v_owner,
    'expiresAt', (now() + interval '24 hours')
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.request_library_access_code(uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.redeem_library_access_code(p_code text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_row public.library_access_codes%ROWTYPE;
  v_session uuid;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  IF NOT public.is_staff() THEN RAISE EXCEPTION 'Not allowed'; END IF;

  SELECT * INTO v_row
  FROM public.library_access_codes
  WHERE code = upper(trim(p_code))
    AND status IN ('pending', 'sent')
    AND expires_at > now()
  ORDER BY created_at DESC
  LIMIT 1;

  IF v_row.id IS NULL THEN RAISE EXCEPTION 'Invalid or expired access code'; END IF;

  UPDATE public.library_access_codes
  SET status = 'used', used_at = now(), granted_to_staff_id = v_uid
  WHERE id = v_row.id;

  INSERT INTO public.library_admin_sessions (library_id, staff_user_id, access_code_id, expires_at)
  VALUES (v_row.library_id, v_uid, v_row.id, now() + interval '4 hours')
  RETURNING id INTO v_session;

  INSERT INTO public.admin_audit_log (actor_id, action, target_library_id, detail)
  VALUES (v_uid, 'library_access_code_redeemed', v_row.library_id, p_code);

  RETURN jsonb_build_object(
    'sessionId', v_session,
    'libraryId', v_row.library_id,
    'expiresAt', (now() + interval '4 hours')
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.redeem_library_access_code(text) TO authenticated;

CREATE OR REPLACE FUNCTION public.staff_has_library_edit_access(p_library_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.is_staff() AND EXISTS (
    SELECT 1 FROM public.library_admin_sessions s
    WHERE s.library_id = p_library_id
      AND s.staff_user_id = auth.uid()
      AND s.expires_at > now()
  );
$$;

GRANT EXECUTE ON FUNCTION public.staff_has_library_edit_access(uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.admin_set_user_tier(
  p_user_id uuid,
  p_tier text,
  p_book_override int DEFAULT NULL,
  p_scan_override int DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.is_staff() THEN RAISE EXCEPTION 'Not allowed'; END IF;
  IF p_tier NOT IN ('free', 'pro', 'pro_plus', 'premium', 'enterprise') THEN
    RAISE EXCEPTION 'Invalid tier';
  END IF;

  UPDATE public.user_profiles
  SET
    subscription_tier = p_tier,
    pro_enabled = p_tier <> 'free',
    nitro_enabled = p_tier <> 'free',
    book_limit_override = p_book_override,
    shelf_scan_limit_override = p_scan_override,
    updated_at = now()
  WHERE user_id = p_user_id;

  INSERT INTO public.admin_audit_log (actor_id, action, target_user_id, detail)
  VALUES (auth.uid(), 'set_tier', p_user_id, p_tier);
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_set_user_tier(uuid, text, int, int) TO authenticated;

CREATE OR REPLACE FUNCTION public.admin_ban_user(p_user_id uuid, p_reason text DEFAULT NULL)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.is_staff() THEN RAISE EXCEPTION 'Not allowed'; END IF;
  IF p_user_id = auth.uid() THEN RAISE EXCEPTION 'Cannot ban yourself'; END IF;

  INSERT INTO public.platform_bans (user_id, reason, banned_by)
  VALUES (p_user_id, nullif(trim(coalesce(p_reason, '')), ''), auth.uid())
  ON CONFLICT (user_id) DO UPDATE
    SET reason = EXCLUDED.reason, banned_by = EXCLUDED.banned_by, created_at = now();

  UPDATE public.user_profiles
  SET banned_at = now(), ban_reason = nullif(trim(coalesce(p_reason, '')), ''), updated_at = now()
  WHERE user_id = p_user_id;

  INSERT INTO public.admin_audit_log (actor_id, action, target_user_id, detail)
  VALUES (auth.uid(), 'ban_user', p_user_id, p_reason);
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_ban_user(uuid, text) TO authenticated;

CREATE OR REPLACE FUNCTION public.admin_unban_user(p_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.is_staff() THEN RAISE EXCEPTION 'Not allowed'; END IF;

  DELETE FROM public.platform_bans WHERE user_id = p_user_id;

  UPDATE public.user_profiles
  SET banned_at = NULL, ban_reason = NULL, updated_at = now()
  WHERE user_id = p_user_id;

  INSERT INTO public.admin_audit_log (actor_id, action, target_user_id, detail)
  VALUES (auth.uid(), 'unban_user', p_user_id, NULL);
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_unban_user(uuid) TO authenticated;
