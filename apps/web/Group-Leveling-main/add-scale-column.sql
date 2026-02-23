-- Add scale column to shop_items table for item resizing
ALTER TABLE public.shop_items
ADD COLUMN IF NOT EXISTS scale numeric(3,1) DEFAULT 1.0;

-- Add comment to explain the column
COMMENT ON COLUMN public.shop_items.scale IS 'Scale multiplier for item size (0.1 to 3.0, default 1.0)';