-- Check for duplicate labubu pin items
SELECT id, name, slot FROM shop_items WHERE name LIKE '%labubu%';

-- If there are duplicates, keep only the accessory version and delete others
-- First, ensure the accessory version exists
INSERT INTO shop_items (name, description, price, image_url, slot, layer_zone, z_index, rarity, gender)
SELECT 'Labubu Pin', 'Adorable accessory pin', 150, '/items/labubu-pin.png', 'accessory', 'body', 15, 'uncommon', '["unisex"]'
WHERE NOT EXISTS (SELECT 1 FROM shop_items WHERE name LIKE '%labubu%' AND slot = 'accessory');

-- Delete any face slot versions
DELETE FROM shop_items WHERE name LIKE '%labubu%' AND slot = 'face';

-- Verify the fix
SELECT id, name, slot FROM shop_items WHERE name LIKE '%labubu%';