-- Profile: store silhouette URL and tint when user selects a base_body so LayeredAvatar can render them
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS base_body_silhouette_url text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS base_body_tint_hex text;

-- Shop item (base_body): default skin tint and silhouette image URL
ALTER TABLE public.shop_items ADD COLUMN IF NOT EXISTS skin_tint_hex text;
ALTER TABLE public.shop_items ADD COLUMN IF NOT EXISTS image_base_url text;

COMMENT ON COLUMN public.profiles.base_body_silhouette_url IS 'URL of the base body silhouette layer (image_base_url from selected base_body item)';
COMMENT ON COLUMN public.profiles.base_body_tint_hex IS 'Hex skin color for the silhouette layer (e.g. #FFDBAC)';
COMMENT ON COLUMN public.shop_items.skin_tint_hex IS 'Default skin tint hex for base_body items (e.g. #FFDBAC)';
COMMENT ON COLUMN public.shop_items.image_base_url IS 'URL of the base body silhouette layer image';
