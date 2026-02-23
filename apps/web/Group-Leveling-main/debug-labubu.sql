-- Debug the labubu pin issue
SELECT 'ALL LABUBU ITEMS' as debug, id, name, slot, created_at
FROM shop_items
WHERE name LIKE '%labubu%'
ORDER BY created_at DESC;

-- Check what slots exist in shop_items
SELECT DISTINCT slot, COUNT(*) as count
FROM shop_items
GROUP BY slot
ORDER BY slot;

-- Check if face slot items exist
SELECT 'FACE SLOT ITEMS' as category, id, name
FROM shop_items
WHERE slot = 'face'
ORDER BY name;

-- Check accessory slot items
SELECT 'ACCESSORY SLOT ITEMS' as category, id, name
FROM shop_items
WHERE slot = 'accessory'
ORDER BY name;