-- Normalized loot pools + single claim_loot RPC (cumulative weight, idempotency, quantity cap 999)
-- Already applied to production Supabase via MCP; this file is the repo source of truth.

-- ---------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.loot_pools (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.loot_pool_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  loot_pool_id uuid NOT NULL REFERENCES public.loot_pools(id) ON DELETE CASCADE,
  weight integer NOT NULL CHECK (weight > 0),
  sort_order integer NOT NULL DEFAULT 0,
  exp_delta bigint,
  coins_delta bigint,
  gems_delta integer,
  shop_item_id uuid REFERENCES public.shop_items(id) ON DELETE SET NULL,
  quantity integer NOT NULL DEFAULT 1 CHECK (quantity > 0),
  CONSTRAINT loot_pool_entries_reward_chk CHECK (
    COALESCE(exp_delta, 0) <> 0
    OR COALESCE(coins_delta, 0) <> 0
    OR COALESCE(gems_delta, 0) <> 0
    OR shop_item_id IS NOT NULL
  )
);

CREATE INDEX IF NOT EXISTS idx_loot_pool_entries_pool ON public.loot_pool_entries(loot_pool_id);

CREATE TABLE IF NOT EXISTS public.loot_source_map (
  source_type text NOT NULL CHECK (source_type IN ('battle', 'chest', 'npc')),
  source_id text NOT NULL,
  loot_pool_id uuid NOT NULL REFERENCES public.loot_pools(id) ON DELETE CASCADE,
  PRIMARY KEY (source_type, source_id)
);

CREATE TABLE IF NOT EXISTS public.loot_claims (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  idempotency_key text NOT NULL,
  source_type text NOT NULL,
  source_id text NOT NULL,
  result jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, idempotency_key)
);

CREATE INDEX IF NOT EXISTS idx_loot_claims_user ON public.loot_claims(user_id);

-- Analytics view
CREATE OR REPLACE VIEW public.v_loot_pool_analytics AS
SELECT
  e.id AS entry_id,
  e.loot_pool_id,
  p.name AS pool_name,
  e.weight,
  e.sort_order,
  e.exp_delta,
  e.coins_delta,
  e.gems_delta,
  e.shop_item_id,
  e.quantity,
  SUM(e.weight) OVER (PARTITION BY e.loot_pool_id) AS pool_total_weight,
  CASE
    WHEN SUM(e.weight) OVER (PARTITION BY e.loot_pool_id) > 0
    THEN e.weight::double precision / SUM(e.weight) OVER (PARTITION BY e.loot_pool_id)::double precision
    ELSE 0
  END AS implied_drop_rate
FROM public.loot_pool_entries e
JOIN public.loot_pools p ON p.id = e.loot_pool_id;

-- ---------------------------------------------------------------------------
-- Seeds
-- ---------------------------------------------------------------------------

INSERT INTO public.loot_pools (id, name, notes)
VALUES
  ('a0000001-0000-4000-8000-000000000001', 'Default Chest Pool', 'seed: weighted coins/exp'),
  ('a0000002-0000-4000-8000-000000000001', 'Default Battle Pool', 'seed: fallback when encounter has no map')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.loot_pool_entries (id, loot_pool_id, weight, sort_order, exp_delta, coins_delta, gems_delta, shop_item_id, quantity)
VALUES
  ('b0000001-0000-4000-8000-000000000001', 'a0000001-0000-4000-8000-000000000001', 40, 1, 50, 150, 0, NULL, 1),
  ('b0000002-0000-4000-8000-000000000001', 'a0000001-0000-4000-8000-000000000001', 35, 2, 75, 250, 0, NULL, 1),
  ('b0000003-0000-4000-8000-000000000001', 'a0000001-0000-4000-8000-000000000001', 25, 3, 120, 400, 1, NULL, 1),
  ('b0000004-0000-4000-8000-000000000001', 'a0000002-0000-4000-8000-000000000001', 50, 1, 400, 120, 0, NULL, 1),
  ('b0000005-0000-4000-8000-000000000001', 'a0000002-0000-4000-8000-000000000001', 50, 2, 450, 150, 0, NULL, 1)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.loot_source_map (source_type, source_id, loot_pool_id)
VALUES
  ('chest', 'small',   'a0000001-0000-4000-8000-000000000001'),
  ('chest', 'silver',  'a0000001-0000-4000-8000-000000000001'),
  ('chest', 'medium',  'a0000001-0000-4000-8000-000000000001'),
  ('chest', 'large',   'a0000001-0000-4000-8000-000000000001'),
  ('battle', 'default', 'a0000002-0000-4000-8000-000000000001')
ON CONFLICT (source_type, source_id) DO NOTHING;

