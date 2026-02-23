-- Add female-specific positioning columns to shop_items table
ALTER TABLE public.shop_items
ADD COLUMN IF NOT EXISTS offset_x_female integer,
ADD COLUMN IF NOT EXISTS offset_y_female integer,
ADD COLUMN IF NOT EXISTS scale_female double precision,
ADD COLUMN IF NOT EXISTS rotation_female integer;

-- Add comments to explain the columns
COMMENT ON COLUMN public.shop_items.offset_x_female IS 'Horizontal offset for female avatars (defaults to offset_x if NULL)';
COMMENT ON COLUMN public.shop_items.offset_y_female IS 'Vertical offset for female avatars (defaults to offset_y if NULL)';
COMMENT ON COLUMN public.shop_items.scale_female IS 'Scale for female avatars (defaults to scale if NULL)';
COMMENT ON COLUMN public.shop_items.rotation_female IS 'Rotation for female avatars (defaults to rotation if NULL)';

-- Update the insert_shop_item RPC function to handle these new columns
CREATE OR REPLACE FUNCTION public.insert_shop_item(item jsonb)
RETURNS SETOF public.shop_items
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  INSERT INTO public.shop_items (
    name, description, image_url, thumbnail_url, slot, bonuses, is_animated, price, gem_price,
    rarity, min_level, class_req, no_restrictions, gender, offset_x, offset_y, z_index, scale, rotation,
    offset_x_female, offset_y_female, scale_female, rotation_female,
    animation_config, is_stackable, item_effects, is_gacha_exclusive, collection_name, collection_id,
    is_sellable, onboarding_available, grip_type
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
    COALESCE((item->>'rotation')::integer, 0),
    (item->>'offset_x_female')::integer,
    (item->>'offset_y_female')::integer,
    (item->>'scale_female')::double precision,
    (item->>'rotation_female')::integer,
    (item->'animation_config'),
    COALESCE((item->>'is_stackable')::boolean, false),
    (item->'item_effects'),
    COALESCE((item->>'is_gacha_exclusive')::boolean, false),
    COALESCE(NULLIF(TRIM(item->>'collection_name'), ''), 'Standard'),
    CASE WHEN item ? 'collection_id' AND item->>'collection_id' IS NOT NULL AND item->>'collection_id' <> '' THEN (item->>'collection_id')::uuid ELSE NULL END,
    COALESCE((item->>'is_sellable')::boolean, true),
    COALESCE((item->>'onboarding_available')::boolean, false),
    NULLIF(TRIM(item->>'grip_type'), '')
  )
  RETURNING *;
END;
$$;

-- Reload PostgREST schema cache
NOTIFY pgrst, 'reload schema';
