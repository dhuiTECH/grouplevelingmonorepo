-- Demo / seed row: Ben Dover on **Central Burnaby Gate** (not "Central Park — Burnaby").
-- Time: 1 hour (3600 s). Pace: 5:30/km → distance_m = round(3600 / 330 * 1000) = 10909.
-- Requires an existing profile with hunter_name matching 'Ben Dover' (case-insensitive).
-- Polyline is a short valid path near the park; leaderboard pace uses distance_meters.
--
-- If this inserts 0 rows: apply migration 20260411120000 or run pnpm seed:ben-dover-leaderboard

INSERT INTO public.recorded_runs (
  id,
  user_id,
  dungeon_id,
  encoded_polyline,
  total_time_seconds,
  distance_meters
)
SELECT
  'a0000000-0000-4000-8000-000000000b01'::uuid,
  p.id,
  g.id,
  '_zmkH~wxmVgEgE',
  3600,
  10909
FROM public.profiles p
CROSS JOIN public.global_dungeons g
WHERE p.hunter_name ILIKE 'Ben Dover'
  AND g.name ILIKE '%central%burnaby%gate%'
LIMIT 1
ON CONFLICT (id) DO UPDATE SET
  encoded_polyline = EXCLUDED.encoded_polyline,
  total_time_seconds = EXCLUDED.total_time_seconds,
  distance_meters = EXCLUDED.distance_meters,
  dungeon_id = EXCLUDED.dungeon_id,
  user_id = EXCLUDED.user_id;