-- ---------------------------------------------------------------------------
-- claim_loot RPC
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.claim_loot(
  p_source_type text,
  p_source_id text,
  p_idempotency_key text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $func$
DECLARE
  uid uuid := auth.uid();
  v_pool_id uuid;
  v_total bigint;
  v_pick numeric;
  v_cum bigint := 0;
  v_row public.loot_pool_entries%ROWTYPE;
  v_found boolean := false;
  v_existing jsonb;
  v_exp bigint;
  v_coins bigint;
  v_gems integer;
  v_uc_id uuid;
  v_uc_qty integer;
  v_new_qty integer;
  v_item_qty integer;
  v_result_items jsonb := '[]'::jsonb;
  v_item jsonb;
  v_out jsonb;
BEGIN
  IF uid IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'not_authenticated');
  END IF;

  IF p_idempotency_key IS NULL OR length(trim(p_idempotency_key)) = 0 THEN
    RETURN jsonb_build_object('ok', false, 'error', 'missing_idempotency_key');
  END IF;

  IF p_source_type IS NULL OR p_source_type NOT IN ('battle', 'chest', 'npc') THEN
    RETURN jsonb_build_object('ok', false, 'error', 'invalid_source_type');
  END IF;

  IF p_source_id IS NULL OR length(trim(p_source_id)) = 0 THEN
    RETURN jsonb_build_object('ok', false, 'error', 'missing_source_id');
  END IF;

  -- Idempotency: return cached result if already claimed
  SELECT lc.result INTO v_existing
  FROM public.loot_claims lc
  WHERE lc.user_id = uid AND lc.idempotency_key = p_idempotency_key;

  IF FOUND THEN
    RETURN v_existing || jsonb_build_object('ok', true, 'cached', true);
  END IF;

  -- Resolve pool
  SELECT m.loot_pool_id INTO v_pool_id
  FROM public.loot_source_map m
  WHERE m.source_type = p_source_type AND m.source_id = p_source_id;

  -- Battle fallback to 'default' pool
  IF v_pool_id IS NULL AND p_source_type = 'battle' THEN
    SELECT m.loot_pool_id INTO v_pool_id
    FROM public.loot_source_map m
    WHERE m.source_type = 'battle' AND m.source_id = 'default';
  END IF;

  IF v_pool_id IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'loot_pool_not_found');
  END IF;

  -- Cumulative weight roll
  SELECT COALESCE(SUM(weight), 0)::bigint INTO v_total
  FROM public.loot_pool_entries
  WHERE loot_pool_id = v_pool_id;

  IF v_total <= 0 THEN
    RETURN jsonb_build_object('ok', false, 'error', 'empty_loot_pool');
  END IF;

  v_pick := floor(random() * v_total::numeric);

  FOR v_row IN
    SELECT *
    FROM public.loot_pool_entries
    WHERE loot_pool_id = v_pool_id
    ORDER BY sort_order, id
  LOOP
    v_cum := v_cum + v_row.weight;
    IF v_pick < v_cum THEN
      v_found := true;
      EXIT;
    END IF;
  END LOOP;

  IF NOT v_found THEN
    RETURN jsonb_build_object('ok', false, 'error', 'roll_failed');
  END IF;

  -- Lock profile row and apply currency
  SELECT p.exp, p.coins, p.gems INTO v_exp, v_coins, v_gems
  FROM public.profiles p
  WHERE p.id = uid
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'error', 'profile_not_found');
  END IF;

  v_exp := v_exp + COALESCE(v_row.exp_delta, 0);
  v_coins := v_coins + COALESCE(v_row.coins_delta, 0);
  v_gems := v_gems + COALESCE(v_row.gems_delta, 0);

  UPDATE public.profiles
  SET exp = v_exp, coins = v_coins, gems = v_gems
  WHERE id = uid;

  -- Item grant with 999 stack cap
  IF v_row.shop_item_id IS NOT NULL THEN
    v_item_qty := GREATEST(1, LEAST(999, COALESCE(v_row.quantity, 1)));

    SELECT uc.id, uc.quantity INTO v_uc_id, v_uc_qty
    FROM public.user_cosmetics uc
    WHERE uc.hunter_id = uid AND uc.shop_item_id = v_row.shop_item_id
    FOR UPDATE;

    IF FOUND THEN
      v_new_qty := LEAST(999, COALESCE(v_uc_qty, 0) + v_item_qty);
      UPDATE public.user_cosmetics SET quantity = v_new_qty WHERE id = v_uc_id;
      v_item := jsonb_build_object(
        'shop_item_id', v_row.shop_item_id,
        'quantity', v_new_qty - COALESCE(v_uc_qty, 0),
        'total_quantity', v_new_qty
      );
    ELSE
      v_new_qty := LEAST(999, v_item_qty);
      INSERT INTO public.user_cosmetics (hunter_id, shop_item_id, equipped, quantity)
      VALUES (uid, v_row.shop_item_id, false, v_new_qty)
      RETURNING id INTO v_uc_id;
      v_item := jsonb_build_object(
        'shop_item_id', v_row.shop_item_id,
        'quantity', v_new_qty,
        'user_cosmetic_id', v_uc_id
      );
    END IF;

    v_result_items := jsonb_build_array(v_item);
  END IF;

  -- Build result and record claim
  v_out := jsonb_build_object(
    'ok', true,
    'cached', false,
    'source_type', p_source_type,
    'source_id', p_source_id,
    'entry_id', v_row.id,
    'exp_delta', COALESCE(v_row.exp_delta, 0),
    'coins_delta', COALESCE(v_row.coins_delta, 0),
    'gems_delta', COALESCE(v_row.gems_delta, 0),
    'exp_total', v_exp,
    'coins_total', v_coins,
    'gems_total', v_gems,
    'items', v_result_items
  );

  INSERT INTO public.loot_claims (user_id, idempotency_key, source_type, source_id, result)
  VALUES (uid, p_idempotency_key, p_source_type, p_source_id, v_out);

  RETURN v_out;
END;
$func$;

GRANT EXECUTE ON FUNCTION public.claim_loot(text, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.claim_loot(text, text, text) TO service_role;
