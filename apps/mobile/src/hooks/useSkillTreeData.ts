import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

/** Matches the structure of your Supabase skills table (flexible for your columns). */
export interface DbSkill {
  id: string;
  name: string;
  skill_type: string;
  x_pos: number;
  y_pos: number;
  max_rank: number;
  required_level: number;
  required_title: string;
  allowed_classes: string[];
  required_skill_id: string | null;
  cooldown_ms: number;
  description_template: string;
  icon_path?: string;
  [key: string]: unknown;
}

/** Normalize class for DB: Fighter uses Warrior tree. */
function getClassKeyForDb(className: string): string {
  const normalized =
    className.charAt(0).toUpperCase() + className.slice(1).toLowerCase();
  return normalized === 'Fighter' ? 'Warrior' : normalized;
}

/**
 * Fetches skill tree data for a class from the Supabase skills table.
 * Use this as the single source of truth for layout (x_pos, y_pos, connections).
 */
export const useSkillTreeData = (className: string) => {
  const [skills, setSkills] = useState<DbSkill[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!className?.trim()) {
      setLoading(false);
      setSkills([]);
      return;
    }

    const fetchSkillTree = async () => {
      setLoading(true);
      const classKey = getClassKeyForDb(className);

      const { data, error } = await supabase
        .from('skills')
        .select('*')
        .contains('allowed_classes', [classKey])
        .order('required_level', { ascending: true });

      if (error) {
        console.error(`Error fetching skill tree for ${className}:`, error);
        setSkills([]);
      } else {
        setSkills((data ?? []) as DbSkill[]);
      }
      setLoading(false);
    };

    fetchSkillTree();
  }, [className]);

  return { skills, loading };
};
