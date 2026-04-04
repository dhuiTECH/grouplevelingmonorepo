-- Free roam / scouting runs (no preset gate)

CREATE TABLE IF NOT EXISTS public.free_hunts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users (id) ON DELETE SET NULL,
  distance_meters double precision NOT NULL CHECK (distance_meters >= 0),
  xp_earned integer NOT NULL CHECK (xp_earned >= 0),
  path_line geometry(LineString, 4326) NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT free_hunts_path_line_valid CHECK (
    ST_IsValid(path_line)
    AND ST_SRID(path_line) = 4326
  )
);

CREATE INDEX IF NOT EXISTS free_hunts_path_line_gix ON public.free_hunts USING gist (path_line);
CREATE INDEX IF NOT EXISTS free_hunts_user_id_idx ON public.free_hunts (user_id);
CREATE INDEX IF NOT EXISTS free_hunts_created_at_idx ON public.free_hunts (created_at DESC);

ALTER TABLE public.free_hunts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can insert own free_hunts"
  ON public.free_hunts
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id IS NULL OR user_id = auth.uid());

CREATE POLICY "Users can read own free_hunts"
  ON public.free_hunts
  FOR SELECT
  TO authenticated
  USING (user_id IS NULL OR user_id = auth.uid());

CREATE OR REPLACE FUNCTION public.insert_free_hunt(
  p_distance_meters double precision,
  p_xp_earned integer,
  p_path_wkt text,
  p_user_id uuid DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  new_id uuid;
BEGIN
  IF p_path_wkt IS NULL OR length(trim(p_path_wkt)) < 10 THEN
    RAISE EXCEPTION 'invalid path';
  END IF;

  INSERT INTO public.free_hunts (user_id, distance_meters, xp_earned, path_line)
  VALUES (
    p_user_id,
    p_distance_meters,
    p_xp_earned,
    ST_GeomFromText(p_path_wkt, 4326)
  )
  RETURNING id INTO new_id;

  RETURN new_id;
END;
$$;

REVOKE ALL ON FUNCTION public.insert_free_hunt(double precision, integer, text, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.insert_free_hunt(double precision, integer, text, uuid) TO authenticated;

COMMENT ON TABLE public.free_hunts IS 'Ad-hoc GPS paths (free roam / scouting); path_line is WGS84 LineString.';
COMMENT ON FUNCTION public.insert_free_hunt(double precision, integer, text, uuid) IS
  'Inserts a free_hunt row from OGC WKT LINESTRING (lon lat per vertex).';
