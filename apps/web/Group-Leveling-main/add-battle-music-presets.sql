-- Create a small config table for battle music presets.
-- This lets the Admin panel attach uploaded MP3s to logical IDs (battle_1..battle_5)
-- without changing code each time.

CREATE TABLE IF NOT EXISTS public.battle_music_presets (
  id TEXT PRIMARY KEY,
  display_name TEXT NOT NULL,
  file_url TEXT
);

-- Seed the five logical presets used by the Admin dropdown.
INSERT INTO public.battle_music_presets (id, display_name)
VALUES
  ('battle_1', 'Battle Theme 1 (Standard)'),
  ('battle_2', 'Battle Theme 2 (Fast/Aggressive)'),
  ('battle_3', 'Battle Theme 3 (Boss/Epic)'),
  ('battle_4', 'Battle Theme 4 (Dungeon/Dark)'),
  ('battle_5', 'Battle Theme 5 (Victory/Light)')
ON CONFLICT (id) DO NOTHING;

