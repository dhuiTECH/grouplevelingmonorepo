-- Fix avatar gender configurations
-- This ensures all avatars have correct gender settings

UPDATE public.shop_items
SET gender = '["male"]'
WHERE name = 'Male Hunter Avatar' AND gender != '["male"]';

UPDATE public.shop_items
SET gender = '["female"]'
WHERE name = 'Female Hunter Avatar' AND gender != '["female"]';

UPDATE public.shop_items
SET gender = '["nonbinary"]'
WHERE name = 'Non-binary Hunter Avatar' AND gender != '["nonbinary"]';

UPDATE public.shop_items
SET gender = '["male"]'
WHERE name = 'Elite Male Hunter Avatar' AND gender != '["male"]';

UPDATE public.shop_items
SET gender = '["female"]'
WHERE name = 'Elite Female Hunter Avatar' AND gender != '["female"]';

UPDATE public.shop_items
SET gender = '["nonbinary"]'
WHERE name = 'Elite Non-binary Hunter Avatar' AND gender != '["nonbinary"]';