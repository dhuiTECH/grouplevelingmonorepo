-- Nerf global gate XP/coin rewards (0.5x). Tunable follow-up in seed_dungeons tier formula.
-- Keeps at least 1 XP when original > 0.

UPDATE public.global_dungeons
SET
  xp_reward = GREATEST(1, ROUND(xp_reward * 0.5)::integer),
  coin_reward = GREATEST(0, ROUND(coin_reward * 0.5)::integer)
WHERE xp_reward IS NOT NULL OR coin_reward IS NOT NULL;
