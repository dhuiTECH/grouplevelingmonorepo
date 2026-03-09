import { supabase } from '@/lib/supabase';

export interface SkillAnimationRow {
  id?: string;
  skill_id: string;
  sprite_url: string | null;
  sfx_url?: string | null;
  frame_count: number;
  frame_width: number;
  frame_height: number;
  frame_size?: number;
  offset_x?: number;
  offset_y?: number;
  preview_scale?: number | string;
  duration_ms: number;
  vfx_type?: 'impact' | 'projectile' | 'melee';
  [key: string]: unknown;
}

/** Map ability display name to skill_animations.skill_id (for when skills.id ≠ skill_animations.skill_id) */
const ABILITY_NAME_TO_SKILL_ID: Record<string, string> = {
  'Lionheart Burst': 'tanker_lionheartburst',
  'lionheart burst': 'tanker_lionheartburst',
  'Lionheart\'s Burst': 'tanker_lionheartburst',
  'lionheart\'s burst': 'tanker_lionheartburst',
  'Lion Heart Burst': 'tanker_lionheartburst',
  'lion heart burst': 'tanker_lionheartburst',
  'Chain Lightning': 'mage_t1_5',
  'chain lightning': 'mage_t1_5',
  'Quick Slash': 'assassin_basic',
  'quick slash': 'assassin_basic',
};

function slugify(name: string): string {
  return name.toLowerCase().replace(/['"´`]/g, '').replace(/\s+/g, '_').trim();
}

/** Case-insensitive lookup: if name contains "lionheart" and "burst" → tanker_lionheartburst */
function heuristicSkillId(abilityName: string): string | null {
  const lower = abilityName.toLowerCase().replace(/['"´`]/g, '');
  if (lower.includes('lionheart') && lower.includes('burst')) return 'tanker_lionheartburst';
  return null;
}

/**
 * Fetch a single skill_animations row by skill_id.
 * Returns null if not found or error.
 */
export async function fetchSkillAnimationBySkillId(skillId: string): Promise<SkillAnimationRow | null> {
  try {
    const { data, error } = await supabase
      .from('skill_animations')
      .select('*')
      .eq('skill_id', skillId)
      .maybeSingle();
    if (error) {
      console.warn('[skill_animations] fetch error for key:', skillId, error.message);
      return null;
    }
    return data as SkillAnimationRow | null;
  } catch (e) {
    console.warn('[skill_animations] fetch exception:', e);
    return null;
  }
}

/**
 * Fetch skill_animations row by skill_id, with fallback by ability name.
 * Tries: skillId (if provided) → ABILITY_NAME_TO_SKILL_ID[abilityName] → slugified abilityName.
 */
export async function fetchSkillAnimation(
  skillId?: string | null,
  abilityName?: string | null
): Promise<SkillAnimationRow | null> {
  const keysToTry: string[] = [];
  if (skillId && String(skillId).trim()) keysToTry.push(String(skillId).trim());
  if (abilityName && ABILITY_NAME_TO_SKILL_ID[abilityName]) keysToTry.push(ABILITY_NAME_TO_SKILL_ID[abilityName]);
  if (abilityName && typeof abilityName === 'string') {
    const slug = slugify(abilityName);
    if (slug && !keysToTry.includes(slug)) keysToTry.push(slug);
    const heuristic = heuristicSkillId(abilityName);
    if (heuristic && !keysToTry.includes(heuristic)) keysToTry.push(heuristic);
  }

  for (const key of keysToTry) {
    const row = await fetchSkillAnimationBySkillId(key);
    if (row) {
      return row;
    }
  }
  return null;
}
