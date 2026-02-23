-- Fix labubu pin slot assignment - move from 'face' to 'accessory'
UPDATE shop_items
SET slot = 'accessory'
WHERE name LIKE '%labubu%' AND slot = 'face';

-- Also update any existing user cosmetics that might reference this item
-- (This is handled automatically by the foreign key relationships)