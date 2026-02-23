-- Store avatar base body silhouette URL and skin tint from Avatar screen.
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS base_body_silhouette_url text,
  ADD COLUMN IF NOT EXISTS base_body_tint_hex text;
