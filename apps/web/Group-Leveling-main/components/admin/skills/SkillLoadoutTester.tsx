import React, { useState } from 'react';

interface Skill {
  id: string;
  name: string;
  base_value: number;
  energy_cost: number;
  cooldown_ms: number;
  skill_type: string;
}

interface TesterProps {
  availableSkills: Skill[];
}

export default function SkillLoadoutTester({ availableSkills }: TesterProps) {
  // Test Dummy Stats
  const [level, setLevel] = useState(10);
  const [str, setStr] = useState(20);
  const [int, setInt] = useState(20);
  
  // The 4-Slot Loadout
  const [loadout, setLoadout] = useState<(string | '')[]>(['', '', '', '']);
  
  // Results
  const [logs, setLogs] = useState<string[]>([]);
  const [totalDmg, setTotalDmg] = useState(0);

  const updateSlot = (index: number, skillId: string) => {
    const newLoadout = [...loadout];
    newLoadout[index] = skillId;
    setLoadout(newLoadout);
  };

  const runSimulation = () => {
    // 1. Setup Simulation State
    let currentTurn = 1;
    const maxTurns = 10; 
    let currentLog: string[] = [];
    let damageSum = 0;
    let currentMp = 50 + (int * 10); 
    
    // Cooldown trackers (in turns)
    const skillCooldowns: Record<string, number> = {};
    
    // 2. The Turn Loop
    while (currentTurn <= maxTurns) {
      // Decrease timers
      loadout.forEach(id => {
        if (id && skillCooldowns[id] > 0) skillCooldowns[id] -= 1;
      });

      // 3. AI Logic: Try to fire skills (Slot 1 Priority -> Slot 4)
      for (const skillId of loadout) {
        if (!skillId) continue;
        
        const skill = availableSkills.find(s => s.id === skillId);
        if (!skill) continue;

        // Check if ready
        const onCd = (skillCooldowns[skillId] || 0) > 0;
        const hasMana = currentMp >= (skill.energy_cost || 0);

        if (!onCd && hasMana) {
          // FIRE!
          const scaling = skill.skill_type === 'MAGIC' ? int : str;
          const hitDmg = (skill.base_value || 0) + (scaling * 2) + (level * 1.5); 
          
          damageSum += hitDmg;
          currentMp -= (skill.energy_cost || 0);
          
          // Set Timers (in turns)
          skillCooldowns[skillId] = skill.cooldown_ms || 1; // Now using turns

          currentLog.push(`[Turn ${currentTurn}] Used ${skill.name} for ${hitDmg} DMG. (MP: ${currentMp})`);
          break; // One skill per turn
        }
      }

      currentTurn += 1;
    }

    setLogs(currentLog);
    setTotalDmg(damageSum);
  };

  return (
    <div className="bg-slate-900 border border-slate-700 rounded-xl p-6 space-y-6">
      <h2 className="text-lg font-black text-cyan-400 uppercase tracking-widest">
        🧪 Loadout Simulation (10 Turns)
      </h2>
      <p className="text-[10px] text-gray-500 mt-0.5">Fills a 4-slot bar and runs a 10 turn simulation (cooldowns, mana). Shows cast log and total damage.</p>

      {/* STAT CONFIG */}
      <div className="flex gap-4 p-4 bg-black/40 rounded-lg">
        <div>
          <label className="text-[10px] text-gray-500 uppercase">Level</label>
          <input type="number" value={level} onChange={e => setLevel(parseInt(e.target.value))} className="w-20 bg-slate-800 text-white text-xs p-2 rounded"/>
        </div>
        <div>
          <label className="text-[10px] text-gray-500 uppercase">STR</label>
          <input type="number" value={str} onChange={e => setStr(parseInt(e.target.value))} className="w-20 bg-slate-800 text-white text-xs p-2 rounded"/>
        </div>
        <div>
          <label className="text-[10px] text-gray-500 uppercase">INT</label>
          <input type="number" value={int} onChange={e => setInt(parseInt(e.target.value))} className="w-20 bg-slate-800 text-white text-xs p-2 rounded"/>
        </div>
      </div>

      {/* THE 4 SLOTS */}
      <div className="grid grid-cols-4 gap-2">
        {loadout.map((slotSkillId, idx) => (
          <div key={idx} className="relative">
             <label className="text-[9px] text-gray-500 uppercase mb-1 block">Slot {idx + 1}</label>
             <select 
               value={slotSkillId}
               onChange={(e) => updateSlot(idx, e.target.value)}
               className="w-full bg-slate-800 border border-cyan-900/50 rounded p-2 text-xs text-cyan-100"
             >
               <option value="">-- Empty --</option>
               {availableSkills.map(s => (
                 <option key={s.id} value={s.id}>{s.name} ({s.energy_cost} MP)</option>
               ))}
             </select>
          </div>
        ))}
      </div>

      {/* RUN BUTTON */}
      <button 
        onClick={runSimulation}
        className="w-full py-3 bg-cyan-600 hover:bg-cyan-500 text-white font-bold uppercase rounded shadow-lg shadow-cyan-900/20 transition-all"
      >
        Run 10 Turn Simulation
      </button>

      {/* RESULTS CONSOLE */}
      <div className="grid grid-cols-2 gap-4 h-64">
        <div className="bg-black font-mono text-[10px] text-green-400 p-4 rounded overflow-y-auto border border-white/10">
          {logs.length === 0 ? <span className="text-gray-600">// Ready to simulate...</span> : logs.map((l, i) => <div key={i}>{l}</div>)}
        </div>
        <div className="flex flex-col justify-center items-center bg-slate-800 rounded border border-white/10">
          <div className="text-4xl font-black text-white">{totalDmg.toLocaleString()}</div>
          <div className="text-xs text-gray-400 uppercase">Total Damage</div>
          <div className="mt-4 text-2xl font-bold text-cyan-400">{(totalDmg / 10).toFixed(1)}</div>
          <div className="text-xs text-gray-400 uppercase">Avg Dmg / Turn</div>
        </div>
      </div>
    </div>
  );
}
