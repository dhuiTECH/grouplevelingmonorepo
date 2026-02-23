-- ============================================
-- REMOVE AGI (AGILITY) STAT
-- ============================================
-- Note: AGI stat was mapped to spd_stat in the frontend
-- No database schema changes needed since spd_stat remains
-- This file documents the removal of AGI from the UI

-- AGI (Agility) has been removed from the game
-- Players can still allocate points to SPD (Speed) which provides similar benefits
-- Assassin class now focuses on SPD stat instead of AGI

-- No database migration needed - spd_stat column remains unchanged