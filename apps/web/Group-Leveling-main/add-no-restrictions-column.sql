-- Add no_restrictions column to shop_items table for unrestricted items

ALTER TABLE public.shop_items
ADD COLUMN no_restrictions boolean DEFAULT false;

-- Add comment for documentation
COMMENT ON COLUMN public.shop_items.no_restrictions IS 'If true, item has no level or class restrictions and is available to all players';