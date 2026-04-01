-- Battle attack animation preset for physical weapons (sword vs spear vs bow).
-- Nullable: legacy rows and non-weapon slots use NULL; app falls back to grip_type / generic All Around.
ALTER TABLE public.shop_items
  ADD COLUMN IF NOT EXISTS weapon_type text;

COMMENT ON COLUMN public.shop_items.weapon_type IS 'For slot weapon: optional Sword, Spear, or Bow — selects distinct battle attack motion; NULL uses grip_type-only presets.';
