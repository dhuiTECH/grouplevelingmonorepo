-- Global loot nerf + treat gems as premium: lower payouts and much lower chance to roll gem rows.

-- ---------------------------------------------------------------------------
-- 1) Nerf currency amounts (~50% exp/coins; halve gem counts, min 1 if any gems)
-- ---------------------------------------------------------------------------
UPDATE public.loot_pool_entries
SET
  exp_delta = CASE
    WHEN exp_delta IS NOT NULL AND exp_delta <> 0
    THEN GREATEST(1, (exp_delta * 0.5)::bigint)
    ELSE exp_delta
  END,
  coins_delta = CASE
    WHEN coins_delta IS NOT NULL AND coins_delta <> 0
    THEN GREATEST(1, (coins_delta * 0.5)::bigint)
    ELSE coins_delta
  END,
  gems_delta = CASE
    WHEN COALESCE(gems_delta, 0) > 0
    THEN GREATEST(1, (gems_delta * 0.5)::integer)
    ELSE gems_delta
  END
WHERE id IN (
  'b0000001-0000-4000-8000-000000000001',
  'b0000002-0000-4000-8000-000000000001',
  'b0000003-0000-4000-8000-000000000001',
  'b0000004-0000-4000-8000-000000000001',
  'b0000005-0000-4000-8000-000000000001',
  'd0000001-0000-4000-8000-000000000001',
  'd0000002-0000-4000-8000-000000000001',
  'd0000003-0000-4000-8000-000000000001',
  'd0000004-0000-4000-8000-000000000001',
  'd0000005-0000-4000-8000-000000000001',
  'd0000006-0000-4000-8000-000000000001',
  'd0000007-0000-4000-8000-000000000001',
  'd0000008-0000-4000-8000-000000000001',
  'd0000009-0000-4000-8000-000000000001',
  'd000000a-0000-4000-8000-000000000001',
  'd000000b-0000-4000-8000-000000000001',
  'd000000c-0000-4000-8000-000000000001',
  'd000000d-0000-4000-8000-000000000001',
  'd000000e-0000-4000-8000-000000000001',
  'd000000f-0000-4000-8000-000000000001',
  'd0000010-0000-4000-8000-000000000001',
  'd0000011-0000-4000-8000-000000000001',
  'd0000012-0000-4000-8000-000000000001',
  'd0000013-0000-4000-8000-000000000001',
  'd0000014-0000-4000-8000-000000000001',
  'd0000015-0000-4000-8000-000000000001',
  'd0000016-0000-4000-8000-000000000001',
  'd0000017-0000-4000-8000-000000000001',
  'd0000018-0000-4000-8000-000000000001',
  'd0000019-0000-4000-8000-000000000001',
  'd000001a-0000-4000-8000-000000000001',
  'd000001b-0000-4000-8000-000000000001'
);

-- ---------------------------------------------------------------------------
-- 2) Large chest: only ONE gem row (was two); move currency-only to row 2
-- ---------------------------------------------------------------------------
UPDATE public.loot_pool_entries
SET gems_delta = 0
WHERE id = 'd000000b-0000-4000-8000-000000000001';

UPDATE public.loot_pool_entries
SET gems_delta = 1
WHERE id = 'd000000c-0000-4000-8000-000000000001';

-- ---------------------------------------------------------------------------
-- 3) Battle tier 5: single gem row (bottom only)
-- ---------------------------------------------------------------------------
UPDATE public.loot_pool_entries
SET gems_delta = 0
WHERE id = 'd000001a-0000-4000-8000-000000000001';

UPDATE public.loot_pool_entries
SET gems_delta = 1
WHERE id = 'd000001b-0000-4000-8000-000000000001';

-- ---------------------------------------------------------------------------
-- 4) Weights: gem rows ~8% implied; currency rows split the rest (46+46+8)
--    Pools with no gems: keep variety 42/38/20 (slightly favor common rolls)
-- ---------------------------------------------------------------------------

