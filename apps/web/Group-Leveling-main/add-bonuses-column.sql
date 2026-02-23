-- Add bonuses column to shop_items table for multiple bonus types
ALTER TABLE public.shop_items
ADD COLUMN IF NOT EXISTS bonuses jsonb DEFAULT '[]'::jsonb;

-- Migrate existing single bonus to new format
UPDATE public.shop_items
SET bonuses = json_build_array(
  json_build_object('type', bonus_type, 'value', bonus_value)
)::jsonb
WHERE bonus_type IS NOT NULL AND bonus_value IS NOT NULL;

-- Drop old columns (optional - keep for backward compatibility)
-- ALTER TABLE public.shop_items DROP COLUMN bonus_type;
-- ALTER TABLE public.shop_items DROP COLUMN bonus_value;

-- Add comment to explain the column
COMMENT ON COLUMN public.shop_items.bonuses IS 'JSON array of bonus objects: [{"type": "speed", "value": 5}, ...] (up to 3 bonuses)';