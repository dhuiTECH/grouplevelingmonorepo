-- Add pool_type to gacha_collections
ALTER TABLE public.gacha_collections 
ADD COLUMN IF NOT EXISTS pool_type TEXT DEFAULT 'gate' CHECK (pool_type IN ('gate', 'gachapon'));

-- Update the existing Shadow Realm to be a 'gate' type
UPDATE public.gacha_collections SET pool_type = 'gate' WHERE name = 'Shadow Realm';

-- Add a default Gachapon collection
INSERT INTO public.gacha_collections (name, description, cover_image_url, is_active, pool_type)
VALUES (
    'Starter Gachapon', 
    'Basic gear and consumables to start your journey.', 
    '/bg1.webp', 
    true,
    'gachapon'
);
