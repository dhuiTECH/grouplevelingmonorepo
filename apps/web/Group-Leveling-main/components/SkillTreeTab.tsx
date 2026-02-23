'use client';

import { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Lock,
  ChevronUp,
  Zap,
  Shield,
  Sword,
  Skull,
  Flame,
  Heart,
  Crosshair,
  User as UserIcon,
  Star,
  ArrowRight,
  Sun,
  Moon,
  Droplet,
  Cloud,
  Ghost,
  Wind,
  Circle,
  Repeat,
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import type { User } from '@/lib/types';

const ICON_MAP: Record<string, React.ComponentType<{ size?: number; className?: string }>> = {
  zap: Zap,
  shield: Shield,
  sword: Sword,
  skull: Skull,
  fire: Flame,
  heart: Heart,
  crosshair: Crosshair,
  user: UserIcon,
  star: Star,
  sun: Sun,
  moon: Moon,
  droplet: Droplet,
  cloud: Cloud,
  ghost: Ghost,
  wind: Wind,
  circle: Circle,
  repeat: Repeat,
};

interface SkillTreeTabProps {
  user: User;
  showNotification: (msg: string, type: 'success' | 'error') => void;
  setUser: (user: User) => void;
}

export default function SkillTreeTab({ user, showNotification, setUser }: SkillTreeTabProps) {
  const [treeNodes, setTreeNodes] = useState<any[]>([]);
  const [skillRanks, setSkillRanks] = useState<Record<string, number>>({});
  const [selectedNode, setSelectedNode] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);

  const playerStats = useMemo(
    () => ({
      STR: user.str_stat ?? 10,
      INT: user.int_stat ?? 10,
      AGI: user.spd_stat ?? 10,
      LCK: user.lck_stat ?? 10,
    }),
    [user.str_stat, user.int_stat, user.spd_stat, user.lck_stat]
  );

  const totalPointsEarned = user.level || 1;
  const pointsSpent = Object.values(skillRanks).reduce((sum, rank) => sum + rank, 0);
  const availablePoints = totalPointsEarned - pointsSpent;

  useEffect(() => {
    const fetchData = async () => {
      if (!user.current_class) return;

      try {
        setLoading(true);

        const { data: skillsData, error: skillsError } = await supabase
          .from('skills')
          .select('*')
          .contains('allowed_classes', [user.current_class]);

        if (skillsError) throw skillsError;
        if (skillsData) setTreeNodes(skillsData);

        const { data: userSkills, error: userError } = await supabase
          .from('user_skills')
          .select('skill_id, current_rank')
          .eq('user_id', user.id);

        if (userError) throw userError;

        const ranks: Record<string, number> = {};
        userSkills?.forEach((row: any) => (ranks[row.skill_id] = row.current_rank));
        setSkillRanks(ranks);
      } catch (err) {
        console.error('Error fetching skill data:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [user.id, user.current_class]);

  const getDynamicDescription = (node: any, rank: number): React.ReactNode => {
    const currentRank = rank === 0 ? 1 : rank;
    const currentBase = Math.floor(node.base_value * (1 + (currentRank - 1) * 0.1));

    let scalingBonus = 0;
    let scalingStat = 'STR';

    if (node.skill_type === 'PHYSICAL') {
      scalingBonus = Math.floor(playerStats.STR * (node.scaling_factor ?? 1));
      scalingStat = 'STR';
    } else if (node.skill_type === 'MAGIC') {
      scalingBonus = Math.floor(playerStats.INT * (node.scaling_factor ?? 1));
      scalingStat = 'INT';
    }

    const totalDmg = currentBase + scalingBonus;

    if (node.description_template?.includes('{')) {
      let desc = node.description_template.replace(
        '{val}',
        `<span class="text-cyan-400 font-bold">${totalDmg}</span>`
      );
      if (node.description_template.includes('{scaling}')) {
        desc = desc.replace(
          '{scaling}',
          `<span class="text-yellow-400 font-bold">(${scalingBonus} from ${scalingStat})</span>`
        );
      }
      return <span dangerouslySetInnerHTML={{ __html: desc }} />;
    }

    return (
      <span className="block">
        {node.description_template || 'No description available.'}
        <br />
        <span className="text-xs text-gray-500 mt-1">Total Impact: {totalDmg}</span>
      </span>
    );
  };

  const isSkillUnlockable = (node: any) => {
    if ((user.level || 1) < (node.required_level ?? 1)) return false;
    if (node.required_skill_id) {
      const parentRank = skillRanks[node.required_skill_id] || 0;
      if (parentRank === 0) return false;
    }
    return true;
  };

  const handleUpgrade = async () => {
    if (!selectedNode || !user.id) return;
    const currentRank = skillRanks[selectedNode.id] || 0;
    const maxRank = selectedNode.max_rank ?? 5;

    if (availablePoints <= 0) {
      showNotification('Not enough Skill Points', 'error');
      return;
    }
    if (currentRank >= maxRank) return showNotification('Skill Maxed', 'error');
    if (!isSkillUnlockable(selectedNode) && currentRank === 0)
      return showNotification('Requirements not met', 'error');

    const newRank = currentRank + 1;
    setSkillRanks((prev) => ({ ...prev, [selectedNode.id]: newRank }));

    const { error } = await supabase.from('user_skills').upsert(
      {
        user_id: user.id,
        skill_id: selectedNode.id,
        current_rank: newRank,
        unlocked_at: new Date().toISOString(),
      },
      { onConflict: 'user_id,skill_id' }
    );

    if (error) {
      showNotification('Upgrade Failed', 'error');
      setSkillRanks((prev) => ({ ...prev, [selectedNode.id]: currentRank }));
    } else {
      showNotification(`${selectedNode.name} Upgraded!`, 'success');
    }
  };

  if (loading)
    return (
      <div className="p-10 text-center text-cyan-500 animate-pulse">Syncing Neuro-Link...</div>
    );

  return (
    <div className="flex flex-col h-full bg-[#050505] relative overflow-hidden">
      {/* SKILL POINTS HEADER */}
      <div className="absolute top-4 right-4 z-20 pointer-events-none">
        <div className="bg-slate-900/90 backdrop-blur border border-cyan-500/30 px-4 py-2 rounded-lg shadow-lg shadow-cyan-500/10">
          <div className="text-[10px] text-gray-400 uppercase tracking-widest font-bold">
            Skill Points
          </div>
          <div className="text-2xl font-mono font-black text-cyan-400">
            {availablePoints} <span className="text-xs text-gray-600">/ {totalPointsEarned}</span>
          </div>
        </div>
      </div>

      {/* TREE AREA */}
      <div className="flex-1 relative overflow-auto touch-pan-x touch-pan-y overscroll-contain">
        <div className="min-h-[800px] min-w-[350px] relative p-6 pb-40">
          <svg className="absolute inset-0 w-full h-full pointer-events-none z-0">
            {treeNodes.map((node) => {
              if (!node.required_skill_id) return null;
              const parent = treeNodes.find((n) => n.id === node.required_skill_id);
              if (!parent) return null;
              const isActive = (skillRanks[node.id] || 0) > 0 && (skillRanks[parent.id] || 0) > 0;
              return (
                <line
                  key={`${node.id}-${parent.id}`}
                  x1={`${parent.x_pos}%`}
                  y1={`${parent.y_pos}%`}
                  x2={`${node.x_pos}%`}
                  y2={`${node.y_pos}%`}
                  stroke={isActive ? '#22d3ee' : '#334155'}
                  strokeWidth="2"
                  strokeDasharray={isActive ? 'none' : '4 4'}
                  className="transition-colors duration-500"
                />
              );
            })}
          </svg>

          {treeNodes.map((node) => {
            const rank = skillRanks[node.id] || 0;
            const maxRank = node.max_rank ?? 5;
            const isUnlocked = isSkillUnlockable(node);
            const isImage = node.icon_path?.startsWith('http');
            const IconComponent = ICON_MAP[node.icon_path || 'zap'] || Zap;

            return (
              <motion.button
                key={node.id}
                onClick={() => setSelectedNode(node)}
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                whileTap={{ scale: 0.9 }}
                style={{ left: `${node.x_pos}%`, top: `${node.y_pos}%` }}
                className={`absolute -translate-x-1/2 -translate-y-1/2 z-10 w-14 h-14 flex items-center justify-center rounded-full border-2 shadow-xl transition-all duration-300 overflow-hidden
                  ${rank > 0 ? 'bg-slate-900 border-cyan-400 shadow-cyan-500/30' : isUnlocked ? 'bg-slate-800 border-gray-500 hover:border-white' : 'bg-black border-slate-800 opacity-60 grayscale'}
                  ${selectedNode?.id === node.id ? 'ring-4 ring-cyan-500/50 scale-110' : ''}
                `}
              >
                {isImage ? (
                  <img src={node.icon_path} alt="" className="w-full h-full object-cover" />
                ) : (
                  <IconComponent
                    size={20}
                    className={rank > 0 ? 'text-cyan-300' : 'text-gray-500'}
                  />
                )}
                <div className="absolute -bottom-2 bg-black text-[9px] font-bold px-1.5 py-0.5 rounded border border-white/10 text-white">
                  {rank}/{maxRank}
                </div>
                {!isUnlocked && rank === 0 && (
                  <div className="absolute inset-0 bg-black/60 flex items-center justify-center rounded-full">
                    <Lock size={14} className="text-red-500" />
                  </div>
                )}
              </motion.button>
            );
          })}
        </div>
      </div>

      {/* DETAIL PANEL */}
      <AnimatePresence>
        {selectedNode && (
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            className="absolute bottom-0 inset-x-0 bg-[#0f1014] border-t border-white/10 p-5 z-30 rounded-t-2xl shadow-[0_-10px_40px_rgba(0,0,0,0.8)]"
          >
            <div className="flex justify-between items-start mb-2">
              <div>
                <h3 className="text-lg font-black text-white uppercase tracking-wide flex items-center gap-2">
                  {selectedNode.name}
                  <span className="text-[10px] bg-slate-800 text-gray-400 px-2 py-0.5 rounded border border-white/10">
                    Rank {skillRanks[selectedNode.id] || 0} / {selectedNode.max_rank ?? 5}
                  </span>
                </h3>
                <div className="flex gap-2 text-[10px] font-mono mt-1 text-gray-400">
                  <span
                    className={
                      selectedNode.skill_type === 'MAGIC' ? 'text-blue-400' : 'text-red-400'
                    }
                  >
                    {selectedNode.skill_type}
                  </span>
                  <span>•</span>
                  <span>{selectedNode.energy_cost ?? 0} MP</span>
                  <span>•</span>
                  <span>
                    {selectedNode.cooldown_ms ?? 0} Turns CD
                  </span>
                </div>
              </div>
              <button
                onClick={() => setSelectedNode(null)}
                className="p-2 text-gray-500 hover:text-white"
              >
                <ChevronUp className="rotate-180" />
              </button>
            </div>

            <div className="my-4 space-y-3">
              <div className="bg-slate-900/50 p-3 rounded border border-white/5">
                <p className="text-xs text-gray-500 uppercase font-bold mb-1">Current Effect</p>
                <div className="text-sm text-gray-300 leading-relaxed">
                  {getDynamicDescription(selectedNode, skillRanks[selectedNode.id] || 0)}
                </div>
              </div>

              {(skillRanks[selectedNode.id] || 0) < (selectedNode.max_rank ?? 5) && (
                <div className="flex items-center gap-2 text-xs text-gray-500">
                  <ArrowRight size={14} className="text-cyan-500" />
                  <span>
                    Next Rank:{' '}
                    <span className="text-white font-bold">
                      {Math.floor(
                        selectedNode.base_value *
                          (1 + (skillRanks[selectedNode.id] || 0) * 0.1)
                      )}{' '}
                      Base
                    </span>
                  </span>
                </div>
              )}
            </div>

            <button
              onClick={handleUpgrade}
              disabled={
                availablePoints <= 0 ||
                (skillRanks[selectedNode.id] || 0) >= (selectedNode.max_rank ?? 5) ||
                (!isSkillUnlockable(selectedNode) && (skillRanks[selectedNode.id] || 0) === 0)
              }
              className={`w-full py-3 rounded-lg font-black uppercase text-sm tracking-widest transition-all
                ${
                  availablePoints > 0 &&
                  (skillRanks[selectedNode.id] || 0) < (selectedNode.max_rank ?? 5) &&
                  (isSkillUnlockable(selectedNode) || (skillRanks[selectedNode.id] || 0) > 0)
                    ? 'bg-cyan-600 hover:bg-cyan-500 text-white shadow-[0_0_20px_rgba(34,211,238,0.4)]'
                    : 'bg-slate-800 text-gray-500 cursor-not-allowed'
                }
              `}
            >
              {(skillRanks[selectedNode.id] || 0) >= (selectedNode.max_rank ?? 5)
                ? 'MAXED OUT'
                : 'UPGRADE SKILL'}
            </button>

            {!isSkillUnlockable(selectedNode) && (skillRanks[selectedNode.id] || 0) === 0 && (
              <div className="mt-3 text-center text-[10px] text-red-400 uppercase font-bold tracking-wider">
                Requires: Level {selectedNode.required_level ?? 1}
                {selectedNode.required_skill_id && ' • Previous Skill'}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
