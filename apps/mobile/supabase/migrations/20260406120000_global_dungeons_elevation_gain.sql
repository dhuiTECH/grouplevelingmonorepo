-- Store total ascent along the official route for tiering / UI
ALTER TABLE public.global_dungeons
  ADD COLUMN IF NOT EXISTS elevation_gain_meters integer NOT NULL DEFAULT 0;

COMMENT ON COLUMN public.global_dungeons.elevation_gain_meters IS
  'Total positive vertical gain (m) along path_line, typically from DEM sampling.';

-- Expose elevation in nearby gate radar (return type changed — must drop first)
DROP FUNCTION IF EXISTS public.get_nearby_dungeons(double precision, double precision, double precision);

CREATE OR REPLACE FUNCTION public.get_nearby_dungeons(
  user_lat double precision,
  user_lon double precision,
  radius_meters double precision DEFAULT 10000
)
RETURNS TABLE (
  id uuid,
  name text,
  distance_meters integer,
  tier text,
  xp_reward integer,
  coin_reward integer,
  image_url text,
  entrance_lat double precision,
  entrance_lon double precision,
  distance_to_gate_meters double precision,
  elevation_gain_meters integer
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, extensions
AS $$
  SELECT
    g.id,
    g.name,
    g.distance_meters,
    g.tier,
    g.xp_reward,
    g.coin_reward,
    g.image_url,
    ST_Y(ST_StartPoint(g.path_line))::double precision AS entrance_lat,
    ST_X(ST_StartPoint(g.path_line))::double precision AS entrance_lon,
    ST_Distance(
      ST_SetSRID(ST_MakePoint(user_lon, user_lat), 4326)::geography,
      ST_StartPoint(g.path_line)::geography
    ) AS distance_to_gate_meters,
    g.elevation_gain_meters
  FROM public.global_dungeons g
  WHERE ST_DWithin(
    ST_SetSRID(ST_MakePoint(user_lon, user_lat), 4326)::geography,
    ST_StartPoint(g.path_line)::geography,
    radius_meters
  )
  ORDER BY distance_to_gate_meters ASC;
$$;

COMMENT ON FUNCTION public.get_nearby_dungeons(double precision, double precision, double precision) IS
  'Returns global_dungeons whose route start is within radius_meters of the user (WGS84 geodesic distance).';

REVOKE ALL ON FUNCTION public.get_nearby_dungeons(double precision, double precision, double precision) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_nearby_dungeons(double precision, double precision, double precision) TO authenticated;
