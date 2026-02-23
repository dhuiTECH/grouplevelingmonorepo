"use client";

import React, { useEffect, useState, useMemo } from 'react';
import { Loader2, Pencil, Plus, Trash2, PawPrint, Zap, ArrowUpCircle, Search, X } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { motion } from 'framer-motion';

interface Skill {
  id: string;
  name: string;
}

interface PetSpecies {
  id: string;
  name: string;
  icon_url: string;
  base_hp: number;
  base_dmg: number;
  metadata: any;
}

export default function PetsTab() {
  const [pets, setPets] = useState<PetSpecies[]>([]);
  const [skills, setSkills] = useState<Skill[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingPet, setEditingPet] = useState<PetSpecies | null>(null);
  const [saving, setSaving] = useState(false);
  const [skillSearchTerm, setSkillSearchTerm] = useState('');

  const filteredSkills = useMemo(() => {
    const lowerSearch = skillSearchTerm.toLowerCase();
    return skills.filter(s => s.name.toLowerCase().includes(lowerSearch));
  }, [skills, skillSearchTerm]);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    const { data: petData, error: petError } = await supabase
      .from('encounter_pool')
      .select('*')
      .eq('event_type', 'PET')
      .order('created_at', { ascending: false });

    const { data: skillData, error: skillError } = await supabase
      .from('skills')
      .select('id, name')
      .order('name');

    if (petError) console.error('Error loading pets:', petError);
    else setPets(petData || []);

    if (skillError) console.error('Error loading skills:', skillError);
    else setSkills(skillData || []);

    setLoading(false);
  };

  const handleUpdatePet = async () => {
    if (!editingPet) return;
    setSaving(true);
    const { error } = await supabase
      .from('encounter_pool')
      .update({
        metadata: editingPet.metadata
      })
      .eq('id', editingPet.id);

    if (error) {
      alert('Failed to update pet: ' + error.message);
    } else {
      setEditingPet(null);
      loadData();
    }
    setSaving(false);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <Loader2 className="animate-spin text-purple-500" size={32} />
      </div>
    );
  }

  return (
    <section className="space-y-6 animate-in fade-in duration-500">
      <div className="flex justify-between items-center">
        <h2 className="text-lg font-black uppercase tracking-widest text-purple-400 flex items-center gap-2">
          <PawPrint size={22} /> Pet Species & Evolution Manager
        </h2>
      </div>

      {editingPet && (
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-gray-900/40 p-6 rounded-2xl border border-purple-900/50 mb-6"
        >
          <div className="flex justify-between items-start mb-6 border-b border-gray-800 pb-4">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 bg-black/50 rounded-xl border border-purple-500/30 flex items-center justify-center">
                <img src={editingPet.icon_url} className="w-12 h-12 object-contain" />
              </div>
              <div>
                <h3 className="text-xl font-black text-white uppercase italic">{editingPet.name}</h3>
                <p className="text-[10px] text-purple-400 font-bold uppercase tracking-wider">Species Configuration</p>
              </div>
            </div>
            <button 
              onClick={() => setEditingPet(null)}
              className="p-2 hover:bg-white/10 rounded-lg text-gray-400 hover:text-white transition-colors"
            >
              <X size={20} />
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Catching Protocols */}
            <div className="space-y-3">
              <h4 className="text-[10px] font-black uppercase text-gray-500 tracking-widest flex items-center gap-2">
                <PawPrint size={12} /> Catching Protocols
              </h4>
              <div className="grid grid-cols-2 gap-4 bg-black/20 p-4 rounded-xl border border-gray-800">
                <div>
                  <label className="block text-[9px] font-bold text-gray-600 uppercase mb-1">Base Catch Rate</label>
                  <input
                    type="number"
                    step="0.05"
                    min="0"
                    max="1"
                    value={editingPet.metadata?.base_catch_rate ?? 0.3}
                    onChange={(e) => {
                      const val = parseFloat(e.target.value);
                      setEditingPet({
                        ...editingPet,
                        metadata: { ...editingPet.metadata, base_catch_rate: val }
                      });
                    }}
                    className="w-full bg-black border border-gray-800 rounded-lg p-2 text-sm text-white focus:border-purple-500 outline-none"
                  />
                  <p className="text-[9px] text-gray-500 mt-1 italic">0.3 = 30% chance</p>
                </div>
                <div>
                  <label className="block text-[9px] font-bold text-gray-600 uppercase mb-1">Flee Rate</label>
                  <input
                    type="number"
                    step="0.05"
                    min="0"
                    max="1"
                    value={editingPet.metadata?.flee_rate ?? 0.1}
                    onChange={(e) => {
                      const val = parseFloat(e.target.value);
                      setEditingPet({
                        ...editingPet,
                        metadata: { ...editingPet.metadata, flee_rate: val }
                      });
                    }}
                    className="w-full bg-black border border-gray-800 rounded-lg p-2 text-sm text-white focus:border-purple-500 outline-none"
                  />
                  <p className="text-[9px] text-gray-500 mt-1 italic">0.1 = 10% chance</p>
                </div>
              </div>
            </div>

            {/* Evolution Logic */}
            <div className="space-y-3">
              <h4 className="text-[10px] font-black uppercase text-gray-500 tracking-widest flex items-center gap-2">
                <ArrowUpCircle size={12} /> Evolution Chain
              </h4>
              <div className="grid grid-cols-2 gap-4 bg-purple-900/10 p-4 rounded-xl border border-purple-500/20">
                <div>
                  <label className="block text-[9px] font-bold text-gray-600 uppercase mb-1">Evolves To</label>
                  <select
                    value={editingPet.metadata?.pet_config?.evolution?.next_form_id || ''}
                    onChange={(e) => {
                      const val = e.target.value || null;
                      setEditingPet({
                        ...editingPet,
                        metadata: {
                          ...editingPet.metadata,
                          pet_config: {
                            ...(editingPet.metadata?.pet_config || {}),
                            evolution: {
                              ...(editingPet.metadata?.pet_config?.evolution || {}),
                              next_form_id: val
                            }
                          }
                        }
                      });
                    }}
                    className="w-full bg-black border border-gray-800 rounded-lg p-2 text-xs text-white focus:border-purple-500 outline-none"
                  >
                    <option value="">No further evolution</option>
                    {pets.filter(p => p.id !== editingPet.id).map(p => (
                      <option key={p.id} value={p.id}>{p.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-[9px] font-bold text-gray-600 uppercase mb-1">Level Required</label>
                  <input
                    type="number"
                    min="1"
                    max="100"
                    value={editingPet.metadata?.pet_config?.evolution?.level || 20}
                    onChange={(e) => {
                      const val = parseInt(e.target.value, 10);
                      setEditingPet({
                        ...editingPet,
                        metadata: {
                          ...editingPet.metadata,
                          pet_config: {
                            ...(editingPet.metadata?.pet_config || {}),
                            evolution: {
                              ...(editingPet.metadata?.pet_config?.evolution || {}),
                              level: val
                            }
                          }
                        }
                      });
                    }}
                    className="w-full bg-black border border-gray-800 rounded-lg p-2 text-xs text-white focus:border-purple-500 outline-none"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Skill Pool */}
          <div className="space-y-3 mt-6">
            <h4 className="text-[10px] font-black uppercase text-gray-500 tracking-widest flex items-center gap-2">
              <Zap size={12} /> Battle Skill Pool
            </h4>
            <div className="bg-black/40 rounded-xl p-4 border border-gray-800">
              <div className="relative mb-4">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={14} />
                <input
                  type="text"
                  placeholder="Search available skills..."
                  className="w-full bg-black border border-gray-700 rounded-lg py-2 pl-9 pr-4 text-sm text-white focus:border-purple-500 outline-none"
                  value={skillSearchTerm}
                  onChange={(e) => setSkillSearchTerm(e.target.value)}
                />
              </div>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2 max-h-60 overflow-y-auto pr-2 custom-scrollbar">
                {/* Basic Attack (NULL) Toggle */}
                {(!skillSearchTerm || "basic attack (null)".includes(skillSearchTerm.toLowerCase())) && (
                  <label className="flex items-center gap-2 p-2 hover:bg-white/5 rounded-lg cursor-pointer transition-colors border border-purple-500/20 bg-purple-900/5">
                    <input
                      type="checkbox"
                      checked={!!editingPet.metadata?.pet_config?.skill_pool?.includes(null)}
                      onChange={(e) => {
                        const pool = editingPet.metadata?.pet_config?.skill_pool || [];
                        const nextPool = e.target.checked
                          ? [...pool, null]
                          : pool.filter((id: any) => id !== null);
                        
                        setEditingPet({
                          ...editingPet,
                          metadata: {
                            ...editingPet.metadata,
                            pet_config: {
                              ...(editingPet.metadata?.pet_config || {}),
                              skill_pool: nextPool
                            }
                          }
                        });
                      }}
                      className="rounded border-gray-700 bg-black text-purple-500 w-4 h-4"
                    />
                    <span className="text-xs text-purple-300 font-black truncate uppercase tracking-tighter">Basic Attack (NULL)</span>
                  </label>
                )}

                {filteredSkills.map((skill) => {
                  const isPool = editingPet.metadata?.pet_config?.skill_pool?.includes(skill.id);
                  return (
                    <label key={skill.id} className={`flex items-center gap-2 p-2 rounded-lg cursor-pointer transition-colors border ${isPool ? 'bg-purple-500/10 border-purple-500/50' : 'hover:bg-white/5 border-transparent'}`}>
                      <input
                      type="checkbox"
                      checked={!!isPool}
                      onChange={(e) => {
                          const pool = editingPet.metadata?.pet_config?.skill_pool || [];
                          const nextPool = e.target.checked
                            ? [...pool, skill.id]
                            : pool.filter((id: string) => id !== skill.id);
                          
                          setEditingPet({
                            ...editingPet,
                            metadata: {
                              ...editingPet.metadata,
                              pet_config: {
                                ...(editingPet.metadata?.pet_config || {}),
                                skill_pool: nextPool
                              }
                            }
                          });
                        }}
                        className="rounded border-gray-700 bg-black text-purple-500 w-4 h-4"
                      />
                      <span className={`text-xs font-bold truncate ${isPool ? 'text-purple-200' : 'text-gray-400'}`}>{skill.name}</span>
                    </label>
                  );
                })}
              </div>
            </div>
          </div>

          <div className="flex gap-4 mt-6">
            <button
              onClick={() => setEditingPet(null)}
              className="px-6 py-3 bg-gray-800 hover:bg-gray-700 text-white rounded-xl font-bold uppercase text-xs"
            >
              Cancel
            </button>
            <button
              onClick={handleUpdatePet}
              disabled={saving}
              className="flex-1 py-3 bg-purple-600 hover:bg-purple-500 disabled:bg-gray-700 text-white rounded-xl font-black uppercase tracking-widest text-xs flex items-center justify-center gap-2 shadow-lg shadow-purple-500/20 transition-all active:scale-[0.98]"
            >
              {saving ? <Loader2 size={16} className="animate-spin" /> : 'Save Pet Configuration'}
            </button>
          </div>
        </motion.div>
      )}

      {/* Pet Grid */}
      <div className="bg-gray-900/40 p-6 rounded-2xl border border-gray-800">
        <h3 className="text-sm font-black uppercase text-gray-400 mb-4">Pet Species Pool ({pets.length})</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 xl:grid-cols-6 gap-4">
          {pets.map((pet) => (
            <div
              key={pet.id}
              className={`group relative aspect-square bg-black/40 border rounded-xl overflow-hidden cursor-pointer transition-all hover:shadow-[0_0_15px_rgba(168,85,247,0.2)] ${
                editingPet?.id === pet.id
                  ? 'border-purple-500 ring-1 ring-purple-500'
                  : 'border-gray-800 hover:border-purple-500/50'
              }`}
              onClick={() => setEditingPet(pet)}
            >
              <div className="absolute inset-0 flex flex-col items-center justify-center p-4 text-center">
                {/* Thumbnail Logic */}
                {(() => {
                  const visuals = pet.metadata?.visuals || {};
                  const spritesheet = visuals.spritesheet;
                  
                  if (spritesheet) {
                    const frameWidth = spritesheet.frame_width || 64;
                    const frameHeight = spritesheet.frame_height || 64;
                    const scale = 64 / Math.max(frameWidth, frameHeight);

                    return (
                      <div 
                        className="mb-3 drop-shadow-[0_0_10px_rgba(0,0,0,0.5)] transition-transform group-hover:scale-110"
                        style={{
                          width: '64px',
                          height: '64px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          overflow: 'hidden'
                        }}
                      >
                        <div
                          style={{
                            width: `${frameWidth}px`,
                            height: `${frameHeight}px`,
                            backgroundImage: `url(${pet.icon_url || visuals.monster_url})`,
                            backgroundSize: `${(spritesheet.frame_count || 1) * 100}% 100%`,
                            backgroundPosition: '0px 0px',
                            backgroundRepeat: 'no-repeat',
                            imageRendering: 'pixelated',
                            transform: `scale(${scale})`,
                            transformOrigin: 'center center'
                          }}
                        />
                      </div>
                    );
                  }

                  return (
                    <img 
                      src={pet.icon_url || '/placeholder.png'} 
                      className="w-16 h-16 object-contain mb-3 drop-shadow-[0_0_10px_rgba(0,0,0,0.5)] transition-transform group-hover:scale-110" 
                    />
                  );
                })()}
                <div className="text-xs font-black text-white leading-tight mb-1">{pet.name}</div>
                <div className="text-[10px] text-gray-500 font-bold">
                  HP {pet.base_hp}
                </div>
              </div>

              {/* Hover Details */}
              <div className="absolute inset-0 bg-gray-900/95 backdrop-blur-sm opacity-0 group-hover:opacity-100 transition-opacity p-4 flex flex-col items-center justify-center z-10">
                <h4 className="text-xs font-black text-white mb-2">{pet.name}</h4>
                <div className="space-y-1 w-full">
                  <div className="flex justify-between text-[10px] text-gray-400 bg-gray-800/50 p-1 rounded">
                    <span>HP</span>
                    <span className="text-green-400 font-mono">{pet.base_hp}</span>
                  </div>
                  <div className="flex justify-between text-[10px] text-gray-400 bg-gray-800/50 p-1 rounded">
                    <span>DMG</span>
                    <span className="text-red-400 font-mono">{pet.base_dmg}</span>
                  </div>
                </div>
                <div className="mt-3 text-[10px] text-purple-400 font-bold uppercase tracking-widest flex items-center gap-1">
                  <Pencil size={10} /> Click to Edit
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}