-- Run this ONCE in Supabase SQL Editor.
-- 1. Fix Warrior -> Fighter in skills.allowed_classes
-- 2. Create classes table
-- 3. Seed 6 classes

-- 1. Fix the Migration Mistake (Warrior -> Fighter)
UPDATE public.skills
SET allowed_classes = ARRAY['Fighter']
WHERE allowed_classes = ARRAY['Warrior'];

-- 2. Create the Master Classes Table
CREATE TABLE IF NOT EXISTS public.classes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT UNIQUE NOT NULL,
  description TEXT,
  base_hp INT DEFAULT 100,
  base_mp INT DEFAULT 50,
  icon_url TEXT
);

-- 3. Insert your 6 Classes (Using FIGHTER this time)
INSERT INTO public.classes (name, description, base_hp, base_mp) VALUES
('Assassin', 'High burst damage and speed.', 90, 40),
('Fighter', 'Balanced offense and defense.', 110, 30),
('Mage', 'High magic damage, low defense.', 70, 100),
('Ranger', 'Ranged physical damage.', 80, 50),
('Tanker', 'Maximum defense and health.', 150, 20),
('Healer', 'Restoration and support buffs.', 80, 80)
ON CONFLICT (name) DO NOTHING;
