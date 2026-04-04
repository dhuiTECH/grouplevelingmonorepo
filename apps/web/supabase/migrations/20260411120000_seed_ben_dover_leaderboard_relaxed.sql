-- Relaxed match for Ben Dover @ **Central Burnaby Gate** (not "Central Park — Burnaby").
-- Still requires profiles.hunter_name ILIKE '%ben%dover%'. If 0 rows, use: pnpm seed:ben-dover-leaderboard

WITH one_gate AS (
  SELECT g.id
  FROM public.global_dungeons g
  WHERE g.name ILIKE '%central%burnaby%gate%'
  ORDER BY g.name
  LIMIT 1
)
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
  one_gate.id,
  '_zmkH~wxmVgEgE',
  3600,
  10909
FROM public.profiles p
CROSS JOIN one_gate
WHERE p.hunter_name ILIKE '%ben%dover%'
LIMIT 1
ON CONFLICT (id) DO UPDATE SET
  encoded_polyline = EXCLUDED.encoded_polyline,
  total_time_seconds = EXCLUDED.total_time_seconds,
  distance_meters = EXCLUDED.distance_meters,
  dungeon_id = EXCLUDED.dungeon_id,
  user_id = EXCLUDED.user_id;
