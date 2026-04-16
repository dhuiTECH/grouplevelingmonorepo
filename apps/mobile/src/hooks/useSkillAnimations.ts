import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useGameDataStore } from '@/store/useGameDataStore';

export interface SkillAnimationConfig {
  skill_id: string;
  sprite_url: string;
  sfx_url: string;
  frame_count: number;
  frame_size: number;
  duration_ms: number;
  vfx_type: string;
}

export interface SkillAnimationsResult {
  byId: Record<string, SkillAnimationConfig>;
  byName: Record<string, SkillAnimationConfig>;
}

function buildAnimMaps(
  animData: any[],
  skillsData: any[],
): SkillAnimationsResult {
  const byId: Record<string, SkillAnimationConfig> = {};
  (animData || []).forEach((row: any) => {
    if (row?.skill_id && row?.sprite_url) {
      byId[row.skill_id] = {
        skill_id: row.skill_id,
        sprite_url: row.sprite_url,
        sfx_url: row.sfx_url || '',
        frame_count: Math.max(1, Number(row.frame_count) || 1),
        frame_size: Math.max(1, Number(row.frame_size) || 128),
        duration_ms: Math.max(100, Number(row.duration_ms) || 500),
        vfx_type: row.vfx_type || 'impact',
      };
    }
  });
  const byName: Record<string, SkillAnimationConfig> = {};
  (skillsData || []).forEach((row: any) => {
    const name = row?.name?.trim();
    if (name && byId[row.id]) byName[name] = byId[row.id];
  });
  return { byId, byName };
}

export function useSkillAnimations(): SkillAnimationsResult {
  const storeAnims = useGameDataStore((s) => s.skillAnimations);
  const storeSkills = useGameDataStore((s) => s.skills);
  const storeHydrated = useGameDataStore((s) => s._hasHydrated);

  const [result, setResult] = useState<SkillAnimationsResult>(() => {
    if (storeHydrated && storeAnims.length > 0) {
      return buildAnimMaps(storeAnims, storeSkills);
    }
    return { byId: {}, byName: {} };
  });

  useEffect(() => {
    if (storeHydrated && storeAnims.length > 0 && Object.keys(result.byId).length === 0) {
      setResult(buildAnimMaps(storeAnims, storeSkills));
    }
  }, [storeHydrated, storeAnims, storeSkills]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data, error } = await supabase
        .from('skill_animations')
        .select('skill_id, sprite_url, sfx_url, frame_count, frame_size, duration_ms, vfx_type');
      if (error || cancelled) return;
      const { data: skillsData } = await supabase.from('skills').select('id, name');
      if (cancelled) return;
      const built = buildAnimMaps(data || [], skillsData || []);
      setResult(built);
      useGameDataStore.getState().setAll({ skillAnimations: data || [] });
    })();
    return () => { cancelled = true; };
  }, []);

  return result;
}
