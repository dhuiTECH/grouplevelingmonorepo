-- 1. Create Gacha Collections table
CREATE TABLE IF NOT EXISTS public.gacha_collections (
    id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    created_at timestamp with time zone DEFAULT now(),
    name text NOT NULL,
    description text,
    cover_image_url text, -- This can be an image or a webm video
    is_active boolean DEFAULT false,
    rarity_weights jsonb DEFAULT '{"common": 57, "uncommon": 30, "rare": 10, "epic": 2.5, "legendary": 0.5}'
);

-- 2. Create Junction table for Items in a Collection
CREATE TABLE IF NOT EXISTS public.collection_items (
    id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    collection_id uuid REFERENCES public.gacha_collections(id) ON DELETE CASCADE,
    shop_item_id uuid REFERENCES public.shop_items(id) ON DELETE CASCADE,
    drop_rate_modifier numeric DEFAULT 1.0, -- Can be used for "Rate Up" events
    created_at timestamp with time zone DEFAULT now(),
    UNIQUE(collection_id, shop_item_id)
);

-- 3. Enable RLS
ALTER TABLE public.gacha_collections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.collection_items ENABLE ROW LEVEL SECURITY;

-- 4. Create public read policies
CREATE POLICY "Public read for gacha_collections" ON public.gacha_collections FOR SELECT USING (true);
CREATE POLICY "Public read for collection_items" ON public.gacha_collections FOR SELECT USING (true);

-- 5. Add some initial seed data for a "Shadow Realm" collection
INSERT INTO public.gacha_collections (name, description, cover_image_url, is_active)
VALUES (
    'Shadow Realm', 
    'Manifest exclusive relics from the depths of the shadows.', 
    '/gates.png', -- You can replace this with a .webm path later
    true
) ON CONFLICT DO NOTHING;

-- 6. Note: You can add items to this collection via the collection_items table
-- Example: 
-- INSERT INTO public.collection_items (collection_id, shop_item_id)
-- SELECT (SELECT id FROM gacha_collections WHERE name = 'Shadow Realm'), id 
-- FROM shop_items WHERE is_gacha_exclusive = true;
