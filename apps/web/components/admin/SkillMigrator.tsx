'use client';

import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { SKILL_DATA } from '@/lib/skillTreeData';

export default function SkillMigrator() {
  const [status, setStatus] = useState('Idle');
  const [log, setLog] = useState<string[]>([]);

  const runMigration = async () => {
    setStatus('Migrating...');
    const logs: string[] = [];

    for (const [className, skills] of Object.entries(SKILL_DATA)) {
      logs.push(`Processing class: ${className}...`);

      for (const skill of skills) {
        const parentId = skill.connectedTo && skill.connectedTo.length > 0
          ? skill.connectedTo[0]
          : null;

        const { error } = await supabase
          .from('skills')
          .upsert({
            id: skill.id,
            name: skill.name,
            allowed_classes: [className],
            x_pos: skill.x,
            y_pos: skill.y,
            max_rank: skill.maxRank,
            required_level: skill.requiredLevel,
            required_skill_id: parentId,
            skill_type: skill.type === 'active' ? 'PHYSICAL' : 'PASSIVE',
            base_value: 0,
            cooldown_ms: 1500,
            energy_cost: 10,
            description_template: 'Effect scales with rank...',
          });

        if (error) {
          logs.push(`❌ Error saving ${skill.name}: ${error.message}`);
        } else {
          logs.push(`✅ Saved ${skill.name}`);
        }
      }
    }

    setLog(logs);
    setStatus('Complete');
  };

  return (
    <div className="p-8 bg-slate-900 text-white rounded-xl border border-yellow-600/50">
      <h2 className="text-xl font-bold text-yellow-500 mb-4">⚠️ Database Migration Tool</h2>
      <p className="mb-6 text-gray-400 text-sm">
        This will overwrite the &apos;skills&apos; table with data from your local <code>skillTreeData.ts</code> file.
      </p>

      <button
        onClick={runMigration}
        disabled={status === 'Migrating...'}
        className="px-6 py-3 bg-yellow-600 hover:bg-yellow-500 font-bold rounded disabled:opacity-50"
      >
        {status === 'Migrating...' ? 'Migrating...' : 'START MIGRATION'}
      </button>

      <div className="mt-6 bg-black p-4 rounded h-64 overflow-y-auto font-mono text-xs">
        {log.map((l, i) => (
          <div key={i}>{l}</div>
        ))}
      </div>
    </div>
  );
}
