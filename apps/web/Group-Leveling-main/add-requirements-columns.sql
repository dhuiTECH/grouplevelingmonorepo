-- Add min_level and class_req columns to shop_items table for gating S-Rank gear

ALTER TABLE public.shop_items
ADD COLUMN min_level integer DEFAULT 1,
ADD COLUMN class_req text DEFAULT 'All';

-- Add check constraint for class_req to ensure valid class names
ALTER TABLE public.shop_items
ADD CONSTRAINT shop_items_class_req_check
CHECK (class_req IN ('All', 'Assassin', 'Fighter', 'Mage', 'Tanker', 'Ranger', 'Healer'));

-- Add comment for documentation
COMMENT ON COLUMN public.shop_items.min_level IS 'Minimum player level required to purchase this item';
COMMENT ON COLUMN public.shop_items.class_req IS 'Class requirement for item (All = no restriction)';