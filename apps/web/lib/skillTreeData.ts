export interface SkillNode {
  id: string;
  name: string;
  type: 'active' | 'passive';
  x: number; // Position as percentage (0-100)
  y: number; // Position as percentage (0-100)
  maxRank: number;
  requiredLevel: number;
  requiredTitle: string;
  cooldown: number; // Cooldown in turns
  connectedTo?: string[]; // Parent skill IDs
  getDescription: (rank: number) => string;
}

// Skill tree data for different classes
export const SKILL_DATA: Record<string, SkillNode[]> = {
  'Assassin': [
    // Tier 0 - Basic Attack
    {
      id: 'assassin_basic',
      name: 'Quick Slash',
      type: 'active',
      x: 50,
      y: 5,
      maxRank: 1,
      requiredLevel: 0,
      requiredTitle: 'Novice',
      cooldown: 0,
      getDescription: (rank) => `Basic attack. Deals 100% ATK. Restores 1 AP.`
    },
    // Tier 1 - Basic Skills
    {
      id: 'assassin_strike',
      name: 'Shadow Rhythm',
      type: 'active',
      x: 50,
      y: 15,
      maxRank: 5,
      requiredLevel: 1,
      requiredTitle: 'Novice',
      cooldown: 0,
      connectedTo: ['assassin_basic'],
      getDescription: (rank) => `Timed Hit: Press at impact to deal ${rank * 20}% bonus damage.`
    },
    {
      id: 'assassin_dodge',
      name: 'Perfect Step',
      type: 'passive',
      x: 40,
      y: 25,
      maxRank: 3,
      requiredLevel: 1,
      requiredTitle: 'Novice',
      cooldown: 0,
      connectedTo: ['assassin_strike'],
      getDescription: (rank) => `Perfect Dodge window increased by ${rank * 0.1}s. Counter after dodging.`
    },
    {
      id: 'assassin_poison',
      name: 'Venom Coat',
      type: 'active',
      x: 60,
      y: 25,
      maxRank: 4,
      requiredLevel: 1,
      requiredTitle: 'Novice',
      cooldown: 3,
      connectedTo: ['assassin_strike'],
      getDescription: (rank) => `Coat weapon. Next ${rank + 2} hits apply stacking poison.`
    },

    // Tier 2 - Intermediate Skills
    {
      id: 'assassin_backstab',
      name: 'Shadowstep Strike',
      type: 'active',
      x: 50,
      y: 40,
      maxRank: 5,
      requiredLevel: 5,
      requiredTitle: 'Apprentice',
      connectedTo: ['assassin_dodge', 'assassin_poison'],
      cooldown: 2,
      getDescription: (rank) => `Teleport behind enemy. timed Hit: ${rank * 30}% Crit Chance.`
    },
    {
      id: 'assassin_smoke',
      name: 'Smoke Bomb',
      type: 'active',
      x: 30,
      y: 50,
      maxRank: 3,
      requiredLevel: 5,
      requiredTitle: 'Apprentice',
      connectedTo: ['assassin_backstab'],
      cooldown: 4,
      getDescription: (rank) => `Blind enemies. Successive QTEs extend duration by ${rank} turn(s).`
    },
    {
      id: 'assassin_bleed',
      name: 'Expose Weakness',
      type: 'passive',
      x: 70,
      y: 50,
      maxRank: 4,
      requiredLevel: 5,
      requiredTitle: 'Apprentice',
      connectedTo: ['assassin_backstab'],
      cooldown: 0,
      getDescription: (rank) => `Critical hits extend debuff durations by ${rank} turn(s).`
    },

    // Tier 3 - Advanced Skills
    {
      id: 'assassin_invisible',
      name: 'Phantom Veil',
      type: 'active',
      x: 50,
      y: 65,
      maxRank: 3,
      requiredLevel: 10,
      requiredTitle: 'Journeyman',
      connectedTo: ['assassin_smoke', 'assassin_bleed'],
      cooldown: 5,
      getDescription: (rank) => `Enter Stealth. Next attack deals ${rank * 50}% dmg. QTE to maintain stealth.`
    },
    {
      id: 'assassin_combo',
      name: 'Chain Reaction',
      type: 'passive',
      x: 50,
      y: 75,
      maxRank: 5,
      requiredLevel: 10,
      requiredTitle: 'Journeyman',
      connectedTo: ['assassin_invisible'],
      cooldown: 0,
      getDescription: (rank) => `Perfect hits restore ${rank * 2} AP.`
    },
    {
      id: 'assassin_execute',
      name: 'Fatal Flourish',
      type: 'active',
      x: 50,
      y: 85,
      maxRank: 4,
      requiredLevel: 10,
      requiredTitle: 'Journeyman',
      connectedTo: ['assassin_combo'],
      cooldown: 4,
      getDescription: (rank) => `Multi-hit QTE. Execute enemies below ${rank * 10}% HP.`
    },

    // Tier 4 - Master Skills
    {
      id: 'assassin_ultimate',
      name: 'Death Blossom',
      type: 'active',
      x: 50,
      y: 95,
      maxRank: 1,
      requiredLevel: 15,
      requiredTitle: 'Adept',
      connectedTo: ['assassin_execute'],
      cooldown: 8,
      getDescription: (rank) => `Rapid-fire QTE sequence dealing massive damage to all enemies.`
    }
  ],

  'Warrior': [
    // Tier 0
    {
      id: 'warrior_basic',
      name: 'Slash',
      type: 'active',
      x: 50,
      y: 5,
      maxRank: 1,
      requiredLevel: 0,
      requiredTitle: 'Novice',
      cooldown: 0,
      getDescription: (rank) => `Basic attack. Deals 100% ATK. Restores 1 AP.`
    },
    // Tier 1 - Basic Skills
    {
      id: 'warrior_bash',
      name: 'Heavy Smash',
      type: 'active',
      x: 50,
      y: 15,
      maxRank: 5,
      requiredLevel: 1,
      requiredTitle: 'Novice',
      cooldown: 0,
      connectedTo: ['warrior_basic'],
      getDescription: (rank) => `Hold & Release timing. Deals ${rank * 25}% bonus dmg on perfect release.`
    },
    {
      id: 'warrior_endurance',
      name: 'Iron Will',
      type: 'passive',
      x: 20,
      y: 25,
      maxRank: 4,
      requiredLevel: 1,
      requiredTitle: 'Novice',
      cooldown: 0,
      connectedTo: ['warrior_basic'],
      getDescription: (rank) => `Perfect Parries restore ${rank * 5} HP.`
    },
    {
      id: 'warrior_charge',
      name: 'Shoulder Check',
      type: 'active',
      x: 80,
      y: 25,
      maxRank: 3,
      requiredLevel: 1,
      requiredTitle: 'Novice',
      cooldown: 2,
      connectedTo: ['warrior_basic'],
      getDescription: (rank) => `Interrupt enemy cast. Success chance increases with Rank (${rank * 15}%).`
    },

    // Tier 2 - Intermediate Skills
    {
      id: 'warrior_taunt',
      name: 'Challenging Shout',
      type: 'active',
      x: 50,
      y: 40,
      maxRank: 4,
      requiredLevel: 5,
      requiredTitle: 'Apprentice',
      connectedTo: ['warrior_bash'],
      cooldown: 3,
      getDescription: (rank) => `Taunt all enemies. Perfect timing blocks first incoming hit.`
    },
    {
      id: 'warrior_armor',
      name: 'Spiked Armor',
      type: 'passive',
      x: 10,
      y: 50,
      maxRank: 5,
      requiredLevel: 5,
      requiredTitle: 'Apprentice',
      connectedTo: ['warrior_endurance'],
      cooldown: 0,
      getDescription: (rank) => `Reflect ${rank * 10}% damage on missed enemy attacks.`
    },
    {
      id: 'warrior_cleave',
      name: 'Wide Swing',
      type: 'active',
      x: 90,
      y: 50,
      maxRank: 4,
      requiredLevel: 5,
      requiredTitle: 'Apprentice',
      connectedTo: ['warrior_charge'],
      cooldown: 2,
      getDescription: (rank) => `Timed Hit: Cleave hits ${rank + 1} enemies.`
    },

    // Tier 3 - Advanced Skills
    {
      id: 'warrior_rage',
      name: 'Blood Rage',
      type: 'active',
      x: 50,
      y: 65,
      maxRank: 3,
      requiredLevel: 10,
      requiredTitle: 'Journeyman',
      connectedTo: ['warrior_taunt'],
      cooldown: 5,
      getDescription: (rank) => `Sacrifice HP for DMG. QTE determines buff potency (${rank}x).`
    },
    {
      id: 'warrior_shield_wall',
      name: 'Phalanx',
      type: 'active',
      x: 15,
      y: 75,
      maxRank: 3,
      requiredLevel: 10,
      requiredTitle: 'Journeyman',
      connectedTo: ['warrior_armor'],
      cooldown: 4,
      getDescription: (rank) => `Party takes -${rank * 20}% dmg. You take redirected dmg.`
    },
    {
      id: 'warrior_whirlwind',
      name: 'Blade Storm',
      type: 'active',
      x: 85,
      y: 75,
      maxRank: 4,
      requiredLevel: 10,
      requiredTitle: 'Journeyman',
      connectedTo: ['warrior_cleave'],
      cooldown: 3,
      getDescription: (rank) => `Mash button to spin. Duration up to ${rank * 2}s.`
    },

    // Tier 4 - Master Skills
    {
      id: 'warrior_ultimate',
      name: 'Titan\'s Wrath',
      type: 'active',
      x: 50,
      y: 90,
      maxRank: 1,
      requiredLevel: 15,
      requiredTitle: 'Adept',
      connectedTo: ['warrior_rage'],
      cooldown: 8,
      getDescription: (rank) => `Earth-shattering slam. Requires 3-step combo input.`
    }
  ],

  'Mage': [
    // Tier 0
    {
      id: 'mage_basic',
      name: 'Mana Bolt',
      type: 'active',
      x: 50,
      y: 5,
      maxRank: 1,
      requiredLevel: 0,
      requiredTitle: 'Novice',
      cooldown: 0,
      getDescription: (rank) => `Basic magic attack. Deals 100% Magic DMG. Restores 1 AP.`
    },
    // Tier 1 - Basic Skills
    {
      id: 'mage_fireball',
      name: 'Ignite',
      type: 'active',
      x: 50,
      y: 15,
      maxRank: 5,
      requiredLevel: 1,
      requiredTitle: 'Novice',
      cooldown: 0,
      connectedTo: ['mage_basic'],
      getDescription: (rank) => `Trace sigil to cast. Speed determines DMG (${rank * 10}% bonus).`
    },
    {
      id: 'mage_mana_shield',
      name: 'Arcane Flux',
      type: 'passive',
      x: 25,
      y: 25,
      maxRank: 4,
      requiredLevel: 1,
      requiredTitle: 'Novice',
      cooldown: 0,
      connectedTo: ['mage_basic'],
      getDescription: (rank) => `Perfect casting refunds ${rank * 5} MP.`
    },
    {
      id: 'mage_frost',
      name: 'Glacial Spike',
      type: 'active',
      x: 75,
      y: 25,
      maxRank: 3,
      requiredLevel: 1,
      requiredTitle: 'Novice',
      cooldown: 3,
      connectedTo: ['mage_basic'],
      getDescription: (rank) => `Timed Hit: Shatters frozen targets for ${rank * 50}% dmg.`
    },

    // Tier 2 - Intermediate Skills
    {
      id: 'mage_lightning',
      name: 'Volt Arc',
      type: 'active',
      x: 50,
      y: 40,
      maxRank: 4,
      requiredLevel: 5,
      requiredTitle: 'Apprentice',
      connectedTo: ['mage_fireball'],
      cooldown: 2,
      getDescription: (rank) => `Rhythm input. Each correct beat jumps to new target (Max ${rank}).`
    },
    {
      id: 'mage_regen',
      name: 'Leyline Tap',
      type: 'passive',
      x: 25,
      y: 50,
      maxRank: 5,
      requiredLevel: 5,
      requiredTitle: 'Apprentice',
      connectedTo: ['mage_mana_shield'],
      cooldown: 0,
      getDescription: (rank) => `Idle restores ${rank}% MP per turn.`
    },
    {
      id: 'mage_teleport',
      name: 'Phase Shift',
      type: 'active',
      x: 75,
      y: 50,
      maxRank: 3,
      requiredLevel: 5,
      requiredTitle: 'Apprentice',
      connectedTo: ['mage_frost'],
      cooldown: 4,
      getDescription: (rank) => `Reaction Dodge. Teleport away from attack.`
    },

    // Tier 3 - Advanced Skills
    {
      id: 'mage_meteor',
      name: 'Cataclysm',
      type: 'active',
      x: 50,
      y: 65,
      maxRank: 3,
      requiredLevel: 10,
      requiredTitle: 'Journeyman',
      connectedTo: ['mage_lightning'],
      cooldown: 6,
      getDescription: (rank) => `Channel spell. Protect from interrupts for ${4 - rank} turns to cast.`
    },
    {
      id: 'mage_barrier',
      name: 'Aegis Rune',
      type: 'active',
      x: 25,
      y: 75,
      maxRank: 4,
      requiredLevel: 10,
      requiredTitle: 'Journeyman',
      connectedTo: ['mage_regen'],
      cooldown: 5,
      getDescription: (rank) => `Draw rune to shield ally. Size determines HP (${rank * 100}).`
    },
    {
      id: 'mage_clone',
      name: 'Fractal Illusion',
      type: 'active',
      x: 75,
      y: 75,
      maxRank: 3,
      requiredLevel: 10,
      requiredTitle: 'Journeyman',
      connectedTo: ['mage_teleport'],
      cooldown: 5,
      getDescription: (rank) => `Summon ${rank} clones that mimic your spells at 30% dmg.`
    },

    // Tier 4 - Master Skills
    {
      id: 'mage_ultimate',
      name: 'Void Singularity',
      type: 'active',
      x: 50,
      y: 90,
      maxRank: 1,
      requiredLevel: 15,
      requiredTitle: 'Adept',
      connectedTo: ['mage_meteor'],
      cooldown: 9,
      getDescription: (rank) => `Complex sigil input. Collapses reality on enemies.`
    }
  ],

  'Tanker': [
    // Tier 0
    {
      id: 'tank_basic',
      name: 'Shield Strike',
      type: 'active',
      x: 50,
      y: 5,
      maxRank: 1,
      requiredLevel: 0,
      requiredTitle: 'Novice',
      cooldown: 0,
      getDescription: (rank) => `Basic attack. Deals 80% ATK. Restores 1 AP. High Aggro.`
    },
    // Tier 1
    {
      id: 'tank_parry',
      name: 'Perfect Parry',
      type: 'active',
      x: 50,
      y: 15,
      maxRank: 5,
      requiredLevel: 1,
      requiredTitle: 'Novice',
      cooldown: 2,
      connectedTo: ['tank_basic'],
      getDescription: (rank) => `Timed Block. Negates dmg and reflects ${rank * 20}%.`
    },
    {
      id: 'tank_bulk',
      name: 'Colossus',
      type: 'passive',
      x: 40,
      y: 25,
      maxRank: 3,
      requiredLevel: 1,
      requiredTitle: 'Novice',
      cooldown: 0,
      connectedTo: ['tank_basic'],
      getDescription: (rank) => `HP +${rank * 100}. Speed -10%.`
    },
    {
      id: 'tank_provoke',
      name: 'War Cry',
      type: 'active',
      x: 60,
      y: 25,
      maxRank: 4,
      requiredLevel: 1,
      requiredTitle: 'Novice',
      cooldown: 3,
      connectedTo: ['tank_basic'],
      getDescription: (rank) => `Mash button to increase aggro radius.`
    },
    // Tier 2
    {
      id: 'tank_intercept',
      name: 'Intercept',
      type: 'active',
      x: 50,
      y: 40,
      maxRank: 5,
      requiredLevel: 5,
      requiredTitle: 'Apprentice',
      connectedTo: ['tank_parry'],
      cooldown: 4,
      getDescription: (rank) => `Reaction: Jump to ally taking lethal dmg.`
    },
    {
      id: 'tank_fortress',
      name: 'Mobile Fortress',
      type: 'passive',
      x: 35,
      y: 50,
      maxRank: 3,
      requiredLevel: 5,
      requiredTitle: 'Apprentice',
      connectedTo: ['tank_bulk'],
      cooldown: 0,
      getDescription: (rank) => `Defending restores ${rank * 2} AP.`
    },
    {
      id: 'tank_slam',
      name: 'Shield Slam',
      type: 'active',
      x: 65,
      y: 50,
      maxRank: 4,
      requiredLevel: 5,
      requiredTitle: 'Apprentice',
      connectedTo: ['tank_provoke'],
      cooldown: 3,
      getDescription: (rank) => `Timed Hit: Stuns enemy for ${rank} turn(s).`
    },
    // Tier 3
    {
      id: 'tank_reveng',
      name: 'Revenge Counter',
      type: 'active',
      x: 50,
      y: 65,
      maxRank: 3,
      requiredLevel: 10,
      requiredTitle: 'Journeyman',
      connectedTo: ['tank_intercept'],
      cooldown: 5,
      getDescription: (rank) => `Store taken dmg, unleash ${rank * 50}% of it in one hit.`
    },
    {
      id: 'tank_aura',
      name: 'Guardian Aura',
      type: 'passive',
      x: 45,
      y: 75,
      maxRank: 3,
      requiredLevel: 10,
      requiredTitle: 'Journeyman',
      connectedTo: ['tank_fortress'],
      cooldown: 0,
      getDescription: (rank) => `Allies gain ${rank * 5}% DEF while near you.`
    },
    {
      id: 'tank_unchained',
      name: 'Unchained',
      type: 'active',
      x: 55,
      y: 75,
      maxRank: 3,
      requiredLevel: 10,
      requiredTitle: 'Journeyman',
      connectedTo: ['tank_slam'],
      cooldown: 6,
      getDescription: (rank) => `Break all CC. Immune for ${rank} turns.`
    },
    // Tier 4
    {
      id: 'tank_ultimate',
      name: 'Immovable Object',
      type: 'active',
      x: 50,
      y: 90,
      maxRank: 1,
      requiredLevel: 15,
      requiredTitle: 'Adept',
      connectedTo: ['tank_reveng'],
      cooldown: 10,
      getDescription: (rank) => `Become invulnerable for 1 turn. Reflect 200% dmg.`
    }
  ],

  'Ranger': [
    // Tier 0
    {
      id: 'ranger_basic',
      name: 'Quick Shot',
      type: 'active',
      x: 50,
      y: 5,
      maxRank: 1,
      requiredLevel: 0,
      requiredTitle: 'Novice',
      cooldown: 0,
      getDescription: (rank) => `Basic attack. Deals 100% Ranged DMG. Restores 1 AP.`
    },
    // Tier 1
    {
      id: 'ranger_shot',
      name: 'Precision Shot',
      type: 'active',
      x: 30,
      y: 15,
      maxRank: 5,
      requiredLevel: 1,
      requiredTitle: 'Novice',
      cooldown: 0,
      connectedTo: ['ranger_basic'],
      getDescription: (rank) => `Align crosshair QTE. Weakspot hit deals ${rank * 30}% bonus.`
    },
    {
      id: 'ranger_focus',
      name: 'Hunter\'s Focus',
      type: 'passive',
      x: 10,
      y: 25,
      maxRank: 3,
      requiredLevel: 1,
      requiredTitle: 'Novice',
      cooldown: 0,
      connectedTo: ['ranger_shot'],
      getDescription: (rank) => `Crit Dmg +${rank * 10}%.`
    },
    {
      id: 'ranger_trap',
      name: 'Snare Trap',
      type: 'active',
      x: 70,
      y: 25,
      maxRank: 4,
      requiredLevel: 1,
      requiredTitle: 'Novice',
      cooldown: 3,
      connectedTo: ['ranger_basic'],
      getDescription: (rank) => `Place trap. Reaction: Trigger when enemy steps.`
    },
    // Tier 2
    {
      id: 'ranger_volley',
      name: 'Arrow Rain',
      type: 'active',
      x: 30,
      y: 40,
      maxRank: 5,
      requiredLevel: 5,
      requiredTitle: 'Apprentice',
      connectedTo: ['ranger_focus'],
      cooldown: 4,
      getDescription: (rank) => `Mash button to increase arrow count (Max ${rank * 5}).`
    },
    {
      id: 'ranger_dodge',
      name: 'Tumble',
      type: 'passive',
      x: 10,
      y: 50,
      maxRank: 3,
      requiredLevel: 5,
      requiredTitle: 'Apprentice',
      connectedTo: ['ranger_volley'],
      cooldown: 0,
      getDescription: (rank) => `Dodging loads special ammo (Explosive).`
    },
    {
      id: 'ranger_pet',
      name: 'Falcon Scout',
      type: 'active',
      x: 90,
      y: 50,
      maxRank: 3,
      requiredLevel: 5,
      requiredTitle: 'Apprentice',
      connectedTo: ['ranger_trap'],
      cooldown: 3,
      getDescription: (rank) => `Command pet to mark targets. Marked take +${rank * 15}% dmg.`
    },
    // Tier 3
    {
      id: 'ranger_snipe',
      name: 'Headshot',
      type: 'active',
      x: 30,
      y: 65,
      maxRank: 3,
      requiredLevel: 10,
      requiredTitle: 'Journeyman',
      connectedTo: ['ranger_dodge'],
      cooldown: 5,
      getDescription: (rank) => `Hold breath QTE. 1-hit kill on non-bosses below ${rank * 20}% HP.`
    },
    {
      id: 'ranger_pierce',
      name: 'Piercing Rounds',
      type: 'passive',
      x: 10,
      y: 75,
      maxRank: 3,
      requiredLevel: 10,
      requiredTitle: 'Journeyman',
      connectedTo: ['ranger_snipe'],
      cooldown: 0,
      getDescription: (rank) => `Attacks ignore ${rank * 15}% DEF.`
    },
    {
      id: 'ranger_retreat',
      name: 'Disengage',
      type: 'active',
      x: 70,
      y: 75,
      maxRank: 3,
      requiredLevel: 10,
      requiredTitle: 'Journeyman',
      connectedTo: ['ranger_pet'],
      cooldown: 4,
      getDescription: (rank) => `Backflip shot. Deals dmg and resets agro.`
    },
    // Tier 4
    {
      id: 'ranger_ultimate',
      name: 'Ballista Shot',
      type: 'active',
      x: 50,
      y: 90,
      maxRank: 1,
      requiredLevel: 15,
      requiredTitle: 'Adept',
      connectedTo: ['ranger_pierce', 'ranger_retreat'],
      cooldown: 8,
      getDescription: (rank) => `Charge up shot (3 turns). Deals 500% DMG.`
    }
  ],

  'Healer': [
    // Tier 0
    {
      id: 'heal_basic',
      name: 'Light Orb',
      type: 'active',
      x: 50,
      y: 5,
      maxRank: 1,
      requiredLevel: 0,
      requiredTitle: 'Novice',
      cooldown: 0,
      getDescription: (rank) => `Basic magic attack. Deals 100% Magic DMG. Restores 1 AP.`
    },
    // Tier 1
    {
      id: 'heal_light',
      name: 'Mend',
      type: 'active',
      x: 25,
      y: 15,
      maxRank: 5,
      requiredLevel: 1,
      requiredTitle: 'Novice',
      cooldown: 0,
      connectedTo: ['heal_basic'],
      getDescription: (rank) => `Rhythm healing. Matches beat for ${rank * 20}% bonus heal.`
    },
    {
      id: 'heal_faith',
      name: 'Faith',
      type: 'passive',
      x: 25,
      y: 25,
      maxRank: 3,
      requiredLevel: 1,
      requiredTitle: 'Novice',
      cooldown: 0,
      connectedTo: ['heal_light'],
      getDescription: (rank) => `Heals can crit for ${rank * 1.5}x amount.`
    },
    {
      id: 'heal_smite',
      name: 'Holy Smite',
      type: 'active',
      x: 75,
      y: 15,
      maxRank: 4,
      requiredLevel: 1,
      requiredTitle: 'Novice',
      cooldown: 2,
      connectedTo: ['heal_basic'],
      getDescription: (rank) => `Timed hit. Dmg scales with your max HP.`
    },
    // Tier 2
    {
      id: 'heal_aoe',
      name: 'Sanctuary',
      type: 'active',
      x: 25,
      y: 40,
      maxRank: 5,
      requiredLevel: 5,
      requiredTitle: 'Apprentice',
      connectedTo: ['heal_faith'],
      cooldown: 4,
      getDescription: (rank) => `Channel zone. Allies inside regen ${rank * 5}% HP/turn.`
    },
    {
      id: 'heal_barrier',
      name: 'Divine Shield',
      type: 'passive',
      x: 10,
      y: 50,
      maxRank: 3,
      requiredLevel: 5,
      requiredTitle: 'Apprentice',
      connectedTo: ['heal_aoe'],
      cooldown: 0,
      getDescription: (rank) => `Overheating grants shield (Max ${rank * 10}% HP).`
    },
    {
      id: 'heal_purge',
      name: 'Purify',
      type: 'active',
      x: 90,
      y: 50,
      maxRank: 3,
      requiredLevel: 5,
      requiredTitle: 'Apprentice',
      connectedTo: ['heal_smite'],
      cooldown: 3,
      getDescription: (rank) => `Reaction: Cleanse debuff instantly on application.`
    },
    // Tier 3
    {
      id: 'heal_res',
      name: 'Revive',
      type: 'active',
      x: 25,
      y: 65,
      maxRank: 3,
      requiredLevel: 10,
      requiredTitle: 'Journeyman',
      connectedTo: ['heal_barrier'],
      cooldown: 8,
      getDescription: (rank) => `Mash QTE to revive ally with ${rank * 20}% HP.`
    },
    {
      id: 'heal_bless',
      name: 'Blessing',
      type: 'passive',
      x: 10,
      y: 75,
      maxRank: 3,
      requiredLevel: 10,
      requiredTitle: 'Journeyman',
      connectedTo: ['heal_res'],
      cooldown: 0,
      getDescription: (rank) => `Buffs last ${rank} extra turn(s).`
    },
    {
      id: 'heal_wrath',
      name: 'Divine Wrath',
      type: 'active',
      x: 75,
      y: 75,
      maxRank: 3,
      requiredLevel: 10,
      requiredTitle: 'Journeyman',
      connectedTo: ['heal_purge'],
      cooldown: 5,
      getDescription: (rank) => `Convert all overhealing into AOE Dmg.`
    },
    // Tier 4
    {
      id: 'heal_ultimate',
      name: 'Miracle',
      type: 'active',
      x: 50,
      y: 90,
      maxRank: 1,
      requiredLevel: 15,
      requiredTitle: 'Adept',
      connectedTo: ['heal_bless', 'heal_wrath'],
      cooldown: 10,
      getDescription: (rank) => `Full party heal + 3 turns Invulnerability.`
    }
  ]
};

// Alias Fighter to Warrior
SKILL_DATA['Fighter'] = SKILL_DATA['Warrior'];

// Normalize class name so it matches SKILL_DATA keys (e.g. "assassin" -> "Assassin")
export function normalizeClassKey(className: string | undefined): string {
  if (!className) return 'Fighter';
  const normalized = className.charAt(0).toUpperCase() + className.slice(1).toLowerCase();
  // Check if the tree has actual nodes
  return (SKILL_DATA[normalized] && SKILL_DATA[normalized].length > 0) ? normalized : 'Fighter';
}

// Get the starter skill for a class (first level-1 skill with no prerequisites), if any
export function getStarterSkillIdForClass(className: string | undefined): string | null {
  const key = normalizeClassKey(className);
  const tree = SKILL_DATA[key];
  if (!tree?.length) return null;
  const starter = tree.find(s => s.requiredLevel === 1 && (!s.connectedTo || s.connectedTo.length === 0));
  return starter?.id ?? null;
}

// Default empty array for unknown classes
export const DEFAULT_SKILL_TREE: SkillNode[] = [];
