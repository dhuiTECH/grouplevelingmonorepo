// scripts/generate-rebalance-sql.ts
require('dotenv').config({ path: '.env' });

// ====================================================================================
// DATABASE SIMULATION & QUERY GENERATION
// ====================================================================================
interface Skill {
    id: string;
    name: string;
    required_level: number;
    allowed_classes: string[] | null;
    energy_cost: number;
    cooldown_ms: number | null;
    base_value: number;
}


// Mock Supabase client to prevent actual DB connection
const mockSupabase = {
  from: (tableName: string) => ({
    select: async (query: string) => {
      // In a real scenario, you'd fetch this from a local file or a direct DB connection.
      // For now, we'll assume the script needs to run in an environment with DB access
      // to fetch the initial data. The key change is that it now *prints* SQL, not runs it.
      const { createClient } = require('@supabase/supabase-js');
      const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || "";
      const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || "";
      if (!supabaseUrl || !supabaseAnonKey) {
        throw new Error("Supabase URL or Anon Key is not defined in .env file");
      }
      const supabase = createClient(supabaseUrl, supabaseAnonKey);
      return await supabase.from(tableName).select(query);
    },
  }),
};


// ====================================================================================
// CONFIGURATION: Define the balancing logic here
// ====================================================================================

// 1. Baseline Formula Constants
const START_VALUE = 18;
const END_VALUE = 1150;
const LEVEL_RANGE = 99; // Level 100 - Level 1
const GROWTH_RATE = (END_VALUE - START_VALUE) / LEVEL_RANGE; // Approx. 11.43

// 2. Class Modifiers
const CLASS_MODIFIERS: { [key: string]: number } = {
  Mage: 0.20, Sorcerer: 0.20,
  Warrior: 0.10, Barbarian: 0.10, Fighter: 0.10,
  Rogue: 0.0, Assassin: 0.0,
  Priest: -0.25, Healer: -0.25,
  Knight: -0.35, Guardian: -0.35,
  Default: 0.0,
};

// 3. Action Point (AP) Cost Modifiers
const AP_MODIFIERS: { [key: number]: number } = { 1: -0.15, 2: 0.0, 3: 0.15, 4: 0.30, 5: 0.50 };

// 4. Cooldown Modifiers (in turns)
const COOLDOWN_MODIFIERS: { [key: number]: number } = {
  0: -0.20, 1: -0.20, 2: 0.0, 3: 0.0, 4: 0.20, 5: 0.20, 6: 0.20,
  7: 0.40, 8: 0.40, 9: 0.40, 10: 0.40, 11: 0.60, 12: 0.60,
};

// ====================================================================================
// SCRIPT LOGIC: Generate SQL
// ====================================================================================

async function generateRebalanceSql() {
  console.log('-- Generating SQL for skill rebalancing...');
  console.log('-- This script will output SQL UPDATE statements. Copy and run them in your Supabase SQL editor.');

  const { data: skills, error } = await mockSupabase.from('skills').select('*');

  if (error) {
    console.error('-- Error fetching skills:', error.message);
    return;
  }
  if (!skills || skills.length === 0) {
    console.log('-- No skills found.');
    return;
  }

  console.log(`-- Found ${skills.length} skills. Generating statements...\n`);

  const sqlStatements = (skills as Skill[]).map((skill: Skill) => {
    const { id, name, required_level, allowed_classes, energy_cost, cooldown_ms, base_value } = skill;

    const classKey = allowed_classes?.[0] || 'Default';
    const classMod = CLASS_MODIFIERS[classKey] ?? CLASS_MODIFIERS.Default;
    const apMod = AP_MODIFIERS[energy_cost] ?? 0.0;
    const cooldownTurns = Math.floor((cooldown_ms || 0) / 1000);
    const cooldownMod = COOLDOWN_MODIFIERS[cooldownTurns] ?? 0.60;

    const baseline = (required_level - 1) * GROWTH_RATE + START_VALUE;
    const finalValue = Math.round(baseline * (1 + classMod) * (1 + apMod) * (1 + cooldownMod));

    return `UPDATE skills SET base_value = ${finalValue} WHERE id = '${id}'; -- ${name} (Lvl ${required_level}), Old: ${base_value}, New: ${finalValue}`;
  }).join('\n');

  console.log(sqlStatements);
  console.log(`\n-- ✅ SQL generation complete. Total statements: ${skills.length}.`);
}

generateRebalanceSql().catch(console.error);
