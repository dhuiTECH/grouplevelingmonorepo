import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

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
  /** Lookup by skill display name (e.g. "Quick Slash") for when ability.id is from static data. */
  byName: Record<string, SkillAnimationConfig>;
}

/** Fetches skill_animations and returns maps by skill_id and by skill name. */
export function useSkillAnimations(): SkillAnimationsResult {
  const [result, setResult] = useState<SkillAnimationsResult>({ byId: {}, byName: {} });

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data, error } = await supabase
        .from('skill_animations')
        .select('skill_id, sprite_url, sfx_url, frame_count, frame_size, duration_ms, vfx_type');
      if (error || cancelled) return;
      const byId: Record<string, SkillAnimationConfig> = {};
      (data || []).forEach((row: any) => {
        if (row?.skill_id && row?.sprite_url) {
          const config: SkillAnimationConfig = {
            skill_id: row.skill_id,
            sprite_url: row.sprite_url,
            sfx_url: row.sfx_url || '',
            frame_count: Math.max(1, Number(row.frame_count) || 1),
            frame_size: Math.max(1, Number(row.frame_size) || 128),
            duration_ms: Math.max(100, Number(row.duration_ms) || 500),
            vfx_type: row.vfx_type || 'impact',
          };
          byId[row.skill_id] = config;
        }
      });
      const { data: skillsData } = await supabase.from('skills').select('id, name');
      if (cancelled) return;
      const byName: Record<string, SkillAnimationConfig> = {};
      (skillsData || []).forEach((row: any) => {
        const name = row?.name?.trim();
        if (name && byId[row.id]) byName[name] = byId[row.id];
      });
      if (!cancelled) setResult({ byId, byName });
    })();
    return () => { cancelled = true; };
  }, []);

  return result;
}
