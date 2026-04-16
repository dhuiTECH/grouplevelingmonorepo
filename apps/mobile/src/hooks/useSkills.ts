import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { SKILL_DATA, SkillNode, getStarterSkillIdForClass, normalizeClassKey } from '@/utils/skillTreeData';
import { useGameDataStore } from '@/store/useGameDataStore';
import { useUserGameDataStore } from '@/store/useUserGameDataStore';

export interface UserSkill {
  id: string;
  user_id: string;
  skill_id: string;
  current_rank: number;
  unlocked_at: string;
}

const padLoadoutToFour = (arr: string[]): string[] => {
  const out = [...arr];
  while (out.length < 4) out.push('');
  return out.slice(0, 4);
};

const dedupeLoadout = (arr: string[]): string[] => {
  const seen = new Set<string>();
  return arr.map((id) => {
    const key = id || '__empty';
    if (key !== '__empty' && seen.has(id)) return '';
    if (id) seen.add(id);
    return id;
  });
};

const dedupeAbilitiesById = <T extends { id: string }>(abilities: T[]): T[] => {
  const seen = new Set<string>();
  return abilities.filter((a) => {
    if (seen.has(a.id)) return false;
    seen.add(a.id);
    return true;
  });
};

const dedupeAbilitiesByName = <T extends { name?: string }>(abilities: T[]): T[] => {
  const seen = new Set<string>();
  return abilities.filter((a) => {
    const key = (a.name ?? '').trim() || '__unnamed';
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
};

export const getBasicAttackId = (className: string | undefined): string => {
  if (!className) return 'warrior_basic';
  const c = className.toLowerCase();
  return c === 'fighter' ? 'warrior_basic' : `${c}_basic`;
};

function normalizeClassStr(s: string): string {
  const t = String(s ?? '').trim();
  if (!t) return t;
  return t.charAt(0).toUpperCase() + t.slice(1).toLowerCase();
}

function rowMatchesClass(row: Record<string, unknown>, dbClassKey: string): boolean {
  const allowed = row.allowed_classes;
  if (Array.isArray(allowed)) {
    const match = (c: string) => {
      const n = normalizeClassStr(c);
      return n === dbClassKey || (dbClassKey === 'Warrior' && n === 'Fighter');
    };
    if ((allowed as string[]).some(match)) return true;
  }
  const v = row.class_key ?? row.class ?? row.character_class;
  const rowClass = normalizeClassStr(String(v ?? ''));
  if (rowClass === dbClassKey) return true;
  if (dbClassKey === 'Warrior' && rowClass === 'Fighter') return true;
  return false;
}

function mapSkillRowToNode(row: Record<string, unknown>): SkillNode {
  const id = String(row.id ?? '');
  const name = String(row.name ?? row.display_name ?? id);
  const typeRaw = String(row.type ?? row.skill_type ?? 'active').toLowerCase();
  const x = Number(row.x ?? row.x_pos ?? row.position_x ?? 50);
  const y = Number(row.y ?? row.y_pos ?? row.position_y ?? 0);
  const maxRank = Number(row.max_rank ?? row.maxRank ?? 1);
  const requiredLevel = Number(row.required_level ?? row.requiredLevel ?? 1);
  const requiredTitle = String(row.required_title ?? row.requiredTitle ?? 'Novice');
  const rawConn = row.connected_to ?? row.connectedTo ?? row.prerequisites ?? row.prerequisite_ids;
  const singlePrereq = row.required_skill_id;
  const connectedTo = Array.isArray(rawConn)
    ? (rawConn as string[]).filter(Boolean)
    : singlePrereq != null && singlePrereq !== ''
      ? [String(singlePrereq)]
      : undefined;
  const description = String(
    row.description ?? row.description_template ?? row.desc ?? ''
  );
  const cooldown = Number(row.cooldown ?? row.cooldown_ms ?? 0);
  const iconPath = String(row.icon_path ?? row.iconPath ?? '');
  return {
    id,
    name,
    type: typeRaw === 'passive' ? 'passive' : 'active',
    x,
    y,
    maxRank,
    requiredLevel,
    requiredTitle,
    cooldown,
    iconPath: iconPath || undefined,
    connectedTo: connectedTo?.length ? connectedTo : undefined,
    getDescription: () => description,
  };
}

function isStarterSkillRow(row: Record<string, unknown>): boolean {
  const level = Number(row.required_level ?? row.requiredLevel ?? 1);
  const rawConn = row.connected_to ?? row.connectedTo ?? row.prerequisites ?? row.prerequisite_ids;
  const singlePrereq = row.required_skill_id;
  const hasPrereqs =
    (Array.isArray(rawConn) && (rawConn as string[]).length > 0) ||
    (singlePrereq != null && singlePrereq !== '');
  return level === 1 && !hasPrereqs;
}

function getBattleFieldsFromRow(row: Record<string, unknown> | null | undefined) {
  if (!row) return { name: '', cost: 1, basePower: 50, type: 'damage', element: 'Physical', cooldown: 0, description: '', target_type: 'enemy' };
  const rawType = String(row.skill_type ?? row.skillType ?? row.type ?? 'damage').toLowerCase();
  const isDamageType = ['physical', 'magic', 'burst', 'damage', 'aoe', 'attack'].includes(rawType);
  return {
    name: String(row.name ?? row.display_name ?? ''),
    cost: Number(row.energy_cost ?? row.energyCost ?? 1),
    basePower: Number(row.base_value ?? row.baseValue ?? 50),
    type: isDamageType ? 'damage' : rawType,
    element: String(row.element ?? 'Physical'),
    cooldown: Number(row.cooldown_ms ?? row.cooldownMs ?? row.cooldown ?? 0),
    description: String(row.description ?? row.description_template ?? row.desc ?? ''),
    target_type: String(row.target_type ?? 'enemy'),
  };
}

const GENERIC_ATTACK_FALLBACK = {
  id: 'generic_attack',
  name: 'Generic Attack',
  cost: 0,
  power: 50,
  type: 'damage',
  element: 'Physical',
  hits: 1,
  target: 'Single',
  description: 'Deal 100% ATK.',
  current_rank: 1,
  cooldown: 0,
};

export const useSkills = (userId?: string) => {
  const { user } = useAuth();
  const effectiveUserId = userId || user?.id;

  const storeSkills = useGameDataStore((s) => s.skills);
  const storeHydrated = useGameDataStore((s) => s._hasHydrated);
  const userStoreHydrated = useUserGameDataStore((s) => s._hasHydrated);
  const cachedUserSkills = useUserGameDataStore((s) => effectiveUserId ? s.userSkills[effectiveUserId] : undefined);
  const cachedLoadout = useUserGameDataStore((s) => effectiveUserId ? s.skillLoadout[effectiveUserId] : undefined);

  const [unlockedSkills, setUnlockedSkills] = useState<UserSkill[]>(cachedUserSkills ?? []);
  const [loadout, setLoadout] = useState<string[]>(
    cachedLoadout ? padLoadoutToFour(dedupeLoadout(cachedLoadout)) : [],
  );
  const [skillDefinitions, setSkillDefinitions] = useState<any[]>(
    storeHydrated && storeSkills.length > 0 ? storeSkills : [],
  );
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (storeHydrated && storeSkills.length > 0 && skillDefinitions.length === 0) {
      setSkillDefinitions(storeSkills);
    }
  }, [storeHydrated, storeSkills]);

  useEffect(() => {
    if (!userStoreHydrated || !effectiveUserId) return;
    if (cachedUserSkills && cachedUserSkills.length > 0 && unlockedSkills.length === 0) {
      setUnlockedSkills(cachedUserSkills);
    }
    if (cachedLoadout && cachedLoadout.length > 0 && loadout.every(l => !l)) {
      setLoadout(padLoadoutToFour(dedupeLoadout(cachedLoadout)));
    }
  }, [userStoreHydrated, effectiveUserId]);

  const getClassKeyForDb = (classKey: string) =>
    classKey === 'Fighter' ? 'Warrior' : classKey;

  const getSkillTreeForClass = useCallback((classKey: string): SkillNode[] => {
    const dbKey = getClassKeyForDb(classKey);
    const rows = (skillDefinitions as Record<string, unknown>[]).filter((row) =>
      rowMatchesClass(row, dbKey)
    );
    if (!rows.length) return [];
    return rows.map(mapSkillRowToNode).sort((a, b) => a.y - b.y || a.x - b.x);
  }, [skillDefinitions]);

  const getSkillNode = (skillId: string): SkillNode | undefined => {
    const def = (skillDefinitions as Record<string, unknown>[]).find(
      (r) => String(r?.id ?? '') === skillId
    );
    if (def) return mapSkillRowToNode(def);
    for (const className in SKILL_DATA) {
      const skill = SKILL_DATA[className].find(s => s.id === skillId);
      if (skill) return skill;
    }
    return undefined;
  };

  useEffect(() => {
    if (!effectiveUserId) {
      setLoading(false);
      return;
    }

    const hasCachedData = storeHydrated && storeSkills.length > 0
      && userStoreHydrated && cachedUserSkills && cachedUserSkills.length > 0;

    if (hasCachedData) {
      setSkillDefinitions(storeSkills);
      setUnlockedSkills(cachedUserSkills!);
      if (cachedLoadout) setLoadout(padLoadoutToFour(dedupeLoadout(cachedLoadout)));
      else if (Array.isArray(user?.skill_loadout)) setLoadout(padLoadoutToFour(dedupeLoadout(user.skill_loadout)));
      setLoading(false);
      return;
    }

    const fetchData = async () => {
      setLoading(true);
      try {
        const [skillsResult, userSkillsResult, profileResult] = await Promise.all([
          supabase.from('skills').select('*'),
          supabase.from('user_skills').select('*').eq('user_id', effectiveUserId),
          supabase.from('profiles').select('skill_loadout').eq('id', effectiveUserId).single(),
        ]);

        const allSkills = skillsResult.data;
        if (!skillsResult.error && allSkills) {
          setSkillDefinitions(allSkills);
          useGameDataStore.getState().setAll({ skills: allSkills });
        }

        if (userSkillsResult.error) throw userSkillsResult.error;
        let finalUserSkills = userSkillsResult.data || [];

        const userLevel = user?.level ?? 0;
        const userClassName = user?.current_class;
        if (finalUserSkills.length === 0 && userLevel >= 1 && userClassName) {
          const classKeyForDb = normalizeClassKey(userClassName) === 'Fighter' ? 'Warrior' : normalizeClassKey(userClassName);
          const starterFromDb = (allSkills || []).find(
            (s: Record<string, unknown>) => rowMatchesClass(s, classKeyForDb) && isStarterSkillRow(s)
          );
          const starterSkillId = starterFromDb ? String(starterFromDb.id ?? '') : getStarterSkillIdForClass(userClassName);
          if (starterSkillId) {
            const { data: inserted, error: insertErr } = await supabase
              .from('user_skills')
              .insert({
                user_id: effectiveUserId,
                skill_id: starterSkillId,
                current_rank: 1,
              })
              .select()
              .single();
            if (!insertErr && inserted) finalUserSkills = [inserted];
          }
        }
        setUnlockedSkills(finalUserSkills);
        useUserGameDataStore.getState().setUserSkills(effectiveUserId, finalUserSkills);

        if (profileResult.error) throw profileResult.error;
        const raw = profileResult.data?.skill_loadout ?? [];
        const finalLoadout = padLoadoutToFour(dedupeLoadout(raw));
        setLoadout(finalLoadout);
        useUserGameDataStore.getState().setSkillLoadout(effectiveUserId, raw);
      } catch (err) {
        console.error('Error fetching skills data:', err);
        if (Array.isArray(user?.skill_loadout)) {
          setLoadout(padLoadoutToFour(dedupeLoadout(user.skill_loadout)));
        }
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [effectiveUserId, user?.level, user?.current_class, user?.skill_loadout]);

  const getBattleSkills = () => {
    if (!effectiveUserId) return [];
    const basicAttackId = getBasicAttackId(user?.current_class);
    const seenLoadoutIds = new Set<string>();
    const activeLoadout = loadout.filter((id): id is string => {
      if (!id || !unlockedSkills.some(s => s.skill_id === id)) return false;
      if (seenLoadoutIds.has(id)) return false;
      seenLoadoutIds.add(id);
      return true;
    });

    const fromLoadout = activeLoadout.map(skillId => {
      const def = (skillDefinitions as Record<string, unknown>[]).find((s) => String(s?.id ?? '') === skillId);
      const node = getSkillNode(skillId);
      const userSkill = unlockedSkills.find(s => s.skill_id === skillId);

      if (!userSkill) return null;
      if (!def && !node) return null;

      const rank = userSkill?.current_rank || 1;
      const battle = getBattleFieldsFromRow(def);
      const name = battle.name || node?.name || 'Unknown Skill';
      const power = battle.basePower + (rank * 10);
      const description = node ? node.getDescription(rank) : (battle.description || 'No description');

      return {
        id: skillId,
        name,
        cost: battle.cost,
        power,
        type: battle.type,
        element: battle.element,
        hits: 1,
        target: battle.target_type,
        target_type: battle.target_type,
        description,
        current_rank: rank,
        cooldown: battle.cooldown,
      };
    }).filter(Boolean) as any[];

    const loadoutSansBasic = fromLoadout.filter((a: any) => a.id !== basicAttackId);

    const def = (skillDefinitions as Record<string, unknown>[]).find((s) => String(s?.id ?? '') === basicAttackId);
    const node = getSkillNode(basicAttackId);
    const userSkill = unlockedSkills.find(s => s.skill_id === basicAttackId);
    const rank = userSkill?.current_rank || 1;

    const basicAbility = def || node
      ? (() => {
          const battle = getBattleFieldsFromRow(def);
          return {
            id: basicAttackId,
            name: battle.name || node?.name || 'Basic Attack',
            cost: battle.cost,
            power: battle.basePower + (rank * 10),
            type: battle.type,
            element: battle.element,
            hits: 1,
            target: battle.target_type,
            target_type: battle.target_type,
            description: node ? node.getDescription(rank) : (battle.description || 'Basic attack.'),
            current_rank: rank,
            cooldown: battle.cooldown,
          };
        })()
      : { ...GENERIC_ATTACK_FALLBACK, target: 'enemy', target_type: 'enemy' };

    return dedupeAbilitiesByName(dedupeAbilitiesById([basicAbility, ...loadoutSansBasic]));
  };

  const updateLoadout = async (newLoadout: string[]) => {
    if (!effectiveUserId) return;
    const padded = padLoadoutToFour(dedupeLoadout(newLoadout));
    setLoadout(padded);
    useUserGameDataStore.getState().setSkillLoadout(effectiveUserId, padded);
    const { error } = await supabase
      .from('profiles')
      .update({ skill_loadout: padded })
      .eq('id', effectiveUserId);

    if (error) {
      console.error('Failed to update loadout:', error);
    }
  };

  const unlockSkill = async (skillId: string) => {
    if (!effectiveUserId) return;

    try {
      const { data, error } = await supabase
        .from('user_skills')
        .insert({
          user_id: effectiveUserId,
          skill_id: skillId,
          current_rank: 1
        })
        .select()
        .single();

      if (error) throw error;

      if (data) {
        setUnlockedSkills(prev => {
          const updated = [...prev, data];
          useUserGameDataStore.getState().setUserSkills(effectiveUserId, updated);
          return updated;
        });
      }
      return { success: true };
    } catch (err) {
      console.error('Error unlocking skill:', err);
      return { success: false, error: err };
    }
  };

  const upgradeSkill = async (skillId: string) => {
    if (!effectiveUserId) return;

    const currentSkill = unlockedSkills.find(s => s.skill_id === skillId);
    if (!currentSkill) return { success: false, error: 'Skill not unlocked' };

    const nextRank = currentSkill.current_rank + 1;

    try {
      const { data, error } = await supabase
        .from('user_skills')
        .update({ current_rank: nextRank })
        .eq('id', currentSkill.id)
        .select()
        .single();

      if (error) throw error;

      if (data) {
        setUnlockedSkills(prev => {
          const updated = prev.map(s => s.id === data.id ? data : s);
          useUserGameDataStore.getState().setUserSkills(effectiveUserId, updated);
          return updated;
        });
      }
      return { success: true };
    } catch (err) {
      console.error('Error upgrading skill:', err);
      return { success: false, error: err };
    }
  };

  return { 
    loading,
    loadout, 
    unlockedSkills, 
    skillDefinitions,
    getSkillTreeForClass,
    getBattleSkills,
    updateLoadout,
    getSkillNode,
    unlockSkill,
    upgradeSkill
  };
};
