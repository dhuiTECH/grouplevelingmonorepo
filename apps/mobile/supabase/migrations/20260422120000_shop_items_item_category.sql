-- Inventory / recipe classification (separate from equipment slot).
-- cosmetic = default for avatar gear and normal shop rows; consumable / crafting_material / quest / misc for stackables & special items.

ALTER TABLE public.shop_items
ADD COLUMN IF NOT EXISTS item_category text NOT NULL DEFAULT 'cosmetic';

ALTER TABLE public.shop_items DROP CONSTRAINT IF EXISTS shop_items_item_category_check;
ALTER TABLE public.shop_items ADD CONSTRAINT shop_items_item_category_check CHECK (
  item_category IN (
    'cosmetic',
    'consumable',
    'crafting_material',
    'quest',
    'misc'
  )
);

COMMENT ON COLUMN public.shop_items.item_category IS
  'cosmetic=equipment/visual shop rows; consumable=usable items; crafting_material=recipe ingredients; quest=quest items; misc=other stackables';

-- Backfill from legacy slot (column was just added with default cosmetic)
UPDATE public.shop_items
SET item_category = CASE
  WHEN slot = 'consumable' THEN 'consumable'
  WHEN slot IN ('misc', 'other') THEN 'misc'
  ELSE 'cosmetic'
END;

NOTIFY pgrst, 'reload schema';
