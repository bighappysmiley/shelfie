-- Track when members accept server rules during onboarding

ALTER TABLE public.community_server_members
  ADD COLUMN IF NOT EXISTS rules_accepted_at timestamptz;

CREATE OR REPLACE FUNCTION public.accept_community_server_rules(p_server_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  UPDATE public.community_server_members
  SET rules_accepted_at = now()
  WHERE server_id = p_server_id AND user_id = v_uid;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Not a member';
  END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION public.accept_community_server_rules(uuid) TO authenticated;
