-- JRPG-style battle loot: every victory grants tier baseline EXP + coins, plus the weighted pool row
-- (equipment / gems / bonus currency from the row). Chests and NPCs unchanged.

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
  v_last_claim timestamptz;
  v_uc_id uuid;
  v_uc_qty integer;
  v_new_qty integer;
  v_item_qty integer;
  v_result_items jsonb := '[]'::jsonb;
  v_item jsonb;
  v_out jsonb;
  v_base_exp bigint := 0;
  v_base_coins bigint := 0;
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

  SELECT lc.result INTO v_existing
  FROM public.loot_claims lc
  WHERE lc.user_id = uid AND lc.idempotency_key = p_idempotency_key;

  IF FOUND THEN
    RETURN v_existing || jsonb_build_object('ok', true, 'cached', true);
  END IF;

  SELECT m.loot_pool_id INTO v_pool_id
  FROM public.loot_source_map m
  WHERE m.source_type = p_source_type AND m.source_id = p_source_id;

  IF v_pool_id IS NULL AND p_source_type = 'battle' THEN
    SELECT m.loot_pool_id INTO v_pool_id
    FROM public.loot_source_map m
    WHERE m.source_type = 'battle' AND m.source_id = 'default';
  END IF;

  IF v_pool_id IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'loot_pool_not_found');
  END IF;

  SELECT COALESCE(SUM(weight), 0)::bigint INTO v_total
  FROM public.loot_pool_entries
  WHERE loot_pool_id = v_pool_id;

  IF v_total <= 0 THEN
    RETURN jsonb_build_object('ok', false, 'error', 'empty_loot_pool');
  END IF;

  SELECT p.exp, p.coins, p.gems, p.last_loot_claim_at
  INTO v_exp, v_coins, v_gems, v_last_claim
  FROM public.profiles p
  WHERE p.id = uid
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'error', 'profile_not_found');
  END IF;

  IF v_last_claim IS NOT NULL AND (clock_timestamp() - v_last_claim) < interval '2 seconds' THEN
    RETURN jsonb_build_object('ok', false, 'error', 'rate_limited');
  END IF;

  v_pick := floor(random() * v_total::numeric);
  v_cum := 0;

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

  -- Battle: participation reward (always) + pool row (drop bonus / item / gems)
  IF p_source_type = 'battle' THEN
    IF p_source_id = 'battle_tier_1' THEN
      v_base_exp := 80;
      v_base_coins := 35;
    ELSIF p_source_id = 'battle_tier_2' THEN
      v_base_exp := 130;
      v_base_coins := 52;
    ELSIF p_source_id = 'battle_tier_3' THEN
      v_base_exp := 200;
      v_base_coins := 75;
    ELSIF p_source_id = 'battle_tier_4' THEN
      v_base_exp := 280;
      v_base_coins := 100;
    ELSIF p_source_id = 'battle_tier_5' THEN
      v_base_exp := 390;
      v_base_coins := 130;
    ELSE
      v_base_exp := 200;
      v_base_coins := 75;
    END IF;
  END IF;

  v_exp := v_exp + v_base_exp + COALESCE(v_row.exp_delta, 0);
  v_coins := v_coins + v_base_coins + COALESCE(v_row.coins_delta, 0);
  v_gems := v_gems + COALESCE(v_row.gems_delta, 0);

  UPDATE public.profiles
  SET
    exp = v_exp,
    coins = v_coins,
    gems = v_gems,
    last_loot_claim_at = clock_timestamp()
  WHERE id = uid;

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

  v_out := jsonb_build_object(
    'ok', true,
    'cached', false,
    'source_type', p_source_type,
    'source_id', p_source_id,
    'entry_id', v_row.id,
    'exp_delta', v_base_exp + COALESCE(v_row.exp_delta, 0),
    'coins_delta', v_base_coins + COALESCE(v_row.coins_delta, 0),
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
