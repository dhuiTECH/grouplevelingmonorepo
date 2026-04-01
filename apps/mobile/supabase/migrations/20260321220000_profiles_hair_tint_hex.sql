-- Per-player hair tint chosen in avatar labs (multiply / silhouette system)
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS hair_tint_hex text;

COMMENT ON COLUMN public.profiles.hair_tint_hex IS 'Hex hair color for tinted hair layer (e.g. #5D4037)';
