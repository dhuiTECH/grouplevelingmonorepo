-- Add collection_id to shop_items to link items to gacha collections
ALTER TABLE public.shop_items 
ADD COLUMN IF NOT EXISTS collection_id uuid REFERENCES public.gacha_collections(id) ON DELETE SET NULL;

-- Create an index for better performance
CREATE INDEX IF NOT EXISTS idx_shop_items_collection_id ON public.shop_items(collection_id);

-- Optional: Migrate existing collection_name data if possible
-- This is tricky because we'd need to match names to IDs.
-- For now, we'll leave existing collection_name as is for legacy support.
