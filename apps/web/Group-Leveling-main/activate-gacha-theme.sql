CREATE OR REPLACE FUNCTION activate_gacha_theme(p_collection_id UUID)
RETURNS void AS $$
DECLARE
    v_pool_type TEXT;
BEGIN
    -- Get the pool type of the collection we want to activate
    SELECT pool_type INTO v_pool_type 
    FROM public.gacha_collections 
    WHERE id = p_collection_id;

    -- Deactivate all other collections of the same pool type
    UPDATE public.gacha_collections
    SET is_active = false
    WHERE id != p_collection_id 
    AND pool_type = v_pool_type;

    -- Activate the chosen collection
    UPDATE public.gacha_collections
    SET is_active = true
    WHERE id = p_collection_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
