-- Track when tickets close; purge closed tickets after 24 hours.

ALTER TABLE public.tickets
  ADD COLUMN IF NOT EXISTS closed_at timestamptz;

UPDATE public.tickets
SET closed_at = coalesce(closed_at, created_at)
WHERE status = 'closed'
  AND closed_at IS NULL;

CREATE OR REPLACE FUNCTION public.tickets_set_closed_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.status = 'closed' AND (TG_OP = 'INSERT' OR OLD.status IS DISTINCT FROM 'closed') THEN
    NEW.closed_at := coalesce(NEW.closed_at, now());
  ELSIF NEW.status IS DISTINCT FROM 'closed' THEN
    NEW.closed_at := NULL;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS tickets_set_closed_at ON public.tickets;
CREATE TRIGGER tickets_set_closed_at
  BEFORE INSERT OR UPDATE OF status ON public.tickets
  FOR EACH ROW
  EXECUTE FUNCTION public.tickets_set_closed_at();

-- Deletes closed tickets (and their messages) older than 24 hours.
CREATE OR REPLACE FUNCTION public.purge_expired_closed_tickets()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  deleted_count integer := 0;
BEGIN
  DELETE FROM public.ticket_messages
  WHERE ticket_id IN (
    SELECT id
    FROM public.tickets
    WHERE status = 'closed'
      AND coalesce(closed_at, created_at) < now() - interval '24 hours'
  );

  WITH gone AS (
    DELETE FROM public.tickets
    WHERE status = 'closed'
      AND coalesce(closed_at, created_at) < now() - interval '24 hours'
    RETURNING id
  )
  SELECT count(*)::integer INTO deleted_count FROM gone;

  RETURN deleted_count;
END;
$$;

GRANT EXECUTE ON FUNCTION public.purge_expired_closed_tickets() TO authenticated;
GRANT EXECUTE ON FUNCTION public.purge_expired_closed_tickets() TO anon;
GRANT EXECUTE ON FUNCTION public.purge_expired_closed_tickets() TO service_role;
