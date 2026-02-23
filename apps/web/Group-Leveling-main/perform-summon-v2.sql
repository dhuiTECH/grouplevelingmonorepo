CREATE OR REPLACE FUNCTION public.perform_summon(
    p_user_id UUID,
    p_cost INTEGER,
    p_use_gems BOOLEAN DEFAULT false,
    p_pool_type TEXT DEFAULT 'gate'
)
RETURNS JSONB AS $$
DECLARE
    v_user_coins INTEGER;
    v_user_gems INTEGER;
    v_won_item RECORD;
    v_active_collection_id UUID;
    v_random_float FLOAT;
    v_rarity_target TEXT;
    v_result JSONB;
BEGIN
    -- 1. Get current balance
    SELECT coins, gems INTO v_user_coins, v_user_gems 
    FROM public.profiles WHERE id = p_user_id;

    -- 2. Validate balance
    IF p_use_gems THEN
        IF v_user_gems < p_cost THEN
            RETURN jsonb_build_object('success', false, 'message', 'Insufficient gems');
        END IF;
    ELSE
        IF v_user_coins < p_cost THEN
            RETURN jsonb_build_object('success', false, 'message', 'Insufficient coins');
        END IF;
    END IF;

    -- 3. Find the active collection for the specified pool type
    SELECT id INTO v_active_collection_id 
    FROM public.gacha_collections 
    WHERE is_active = true AND pool_type = p_pool_type
    LIMIT 1;

    IF v_active_collection_id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'message', 'No active collection for this pool');
    END IF;

    -- 4. Roll for rarity (Simplified probabilities)
    v_random_float := random() * 100;
    
    IF v_random_float < 0.5 THEN
        v_rarity_target := 'legendary';
    ELSIF v_random_float < 3.0 THEN
        v_rarity_target := 'epic';
    ELSIF v_random_float < 15.0 THEN
        v_rarity_target := 'rare';
    ELSE
        v_rarity_target := 'common';
    END IF;

    -- 5. Select a random item from the active collection that matches the rarity
    -- Now checks BOTH collection_items (junction table) AND shop_items.collection_id (new column)
    SELECT si.* INTO v_won_item
    FROM public.shop_items si
    LEFT JOIN public.collection_items ci ON ci.shop_item_id = si.id
    WHERE (ci.collection_id = v_active_collection_id OR si.collection_id = v_active_collection_id)
    AND (si.rarity = v_rarity_target OR NOT EXISTS (
        SELECT 1 FROM public.shop_items si2 
        LEFT JOIN public.collection_items ci2 ON ci2.shop_item_id = si2.id 
        WHERE (ci2.collection_id = v_active_collection_id OR si2.collection_id = v_active_collection_id)
        AND si2.rarity = v_rarity_target
    ))
    ORDER BY random()
    LIMIT 1;

    IF v_won_item IS NULL THEN
        -- Absolute fallback: any item in the collection
        SELECT si.* INTO v_won_item
        FROM public.shop_items si
        LEFT JOIN public.collection_items ci ON ci.shop_item_id = si.id
        WHERE (ci.collection_id = v_active_collection_id OR si.collection_id = v_active_collection_id)
        ORDER BY random()
        LIMIT 1;
    END IF;

    IF v_won_item IS NULL THEN
        RETURN jsonb_build_object('success', false, 'message', 'This collection is empty');
    END IF;

    -- 6. Deduct cost and add item to inventory
    IF p_use_gems THEN
        UPDATE public.profiles SET gems = gems - p_cost WHERE id = p_user_id RETURNING gems INTO v_user_gems;
    ELSE
        UPDATE public.profiles SET coins = coins - p_cost WHERE id = p_user_id RETURNING coins INTO v_user_coins;
    END IF;

    -- Add to user inventory
    INSERT INTO public.user_inventory (user_id, item_id, quantity)
    VALUES (p_user_id, v_won_item.id, 1)
    ON CONFLICT (user_id, item_id) 
    DO UPDATE SET quantity = public.user_inventory.quantity + 1;

    -- 7. Return success result
    v_result := jsonb_build_object(
        'success', true,
        'message', 'Summon successful!',
        'item_id', v_won_item.id,
        'item_name', v_won_item.name,
        'item_rarity', v_won_item.rarity,
        'image_url', v_won_item.image_url,
        'thumbnail_url', v_won_item.thumbnail_url,
        'is_animated', v_won_item.is_animated,
        'animation_config', v_won_item.animation_config,
        'new_balance', CASE WHEN p_use_gems THEN v_user_gems ELSE v_user_coins END
    );

    RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
