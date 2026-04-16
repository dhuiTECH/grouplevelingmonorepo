CREATE OR REPLACE FUNCTION get_asset_manifest_version()
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT md5(
    COALESCE((SELECT string_agg(COALESCE(icon_url, '') || '|' || COALESCE(metadata::text, ''), E'\n' ORDER BY id) FROM encounter_pool), '') ||
    E'\x00' ||
    COALESCE((SELECT COALESCE(autotile_sheet_url, '') || '|' || COALESCE(dirt_sheet_url, '') || '|' || COALESCE(dirtv2_sheet_url, '') || '|' || COALESCE(water_sheet_url, '') || '|' || COALESCE(waterv2_sheet_url, '') || '|' || COALESCE(foam_sheet_url, '') FROM world_map_settings WHERE id = 1), '') ||
    E'\x00' ||
    COALESCE((SELECT string_agg(COALESCE(image_url, '') || '|' || COALESCE(thumbnail_url, ''), E'\n' ORDER BY id) FROM shop_items), '') ||
    E'\x00' ||
    COALESCE((SELECT string_agg(COALESCE(icon_url, ''), E'\n' ORDER BY id) FROM world_map_nodes), '') ||
    E'\x00' ||
    COALESCE((SELECT string_agg(COALESCE(icon_url, ''), E'\n' ORDER BY id) FROM skills), '') ||
    E'\x00' ||
    COALESCE((SELECT string_agg(COALESCE(icon_url, ''), E'\n' ORDER BY id) FROM classes), '') ||
    E'\x00' ||
    COALESCE((SELECT string_agg(COALESCE(sprite_url, ''), E'\n' ORDER BY id) FROM skill_animations), '')
  );
$$;

REVOKE ALL ON FUNCTION get_asset_manifest_version() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION get_asset_manifest_version() TO authenticated, anon;
