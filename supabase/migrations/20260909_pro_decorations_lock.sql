-- Expand profile decoration options; lock Pro flags so users cannot self-grant.

ALTER TABLE public.user_profiles DROP CONSTRAINT IF EXISTS user_profiles_profile_ring_check;
ALTER TABLE public.user_profiles
  ADD CONSTRAINT user_profiles_profile_ring_check
  CHECK (
    profile_ring IS NULL
    OR profile_ring IN (
      'holo', 'sparkle', 'ember', 'frost', 'aurora', 'pulse', 'pro', 'nitro',
      'tide', 'mist', 'flare'
    )
  );

-- Users may choose a decoration, but cannot self-grant Pro / subscription.
-- Staff updates via admin_set_user_tier (SECURITY DEFINER + is_staff) and service_role pass.
CREATE OR REPLACE FUNCTION public.user_profiles_lock_pro_columns()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  -- Backend / elevated roles may set anything.
  IF coalesce(auth.role(), '') IN ('service_role', 'supabase_admin') THEN
    RETURN NEW;
  END IF;

  -- Staff (including SECURITY DEFINER admin RPCs that still carry the caller's JWT).
  IF public.is_staff() THEN
    RETURN NEW;
  END IF;

  IF TG_OP = 'UPDATE' THEN
    NEW.pro_enabled := OLD.pro_enabled;
    NEW.nitro_enabled := OLD.nitro_enabled;
    NEW.subscription_tier := OLD.subscription_tier;
    NEW.stripe_customer_id := OLD.stripe_customer_id;
    NEW.stripe_subscription_id := OLD.stripe_subscription_id;
    NEW.subscription_status := OLD.subscription_status;
    NEW.subscription_period_end := OLD.subscription_period_end;
  ELSIF TG_OP = 'INSERT' THEN
    NEW.pro_enabled := false;
    NEW.nitro_enabled := false;
    NEW.subscription_tier := 'free';
    NEW.stripe_customer_id := NULL;
    NEW.stripe_subscription_id := NULL;
    NEW.subscription_status := coalesce(NEW.subscription_status, 'none');
    NEW.subscription_period_end := NULL;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS user_profiles_lock_pro_columns ON public.user_profiles;
CREATE TRIGGER user_profiles_lock_pro_columns
  BEFORE INSERT OR UPDATE ON public.user_profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.user_profiles_lock_pro_columns();
