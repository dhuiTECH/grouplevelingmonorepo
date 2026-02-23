-- Comprehensive fix for labubu pin accessory issue

-- Step 1: Check current state
SELECT 'BEFORE FIX' as status, id, name, slot FROM shop_items WHERE name LIKE '%labubu%';

-- Step 2: Ensure only one accessory version exists
-- Delete any face slot versions
DELETE FROM shop_items WHERE name LIKE '%labubu%' AND slot = 'face';

-- Step 3: Ensure accessory version exists
INSERT INTO shop_items (name, description, price, image_url, slot, layer_zone, z_index, rarity, gender)
SELECT 'Labubu Pin', 'Adorable accessory pin', 150, '/items/labubu-pin.png', 'accessory', 'body', 15, 'uncommon', '["unisex"]'
WHERE NOT EXISTS (SELECT 1 FROM shop_items WHERE name LIKE '%labubu%' AND slot = 'accessory');

-- Step 4: Update any user cosmetics that reference face slot labubu pins to use accessory slot
UPDATE user_cosmetics
SET shop_item_id = (
    SELECT id FROM shop_items
    WHERE name LIKE '%labubu%' AND slot = 'accessory'
    LIMIT 1
)
WHERE shop_item_id IN (
    SELECT id FROM shop_items
    WHERE name LIKE '%labubu%' AND slot = 'face'
);

-- Step 5: Clean up any orphaned face slot items
DELETE FROM shop_items WHERE name LIKE '%labubu%' AND slot = 'face';

-- Step 6: Verify the fix
SELECT 'AFTER FIX' as status, id, name, slot FROM shop_items WHERE name LIKE '%labubu%';

-- Step 7: Check for any remaining face slot items that might be causing issues
SELECT 'FACE SLOT ITEMS' as category, id, name FROM shop_items WHERE slot = 'face';