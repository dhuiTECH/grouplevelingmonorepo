// lib/stats.ts
import { User, RANKS } from '@/lib/types';
import { supabase } from '@/lib/supabase';

export const calculatePlayerStats = (profile: any) => {
  if (!profile) return { maxHP: 100, maxMP: 50 };

  const { 
    level = 1, 
    end_stat = 10, 
    int_stat = 10, 
    wil_stat = 10, 
    current_class = 'None',
    user_skills = [] // Assuming user_skills joined in profile or passed separately
  } = profile;

  // Calculate Base Stats first
  let bonusHP = 0;
  let bonusMP = 0;

  // Check for Stat Boost Passives
  if (Array.isArray(user_skills)) {
    user_skills.forEach((us: any) => {
      if (us.skills?.bonus_type === 'stat_hp') {
        bonusHP += (us.skills.base_value || 0) * (us.current_rank || 1);
      }
    });
  }

  // --- 1. HP CALCULATION (Matches regenerate-hp-mp.sql) ---
  // SQL: 100 + (Level * 10) + (END * Multiplier) + (WIL - 10)
  const baseHpStructure = 100 + (level * 10);
  
  // Tankers get 2x HP from Endurance
  const endMultiplier = current_class === 'Tanker' ? 10 : 5;
  
  // Vitality Bonus (Willpower)
  const vitalityBonus = Math.max(0, wil_stat - 10);

  const maxHP = baseHpStructure + (end_stat * endMultiplier) + vitalityBonus + bonusHP;

  // --- 2. MP CALCULATION (Matches regenerate-hp-mp.sql) ---
  // SQL: 50 + (INT * 10)
  const maxMP = 50 + (int_stat * 10) + bonusMP;

  return { maxHP, maxMP };
};

export const getExpProgress = (currentExp: number, currentLevel: number) => {
  // We use a standardized formula to approximate your DB Table
  // This ensures the UI can predict the NEXT level without fetching the whole table
  // Formula: Next Level = (CurrentLevel ^ 2) * 100
  
  const xpForCurrentLevel = Math.pow(currentLevel - 1, 2) * 100;
  const xpForNextLevel = Math.pow(currentLevel, 2) * 100;
  
  const currentProgress = currentExp - xpForCurrentLevel;
  const totalNeeded = xpForNextLevel - xpForCurrentLevel;
  
  return {
    current: Math.max(0, currentProgress),
    total: Math.max(100, totalNeeded), // Prevent divide by zero
    percent: Math.min(100, Math.max(0, (currentProgress / totalNeeded) * 100))
  };
};

export const calculateLevel = (exp: number): number => {
  const level = Math.floor(Math.sqrt(exp / 100)) + 1;
  console.log(`🎯 Level calculation: ${exp} EXP → Level ${level}`);
  return level;
};

export const getRank = (level: number): string => {
  if (level < 10) return 'E';
  if (level < 25) return 'D';
  if (level < 45) return 'C';
  if (level < 70) return 'B';
  if (level < 90) return 'A';
  return 'S';
};

/**
 * Calculates derived stats synchronously.
 * To include association buffs, fetch them separately and pass them in.
 */
export function calculateDerivedStats(user: User, associationBuffs?: { exp_buff_percent: number, gold_buff_percent: number }, userSkills: any[] = []) {
  const {
    level = 1,
    str_stat = 10,
    spd_stat = 10,
    end_stat = 10,
    int_stat = 10,
    lck_stat = 10,
    per_stat = 10,
    wil_stat = 10,
    current_class = 'None'
  } = user;

  let moveSpeedBonus = 0;
  let flatStr = 0;
  let flatInt = 0;
  let expMultiplier = 1;
  let goldMultiplier = 1;

  // 1. Association Buffs
  if (associationBuffs) {
    expMultiplier += (associationBuffs.exp_buff_percent || 0) / 100;
    goldMultiplier += (associationBuffs.gold_buff_percent || 0) / 100;
  }

  // 2. Passive Skill Buffs
  if (userSkills && userSkills.length > 0) {
      userSkills.forEach((us) => {
        const skill = us.skills; 
        if (!skill || !skill.bonus_type || skill.bonus_type === 'none') return;

        const rank = us.current_rank || 1;
        const value = (skill.base_value || 0) * rank;

        if (skill.bonus_type === 'coin_boost') goldMultiplier += value / 100;
        else if (skill.bonus_type === 'exp_boost') expMultiplier += value / 100;
        else if (skill.bonus_type === 'speed_boost') moveSpeedBonus += value;
        else if (skill.bonus_type === 'stat_str') flatStr += value;
        else if (skill.bonus_type === 'stat_int') flatInt += value;
      });
  }

  // Pass userSkills to calculatePlayerStats if it's updated to use them
  const stats = calculatePlayerStats({ ...user, user_skills: userSkills });

  // Attack: (Strength * 2) + (level * 1.5) + Flat Bonus
  const attackDamage = ((str_stat + flatStr) * 2) + (level * 1.5);

  // Magic Power: (Intelligence * 2) + (level * 1.5) + Flat Bonus
  const magicPower = ((int_stat + flatInt) * 2) + (level * 1.5);


  const critPercent = (spd_stat * 0.5) + (per_stat * 0.2);

  const critDamageMultiplier = 1.5 + ((per_stat - 10) * 0.005);

  const hpRegenRate = 0.5 + ((wil_stat - 10) * 0.25);

  const mpRegenRate = 0.3 + ((wil_stat - 10) * 0.125);

  return {
    maxHP: stats.maxHP,
    maxMP: stats.maxMP,
    attackDamage,
    magicPower,
    critPercent,
    critDamageMultiplier,
    hpRegenRate,
    mpRegenRate,
    expMultiplier,
    goldMultiplier,
    moveSpeedBonus,
  };
}

/**
 * Helper to fetch association buffs asynchronously.
 */
export async function fetchAssociationBuffs(associationId: string) {
  try {
    const { data: association, error } = await supabase
      .from('associations')
      .select('exp_buff_percent, gold_buff_percent')
      .eq('id', associationId)
      .single();

    if (error) throw error;
    return association;
  } catch (error) {
    console.error('Error fetching association buffs:', error);
    return null;
  }
}

export async function regenerateHPMP(user: User, minutes: number = 1) {
  // We can fetch association buffs here since regenerateHPMP is already async
  let associationBuffs = null;
  if (user.association_id) {
    associationBuffs = await fetchAssociationBuffs(user.association_id);
  }

  const derivedStats = calculateDerivedStats(user, associationBuffs || undefined);
  const hpRegen = Math.floor(derivedStats.hpRegenRate * minutes);
  const mpRegen = Math.floor(derivedStats.mpRegenRate * minutes);

  return {
    hpRegen,
    mpRegen,
    newHP: Math.min((user.current_hp || 0) + hpRegen, derivedStats.maxHP),
    newMP: Math.min((user.current_mp || 0) + mpRegen, derivedStats.maxMP)
  };
}
