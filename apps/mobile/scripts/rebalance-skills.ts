// scripts/rebalance-skills.ts
require('dotenv').config({ path: '.env' });
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || "";
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || "";

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error("Supabase URL or Anon Key is not defined in .env file");
}

// Create a new client for the script
const supabase = createClient(supabaseUrl, supabaseAnonKey);


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
  // Glass Cannon types
  Mage: 0.20,
  Sorcerer: 0.20,
  // Bruiser types
  Warrior: 0.10,
  Barbarian: 0.10,
  Fighter: 0.10, // Assuming Fighter is similar to Warrior
  // Assassin types
  Rogue: 0.0,
  Assassin: 0.0,
  // Support types
  Priest: -0.25,
  Healer: -0.25,
  // Tank types
  Knight: -0.35,
  Guardian: -0.35,
  // Default/Unknown
  Default: 0.0,
};

// 3. Action Point (AP) Cost Modifiers
const AP_MODIFIERS: { [key: number]: number } = {
  1: -0.15,
  2: 0.0,   // Baseline
  3: 0.15,
  4: 0.30,
  5: 0.50,
};

// 4. Cooldown Modifiers (in turns)
const COOLDOWN_MODIFIERS: { [key: number]: number } = {
  0: -0.20,
  1: -0.20,
  2: 0.0,   // Baseline
  3: 0.0,
  4: 0.20,
  5: 0.20,
  6: 0.20,
  7: 0.40,
  8: 0.40,
  9: 0.40,
  10: 0.40,
  11: 0.60,
  12: 0.60,
};

// ====================================================================================
// SCRIPT LOGIC: Do not modify below this line
// ====================================================================================

/**
 * Main function to rebalance all skills
 */
async function rebalanceSkills() {
  console.log('Starting skill rebalancing...');

  // 1. Fetch all skills from the database
  const { data: skills, error } = await supabase.from('skills').select('*');

  if (error) {
    console.error('Error fetching skills:', error.message);
    return;
  }

  if (!skills || skills.length === 0) {
    console.log('No skills found to rebalance.');
    return;
  }

  console.log(`Found ${skills.length} skills to process.`);

  const updates = [];

  // 2. Calculate new base_value for each skill
  for (const skill of skills) {
    const { id, name, required_level, allowed_classes, energy_cost, cooldown_ms } = skill;

    // Determine modifiers
    const classKey = allowed_classes?.[0] || 'Default';
    const classMod = CLASS_MODIFIERS[classKey] ?? CLASS_MODIFIERS.Default;
    const apMod = AP_MODIFIERS[energy_cost] ?? 0.0;
    
    // Convert cooldown from ms to turns if needed, assuming 1 turn = 1000ms for this logic
    // This may need adjustment based on your game's turn duration.
    const cooldownTurns = Math.floor((cooldown_ms || 0) / 1000); 
    const cooldownMod = COOLDOWN_MODIFIERS[cooldownTurns] ?? 0.60; // Default to highest mod for long cooldowns

    // Calculate baseline value
    const baseline = (required_level - 1) * GROWTH_RATE + START_VALUE;

    // Calculate final value
    const finalValue = Math.round(
      baseline * (1 + classMod) * (1 + apMod) * (1 + cooldownMod)
    );

    updates.push({ id, name, old_value: skill.base_value, new_value: finalValue });

    // 3. Update the skill in the database
    const { error: updateError } = await supabase
      .from('skills')
      .update({ base_value: finalValue })
      .eq('id', id);

    if (updateError) {
      console.error(`Failed to update skill "${name}" (ID: ${id}):`, updateError.message);
    }
  }

  // 4. Log the changes
  console.log('\nRebalancing Complete. Summary of changes:');
  console.table(updates.map(u => ({ 
    ID: u.id, 
    Skill: u.name, 
    'Old Value': u.old_value, 
    'New Value': u.new_value 
  })));

  console.log(`\nSuccessfully updated ${updates.length} skills.`);
}

// Run the script
rebalanceSkills().catch(console.error);
