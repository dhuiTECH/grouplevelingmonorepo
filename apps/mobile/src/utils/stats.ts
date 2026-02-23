import { User } from '@/types/user';
import { supabase } from '@/lib/supabase';

export const calculateLevel = (exp: number): number => {
  const level = Math.floor(Math.sqrt(exp / 100)) + 1;
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
export function calculateDerivedStats(user: User, associationBuffs?: { exp_buff_percent: number, gold_buff_percent: number }) {
  const {
    level = 1,
    str_stat = 10,
    spd_stat = 10,
    end_stat = 10,
    int_stat = 10,
    lck_stat = 10,
    per_stat = 10,
    wil_stat = 10,
  } = user;

  let expMultiplier = 1;
  let goldMultiplier = 1;

  if (associationBuffs) {
    expMultiplier += (associationBuffs.exp_buff_percent || 0) / 100;
    goldMultiplier += (associationBuffs.gold_buff_percent || 0) / 100;
  }

  // Base Stats (Fixed)
  const baseHP = 100;
  const baseMP = 50;

  // HP: Base + (Constitution * 5)
  const maxHP = baseHP + (end_stat * 5);

  // MP: Base + (Intelligence * 5)
  const maxMP = baseMP + (int_stat * 5);

  // Attack: (Strength * 2) + (Level * 1.5)
  const attackDamage = (str_stat * 2) + (level * 1.5);

  const critPercent = (spd_stat * 0.3) + (lck_stat * 0.2) + (per_stat * 0.1);

  const critDamageMultiplier = 1.5 + ((per_stat - 10) * 0.002);

  const hpRegenRate = 0.5 + ((wil_stat - 10) * 0.25);

  const mpRegenRate = 0.3 + ((wil_stat - 10) * 0.125);

  return {
    maxHP,
    maxMP,
    attackDamage,
    critPercent,
    critDamageMultiplier,
    hpRegenRate,
    mpRegenRate,
    expMultiplier,
    goldMultiplier,
  };
}

/**
 * Calculates total Combat Power (CP) for a hunter.
 * Combines base stats, level, and equipment bonuses.
 */
export function calculateCombatPower(user: any) {
  const {
    level = 1,
    str_stat = 10,
    spd_stat = 10,
    end_stat = 10,
    int_stat = 10,
    lck_stat = 10,
    per_stat = 10,
    wil_stat = 10,
    cosmetics = []
  } = user;

  // Base CP from stats
  const baseStatsSum = str_stat + spd_stat + end_stat + int_stat + lck_stat + per_stat + wil_stat;
  const baseCP = baseStatsSum * 10;
  
  // Level multiplier/bonus
  const levelCP = level * 100;
  
  // Equipment bonuses
  let equipmentCP = 0;
  if (cosmetics && Array.isArray(cosmetics)) {
    cosmetics.forEach((c: any) => {
      if (c.equipped) {
        const item = c.shop_items;
        if (item) {
          // Sum up all bonuses from the item
          if (item.bonuses && Array.isArray(item.bonuses)) {
            item.bonuses.forEach((b: any) => {
              equipmentCP += (b.value * 5);
            });
          } else if (item.bonus_type && item.bonus_value) {
            equipmentCP += (item.bonus_value * 5);
          }
        }
      }
    });
  }

  return Math.floor(baseCP + levelCP + equipmentCP);
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
  } catch (error: any) {
    console.error('Error fetching association buffs:', error);
    return null;
  }
}

export async function regenerateHPMP(user: User, minutes: number = 1) {
  // We can fetch association buffs here since regenerateHPMP is already async
  let associationBuffs = null;
  // Add a check for user.association_id to avoid error if it's not present
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