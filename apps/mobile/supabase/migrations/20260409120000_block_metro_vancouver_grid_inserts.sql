-- Block synthetic "Metro Vancouver Grid — N" gates at the DB (stops rogue/old seeders).
-- Purge helper for seed script startup.

CREATE OR REPLACE FUNCTION public.purge_metro_vancouver_grid_gates()
RETURNS integer
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  WITH deleted AS (
    DELETE FROM public.global_dungeons
    WHERE starts_with(name, 'Metro Vancouver Grid')
    RETURNING 1
  )
  SELECT count(*)::int FROM deleted;
$$;

REVOKE ALL ON FUNCTION public.purge_metro_vancouver_grid_gates() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.purge_metro_vancouver_grid_gates() TO service_role;

CREATE OR REPLACE FUNCTION public.global_dungeons_reject_metro_grid_prefix()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF starts_with(NEW.name, 'Metro Vancouver Grid') THEN
    RAISE EXCEPTION 'Metro Vancouver grid gates are disabled. Use curated hotspots only.';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS global_dungeons_reject_metro_grid_prefix ON public.global_dungeons;
CREATE TRIGGER global_dungeons_reject_metro_grid_prefix
  BEFORE INSERT OR UPDATE OF name ON public.global_dungeons
  FOR EACH ROW
  EXECUTE FUNCTION public.global_dungeons_reject_metro_grid_prefix();

COMMENT ON FUNCTION public.purge_metro_vancouver_grid_gates() IS
  'Deletes rows whose name starts with Metro Vancouver Grid; run before seed-dungeons.';
