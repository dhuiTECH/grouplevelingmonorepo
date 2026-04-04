-- Pace-based global leaderboard: rank by min/km so 10 km and 1.8 km runs compare fairly.
-- Also persist GPS path length on each recorded run.

ALTER TABLE public.recorded_runs
  ADD COLUMN IF NOT EXISTS distance_meters integer;

UPDATE public.recorded_runs r
SET distance_meters = GREATEST(
  1,
  ROUND(ST_Length(public.decode_polyline(r.encoded_polyline)::geography))::integer
)
WHERE r.distance_meters IS NULL
  AND public.decode_polyline(r.encoded_polyline) IS NOT NULL
  AND ST_NPoints(public.decode_polyline(r.encoded_polyline)) >= 2;

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
  dist_m integer;
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
    INSERT INTO public.recorded_runs (user_id, dungeon_id, encoded_polyline, total_time_seconds, distance_meters)
    VALUES (uid, NULL, encoded_polyline, total_time_seconds, NULL);
    RETURN NULL;
  END IF;

  user_len := ST_Length(user_line::geography);

  IF user_len IS NULL OR user_len <= 0 THEN
    INSERT INTO public.recorded_runs (user_id, dungeon_id, encoded_polyline, total_time_seconds, distance_meters)
    VALUES (uid, NULL, encoded_polyline, total_time_seconds, NULL);
    RETURN NULL;
  END IF;

  dist_m := GREATEST(1, ROUND(user_len)::integer);

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

  INSERT INTO public.recorded_runs (user_id, dungeon_id, encoded_polyline, total_time_seconds, distance_meters)
  VALUES (uid, matched_id, encoded_polyline, total_time_seconds, dist_m);

  RETURN matched_id;
END;
$$;

COMMENT ON FUNCTION public.match_run_to_dungeon(text, integer) IS
  'Decodes polyline, matches first global_dungeon with >=90%% of user path length inside 20m buffer; stores distance_meters; inserts recorded_runs; returns matched dungeon id or NULL.';

DROP VIEW IF EXISTS public.best_global_dungeon_times;

CREATE VIEW public.best_global_dungeon_times AS
WITH runs AS (
  SELECT
    r.id,
    r.user_id,
    r.dungeon_id,
    r.encoded_polyline,
    r.total_time_seconds,
    r.created_at,
    COALESCE(
      NULLIF(r.distance_meters, 0),
      NULLIF(
        ROUND(ST_Length(public.decode_polyline(r.encoded_polyline)::geography))::integer,
        0
      )
    ) AS effective_distance_m
  FROM public.recorded_runs r
  WHERE r.dungeon_id IS NOT NULL
),
runs_with_pace AS (
  SELECT
    runs.id,
    runs.user_id,
    runs.dungeon_id,
    runs.total_time_seconds,
    runs.created_at,
    runs.effective_distance_m,
    CASE
      WHEN runs.effective_distance_m IS NOT NULL
        AND runs.effective_distance_m >= 100
      THEN runs.total_time_seconds::numeric / (runs.effective_distance_m::numeric / 1000.0)
      ELSE NULL
    END AS pace_sec_per_km
  FROM runs
  WHERE runs.effective_distance_m IS NOT NULL
    AND runs.effective_distance_m > 0
),
best AS (
  SELECT DISTINCT ON (rwp.user_id, rwp.dungeon_id)
    rwp.id AS run_id,
    rwp.user_id,
    rwp.dungeon_id,
    rwp.total_time_seconds AS best_time_seconds,
    rwp.effective_distance_m AS best_distance_meters,
    rwp.pace_sec_per_km AS best_pace_seconds_per_km,
    (100000.0 / GREATEST(rwp.pace_sec_per_km::numeric, 0.001)) AS leaderboard_score
  FROM runs_with_pace rwp
  WHERE rwp.pace_sec_per_km IS NOT NULL
  ORDER BY rwp.user_id, rwp.dungeon_id, rwp.pace_sec_per_km ASC, rwp.created_at ASC
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
  b.best_distance_meters::integer AS best_distance_meters,
  b.best_pace_seconds_per_km,
  b.leaderboard_score,
  0::integer AS best_elevation_gain_meters,
  COALESCE(a.attempts, 0::bigint) AS attempts
FROM best b
JOIN public.profiles p ON p.id = b.user_id
JOIN public.global_dungeons g ON g.id = b.dungeon_id
LEFT JOIN attempts_agg a ON a.user_id = b.user_id AND a.dungeon_id = b.dungeon_id;

GRANT SELECT ON public.best_global_dungeon_times TO authenticated;

COMMENT ON VIEW public.best_global_dungeon_times IS
  'Best pace (min/km) per user per global dungeon; leaderboard_score = 100000 / pace_sec_per_km (higher = faster). Min path length 100m.';
