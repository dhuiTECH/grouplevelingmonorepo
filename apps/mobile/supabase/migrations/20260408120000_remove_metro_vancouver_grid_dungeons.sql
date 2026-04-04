-- Remove synthetic grid-seeded gates (popular routes kept in CURATED_HOTSPOTS only)
-- Use starts_with so Unicode em dash in names matches reliably (LIKE can be finicky).

DELETE FROM public.global_dungeons
WHERE starts_with(name, 'Metro Vancouver Grid');
