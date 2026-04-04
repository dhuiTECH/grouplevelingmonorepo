-- Nearest-gate match for in-app uploads + finish_imported_run for Health/Fit imports with session dedupe.

-- ---------------------------------------------------------------------------
-- In-app matching: prefer geographically nearest official route among bbox candidates.
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
    ORDER BY ST_Distance(
      ST_StartPoint(user_line)::geography,
      ST_StartPoint(gd.path_line)::geography
    ) ASC
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
  'Decodes polyline; orders candidate gates by distance from user path start to official path start; first with >=90%% coverage in 20m buffer wins; stores recorded_runs.';

-- ---------------------------------------------------------------------------
-- Imported workouts: dedupe vs existing in-app sessions, then gate match or free_hunt only.
-- Free-roam XP: floor(distance_m / 25) — keep in sync with apps/mobile/src/lib/runRewards.ts
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.finish_imported_run(
  p_encoded_polyline text,
  p_total_time_seconds integer,
  p_workout_start timestamptz
)
RETURNS jsonb
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
  dedupe_slack_sec constant integer := 120;
  meters_per_xp constant double precision := 25.0;
  session_end timestamptz;
  has_dup boolean;
  dist_double double precision;
  xp_val integer;
  new_free_id uuid;
BEGIN
  IF uid IS NULL THEN
    RAISE EXCEPTION 'not authenticated';
  END IF;

  IF p_total_time_seconds IS NULL OR p_total_time_seconds < 0 THEN
    RAISE EXCEPTION 'invalid total_time_seconds';
  END IF;

  IF p_workout_start IS NULL THEN
    RAISE EXCEPTION 'p_workout_start required';
  END IF;

  session_end := p_workout_start
    + make_interval(secs => GREATEST(p_total_time_seconds, 0))
    + make_interval(secs => dedupe_slack_sec);

  SELECT EXISTS (
    SELECT 1
    FROM public.recorded_runs r
    WHERE r.user_id = uid
      AND r.created_at >= p_workout_start
      AND r.created_at <= session_end
    UNION ALL
    SELECT 1
    FROM public.free_hunts f
    WHERE f.user_id = uid
      AND f.created_at >= p_workout_start
      AND f.created_at <= session_end
  ) INTO has_dup;

  IF has_dup THEN
    RETURN jsonb_build_object(
      'ok', false,
      'reason', 'duplicate_time_window'
    );
  END IF;

  user_line := public.decode_polyline(p_encoded_polyline);

  IF user_line IS NULL OR ST_NPoints(user_line) < 2 THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'invalid_polyline');
  END IF;

  user_len := ST_Length(user_line::geography);

  IF user_len IS NULL OR user_len <= 0 THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'invalid_polyline');
  END IF;

  dist_m := GREATEST(1, ROUND(user_len)::integer);
  dist_double := user_len;

  matched_id := NULL;

  FOR g IN
    SELECT gd.*
    FROM public.global_dungeons gd
    WHERE gd.path_line && ST_Envelope(user_line)
    ORDER BY ST_Distance(
      ST_StartPoint(user_line)::geography,
      ST_StartPoint(gd.path_line)::geography
    ) ASC
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

  IF matched_id IS NOT NULL THEN
    INSERT INTO public.recorded_runs (user_id, dungeon_id, encoded_polyline, total_time_seconds, distance_meters)
    VALUES (uid, matched_id, p_encoded_polyline, p_total_time_seconds, dist_m);

    RETURN jsonb_build_object(
      'ok', true,
      'kind', 'gate',
      'dungeon_id', matched_id,
      'distance_meters', dist_m
    );
  END IF;

  xp_val := GREATEST(0, FLOOR(dist_double / meters_per_xp)::integer);

  INSERT INTO public.free_hunts (user_id, distance_meters, xp_earned, path_line)
  VALUES (uid, dist_double, xp_val, ST_SetSRID(user_line, 4326))
  RETURNING id INTO new_free_id;

  RETURN jsonb_build_object(
    'ok', true,
    'kind', 'free',
    'free_hunt_id', new_free_id,
    'distance_meters', dist_double,
    'xp_earned', xp_val
  );
END;
$$;

REVOKE ALL ON FUNCTION public.finish_imported_run(text, integer, timestamptz) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.finish_imported_run(text, integer, timestamptz) TO authenticated;

COMMENT ON FUNCTION public.finish_imported_run(text, integer, timestamptz) IS
  'Import path: dedupe if recorded_runs/free_hunts created_at in [workout_start, workout_start+total_time+120s]; else match nearest gate or insert free_hunt (XP = floor(m/25)).';
