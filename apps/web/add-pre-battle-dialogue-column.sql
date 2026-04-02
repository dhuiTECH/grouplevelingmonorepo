ALTER TABLE encounter_pool
  ADD COLUMN IF NOT EXISTS pre_battle_dialogue JSONB DEFAULT NULL;
