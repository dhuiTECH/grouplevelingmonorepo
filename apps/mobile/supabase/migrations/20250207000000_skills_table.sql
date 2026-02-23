-- Skills table: source of truth for skill tree nodes (per class)
CREATE TABLE IF NOT EXISTS skills (
  id text PRIMARY KEY,
  name text NOT NULL,
  class_key text NOT NULL,
  type text NOT NULL CHECK (type IN ('active', 'passive')),
  x numeric NOT NULL DEFAULT 50,
  y numeric NOT NULL DEFAULT 0,
  max_rank integer NOT NULL DEFAULT 1,
  required_level integer NOT NULL DEFAULT 1,
  required_title text NOT NULL DEFAULT 'Novice',
  connected_to text[] DEFAULT '{}',
  description text,
  -- Battle/ability fields (optional)
  base_value integer DEFAULT 50,
  energy_cost integer DEFAULT 1,
  cooldown_ms integer DEFAULT 0,
  element text DEFAULT 'Physical',
  skill_type text DEFAULT 'damage'
);

-- Index for fetching tree by class (Fighter uses Warrior tree)
CREATE INDEX IF NOT EXISTS idx_skills_class_key ON skills(class_key);

-- RLS: allow read for authenticated users
ALTER TABLE skills ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read skills"
  ON skills FOR SELECT
  TO authenticated
  USING (true);

-- Seed: Assassin
INSERT INTO skills (id, name, class_key, type, x, y, max_rank, required_level, required_title, connected_to, description) VALUES
('assassin_strike', 'Shadow Strike', 'Assassin', 'active', 50, 10, 5, 1, 'Novice', '{}', 'Deals bonus damage with basic attacks.'),
('assassin_dodge', 'Evasion', 'Assassin', 'passive', 30, 25, 3, 1, 'Novice', '{}', 'Increases dodge chance.'),
('assassin_poison', 'Venom Blade', 'Assassin', 'active', 70, 25, 4, 1, 'Novice', '{}', 'Applies poison damage over time.'),
('assassin_backstab', 'Backstab', 'Assassin', 'active', 50, 40, 5, 5, 'Apprentice', '{assassin_strike}', 'Attacks from behind deal bonus critical damage.'),
('assassin_smoke', 'Smoke Bomb', 'Assassin', 'active', 20, 50, 3, 5, 'Apprentice', '{assassin_dodge}', 'Reduces enemy accuracy.'),
('assassin_bleed', 'Hemorrhage', 'Assassin', 'passive', 80, 50, 4, 5, 'Apprentice', '{assassin_poison}', 'Critical hits cause bleeding.'),
('assassin_invisible', 'Shadow Walk', 'Assassin', 'active', 50, 65, 3, 10, 'Journeyman', '{assassin_backstab}', 'Become invisible. Attacks break invisibility.'),
('assassin_combo', 'Combo Master', 'Assassin', 'passive', 30, 75, 5, 10, 'Journeyman', '{assassin_smoke}', 'Consecutive attacks increase damage.'),
('assassin_execute', 'Execution', 'Assassin', 'active', 70, 75, 4, 10, 'Journeyman', '{assassin_bleed}', 'Instantly kill enemies below health threshold.'),
('assassin_ultimate', 'Phantom Dance', 'Assassin', 'active', 50, 90, 1, 15, 'Adept', '{assassin_invisible}', 'Create phantom copies that attack enemies.')
ON CONFLICT (id) DO NOTHING;

-- Seed: Warrior (and Fighter uses this tree)
INSERT INTO skills (id, name, class_key, type, x, y, max_rank, required_level, required_title, connected_to, description) VALUES
('warrior_bash', 'Shield Bash', 'Warrior', 'active', 50, 10, 5, 1, 'Novice', '{}', 'Bash enemies, stunning them.'),
('warrior_endurance', 'Fortitude', 'Warrior', 'passive', 30, 25, 4, 1, 'Novice', '{}', 'Increases max HP.'),
('warrior_charge', 'Charge', 'Warrior', 'active', 70, 25, 3, 1, 'Novice', '{}', 'Charge forward, dealing damage.'),
('warrior_taunt', 'Taunt', 'Warrior', 'active', 50, 40, 4, 5, 'Apprentice', '{warrior_bash}', 'Force enemies to attack you, reducing damage taken.'),
('warrior_armor', 'Iron Skin', 'Warrior', 'passive', 20, 50, 5, 5, 'Apprentice', '{warrior_endurance}', 'Reduces physical damage taken.'),
('warrior_cleave', 'Cleave', 'Warrior', 'active', 80, 50, 4, 5, 'Apprentice', '{warrior_charge}', 'Attack hits multiple enemies.'),
('warrior_rage', 'Berserker Rage', 'Warrior', 'active', 50, 65, 3, 10, 'Journeyman', '{warrior_taunt}', 'Enter rage mode, increasing attack speed.'),
('warrior_shield_wall', 'Shield Wall', 'Warrior', 'active', 30, 75, 3, 10, 'Journeyman', '{warrior_armor}', 'Create barrier that blocks damage.'),
('warrior_whirlwind', 'Whirlwind', 'Warrior', 'active', 70, 75, 4, 10, 'Journeyman', '{warrior_cleave}', 'Spin attack damaging nearby enemies.'),
('warrior_ultimate', 'Last Stand', 'Warrior', 'active', 50, 90, 1, 15, 'Adept', '{warrior_rage}', 'When HP drops low, gain defense and counterattack.')
ON CONFLICT (id) DO NOTHING;

-- Seed: Mage
INSERT INTO skills (id, name, class_key, type, x, y, max_rank, required_level, required_title, connected_to, description) VALUES
('mage_fireball', 'Fireball', 'Mage', 'active', 50, 10, 5, 1, 'Novice', '{}', 'Launch fireball dealing fire damage.'),
('mage_mana_shield', 'Mana Shield', 'Mage', 'passive', 30, 25, 4, 1, 'Novice', '{}', 'Convert damage to MP loss.'),
('mage_frost', 'Frost Nova', 'Mage', 'active', 70, 25, 3, 1, 'Novice', '{}', 'Freeze nearby enemies, slowing them.'),
('mage_lightning', 'Chain Lightning', 'Mage', 'active', 50, 40, 4, 5, 'Apprentice', '{mage_fireball}', 'Lightning jumps to multiple enemies.'),
('mage_regen', 'Arcane Regeneration', 'Mage', 'passive', 20, 50, 5, 5, 'Apprentice', '{mage_mana_shield}', 'Increases MP regeneration.'),
('mage_teleport', 'Blink', 'Mage', 'active', 80, 50, 3, 5, 'Apprentice', '{mage_frost}', 'Teleport in any direction.'),
('mage_meteor', 'Meteor Storm', 'Mage', 'active', 50, 65, 3, 10, 'Journeyman', '{mage_lightning}', 'Summon meteors for area damage.'),
('mage_barrier', 'Prismatic Barrier', 'Mage', 'active', 30, 75, 4, 10, 'Journeyman', '{mage_regen}', 'Create barrier that absorbs damage.'),
('mage_clone', 'Mirror Image', 'Mage', 'active', 70, 75, 3, 10, 'Journeyman', '{mage_teleport}', 'Create mirror images that confuse enemies.'),
('mage_ultimate', 'Arcane Nova', 'Mage', 'active', 50, 90, 1, 15, 'Adept', '{mage_meteor}', 'Unleash catastrophic magical explosion.')
ON CONFLICT (id) DO NOTHING;
