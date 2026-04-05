'use client';

import { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/lib/supabase';
import { Zap, Sword, Plus, Trash2, Filter, Search, Users } from 'lucide-react';
import ClassesTab from '@/components/admin/ClassesTab';
import CreateSkillForm from '@/components/skills/CreateSkillForm';
import SkillVisualsEditor from '@/components/skills/SkillVisualsEditor';
import SkillBalancer from './SkillBalancer';
import SkillLoadoutTester from './skills/SkillLoadoutTester';
import AdminSkillTreeBuilder from './skills/AdminSkillTreeBuilder';

type SubTab = 'architect' | 'database' | 'classes';

export default function SkillsTab() {
  const [subTab, setSubTab] = useState<SubTab>('architect');

  // Tree Architect state
  const [selectedClass, setSelectedClass] = useState('Assassin');
  const [classList, setClassList] = useState<string[]>([]);

  // Skill Database state
  const [skills, setSkills] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingSkill, setEditingSkill] = useState<any>(null);
  const [selectedSkill, setSelectedSkill] = useState<any>(null);
  const [showBalancer, setShowBalancer] = useState(false);
  const [showTester, setShowTester] = useState(false);
  const [skillDbFilter, setSkillDbFilter] = useState<string>('all'); // 'all' | 'mob_only' | class name
  const [searchQuery, setSearchQuery] = useState('');

  const filteredSkills = useMemo(() => {
    let result = skills;
    
    if (skillDbFilter !== 'all') {
      if (skillDbFilter === 'mob_only') {
        result = result.filter((s) => !s.allowed_classes?.length);
      } else {
        result = result.filter((s) => s.allowed_classes?.includes(skillDbFilter));
      }
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      result = result.filter((s) => 
        s.name.toLowerCase().includes(q) || 
        s.id.toString().toLowerCase().includes(q)
      );
    }

    return result;
  }, [skills, skillDbFilter, searchQuery]);

  useEffect(() => {
    const fetchClasses = async () => {
      const { data } = await supabase.from('classes').select('name').order('name');
      if (data) {
        const names = data.map((c) => c.name);
        setClassList(names);
        if (names.length > 0) setSelectedClass(names[0]);
      }
    };
    fetchClasses();
  }, []);

  const fetchSkills = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('skills')
      .select('*')
      .order('name', { ascending: true });
    if (error) {
      console.error('Skills fetch error:', error);
      setSkills([]);
    } else if (data) {
      setSkills(data);
    }
    setLoading(false);
  };

  useEffect(() => {
    if (subTab === 'database') fetchSkills();
  }, [subTab]);

  return (
    <div className="text-white p-4 font-mono space-y-6">
      {/* Sub-tabs: Tree Architect | Skill Database | Classes */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-4 border-b border-slate-800 pb-4">
        <h1 className="text-xl font-black tracking-widest text-red-600 uppercase flex items-center gap-2 shrink-0">
          <Zap size={22} /> Skills
        </h1>
        <div className="flex flex-wrap gap-2 bg-black p-1 rounded-lg border border-slate-700">
          <button
            onClick={() => setSubTab('architect')}
            className={`px-4 py-2 rounded text-xs font-bold uppercase transition-all ${
              subTab === 'architect'
                ? 'bg-cyan-600 text-white shadow-lg shadow-cyan-500/20'
                : 'text-gray-500 hover:text-white hover:bg-white/5'
            }`}
          >
            Tree Architect
          </button>
          <button
            onClick={() => setSubTab('database')}
            className={`px-4 py-2 rounded text-xs font-bold uppercase transition-all ${
              subTab === 'database'
                ? 'bg-cyan-600 text-white shadow-lg shadow-cyan-500/20'
                : 'text-gray-500 hover:text-white hover:bg-white/5'
            }`}
          >
            Skill Database
          </button>
          <button
            onClick={() => setSubTab('classes')}
            className={`px-4 py-2 rounded text-xs font-bold uppercase transition-all flex items-center gap-1.5 ${
              subTab === 'classes'
                ? 'bg-cyan-600 text-white shadow-lg shadow-cyan-500/20'
                : 'text-gray-500 hover:text-white hover:bg-white/5'
            }`}
          >
            <Users size={14} className="opacity-80" /> Classes
          </button>
        </div>
      </div>

      {subTab === 'architect' && (
        <>
          <div className="flex justify-between items-center bg-slate-900 p-4 rounded-lg border border-slate-800">
            <div>
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <Zap className="text-cyan-400" size={18} /> Skill Tree Architect
              </h2>
              <p className="text-xs text-gray-500">Select a class to edit their tree.</p>
            </div>
            <div className="flex gap-2 bg-black p-1 rounded-lg border border-white/10 overflow-x-auto">
              {classList.map((cls) => (
                <button
                  key={cls}
                  onClick={() => setSelectedClass(cls)}
                  className={`px-4 py-2 rounded text-xs font-bold uppercase transition-all whitespace-nowrap
                    ${selectedClass === cls
                      ? 'bg-cyan-600 text-white shadow-lg shadow-cyan-500/20'
                      : 'text-gray-500 hover:text-white hover:bg-white/5'
                    }`}
                >
                  {cls}
                </button>
              ))}
            </div>
          </div>
          <div className="min-h-[600px] max-h-[80vh] overflow-auto border border-white/5 rounded-xl shadow-2xl relative">
            <AdminSkillTreeBuilder selectedClass={selectedClass} />
          </div>
        </>
      )}

      {subTab === 'database' && (
        <>
          <header className="flex justify-between items-center border-b border-red-900/30 pb-4 flex-wrap gap-2">
            <div>
              <p className="text-xs text-gray-500">SYSTEM DATABASE // Add & edit skills used in trees and mobs</p>
              <p className="text-[10px] text-gray-600 mt-0.5 max-w-xl">
                  <strong>Skill Balancer:</strong> Compare damage at different Level/STR/INT and see burst + DPS for a 4-slot loadout. &bull; <strong>Loadout Tester:</strong> Run a 10s simulation with cooldowns and action points to see real DPS and cast order.
                </p>
              </div>
            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowBalancer(!showBalancer);
                  setShowTester(false);
                }}
                className={`px-4 py-2 rounded text-xs font-bold uppercase tracking-wider flex items-center gap-2 transition-all border ${
                  showBalancer ? 'bg-cyan-900 border-cyan-500 text-cyan-100' : 'bg-gray-900 border-gray-700 hover:border-cyan-500 text-gray-400'
                }`}
              >
                <Sword size={16} /> Skill Balancer
              </button>
              <button
                onClick={() => {
                  setShowTester(!showTester);
                  setShowBalancer(false);
                }}
                className={`px-4 py-2 rounded text-xs font-bold uppercase tracking-wider flex items-center gap-2 transition-all border ${
                  showTester ? 'bg-purple-900 border-purple-500 text-purple-100' : 'bg-gray-900 border-gray-700 hover:border-purple-500 text-gray-400'
                }`}
              >
                <Zap size={16} /> Loadout Tester
              </button>
              <button
                onClick={() => {
                  setEditingSkill(null);
                  setShowCreateModal(true);
                }}
                className="bg-red-700 hover:bg-red-600 px-6 py-2 rounded text-xs font-bold uppercase tracking-wider flex items-center gap-2 transition-all"
              >
                <Plus size={16} /> Add Protocol
              </button>
            </div>
          </header>

          {showBalancer && (
            <div className="mb-8">
              <SkillBalancer skills={skills} />
            </div>
          )}

          {showTester && (
            <div className="mb-8">
              <SkillLoadoutTester availableSkills={skills} />
            </div>
          )}

          {/* Filter: All | Mob Only | Classes */}
          <div className="flex flex-wrap items-center gap-4 mb-4 bg-slate-900/50 p-3 rounded-lg border border-slate-800/50">
            <div className="flex items-center gap-2 flex-grow max-w-md">
              <div className="relative w-full">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={14} />
                <input
                  type="text"
                  placeholder="Search skills by name or ID..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-black/40 border border-slate-700 rounded-md py-1.5 pl-9 pr-3 text-xs text-gray-200 focus:outline-none focus:border-cyan-500 transition-colors"
                />
                {searchQuery && (
                  <button 
                    onClick={() => setSearchQuery('')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white"
                  >
                    ×
                  </button>
                )}
              </div>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-[10px] text-gray-500 uppercase font-bold flex items-center gap-1">
                <Filter size={12} /> Filter
              </span>
              <div className="flex flex-wrap gap-1.5">
                <button
                  onClick={() => setSkillDbFilter('all')}
                  className={`px-3 py-1.5 rounded text-xs font-bold uppercase transition-all ${
                    skillDbFilter === 'all'
                      ? 'bg-cyan-600 text-white'
                      : 'bg-gray-800 text-gray-400 hover:bg-gray-700 hover:text-white'
                  }`}
                >
                  All
                </button>
                <button
                  onClick={() => setSkillDbFilter('mob_only')}
                  className={`px-3 py-1.5 rounded text-xs font-bold uppercase transition-all ${
                    skillDbFilter === 'mob_only'
                      ? 'bg-yellow-600 text-white'
                      : 'bg-gray-800 text-gray-400 hover:bg-gray-700 hover:text-white'
                  }`}
                >
                  Mob Only
                </button>
                {classList.map((cls) => (
                  <button
                    key={cls}
                    onClick={() => setSkillDbFilter(cls)}
                    className={`px-3 py-1.5 rounded text-xs font-bold uppercase transition-all ${
                      skillDbFilter === cls
                        ? 'bg-cyan-600 text-white'
                        : 'bg-gray-800 text-gray-400 hover:bg-gray-700 hover:text-white'
                    }`}
                  >
                    {cls}
                  </button>
                ))}
              </div>
              <span className="text-[10px] text-gray-500 ml-1">
                {filteredSkills.length} skill{filteredSkills.length !== 1 ? 's' : ''}
              </span>
            </div>
          </div>

          {loading ? (
            <div className="text-red-500 animate-pulse text-sm">Loading skills...</div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-4 xl:grid-cols-6 gap-4">
              {filteredSkills.map((skill) => (
                <div
                  key={skill.id}
                  className="bg-[#0a0a0a] border border-gray-800 hover:border-red-500/50 transition-colors rounded-xl group relative aspect-square overflow-hidden"
                >
                  <div className="absolute inset-0 p-3 flex flex-col items-center justify-center text-center">
                    <div className="w-12 h-12 bg-gray-900 rounded-lg border border-gray-700 flex items-center justify-center overflow-hidden mb-2 shadow-lg">
                      {(skill.icon_url || skill.icon_path) ? (
                        <img
                          src={skill.icon_url || skill.icon_path}
                          alt=""
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <Sword size={24} className="text-gray-600" />
                      )}
                    </div>
                    <h3 className="text-xs font-bold text-gray-200 leading-tight line-clamp-2">{skill.name}</h3>
                    
                    <div className="mt-2 flex gap-1 justify-center">
                        {!skill.allowed_classes?.length ? (
                        <span className="text-[9px] bg-yellow-900/20 text-yellow-500 px-1.5 py-0.5 rounded border border-yellow-900/50">
                          MOB
                        </span>
                      ) : (
                        <span className="text-[9px] bg-cyan-900/20 text-cyan-500 px-1.5 py-0.5 rounded border border-cyan-900/50">
                          {skill.allowed_classes.length > 1 ? 'MULTI' : skill.allowed_classes[0]}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Hover Overlay */}
                  <div className="absolute inset-0 bg-gray-900/95 backdrop-blur-sm opacity-0 group-hover:opacity-100 transition-opacity p-3 flex flex-col z-10">
                    <div className="flex-1 overflow-y-auto custom-scrollbar space-y-1.5">
                      <h3 className="text-xs font-black text-white text-center mb-2">{skill.name}</h3>
                      
                      <div className="flex justify-between items-center text-[10px] text-gray-400 bg-gray-800/50 p-1 rounded">
                        <span>ID</span>
                        <span className="font-mono">{skill.id}</span>
                      </div>
                      <div className="flex justify-between items-center text-[10px] text-gray-400 bg-gray-800/50 p-1 rounded">
                        <span>DMG</span>
                        <span className="text-red-400 font-mono">{skill.base_value ?? 0}</span>
                      </div>
                      <div className="flex justify-between items-center text-[10px] text-gray-400 bg-gray-800/50 p-1 rounded">
                        <span>AP Cost</span>
                        <span className="text-blue-400 font-mono">{skill.energy_cost ?? 0}</span>
                      </div>
                      <div className="flex justify-between items-center text-[10px] text-gray-400 bg-gray-800/50 p-1 rounded">
                        <span>Cooldown</span>
                        <span className="text-yellow-400 font-mono">{skill.cooldown_ms ?? 0}T</span>
                      </div>
                      <div className="flex justify-between items-center text-[10px] text-gray-400 bg-gray-800/50 p-1 rounded">
                        <span>Target</span>
                        <span className={`font-black text-xs uppercase ${
                          skill.target_type === 'self' ? 'text-cyan-400' :
                          skill.target_type === 'teammate' ? 'text-green-400' :
                          skill.target_type === 'area_enemy' ? 'text-red-400' :
                          skill.target_type === 'area_friendly' ? 'text-blue-400' :
                          'text-yellow-400'
                        }`}>
                          {skill.target_type?.replace('_', ' ').toUpperCase() || 'ENEMY'}
                        </span>
                      </div>
                    </div>

                    <div className="flex gap-1 mt-2 pt-2 border-t border-gray-800">
                      <button
                        onClick={() => {
                          setEditingSkill(skill);
                          setShowCreateModal(true);
                        }}
                        className="flex-1 text-[10px] bg-gray-800 hover:bg-gray-700 py-1.5 rounded text-white"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => setSelectedSkill(skill)}
                        className="flex-1 text-[10px] bg-cyan-900/30 hover:bg-cyan-800/50 text-cyan-400 border border-cyan-800 py-1.5 rounded"
                      >
                        Visuals
                      </button>
                      <button
                        onClick={async () => {
                          if (!confirm(`Delete "${skill.name}"?`)) return;
                          await supabase.from('skills').delete().eq('id', skill.id);
                          fetchSkills();
                        }}
                        className="text-red-500 hover:bg-red-900/20 p-1.5 rounded"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {showCreateModal && (
            <CreateSkillForm
              skill={editingSkill}
              onClose={() => {
                setShowCreateModal(false);
                setEditingSkill(null);
              }}
              onSuccess={() => {
                fetchSkills();
                setShowCreateModal(false);
                setEditingSkill(null);
              }}
            />
          )}

          {selectedSkill && (
            <SkillVisualsEditor
              skillId={selectedSkill.id}
              skillName={selectedSkill.name}
              onClose={() => setSelectedSkill(null)}
            />
          )}
        </>
      )}

      {subTab === 'classes' && <ClassesTab />}
    </div>
  );
}
