-- Global route catalog + recorded runs with PostGIS matching (90% length-in-buffer rule)
-- Run in Supabase SQL Editor or via supabase db push.

CREATE EXTENSION IF NOT EXISTS postgis WITH SCHEMA extensions;

-- ---------------------------------------------------------------------------
-- Google-encoded polyline -> LineString (EPSG:4326)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.decode_polyline(encoded text)
RETURNS geometry(LineString, 4326)
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
  i int := 1;
  len int;
  lat bigint := 0;
  lng bigint := 0;
  result int;
  shift int;
  b int;
  dlat bigint;
  dlng bigint;
  pts geometry[] := ARRAY[]::geometry[];
  lon float8;
  latf float8;
BEGIN
  IF encoded IS NULL OR length(trim(encoded)) = 0 THEN
    RETURN NULL;
  END IF;

  len := length(encoded);

  WHILE i <= len LOOP
    result := 0;
    shift := 0;
    LOOP
      b := ascii(substr(encoded, i, 1)) - 63;
      i := i + 1;
      result := result | ((b & 31) << shift);
      shift := shift + 5;
      EXIT WHEN b < 32;
    END LOOP;

    -- Signed delta: (result & 1) ? ~(result >> 1) : (result >> 1)
    dlat := CASE WHEN (result & 1) = 1 THEN -((result >> 1) + 1) ELSE (result >> 1) END;
    lat := lat + dlat;

    result := 0;
    shift := 0;
    LOOP
      b := ascii(substr(encoded, i, 1)) - 63;
      i := i + 1;
      result := result | ((b & 31) << shift);
      shift := shift + 5;
      EXIT WHEN b < 32;
    END LOOP;

    dlng := CASE WHEN (result & 1) = 1 THEN -((result >> 1) + 1) ELSE (result >> 1) END;
    lng := lng + dlng;

    lon := lng::float8 / 100000.0;
    latf := lat::float8 / 100000.0;
    pts := array_append(pts, ST_SetSRID(ST_MakePoint(lon, latf), 4326));
  END LOOP;

  IF coalesce(array_length(pts, 1), 0) < 2 THEN
    RETURN NULL;
  END IF;

  RETURN ST_MakeLine(pts)::geometry(LineString, 4326);
END;
$$;

-- ---------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.global_dungeons (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  distance_meters integer NOT NULL,
  tier text,
  xp_reward integer NOT NULL DEFAULT 0,
  coin_reward integer NOT NULL DEFAULT 0,
  image_url text,
  path_line geometry(LineString, 4326) NOT NULL,
  CONSTRAINT global_dungeons_path_line_valid CHECK (ST_IsValid(path_line) AND ST_SRID(path_line) = 4326)
);

CREATE INDEX IF NOT EXISTS global_dungeons_path_line_gix
  ON public.global_dungeons USING gist (path_line);

