'use client';

import { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { supabase } from '@/lib/supabase';
import {
  Save, Move, Plus, Trash2, Upload,
  Zap, Shield, Sword, Skull, Flame, Heart, Crosshair, User, Star
} from 'lucide-react';

const ICON_MAP: Record<string, React.ComponentType<{ size?: number; className?: string }>> = {
  zap: Zap,
  shield: Shield,
  sword: Sword,
  skull: Skull,
  fire: Flame,
  heart: Heart,
  crosshair: Crosshair,
  user: User,
  star: Star,
};

/** Per-class theme for tree connection lines and node accents */
const CLASS_THEMES: Record<string, { stroke: string; nodeBorder: string; nodeRing: string; iconClass: string }> = {
  Assassin: { stroke: '#a78bfa', nodeBorder: 'border-violet-500', nodeRing: 'ring-violet-500/50', iconClass: 'text-violet-400' },
  Fighter:  { stroke: '#f87171', nodeBorder: 'border-red-500', nodeRing: 'ring-red-500/50', iconClass: 'text-red-400' },
  Mage:     { stroke: '#38bdf8', nodeBorder: 'border-sky-400', nodeRing: 'ring-sky-400/50', iconClass: 'text-sky-400' },
  Tanker:   { stroke: '#fbbf24', nodeBorder: 'border-amber-400', nodeRing: 'ring-amber-400/50', iconClass: 'text-amber-400' },
  Ranger:   { stroke: '#4ade80', nodeBorder: 'border-green-400', nodeRing: 'ring-green-400/50', iconClass: 'text-green-400' },
  Healer:   { stroke: '#f472b6', nodeBorder: 'border-pink-400', nodeRing: 'ring-pink-400/50', iconClass: 'text-pink-400' },
};
const DEFAULT_THEME = { stroke: '#334155', nodeBorder: 'border-cyan-600', nodeRing: 'ring-cyan-500/50', iconClass: 'text-cyan-400' };

/** Build tiers: tier[0] = roots, tier[1] = children of roots, etc. */
function buildTiers(skills: Skill[]): Skill[][] {
  const byId = new Map(skills.map((s) => [s.id, s]));
  const tiers: Skill[][] = [];
  const roots = skills.filter((s) => !s.required_skill_id);
  if (roots.length === 0) return [];
  tiers.push(roots);
  const placed = new Set(roots.map((s) => s.id));
  while (placed.size < skills.length) {
    const nextTier = skills.filter(
      (s) => s.required_skill_id && placed.has(s.required_skill_id) && !placed.has(s.id)
    );
    if (nextTier.length === 0) break;
    tiers.push(nextTier);
    nextTier.forEach((s) => placed.add(s.id));
  }
  return tiers;
}

// Spread nodes across full width so 4–5 per tier never stack. Big vertical gap between tiers.
const X_MIN = 8;
const X_MAX = 92;
const Y_MIN = 6;
const Y_MAX = 94;

/** Spread n nodes across FULL width [X_MIN, X_MAX] so each tier looks clearly different and no stacking. */
function spreadHorizontal(n: number, reverse = false): number[] {
  if (n <= 0) return [];
  if (n === 1) return [50];
  const span = X_MAX - X_MIN;
  const step = n > 1 ? span / (n - 1) : 0;
  const x = Array.from({ length: n }, (_, i) => X_MIN + i * step);
  return reverse ? x.reverse() : x;
}

/** Class-specific layout: every node gets a unique position, zero overlap. */
function applyClassLayout(className: string, skills: Skill[]): { id: string; x_pos: number; y_pos: number }[] {
  const tiers = buildTiers(skills);
  const byId = new Map<string, { x_pos: number; y_pos: number }>();

  // Spread all tiers in [Y_MIN, Y_MAX] so deep tiers don't all squash to the same bottom row
  const ySpan = Y_MAX - Y_MIN;
  const tierStep = tiers.length > 0 ? ySpan / (tiers.length + 1) : ySpan;

  tiers.forEach((tier, tierIndex) => {
    const n = tier.length;
    const yBase = Y_MIN + (tierIndex + 1) * tierStep;
    const y = Math.min(Y_MAX, Math.max(Y_MIN, yBase));

    switch (className) {
      case 'Assassin': {
        const xs = spreadHorizontal(n, tierIndex % 2 === 1);
        tier.forEach((s, i) => {
          byId.set(s.id, { x_pos: xs[i] ?? 50, y_pos: y });
        });
        break;
      }
      case 'Fighter':
      case 'Mage':
      case 'Ranger': {
        const xs = spreadHorizontal(n);
        tier.forEach((s, i) => {
          byId.set(s.id, { x_pos: xs[i] ?? 50, y_pos: y });
        });
        break;
      }
      case 'Tanker': {
        const cols = n <= 1 ? 1 : n <= 2 ? 2 : Math.ceil(Math.sqrt(n));
        const rows = Math.ceil(n / cols);
        const minRowStep = 14;
        const rowStep = rows > 1 ? Math.max(minRowStep, (tierStep * 0.7) / (rows - 1)) : 0;
        const blockHeight = (rows - 1) * rowStep;
        const xs = spreadHorizontal(cols);
        tier.forEach((s, i) => {
          const row = Math.floor(i / cols);
          const col = i % cols;
          const yRow = Math.min(Y_MAX, Math.max(Y_MIN, yBase - blockHeight / 2 + row * rowStep));
          byId.set(s.id, { x_pos: xs[col] ?? 50, y_pos: yRow });
        });
        break;
      }
      case 'Healer': {
        const crossSpread = 25;
        if (tierIndex === 0) {
          const xs = spreadHorizontal(n);
          tier.forEach((s, i) => {
            byId.set(s.id, { x_pos: xs[i] ?? 50, y_pos: y });
          });
        } else if (tierIndex === 1 && n <= 4) {
          const cy = Math.min(Y_MAX - 10, Math.max(Y_MIN + 10, yBase));
          const cross: [number, number][] = [
            [50, Math.max(Y_MIN, cy - crossSpread)],
            [50, Math.min(Y_MAX, cy + crossSpread)],
            [Math.max(X_MIN, 50 - crossSpread), cy],
            [Math.min(X_MAX, 50 + crossSpread), cy],
          ];
          tier.forEach((s, i) => {
            byId.set(s.id, { x_pos: cross[i]![0], y_pos: cross[i]![1] });
          });
        } else {
          const xs = spreadHorizontal(n);
          tier.forEach((s, i) => {
            byId.set(s.id, { x_pos: xs[i] ?? 50, y_pos: y });
          });
        }
        break;
      }
      default: {
        const xs = spreadHorizontal(n);
        tier.forEach((s, i) => {
          byId.set(s.id, { x_pos: xs[i] ?? 50, y_pos: y });
        });
      }
    }
  });

  // ORPHANS: any skill not in tiers (broken parent ref, etc.) gets a unique spot in a row at bottom
  const placedIds = new Set(byId.keys());
  const orphans = skills.filter((s) => !placedIds.has(s.id));
  if (orphans.length > 0) {
    const xs = spreadHorizontal(orphans.length);
    const orphanY = Math.min(Y_MAX, Y_MIN + (tiers.length + 1) * tierStep);
    orphans.forEach((s, i) => {
      byId.set(s.id, { x_pos: xs[i] ?? 50, y_pos: orphanY });
    });
  }

  // Return one entry per skill, guaranteed unique positions
  return skills.map((s) => {
    const p = byId.get(s.id) ?? { x_pos: 50, y_pos: 50 };
    return { id: s.id, x_pos: p.x_pos, y_pos: p.y_pos };
  });
}

interface Skill {
  id: string;
  name: string;
  x_pos: number;
  y_pos: number;
  required_skill_id: string | null;
  base_value: number;
  energy_cost: number;
  cooldown_ms: number;
  skill_type: 'PHYSICAL' | 'MAGIC' | 'PASSIVE';
  scaling_factor: number;
  allowed_classes: string[];
  icon_path?: string;
  description_template?: string;
  max_rank: number;
  required_level: number;
}

export default function AdminSkillTreeBuilder({ selectedClass }: { selectedClass: string }) {
  const [skills, setSkills] = useState<Skill[]>([]);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [selectedSkill, setSelectedSkill] = useState<Skill | null>(null);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    fetchSkills();
    setSelectedSkill(null);
  }, [selectedClass]);

  const fetchSkills = async () => {
    const { data } = await supabase
      .from('skills')
      .select('*')
      .contains('allowed_classes', [selectedClass]);
    if (data) setSkills(data);
  };

  const addNewSkill = async () => {
    const newId = `${selectedClass.toLowerCase()}_new_${Date.now()}`;
    const newSkill = {
      id: newId,
      name: 'New Skill',
      allowed_classes: [selectedClass],
      x_pos: 50,
      y_pos: 50,
      skill_type: 'PHYSICAL',
      base_value: 10,
      energy_cost: 10,
      cooldown_ms: 1,
      scaling_factor: 1.0,
      required_skill_id: null,
      max_rank: 5,
      required_level: 1,
      icon_path: 'zap',
      description_template: 'Deals damage to target.',
    };
    setSkills((prev) => [...prev, newSkill as Skill]);
    await supabase.from('skills').insert(newSkill as any);
  };

  const deleteSkill = async (id: string) => {
    if (!confirm('Are you sure?')) return;
    setSkills((prev) => prev.filter((s) => s.id !== id));
    setSelectedSkill(null);
    await supabase.from('skills').delete().eq('id', id);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0 || !selectedSkill) return;
    try {
      setUploading(true);
      const file = e.target.files[0];
      const fileName = `${selectedClass}_${selectedSkill.id}_${Date.now()}.${file.name.split('.').pop()}`;
      const { error: uploadError } = await supabase.storage.from('skill-icons').upload(fileName, file, {
        upsert: true,
        cacheControl: '31536000'
      });
      if (uploadError) throw uploadError;
      const { data: { publicUrl } } = supabase.storage.from('skill-icons').getPublicUrl(fileName);

      const updated = { ...selectedSkill, icon_path: publicUrl };
      setSelectedSkill(updated);
      setSkills((prev) => prev.map((s) => (s.id === updated.id ? updated : s)));
      await supabase.from('skills').update({ icon_path: publicUrl }).eq('id', updated.id);
    } catch (error: any) {
      alert('Upload failed: ' + error.message);
    } finally {
      setUploading(false);
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!draggingId || !containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = Math.max(0, Math.min(100, ((e.clientX - rect.left) / rect.width) * 100));
    const y = Math.max(0, Math.min(100, ((e.clientY - rect.top) / rect.height) * 100));
    setSkills((prev) =>
      prev.map((s) => (s.id === draggingId ? { ...s, x_pos: x, y_pos: y } : s))
    );
  };

  const savePositions = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    const headers: HeadersInit = { 'Content-Type': 'application/json' };
    if (session?.access_token) headers['Authorization'] = `Bearer ${session.access_token}`;
    const res = await fetch('/api/admin/skills/positions', {
      method: 'POST',
      headers,
      body: JSON.stringify({
        positions: skills.map((s) => ({ id: s.id, x_pos: s.x_pos, y_pos: s.y_pos })),
      }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      const msg = [data?.error, data?.details].filter(Boolean).join(' — ') || 'Failed to save positions.';
      alert(msg);
      return;
    }
    alert(`Tree layout saved! (${data?.updated ?? skills.length} positions)`);
  };

  const applyClassLayoutClick = () => {
    const positions = applyClassLayout(selectedClass, skills);
    const byId = new Map(positions.map((p) => [p.id, p]));
    setSkills((prev) =>
      prev.map((s) => {
        const pos = byId.get(s.id);
        return pos ? { ...s, x_pos: pos.x_pos, y_pos: pos.y_pos } : s;
      })
    );
    alert(`${selectedClass} layout applied. Click "Save Positions" to persist.`);
  };

  const saveSkillStats = async (updatedSkill: Skill) => {
    await supabase
      .from('skills')
      .update({
        name: updatedSkill.name,
        base_value: updatedSkill.base_value,
        energy_cost: updatedSkill.energy_cost,
        cooldown_ms: updatedSkill.cooldown_ms,
        skill_type: updatedSkill.skill_type,
        scaling_factor: updatedSkill.scaling_factor,
        required_skill_id: updatedSkill.required_skill_id || null,
        icon_path: updatedSkill.icon_path,
        description_template: updatedSkill.description_template,
        max_rank: updatedSkill.max_rank,
        required_level: updatedSkill.required_level,
      })
      .eq('id', updatedSkill.id);
    setSkills((prev) => prev.map((s) => (s.id === updatedSkill.id ? updatedSkill : s)));
    alert('Stats Saved');
  };

  return (
    <div className="flex gap-4 min-h-[1100px]">
      {/* CANVAS - tall so tree can extend and parent scrolls */}
      <div
        ref={containerRef}
        className="flex-1 min-h-[1000px] bg-[#050505] relative border border-slate-800 rounded-lg overflow-hidden cursor-crosshair"
        onMouseMove={handleMouseMove}
        onMouseUp={() => setDraggingId(null)}
        onMouseLeave={() => setDraggingId(null)}
      >
        <div className="absolute top-4 left-4 z-20 flex flex-wrap items-center gap-2">
          <button
            onClick={addNewSkill}
            className="bg-cyan-600 hover:bg-cyan-500 text-white px-4 py-2 rounded text-xs font-bold flex items-center gap-2 shadow-lg"
          >
            <Plus size={14} /> ADD NODE
          </button>
          <button
            onClick={applyClassLayoutClick}
            className="bg-slate-600 hover:bg-slate-500 text-white px-4 py-2 rounded text-xs font-bold flex items-center gap-2 shadow-lg border border-slate-500"
            title={`Arrange tree in ${selectedClass} shape (zigzag, arc, tower, etc.)`}
          >
            <Move size={14} /> Apply {selectedClass} layout
          </button>
        </div>
        <button
          onClick={savePositions}
          className="absolute top-4 right-4 z-20 bg-green-600 hover:bg-green-500 text-white px-4 py-2 rounded text-xs font-bold flex items-center gap-2 shadow-lg"
        >
          <Save size={14} /> SAVE POSITIONS
        </button>

        <svg className="absolute inset-0 w-full h-full pointer-events-none z-0">
          <defs>
            <filter id="lineGlow" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="2" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>
          {skills.map((s) => {
            const p = skills.find((parent) => parent.id === s.required_skill_id);
            if (!p) return null;
            const theme = CLASS_THEMES[selectedClass] ?? DEFAULT_THEME;
            return (
              <g key={s.id} filter="url(#lineGlow)">
                <line
                  x1={`${p.x_pos}%`}
                  y1={`${p.y_pos}%`}
                  x2={`${s.x_pos}%`}
                  y2={`${s.y_pos}%`}
                  stroke={theme.stroke}
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeDasharray="6 4"
                  opacity="0.9"
                />
                <line
                  x1={`${p.x_pos}%`}
                  y1={`${p.y_pos}%`}
                  x2={`${s.x_pos}%`}
                  y2={`${s.y_pos}%`}
                  stroke={theme.stroke}
                  strokeWidth="1"
                  strokeLinecap="round"
                  strokeDasharray="6 4"
                  opacity="0.4"
                />
              </g>
            );
          })}
        </svg>

        {skills.map((skill) => {
          const isImage = skill.icon_path?.startsWith('http');
          const IconComponent = ICON_MAP[skill.icon_path || 'zap'] || Zap;
          const theme = CLASS_THEMES[selectedClass] ?? DEFAULT_THEME;
          const borderClass = skill.skill_type === 'PASSIVE' ? 'border-gray-600' : theme.nodeBorder;
          return (
            <motion.div
              key={skill.id}
              style={{ left: `${skill.x_pos}%`, top: `${skill.y_pos}%` }}
              className={`absolute w-12 h-12 -translate-x-1/2 -translate-y-1/2 flex items-center justify-center rounded-full border-2 bg-slate-900 cursor-grab active:cursor-grabbing z-10 hover:ring-2 ${theme.nodeRing} overflow-hidden ${borderClass}`}
              onMouseDown={() => setDraggingId(skill.id)}
              onClick={(e) => {
                e.stopPropagation();
                setSelectedSkill(skill);
              }}
            >
              {isImage ? (
                <img src={skill.icon_path} alt="" className="w-full h-full object-cover" />
              ) : (
                <IconComponent
                  size={20}
                  className={skill.skill_type === 'PASSIVE' ? 'text-gray-400' : theme.iconClass}
                />
              )}
              <div className="absolute -bottom-6 text-[9px] text-gray-400 w-24 text-center truncate bg-black/80 px-1 rounded pointer-events-none">
                {skill.name}
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* EDIT SIDEBAR */}
      <div className="w-80 bg-slate-900 border-l border-slate-800 p-6 overflow-y-auto">
        {selectedSkill ? (
          <div className="space-y-4">
            <h3 className="text-lg font-bold text-cyan-400 border-b border-cyan-900 pb-2">
              Edit Skill
            </h3>

            <div>
              <label className="text-[10px] text-gray-500 uppercase">Name</label>
              <input
                className="w-full bg-black border border-slate-700 p-2 text-sm text-white rounded"
                value={selectedSkill.name}
                onChange={(e) => setSelectedSkill({ ...selectedSkill, name: e.target.value })}
              />
            </div>

            {/* PARENT ID (THIS CREATES THE LINES) */}
            <div>
              <label className="text-[10px] text-gray-500 uppercase">
                Parent Skill (Connects Line)
              </label>
              <select
                className="w-full bg-black border border-slate-700 p-2 text-xs text-white rounded"
                value={selectedSkill.required_skill_id || ''}
                onChange={(e) =>
                  setSelectedSkill({
                    ...selectedSkill,
                    required_skill_id: e.target.value || null,
                  })
                }
              >
                <option value="">-- Root Node --</option>
                {skills
                  .filter((s) => s.id !== selectedSkill.id)
                  .map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
              </select>
            </div>

            <div>
              <label className="text-[10px] text-gray-500 uppercase">Description</label>
              <textarea
                className="w-full bg-black border border-slate-700 p-2 text-xs text-white rounded h-20"
                value={selectedSkill.description_template || ''}
                onChange={(e) =>
                  setSelectedSkill({
                    ...selectedSkill,
                    description_template: e.target.value,
                  })
                }
              />
            </div>

            {/* UPLOAD & ICON */}
            <div>
              <label className="text-[10px] text-gray-500 uppercase">Icon</label>
              <div className="flex flex-col gap-2">
                <label className="flex items-center gap-2 cursor-pointer bg-slate-800 p-2 rounded text-xs text-white border border-slate-600">
                  <Upload size={14} />
                  <span>{uploading ? 'Uploading...' : 'Upload Custom Icon'}</span>
                  <input
                    type="file"
                    className="hidden"
                    accept="image/*"
                    onChange={handleFileUpload}
                    disabled={uploading}
                  />
                </label>
                <div className="text-[10px] text-gray-500 text-center">- OR -</div>
                <select
                  className="w-full bg-black border border-slate-700 p-2 text-xs text-white rounded"
                  value={
                    !selectedSkill.icon_path?.startsWith('http')
                      ? selectedSkill.icon_path || 'zap'
                      : 'zap'
                  }
                  onChange={(e) =>
                    setSelectedSkill({ ...selectedSkill, icon_path: e.target.value })
                  }
                >
                  {Object.keys(ICON_MAP).map((k) => (
                    <option key={k} value={k}>
                      {k.toUpperCase()}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* STATS */}
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-[9px] text-gray-500 block">Mana Cost</label>
                <input
                  type="number"
                  className="w-full bg-slate-800 p-1 text-xs text-white rounded"
                  value={selectedSkill.energy_cost ?? 10}
                  onChange={(e) =>
                    setSelectedSkill({
                      ...selectedSkill,
                      energy_cost: Number(e.target.value),
                    })
                  }
                />
              </div>
              <div>
                <label className="text-[9px] text-gray-500 block">Cooldown (Turns)</label>
                <input
                  type="number"
                  className="w-full bg-slate-800 p-1 text-xs text-white rounded"
                  value={selectedSkill.cooldown_ms ?? 1}
                  onChange={(e) =>
                    setSelectedSkill({
                      ...selectedSkill,
                      cooldown_ms: Number(e.target.value),
                    })
                  }
                />
              </div>
              <div>
                <label className="text-[9px] text-gray-500 block">Required Level</label>
                <input
                  type="number"
                  className="w-full bg-slate-800 p-1 text-xs text-white rounded"
                  value={selectedSkill.required_level ?? 1}
                  onChange={(e) =>
                    setSelectedSkill({
                      ...selectedSkill,
                      required_level: Number(e.target.value),
                    })
                  }
                />
              </div>
              <div>
                <label className="text-[9px] text-gray-500 block">Max Rank</label>
                <input
                  type="number"
                  className="w-full bg-slate-800 p-1 text-xs text-white rounded"
                  value={selectedSkill.max_rank ?? 5}
                  onChange={(e) =>
                    setSelectedSkill({
                      ...selectedSkill,
                      max_rank: Number(e.target.value),
                    })
                  }
                />
              </div>
            </div>

            <button
              onClick={() => saveSkillStats(selectedSkill)}
              className="w-full bg-cyan-600 hover:bg-cyan-500 text-white font-bold py-3 rounded mt-2"
            >
              SAVE CHANGES
            </button>
            <button
              onClick={() => deleteSkill(selectedSkill.id)}
              className="w-full text-red-500 text-xs py-2 mt-2 flex justify-center gap-1 items-center"
            >
              <Trash2 size={12} /> Delete
            </button>
          </div>
        ) : (
          <div className="h-full flex flex-col items-center justify-center text-gray-600 text-sm text-center">
            <Move size={32} className="mb-2 opacity-50" />
            <p>
              Select a node to
              <br />
              edit connections
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
