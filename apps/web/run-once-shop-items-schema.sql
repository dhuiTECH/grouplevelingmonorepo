-- Run this ONCE in Supabase SQL Editor to fix shop item create/update errors.
-- Fixes: "Could not find the 'is_sellable' column", "Could not find the 'onboarding_available' column",
-- "Could not find the function insert_shop_item", and "violates check constraint shop_items_slot_check".

-- 0. Allow all slot values used by the form (hair, face_eyes, face_mouth, eyes, back, other)
ALTER TABLE public.shop_items DROP CONSTRAINT IF EXISTS shop_items_slot_check;
ALTER TABLE public.shop_items ADD CONSTRAINT shop_items_slot_check CHECK (slot IN (
  'avatar', 'base_body', 'face_eyes', 'face_mouth', 'hair', 'face', 'body', 'weapon', 'head', 'eyes', 'back', 'shoulder', 'hands', 'feet', 'background', 'accessory', 'magic effects', 'other'
));

-- 1. Add is_sellable column
ALTER TABLE public.shop_items
ADD COLUMN IF NOT EXISTS is_sellable boolean DEFAULT true;
COMMENT ON COLUMN public.shop_items.is_sellable IS 'If true, item appears in the public shop; if false, creator/admin only (e.g. avatar parts)';

-- 2. Add onboarding_available column
ALTER TABLE public.shop_items
ADD COLUMN IF NOT EXISTS onboarding_available boolean DEFAULT false;
COMMENT ON COLUMN public.shop_items.onboarding_available IS 'If true, this item appears in the onboarding avatar customization screen (Face/Body slots)';

-- 3. Add insert_shop_item RPC (fallback for create when schema cache is stale)
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
COMMENT ON FUNCTION public.insert_shop_item(jsonb) IS 'Insert a shop item; use when PostgREST schema cache is stale';

-- 4. Reload PostgREST schema cache so new columns and function are recognized
NOTIFY pgrst, 'reload schema';
