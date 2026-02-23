-- Add rotation column to shop_items table for item rotation
ALTER TABLE public.shop_items
ADD COLUMN IF NOT EXISTS rotation numeric DEFAULT 0;

-- Add comment to explain the column
COMMENT ON COLUMN public.shop_items.rotation IS 'Rotation angle in degrees for the item (default 0)';
