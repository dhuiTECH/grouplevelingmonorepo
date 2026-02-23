-- Encounter <-> Map binding: add map_id to encounter_pool (nullable).
-- Run this before using the Map selector in MobsTab.
ALTER TABLE public.encounter_pool
  ADD COLUMN IF NOT EXISTS map_id UUID REFERENCES public.maps(id);

-- Generated column for fast filtering of catchable pets (mobile app: WHERE is_catchable = true).
-- metadata->>'catchable' is set when event_type = 'PET'.
ALTER TABLE public.encounter_pool
  ADD COLUMN IF NOT EXISTS is_catchable BOOLEAN
  GENERATED ALWAYS AS ((metadata->>'catchable')::boolean) STORED;
