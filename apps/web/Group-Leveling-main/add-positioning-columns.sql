-- Add positioning columns to shop_items table for avatar item positioning
ALTER TABLE public.shop_items
ADD COLUMN IF NOT EXISTS offset_x integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS offset_y integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS z_index integer DEFAULT 1;

-- Add comment to explain the columns
COMMENT ON COLUMN public.shop_items.offset_x IS 'Horizontal offset in pixels for positioning on avatar (can be negative)';
COMMENT ON COLUMN public.shop_items.offset_y IS 'Vertical offset in pixels for positioning on avatar (can be negative)';
COMMENT ON COLUMN public.shop_items.z_index IS 'Z-index for layering items on avatar (1-50, higher = more in front)';