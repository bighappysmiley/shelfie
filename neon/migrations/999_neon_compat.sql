-- Neon Auth compatibility overrides for Supabase-shaped helpers

CREATE OR REPLACE FUNCTION public._assert_verification_for_join(
  p_verification_level text,
  p_via_invite boolean DEFAULT false,
  p_user_id uuid DEFAULT auth.uid()
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, neon_auth
AS $$
DECLARE
  v_email_verified boolean;
  v_created_at timestamptz;
BEGIN
  IF coalesce(p_verification_level, 'none') = 'none' THEN
    RETURN;
  END IF;

  IF p_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT u."emailVerified", u."createdAt"
    INTO v_email_verified, v_created_at
  FROM neon_auth."user" u
  WHERE u.id = p_user_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'User not found';
  END IF;

  IF p_verification_level = 'high' AND NOT p_via_invite THEN
    RAISE EXCEPTION 'This server requires an invite to join.';
  END IF;

  IF p_verification_level IN ('low', 'medium', 'high') THEN
    IF coalesce(v_email_verified, false) IS NOT TRUE THEN
      RAISE EXCEPTION 'Verify your email before joining this server.';
    END IF;
  END IF;

  IF p_verification_level IN ('medium', 'high') THEN
    IF coalesce(v_created_at, now()) > now() - interval '5 minutes' THEN
      RAISE EXCEPTION 'Your account must be at least 5 minutes old to join this server.';
    END IF;
  END IF;
END;
$$;

-- Ensure Data API roles can use public objects created by migrations
GRANT USAGE ON SCHEMA public TO anonymous, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO anonymous, authenticated;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO anonymous, authenticated;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO anonymous, authenticated;
GRANT SELECT ON neon_auth."user" TO anonymous, authenticated;