-- Default legacy pool (b0000001-3): one gem row
UPDATE public.loot_pool_entries SET weight = 46, sort_order = 1 WHERE id = 'b0000001-0000-4000-8000-000000000001';
UPDATE public.loot_pool_entries SET weight = 46, sort_order = 2 WHERE id = 'b0000002-0000-4000-8000-000000000001';
UPDATE public.loot_pool_entries SET weight = 8, sort_order = 3 WHERE id = 'b0000003-0000-4000-8000-000000000001';

-- Default battle pool: no gems
UPDATE public.loot_pool_entries SET weight = 42, sort_order = 1 WHERE id = 'b0000004-0000-4000-8000-000000000001';
UPDATE public.loot_pool_entries SET weight = 38, sort_order = 2 WHERE id = 'b0000005-0000-4000-8000-000000000001';

-- Chest small / silver: no gems
UPDATE public.loot_pool_entries SET weight = 42 WHERE id = 'd0000001-0000-4000-8000-000000000001';
UPDATE public.loot_pool_entries SET weight = 38 WHERE id = 'd0000002-0000-4000-8000-000000000001';
UPDATE public.loot_pool_entries SET weight = 20 WHERE id = 'd0000003-0000-4000-8000-000000000001';
UPDATE public.loot_pool_entries SET weight = 42 WHERE id = 'd0000004-0000-4000-8000-000000000001';
UPDATE public.loot_pool_entries SET weight = 38 WHERE id = 'd0000005-0000-4000-8000-000000000001';
UPDATE public.loot_pool_entries SET weight = 20 WHERE id = 'd0000006-0000-4000-8000-000000000001';

-- Chest medium: one gem row (d9)
UPDATE public.loot_pool_entries SET weight = 46 WHERE id = 'd0000007-0000-4000-8000-000000000001';
UPDATE public.loot_pool_entries SET weight = 46 WHERE id = 'd0000008-0000-4000-8000-000000000001';
UPDATE public.loot_pool_entries SET weight = 8 WHERE id = 'd0000009-0000-4000-8000-000000000001';

-- Chest large: gem only on d000000c
UPDATE public.loot_pool_entries SET weight = 46 WHERE id = 'd000000a-0000-4000-8000-000000000001';
UPDATE public.loot_pool_entries SET weight = 46 WHERE id = 'd000000b-0000-4000-8000-000000000001';
UPDATE public.loot_pool_entries SET weight = 8 WHERE id = 'd000000c-0000-4000-8000-000000000001';

-- Battle tiers 1–3: no gems
UPDATE public.loot_pool_entries SET weight = 42 WHERE id IN (
  'd000000d-0000-4000-8000-000000000001',
  'd0000010-0000-4000-8000-000000000001',
  'd0000013-0000-4000-8000-000000000001'
);
UPDATE public.loot_pool_entries SET weight = 38 WHERE id IN (
  'd000000e-0000-4000-8000-000000000001',
  'd0000011-0000-4000-8000-000000000001',
  'd0000014-0000-4000-8000-000000000001'
);
UPDATE public.loot_pool_entries SET weight = 20 WHERE id IN (
  'd000000f-0000-4000-8000-000000000001',
  'd0000012-0000-4000-8000-000000000001',
  'd0000015-0000-4000-8000-000000000001'
);

-- Battle tier 4: one gem row (d18)
UPDATE public.loot_pool_entries SET weight = 46 WHERE id = 'd0000016-0000-4000-8000-000000000001';
UPDATE public.loot_pool_entries SET weight = 46 WHERE id = 'd0000017-0000-4000-8000-000000000001';
UPDATE public.loot_pool_entries SET weight = 8 WHERE id = 'd0000018-0000-4000-8000-000000000001';

-- Battle tier 5: gem only on d1b
UPDATE public.loot_pool_entries SET weight = 46 WHERE id = 'd0000019-0000-4000-8000-000000000001';
UPDATE public.loot_pool_entries SET weight = 46 WHERE id = 'd000001a-0000-4000-8000-000000000001';
UPDATE public.loot_pool_entries SET weight = 8 WHERE id = 'd000001b-0000-4000-8000-000000000001';
