-- Add animation_config column to shop_items table for sprite sheet animations
ALTER TABLE public.shop_items
ADD COLUMN IF NOT EXISTS animation_config jsonb;

-- Add comment to explain the column
COMMENT ON COLUMN public.shop_items.animation_config IS 'JSON object containing sprite sheet animation settings: {frameWidth, frameHeight, totalFrames, fps}';