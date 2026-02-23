'use client';

import { useState, useMemo } from 'react';
import { Sword, Zap, Brain, Shield, Crosshair, Clock, Flame } from 'lucide-react';

interface Props {
  skills: any[];
}

export default function SkillBalancer({ skills }: Props) {
  // 1. SIMULATED PLAYER STATS
  const [playerStats, setPlayerStats] = useState({
    level: 10,
    str: 20,
    int: 15,
    wil: 10,
  });

  // 2. LOADOUT STATE (4 Slots)
  const [loadout, setLoadout] = useState<string[]>([
    '', '', '', ''
  ]);

  // HELPER: Calculate Damage
  const calculateDamage = (skill: any) => {
    if (!skill) return 0;
    const base = skill.base_value || 0;
    
    // Formula: Base + (ScalingStat * 2) + (Level * 1.5)
    // Physical uses STR, Magic uses INT
    const scalingStat = skill.skill_type === 'MAGIC' ? playerStats.int : playerStats.str;
    const damage = base + (scalingStat * 2) + (playerStats.level * 1.5);
    return Math.floor(damage);
  };

  // HELPER: Calculate Burst Damage (Sum of all 4 skills)
  const burstDamage = useMemo(() => {
    return loadout.reduce((total, skillId) => {
      const skill = skills.find(s => s.id === skillId);
      return total + calculateDamage(skill);
    }, 0);
  }, [loadout, playerStats, skills]);

  const totalManaCost = useMemo(() => {
    return loadout.reduce((total, skillId) => {
        const skill = skills.find(s => s.id === skillId);
        return total + (skill?.energy_cost || 0);
    }, 0);
  }, [loadout, skills]);

  return (
    <div className="bg-[#0f0f0f] border border-gray-800 rounded-lg p-6 space-y-8">
      
      {/* HEADER */}
      <div className="flex items-center justify-between border-b border-gray-800 pb-4">
        <div>
          <h2 className="text-xl font-black text-cyan-500 uppercase tracking-widest flex items-center gap-2">
            <Brain size={24} /> Skill Balancer Engine
          </h2>
          <p className="text-xs text-gray-500">SIMULATION MATRIX // V 1.0</p>
          <p className="text-[10px] text-gray-500 mt-0.5">Tweak Level/STR/INT and pick 4 skills to see burst damage and per-skill DPS. Use the table below to balance base values and scaling.</p>
        </div>
        <div className="text-right">
            <div className="text-xs text-gray-500 font-bold uppercase">BURST POTENTIAL</div>
            <div className="text-2xl font-black text-red-500 tracking-tighter">{burstDamage.toLocaleString()} DMG</div>
        </div>
      </div>

      {/* 1. PLAYER STAT SIMULATOR */}
      <div className="grid grid-cols-4 gap-4 bg-black/40 p-4 rounded border border-gray-800">
        {[
          { label: 'Level', key: 'level', color: 'text-white' },
          { label: 'STR', key: 'str', color: 'text-red-500' },
          { label: 'INT', key: 'int', color: 'text-blue-500' },
          { label: 'WIL', key: 'wil', color: 'text-green-500' },
        ].map((stat) => (
          <div key={stat.key}>
            <label className={`block text-[10px] font-bold uppercase ${stat.color} mb-1`}>{stat.label}</label>
            <input 
              type="number" 
              value={playerStats[stat.key as keyof typeof playerStats]}
              onChange={(e) => setPlayerStats({...playerStats, [stat.key]: parseInt(e.target.value) || 0})}
              className="w-full bg-black border border-gray-700 text-white p-2 text-sm rounded focus:border-cyan-500 outline-none font-mono"
            />
          </div>
        ))}
      </div>

      {/* 2. LOADOUT TESTER */}
      <div>
        <h3 className="text-xs font-bold text-gray-400 uppercase mb-3 flex items-center gap-2">
            <Crosshair size={14}/> 4-Slot Burst Test
        </h3>
        <div className="grid grid-cols-4 gap-4">
            {loadout.map((slotSkillId, index) => {
                const selectedSkill = skills.find(s => s.id === slotSkillId);
                const damage = calculateDamage(selectedSkill);

                return (
                    <div key={index} className="bg-black border border-gray-800 rounded p-3 relative group hover:border-cyan-900/50 transition-colors">
                        <div className="text-[10px] text-gray-600 uppercase mb-2 font-bold">Slot {index + 1}</div>
                        
                        <select 
                            value={slotSkillId}
                            onChange={(e) => {
                                const newLoadout = [...loadout];
                                newLoadout[index] = e.target.value;
                                setLoadout(newLoadout);
                            }}
                            className="w-full bg-[#111] text-xs text-gray-300 p-2 rounded border border-gray-700 outline-none mb-3"
                        >
                            <option value="">-- Empty --</option>
                            {skills.map(s => (
                                <option key={s.id} value={s.id}>{s.name}</option>
                            ))}
                        </select>

                        {selectedSkill ? (
                            <div className="space-y-1">
                                <div className="flex justify-between text-xs">
                                    <span className="text-gray-500">DMG</span>
                                    <span className="text-red-400 font-bold">{damage}</span>
                                </div>
                                <div className="flex justify-between text-xs">
                                    <span className="text-gray-500">Mana</span>
                                    <span className="text-blue-400 font-bold">{selectedSkill.energy_cost || 0}</span>
                                </div>
                                <div className="flex justify-between text-xs">
                                    <span className="text-gray-500">CD</span>
                                    <span className="text-yellow-400 font-bold">{selectedSkill.cooldown_ms || 0} Turns</span>
                                </div>
                            </div>
                        ) : (
                            <div className="h-[52px] flex items-center justify-center text-gray-800">
                                <Sword size={20} />
                            </div>
                        )}
                    </div>
                );
            })}
        </div>
        
        {/* TOTALS FOOTER */}
        <div className="mt-4 flex justify-end gap-6 text-xs font-mono border-t border-gray-800 pt-3">
            <div className="flex items-center gap-2">
                <span className="text-gray-500">TOTAL MANA COST:</span>
                <span className="text-blue-400 font-bold">{totalManaCost}</span>
            </div>
            <div className="flex items-center gap-2">
                <span className="text-gray-500">BURST DAMAGE (3s):</span>
                <span className="text-red-500 font-bold text-lg">{burstDamage}</span>
            </div>
        </div>
      </div>

      {/* 3. LIVE SKILL PREVIEW TABLE */}
      <div>
        <h3 className="text-xs font-bold text-gray-400 uppercase mb-3 flex items-center gap-2">
            <Flame size={14}/> All Skills Preview (At Current Stats)
        </h3>
        <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
                <thead>
                    <tr className="text-[10px] text-gray-500 uppercase border-b border-gray-800">
                        <th className="p-2">Skill</th>
                        <th className="p-2">Base</th>
                        <th className="p-2">Scaling</th>
                        <th className="p-2 text-red-500">Final Dmg</th>
                        <th className="p-2">DPT (Est)</th>
                    </tr>
                </thead>
                <tbody className="text-xs font-mono">
                    {skills.map(skill => {
                        const dmg = calculateDamage(skill);
                        const cdTurns = skill.cooldown_ms || 1;
                        const dpt = Math.floor(dmg / Math.max(1, cdTurns)); // Damage Per Turn

                        return (
                            <tr key={skill.id} className="border-b border-gray-900 hover:bg-white/5">
                                <td className="p-2 font-bold text-cyan-400">{skill.name}</td>
                                <td className="p-2 text-gray-400">{skill.base_value || 0}</td>
                                <td className="p-2 text-gray-500">
                                    <span className={skill.skill_type === 'MAGIC' ? 'text-blue-900' : 'text-red-900'}>
                                        {skill.skill_type === 'MAGIC' ? 'INT*2' : 'STR*2'}
                                    </span> + <span className="text-gray-700">LVL*1.5</span>
                                </td>
                                <td className="p-2 text-red-400 font-bold">{dmg}</td>
                                <td className="p-2 text-yellow-600">{dpt}/T</td>
                            </tr>
                        );
                    })}
                </tbody>
            </table>
        </div>
      </div>

    </div>
  );
}