CREATE TABLE IF NOT EXISTS public.recorded_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  dungeon_id uuid REFERENCES public.global_dungeons (id) ON DELETE SET NULL,
  encoded_polyline text NOT NULL,
  total_time_seconds integer NOT NULL CHECK (total_time_seconds >= 0),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS recorded_runs_user_created_idx
  ON public.recorded_runs (user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS recorded_runs_dungeon_time_idx
  ON public.recorded_runs (dungeon_id, total_time_seconds);

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------
ALTER TABLE public.global_dungeons ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.recorded_runs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "global_dungeons_select_authenticated" ON public.global_dungeons;
CREATE POLICY "global_dungeons_select_authenticated"
  ON public.global_dungeons FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "recorded_runs_select_leaderboard" ON public.recorded_runs;
CREATE POLICY "recorded_runs_select_leaderboard"
  ON public.recorded_runs FOR SELECT TO authenticated USING (true);

-- Inserts only via SECURITY DEFINER RPC (no direct INSERT policy for authenticated)

-- ---------------------------------------------------------------------------
-- Match RPC: 90% of user path length must lie inside 20 m buffer of official route
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.match_run_to_dungeon(
  encoded_polyline text,
  total_time_seconds integer
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  uid uuid := auth.uid();
  user_line geometry;
  user_len double precision;
  g record;
  buf geometry;
  intersect_geom geometry;
  intersect_len double precision;
  cov double precision;
  matched_id uuid;
  match_min_coverage_ratio constant double precision := 0.90;
  buffer_meters constant double precision := 20;
BEGIN
  IF uid IS NULL THEN
    RAISE EXCEPTION 'not authenticated';
  END IF;

  IF total_time_seconds IS NULL OR total_time_seconds < 0 THEN
    RAISE EXCEPTION 'invalid total_time_seconds';
  END IF;

  user_line := public.decode_polyline(encoded_polyline);

  IF user_line IS NULL OR ST_NPoints(user_line) < 2 THEN
    INSERT INTO public.recorded_runs (user_id, dungeon_id, encoded_polyline, total_time_seconds)
    VALUES (uid, NULL, encoded_polyline, total_time_seconds);
    RETURN NULL;
  END IF;

  user_len := ST_Length(user_line::geography);

  IF user_len IS NULL OR user_len <= 0 THEN
    INSERT INTO public.recorded_runs (user_id, dungeon_id, encoded_polyline, total_time_seconds)
    VALUES (uid, NULL, encoded_polyline, total_time_seconds);
    RETURN NULL;
  END IF;

  matched_id := NULL;

  FOR g IN
    SELECT gd.*
    FROM public.global_dungeons gd
    WHERE gd.path_line && ST_Envelope(user_line)
    ORDER BY gd.id
  LOOP
    buf := ST_Buffer(g.path_line::geography, buffer_meters)::geometry;
    intersect_geom := ST_Intersection(user_line, buf);

    IF intersect_geom IS NULL OR ST_IsEmpty(intersect_geom) THEN
      CONTINUE;
    END IF;

    intersect_len := ST_Length(intersect_geom::geography);
    cov := intersect_len / user_len;

    IF cov >= match_min_coverage_ratio THEN
      matched_id := g.id;
      EXIT;
    END IF;
  END LOOP;

  INSERT INTO public.recorded_runs (user_id, dungeon_id, encoded_polyline, total_time_seconds)
  VALUES (uid, matched_id, encoded_polyline, total_time_seconds);

  RETURN matched_id;
END;
$$;

REVOKE ALL ON FUNCTION public.match_run_to_dungeon(text, integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.match_run_to_dungeon(text, integer) TO authenticated;

REVOKE ALL ON FUNCTION public.decode_polyline(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.decode_polyline(text) TO authenticated;

-- ---------------------------------------------------------------------------
-- Leaderboard view (Strava-style: lower time = better; score for sort compatibility)
-- ---------------------------------------------------------------------------
DROP VIEW IF EXISTS public.best_global_dungeon_times;

CREATE VIEW public.best_global_dungeon_times AS
WITH best AS (
  SELECT DISTINCT ON (r.user_id, r.dungeon_id)
    r.id AS run_id,
    r.user_id,
    r.dungeon_id,
    r.total_time_seconds AS best_time_seconds,
    (100000.0 / GREATEST(r.total_time_seconds::numeric, 1)) AS leaderboard_score
  FROM public.recorded_runs r
  WHERE r.dungeon_id IS NOT NULL
  ORDER BY r.user_id, r.dungeon_id, r.total_time_seconds ASC, r.created_at ASC
),
attempts_agg AS (
  SELECT user_id, dungeon_id, count(*)::bigint AS attempts
  FROM public.recorded_runs
  WHERE dungeon_id IS NOT NULL
  GROUP BY user_id, dungeon_id
)
SELECT
  (b.user_id::text || ':'::text) || b.dungeon_id AS id,
  b.user_id,
  p.hunter_name,
  p.avatar,
  p.level,
  p.current_title,
  p.base_body_silhouette_url,
  p.base_body_tint_hex,
  b.dungeon_id,
  g.name AS dungeon_name,
  g.tier AS dungeon_tier,
  b.best_time_seconds::integer AS best_time_seconds,
  b.leaderboard_score,
  0::integer AS best_elevation_gain_meters,
  COALESCE(a.attempts, 0::bigint) AS attempts
FROM best b
JOIN public.profiles p ON p.id = b.user_id
JOIN public.global_dungeons g ON g.id = b.dungeon_id
LEFT JOIN attempts_agg a ON a.user_id = b.user_id AND a.dungeon_id = b.dungeon_id;

GRANT SELECT ON public.best_global_dungeon_times TO authenticated;

COMMENT ON FUNCTION public.match_run_to_dungeon(text, integer) IS
  'Decodes polyline, matches first global_dungeon with >=90%% of user path length inside 20m buffer; inserts recorded_runs; returns matched dungeon id or NULL.';
