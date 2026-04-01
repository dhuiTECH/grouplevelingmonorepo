-- Elevation + time-to-target for dungeon run leaderboard (higher score = better rank)

ALTER TABLE public.dungeon_runs
  ADD COLUMN IF NOT EXISTS elevation_gain_meters integer NOT NULL DEFAULT 0;

ALTER TABLE public.dungeon_runs
  ADD COLUMN IF NOT EXISTS time_to_target_seconds integer;

COMMENT ON COLUMN public.dungeon_runs.elevation_gain_meters IS 'Cumulative GPS elevation gain (m) during the run.';
COMMENT ON COLUMN public.dungeon_runs.time_to_target_seconds IS 'Elapsed seconds when distance first reached target (e.g. 5km), same threshold as completion (99% of target).';

UPDATE public.dungeon_runs
SET time_to_target_seconds = duration_seconds
WHERE completed = true AND time_to_target_seconds IS NULL;

DROP VIEW IF EXISTS public.best_dungeon_times;

CREATE VIEW public.best_dungeon_times AS
WITH scored AS (
  SELECT
    r.id AS run_id,
    r.user_id,
    r.dungeon_id,
    r.duration_seconds,
    COALESCE(r.elevation_gain_meters, 0) AS elevation_gain_meters,
    COALESCE(r.time_to_target_seconds, r.duration_seconds) AS effective_time_seconds,
    (
      COALESCE(r.elevation_gain_meters, 0)::numeric * 10
      + (100000.0 / GREATEST(COALESCE(r.time_to_target_seconds, r.duration_seconds), 1)::numeric)
    ) AS leaderboard_score
  FROM public.dungeon_runs r
  WHERE r.completed = true
),
best AS (
  SELECT DISTINCT ON (user_id, dungeon_id)
    run_id,
    user_id,
    dungeon_id,
    duration_seconds,
    elevation_gain_meters,
    effective_time_seconds,
    leaderboard_score
  FROM scored
  ORDER BY user_id, dungeon_id, leaderboard_score DESC
),
attempts_agg AS (
  SELECT user_id, dungeon_id, count(*)::bigint AS attempts
  FROM public.dungeon_runs
  WHERE completed = true
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
  d.name AS dungeon_name,
  d.tier AS dungeon_tier,
  b.effective_time_seconds::integer AS best_time_seconds,
  b.leaderboard_score,
  b.elevation_gain_meters AS best_elevation_gain_meters,
  COALESCE(a.attempts, 0::bigint) AS attempts
FROM best b
JOIN public.profiles p ON p.id = b.user_id
JOIN public.dungeons d ON d.id = b.dungeon_id
LEFT JOIN attempts_agg a ON a.user_id = b.user_id AND a.dungeon_id = b.dungeon_id;
