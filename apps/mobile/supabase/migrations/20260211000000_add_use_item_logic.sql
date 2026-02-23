-- Add columns to shop_items
ALTER TABLE shop_items ADD COLUMN IF NOT EXISTS is_stackable BOOLEAN DEFAULT FALSE;
ALTER TABLE shop_items ADD COLUMN IF NOT EXISTS item_effects JSONB DEFAULT NULL;

-- Add quantity to user_cosmetics
ALTER TABLE user_cosmetics ADD COLUMN IF NOT EXISTS quantity INTEGER DEFAULT 1;

-- Function to use an item
CREATE OR REPLACE FUNCTION use_cosmetic_item(
  p_cosmetic_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user_id UUID;
  v_cosmetic_record RECORD;
  v_shop_item RECORD;
  v_effects JSONB;
  v_effect JSONB;
  v_new_hp INTEGER;
  v_new_exp INTEGER;
  v_remaining INTEGER;
BEGIN
  v_user_id := auth.uid();

  -- Get the user cosmetic record
  SELECT * INTO v_cosmetic_record
  FROM user_cosmetics
  WHERE id = p_cosmetic_id AND hunter_id = v_user_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'message', 'Item not found');
  END IF;

  -- Get the shop item details
  SELECT * INTO v_shop_item
  FROM shop_items
  WHERE id = v_cosmetic_record.shop_item_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'message', 'Item definition not found');
  END IF;

  -- Check if item is usable (has effects)
  IF v_shop_item.item_effects IS NULL THEN
    RETURN jsonb_build_object('success', false, 'message', 'Item is not usable');
  END IF;

  v_effects := v_shop_item.item_effects;

  -- Apply effects
  IF jsonb_typeof(v_effects) = 'array' THEN
    FOR v_effect IN SELECT * FROM jsonb_array_elements(v_effects)
    LOOP
      IF v_effect->>'type' = 'heal_hp' THEN
         UPDATE profiles 
         SET current_hp = LEAST(max_hp, current_hp + (v_effect->>'value')::INTEGER)
         WHERE id = v_user_id;
      ELSIF v_effect->>'type' = 'grant_exp' THEN
         UPDATE profiles 
         SET exp = exp + (v_effect->>'value')::INTEGER
         WHERE id = v_user_id;
      END IF;
    END LOOP;
  ELSE
      IF v_effects->>'type' = 'heal_hp' THEN
         UPDATE profiles 
         SET current_hp = LEAST(max_hp, current_hp + (v_effects->>'value')::INTEGER)
         WHERE id = v_user_id;
      ELSIF v_effects->>'type' = 'grant_exp' THEN
         UPDATE profiles 
         SET exp = exp + (v_effects->>'value')::INTEGER
         WHERE id = v_user_id;
      END IF;
  END IF;

  -- Get updated stats
  SELECT current_hp, exp INTO v_new_hp, v_new_exp FROM profiles WHERE id = v_user_id;

  -- Handle quantity
  IF v_cosmetic_record.quantity > 1 THEN
    UPDATE user_cosmetics
    SET quantity = quantity - 1
    WHERE id = p_cosmetic_id;
    v_remaining := v_cosmetic_record.quantity - 1;
    RETURN jsonb_build_object(
        'success', true, 
        'message', 'Item used', 
        'remaining', v_remaining,
        'new_hp', v_new_hp,
        'new_exp', v_new_exp
    );
  ELSE
    DELETE FROM user_cosmetics
    WHERE id = p_cosmetic_id;
    v_remaining := 0;
    RETURN jsonb_build_object(
        'success', true, 
        'message', 'Item used and consumed', 
        'remaining', v_remaining,
        'new_hp', v_new_hp,
        'new_exp', v_new_exp
    );
  END IF;
END;
$$;
