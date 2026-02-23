-- Insert shop item via RPC so PostgREST schema cache is not required.
-- Run after add-is-sellable.sql and add-onboarding-available.sql.
-- Usage: SELECT * FROM insert_shop_item('{"name":"...", "slot":"hair", ...}'::jsonb);

CREATE OR REPLACE FUNCTION public.insert_shop_item(item jsonb)
RETURNS SETOF public.shop_items
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  INSERT INTO public.shop_items (
    name, description, image_url, thumbnail_url, slot, bonuses, is_animated, price, gem_price,
    rarity, min_level, class_req, no_restrictions, gender, offset_x, offset_y, z_index, scale,
    animation_config, is_stackable, item_effects, is_gacha_exclusive, collection_name, collection_id,
    is_sellable, onboarding_available
  )
  VALUES (
    (item->>'name'),
    NULLIF(TRIM(item->>'description'), ''),
    (item->>'image_url'),
    NULLIF(item->>'thumbnail_url', ''),
    (item->>'slot'),
    COALESCE((item->'bonuses')::jsonb, '[]'::jsonb),
    COALESCE((item->>'is_animated')::boolean, false),
    COALESCE((item->>'price')::integer, 0),
    CASE WHEN item ? 'gem_price' AND item->>'gem_price' IS NOT NULL AND item->>'gem_price' <> '' THEN (item->>'gem_price')::integer ELSE NULL END,
    COALESCE(NULLIF(TRIM(item->>'rarity'), ''), 'common'),
    CASE WHEN (item->>'no_restrictions')::boolean THEN NULL ELSE COALESCE((item->>'min_level')::integer, 1) END,
    CASE WHEN (item->>'no_restrictions')::boolean THEN NULL ELSE COALESCE(NULLIF(TRIM(item->>'class_req'), ''), 'All') END,
    COALESCE((item->>'no_restrictions')::boolean, false),
    NULLIF(TRIM(item->>'gender'), ''),
    COALESCE((item->>'offset_x')::integer, 0),
    COALESCE((item->>'offset_y')::integer, 0),
    COALESCE((item->>'z_index')::integer, 1),
    COALESCE((item->>'scale')::double precision, 1.0),
    (item->'animation_config'),
    COALESCE((item->>'is_stackable')::boolean, false),
    (item->'item_effects'),
    COALESCE((item->>'is_gacha_exclusive')::boolean, false),
    COALESCE(NULLIF(TRIM(item->>'collection_name'), ''), 'Standard'),
    CASE WHEN item ? 'collection_id' AND item->>'collection_id' IS NOT NULL AND item->>'collection_id' <> '' THEN (item->>'collection_id')::uuid ELSE NULL END,
    COALESCE((item->>'is_sellable')::boolean, true),
    COALESCE((item->>'onboarding_available')::boolean, false)
  )
  RETURNING *;
END;
$$;

COMMENT ON FUNCTION public.insert_shop_item(jsonb) IS 'Insert a shop item; use when PostgREST schema cache is stale (avoids is_sellable/onboarding_available column errors)';

NOTIFY pgrst, 'reload schema';
