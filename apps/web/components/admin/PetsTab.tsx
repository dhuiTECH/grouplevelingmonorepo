"use client";

import React, { useEffect, useRef, useState, useMemo } from 'react';
import { Loader2, Pencil, PawPrint, Zap, ArrowUpCircle, Search, X, Upload, Film, Footprints } from 'lucide-react';
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

interface AnimConfig {
  walkingUrl: string;
  walkingFrameCount: number;
  walkingFrameWidth: number;
  walkingFrameHeight: number;
  walkingAnimSpeed: number;
  idleFrame: number;
}

const defaultAnimConfig = (): AnimConfig => ({
  walkingUrl: '',
  walkingFrameCount: 4,
  walkingFrameWidth: 64,
  walkingFrameHeight: 64,
  walkingAnimSpeed: 800,
  idleFrame: 0,
});

function PetAnimPreview({ cfg }: { cfg: AnimConfig }) {
  const [walkFrame, setWalkFrame] = useState(0);
  const [previewMode, setPreviewMode] = useState<'idle' | 'walk'>('idle');

  useEffect(() => {
    if (previewMode !== 'walk' || !cfg.walkingUrl || cfg.walkingFrameCount <= 1) {
      setWalkFrame(0);
      return;
    }
    const fps = cfg.walkingAnimSpeed > 0 ? (cfg.walkingFrameCount * 1000) / cfg.walkingAnimSpeed : 10;
    const interval = setInterval(() => {
      setWalkFrame((p) => (p + 1) % cfg.walkingFrameCount);
    }, 1000 / Math.min(30, Math.max(1, fps)));
    return () => clearInterval(interval);
  }, [previewMode, cfg.walkingUrl, cfg.walkingFrameCount, cfg.walkingAnimSpeed]);

  const hasSheet = !!cfg.walkingUrl;
  const displayScale = hasSheet ? Math.min(2, 96 / Math.max(cfg.walkingFrameWidth, cfg.walkingFrameHeight)) : 2;
  const idlePos = cfg.walkingFrameCount > 1 ? (cfg.idleFrame / (cfg.walkingFrameCount - 1)) * 100 : 0;
  const walkPos = cfg.walkingFrameCount > 1 ? (walkFrame / (cfg.walkingFrameCount - 1)) * 100 : 0;

  return (
    <div className="mt-4 p-4 rounded-xl border border-gray-800 bg-black/30 space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-[10px] font-black uppercase text-gray-400 tracking-widest flex items-center gap-2">
          <Film size={12} /> Animation Preview
        </span>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setPreviewMode('idle')}
            className={`px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider transition-colors ${previewMode === 'idle' ? 'bg-purple-600 text-white' : 'bg-gray-800 text-gray-400 hover:bg-gray-700'}`}
          >
            Idle
          </button>
          <button
            type="button"
            onClick={() => setPreviewMode('walk')}
            className={`px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider transition-colors ${previewMode === 'walk' ? 'bg-cyan-600 text-white' : 'bg-gray-800 text-gray-400 hover:bg-gray-700'}`}
          >
            Walking
          </button>
        </div>
      </div>

      <div className="flex gap-6 items-end">
        {/* Idle Preview — static frame from walking sheet */}
        <div className="flex flex-col items-center gap-2">
          <span className="text-[9px] font-black uppercase text-purple-400 tracking-widest">Idle — Frame {cfg.idleFrame}</span>
          <div
            className={`relative rounded-xl border-2 transition-colors overflow-hidden flex items-center justify-center bg-gray-900/60 ${previewMode === 'idle' ? 'border-purple-500 shadow-[0_0_12px_rgba(168,85,247,0.4)]' : 'border-gray-800'}`}
            style={{ width: 100, height: 100 }}
          >
            {hasSheet ? (
              <div
                style={{
                  width: `${cfg.walkingFrameWidth}px`,
                  height: `${cfg.walkingFrameHeight}px`,
                  backgroundImage: `url(${cfg.walkingUrl})`,
                  backgroundSize: `${cfg.walkingFrameCount * 100}% 100%`,
                  backgroundPosition: `${idlePos}% 0px`,
                  backgroundRepeat: 'no-repeat',
                  imageRendering: 'pixelated',
                  transform: `scale(${displayScale})`,
                  transformOrigin: 'center center',
                }}
              />
            ) : (
              <div className="text-gray-600 text-[9px] text-center uppercase font-bold px-2">No spritesheet<br/>uploaded</div>
            )}
          </div>
          <span className="text-[9px] text-gray-500 italic">+ breathing effect</span>
        </div>

        {/* Walking Preview — full animation */}
        <div className="flex flex-col items-center gap-2">
          <span className="text-[9px] font-black uppercase text-cyan-400 tracking-widest">Walking</span>
          <div
            className={`relative rounded-xl border-2 transition-colors overflow-hidden flex items-center justify-center bg-gray-900/60 ${previewMode === 'walk' ? 'border-cyan-500 shadow-[0_0_12px_rgba(6,182,212,0.4)]' : 'border-gray-800'}`}
            style={{ width: 100, height: 100 }}
          >
            {hasSheet ? (
              <div
                style={{
                  width: `${cfg.walkingFrameWidth}px`,
                  height: `${cfg.walkingFrameHeight}px`,
                  backgroundImage: `url(${cfg.walkingUrl})`,
                  backgroundSize: `${cfg.walkingFrameCount * 100}% 100%`,
                  backgroundPosition: `${walkPos}% 0px`,
                  backgroundRepeat: 'no-repeat',
                  imageRendering: 'pixelated',
                  transform: `scale(${displayScale})`,
                  transformOrigin: 'center center',
                }}
              />
            ) : (
              <div className="text-gray-600 text-[9px] text-center uppercase font-bold px-2">No spritesheet<br/>uploaded</div>
            )}
          </div>
          <span className="text-[9px] text-gray-500 italic">Full loop</span>
        </div>

        <div className="flex-1 text-[9px] text-gray-500 italic leading-relaxed">
          <p className="mb-1"><span className="text-purple-400 font-bold">Idle:</span> one still frame from the sheet + gentle breathing on the world map.</p>
          <p><span className="text-cyan-400 font-bold">Walking:</span> all frames loop when the joystick moves.</p>
        </div>
      </div>
    </div>
  );
}

export default function PetsTab() {
  const walkingInputRef = useRef<HTMLInputElement>(null);

  const [pets, setPets] = useState<PetSpecies[]>([]);
  const [skills, setSkills] = useState<Skill[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingPet, setEditingPet] = useState<PetSpecies | null>(null);
  const [saving, setSaving] = useState(false);
  const [skillSearchTerm, setSkillSearchTerm] = useState('');
  const [uploadingWalking, setUploadingWalking] = useState(false);
  const [animConfig, setAnimConfig] = useState<AnimConfig>(defaultAnimConfig());
  const [activeSection, setActiveSection] = useState<'config' | 'animation'>('config');

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

  const openEdit = (pet: PetSpecies) => {
    setEditingPet(pet);
    setActiveSection('config');
    const walkSheet = pet.metadata?.visuals?.walking_spritesheet || {};
    setAnimConfig({
      walkingUrl: walkSheet.url || '',
      walkingFrameCount: walkSheet.frame_count ?? 4,
      walkingFrameWidth: walkSheet.frame_width ?? 64,
      walkingFrameHeight: walkSheet.frame_height ?? 64,
      walkingAnimSpeed: walkSheet.duration_ms ?? 800,
      idleFrame: walkSheet.idle_frame ?? 0,
    });
  };

  const handleUploadWalking = async (file: File) => {
    if (!file) return;
    setUploadingWalking(true);
    try {
      const filePath = `encounters/pets/${Date.now()}_walking_${file.name.replace(/[^a-zA-Z0-9.-]/g, '_')}`;
      const { error } = await supabase.storage.from('game-assets').upload(filePath, file, { 
        upsert: true,
        cacheControl: '31536000'
      });
      if (error) throw error;
      const { data } = supabase.storage.from('game-assets').getPublicUrl(filePath);
      setAnimConfig(prev => ({ ...prev, walkingUrl: `${data.publicUrl}?t=${Date.now()}` }));
      if (walkingInputRef.current) walkingInputRef.current.value = '';
    } catch (e: any) {
      alert('Upload failed: ' + (e?.message || e));
    } finally {
      setUploadingWalking(false);
    }
  };

  const handleUpdatePet = async () => {
    if (!editingPet) return;
    setSaving(true);

    const updatedVisuals = {
      ...(editingPet.metadata?.visuals || {}),
      walking_spritesheet: animConfig.walkingUrl ? {
        url: animConfig.walkingUrl,
        frame_count: animConfig.walkingFrameCount,
        frame_width: animConfig.walkingFrameWidth,
        frame_height: animConfig.walkingFrameHeight,
        duration_ms: animConfig.walkingAnimSpeed,
        idle_frame: animConfig.idleFrame,
      } : (editingPet.metadata?.visuals?.walking_spritesheet || null),
    };

    const { error } = await supabase
      .from('encounter_pool')
      .update({ metadata: { ...editingPet.metadata, visuals: updatedVisuals } })
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
          {/* Header */}
          <div className="flex justify-between items-start mb-6 border-b border-gray-800 pb-4">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 bg-black/50 rounded-xl border border-purple-500/30 flex items-center justify-center overflow-hidden">
                {animConfig.walkingUrl ? (
                  <div
                    style={{
                      width: `${animConfig.walkingFrameWidth}px`,
                      height: `${animConfig.walkingFrameHeight}px`,
                      backgroundImage: `url(${animConfig.walkingUrl})`,
                      backgroundSize: `${animConfig.walkingFrameCount * 100}% 100%`,
                      backgroundPosition: `${animConfig.walkingFrameCount > 1 ? (animConfig.idleFrame / (animConfig.walkingFrameCount - 1)) * 100 : 0}% 0px`,
                      backgroundRepeat: 'no-repeat',
                      imageRendering: 'pixelated',
                      transform: `scale(${Math.min(3, 48 / Math.max(animConfig.walkingFrameWidth, animConfig.walkingFrameHeight))})`,
                      transformOrigin: 'center center',
                    }}
                  />
                ) : (
                  <img src={editingPet.icon_url} className="w-12 h-12 object-contain" />
                )}
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

          {/* Section Tabs */}
          <div className="flex gap-2 mb-6">
            <button
              type="button"
              onClick={() => setActiveSection('config')}
              className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-colors ${activeSection === 'config' ? 'bg-purple-600 text-white' : 'bg-gray-800 text-gray-400 hover:bg-gray-700'}`}
            >
              <PawPrint size={10} className="inline mr-1" /> Species Config
            </button>
            <button
              type="button"
              onClick={() => setActiveSection('animation')}
              className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-colors ${activeSection === 'animation' ? 'bg-cyan-600 text-white' : 'bg-gray-800 text-gray-400 hover:bg-gray-700'}`}
            >
              <Footprints size={10} className="inline mr-1" /> World Map Animations
            </button>
          </div>

          {/* Config Section */}
          {activeSection === 'config' && (
            <div className="space-y-6">
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
                        type="number" step="0.05" min="0" max="1"
                        value={editingPet.metadata?.base_catch_rate ?? 0.3}
                        onChange={(e) => setEditingPet({ ...editingPet, metadata: { ...editingPet.metadata, base_catch_rate: parseFloat(e.target.value) } })}
                        className="w-full bg-black border border-gray-800 rounded-lg p-2 text-sm text-white focus:border-purple-500 outline-none"
                      />
                      <p className="text-[9px] text-gray-500 mt-1 italic">0.3 = 30% chance</p>
                    </div>
                    <div>
                      <label className="block text-[9px] font-bold text-gray-600 uppercase mb-1">Flee Rate</label>
                      <input
                        type="number" step="0.05" min="0" max="1"
                        value={editingPet.metadata?.flee_rate ?? 0.1}
                        onChange={(e) => setEditingPet({ ...editingPet, metadata: { ...editingPet.metadata, flee_rate: parseFloat(e.target.value) } })}
                        className="w-full bg-black border border-gray-800 rounded-lg p-2 text-sm text-white focus:border-purple-500 outline-none"
                      />
                      <p className="text-[9px] text-gray-500 mt-1 italic">0.1 = 10% chance</p>
                    </div>
                  </div>
                </div>

                {/* Evolution Chain */}
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
                          setEditingPet({ ...editingPet, metadata: { ...editingPet.metadata, pet_config: { ...(editingPet.metadata?.pet_config || {}), evolution: { ...(editingPet.metadata?.pet_config?.evolution || {}), next_form_id: val } } } });
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
                        type="number" min="1" max="100"
                        value={editingPet.metadata?.pet_config?.evolution?.level || 20}
                        onChange={(e) => {
                          setEditingPet({ ...editingPet, metadata: { ...editingPet.metadata, pet_config: { ...(editingPet.metadata?.pet_config || {}), evolution: { ...(editingPet.metadata?.pet_config?.evolution || {}), level: parseInt(e.target.value, 10) } } } });
                        }}
                        className="w-full bg-black border border-gray-800 rounded-lg p-2 text-xs text-white focus:border-purple-500 outline-none"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Skill Pool */}
              <div className="space-y-3">
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
                    {(!skillSearchTerm || "basic attack (null)".includes(skillSearchTerm.toLowerCase())) && (
                      <label className="flex items-center gap-2 p-2 hover:bg-white/5 rounded-lg cursor-pointer transition-colors border border-purple-500/20 bg-purple-900/5">
                        <input
                          type="checkbox"
                          checked={!!editingPet.metadata?.pet_config?.skill_pool?.includes(null)}
                          onChange={(e) => {
                            const pool = editingPet.metadata?.pet_config?.skill_pool || [];
                            const nextPool = e.target.checked ? [...pool, null] : pool.filter((id: any) => id !== null);
                            setEditingPet({ ...editingPet, metadata: { ...editingPet.metadata, pet_config: { ...(editingPet.metadata?.pet_config || {}), skill_pool: nextPool } } });
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
                              const nextPool = e.target.checked ? [...pool, skill.id] : pool.filter((id: string) => id !== skill.id);
                              setEditingPet({ ...editingPet, metadata: { ...editingPet.metadata, pet_config: { ...(editingPet.metadata?.pet_config || {}), skill_pool: nextPool } } });
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
            </div>
          )}

          {/* Animation Section */}
          {activeSection === 'animation' && (
            <div className="space-y-6">
              <div className="space-y-3">
                <h4 className="text-[10px] font-black uppercase text-cyan-400 tracking-widest flex items-center gap-2">
                  <Footprints size={12} /> Walking Spritesheet (Horizontal Strip)
                </h4>
                <div className="bg-black/30 p-4 rounded-xl border border-cyan-500/20 space-y-3">
                  <div className="flex gap-2">
                    <input
                      value={animConfig.walkingUrl}
                      onChange={(e) => setAnimConfig(prev => ({ ...prev, walkingUrl: e.target.value }))}
                      placeholder="Walking spritesheet URL or upload below"
                      className="flex-1 bg-black border border-gray-700 rounded-lg p-2 text-sm text-white focus:border-cyan-500 outline-none"
                    />
                    <input
                      type="file"
                      ref={walkingInputRef}
                      accept="image/png,image/jpeg,image/webp"
                      className="hidden"
                      onChange={(e) => { const f = e.target.files?.[0]; if (f) handleUploadWalking(f); }}
                    />
                    <button
                      type="button"
                      onClick={() => walkingInputRef.current?.click()}
                      disabled={uploadingWalking}
                      className="px-3 py-2 bg-cyan-700 hover:bg-cyan-600 disabled:bg-gray-700 text-white rounded-lg text-[10px] font-bold uppercase flex items-center gap-1 shrink-0"
                    >
                      {uploadingWalking ? <Loader2 size={12} className="animate-spin" /> : <Upload size={12} />}
                      {uploadingWalking ? 'Uploading…' : 'Upload'}
                    </button>
                  </div>

                  <div className="flex flex-wrap gap-4">
                    <div>
                      <label className="block text-[9px] font-black uppercase text-gray-500 mb-1">Frames</label>
                      <input
                        type="number" min={1}
                        value={animConfig.walkingFrameCount}
                        onChange={(e) => setAnimConfig(prev => ({ ...prev, walkingFrameCount: Math.max(1, parseInt(e.target.value, 10) || 1) }))}
                        className="w-20 bg-black border border-gray-700 rounded-lg p-2 text-sm text-white"
                      />
                    </div>
                    <div>
                      <label className="block text-[9px] font-black uppercase text-gray-500 mb-1">Speed (ms total)</label>
                      <input
                        type="number" min={10} step={50}
                        value={animConfig.walkingAnimSpeed}
                        onChange={(e) => setAnimConfig(prev => ({ ...prev, walkingAnimSpeed: Math.max(10, parseInt(e.target.value, 10) || 800) }))}
                        className="w-28 bg-black border border-gray-700 rounded-lg p-2 text-sm text-white"
                      />
                    </div>
                    <div>
                      <label className="block text-[9px] font-black uppercase text-gray-500 mb-1">Width (px)</label>
                      <input
                        type="number" min={1}
                        value={animConfig.walkingFrameWidth}
                        onChange={(e) => setAnimConfig(prev => ({ ...prev, walkingFrameWidth: Math.max(1, parseInt(e.target.value, 10) || 64) }))}
                        className="w-24 bg-black border border-gray-700 rounded-lg p-2 text-sm text-white"
                      />
                    </div>
                    <div>
                      <label className="block text-[9px] font-black uppercase text-gray-500 mb-1">Height (px)</label>
                      <input
                        type="number" min={1}
                        value={animConfig.walkingFrameHeight}
                        onChange={(e) => setAnimConfig(prev => ({ ...prev, walkingFrameHeight: Math.max(1, parseInt(e.target.value, 10) || 64) }))}
                        className="w-24 bg-black border border-gray-700 rounded-lg p-2 text-sm text-white"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Idle Frame Picker */}
              <div className="space-y-3">
                <h4 className="text-[10px] font-black uppercase text-purple-400 tracking-widest flex items-center gap-2">
                  <PawPrint size={12} /> Idle Frame (Standing Still)
                </h4>
                <div className="bg-black/30 p-4 rounded-xl border border-purple-500/20 space-y-3">
                  <p className="text-[9px] text-gray-400">Pick which frame from the walking sheet to freeze on when the pet is standing still. The breathing animation will play on top.</p>

                  <div className="flex items-center gap-4">
                    <div>
                      <label className="block text-[9px] font-black uppercase text-purple-400 mb-1">Frame Index</label>
                      <input
                        type="number"
                        min={0}
                        max={Math.max(0, animConfig.walkingFrameCount - 1)}
                        value={animConfig.idleFrame}
                        onChange={(e) => setAnimConfig(prev => ({ ...prev, idleFrame: Math.max(0, Math.min(prev.walkingFrameCount - 1, parseInt(e.target.value, 10) || 0)) }))}
                        className="w-20 bg-black border border-purple-700 rounded-lg p-2 text-sm text-white"
                      />
                      <p className="text-[9px] text-gray-500 mt-1 italic">0 = first frame</p>
                    </div>
                  </div>

                  {/* Visual frame strip picker */}
                  {animConfig.walkingUrl && animConfig.walkingFrameCount > 1 && (
                    <div>
                      <p className="text-[9px] font-black uppercase text-gray-500 mb-2">Click a frame to select as idle:</p>
                      <div className="flex gap-1 flex-wrap">
                        {Array.from({ length: Math.min(animConfig.walkingFrameCount, 16) }, (_, i) => (
                          <button
                            key={i}
                            type="button"
                            onClick={() => setAnimConfig(prev => ({ ...prev, idleFrame: i }))}
                            className={`relative border-2 rounded overflow-hidden transition-all bg-black ${animConfig.idleFrame === i ? 'border-purple-500 scale-110 shadow-[0_0_8px_rgba(168,85,247,0.6)]' : 'border-gray-700 hover:border-purple-500/50'}`}
                            style={{ width: 44, height: 44 }}
                            title={`Frame ${i}`}
                          >
                            <div
                              style={{
                                position: 'absolute',
                                left: '50%',
                                top: '50%',
                                width: `${animConfig.walkingFrameWidth}px`,
                                height: `${animConfig.walkingFrameHeight}px`,
                                backgroundImage: `url(${animConfig.walkingUrl})`,
                                backgroundSize: `${animConfig.walkingFrameCount * 100}% 100%`,
                                backgroundPosition: `${animConfig.walkingFrameCount > 1 ? (i / (animConfig.walkingFrameCount - 1)) * 100 : 0}% 0px`,
                                backgroundRepeat: 'no-repeat',
                                imageRendering: 'pixelated',
                                transform: `translate(-50%, -50%) scale(${Math.min(2, 36 / Math.max(animConfig.walkingFrameWidth, animConfig.walkingFrameHeight))})`,
                                transformOrigin: 'center center',
                              }}
                            />
                            <span className="absolute bottom-0 right-0 text-[7px] text-white bg-black/70 px-0.5">{i}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Preview */}
              <PetAnimPreview cfg={animConfig} />
            </div>
          )}

          {/* Footer Buttons */}
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
          {pets.map((pet) => {
            const walkSheet = pet.metadata?.visuals?.walking_spritesheet;
            const idleFrameIdx = walkSheet?.idle_frame ?? 0;
            const frameCount = walkSheet?.frame_count ?? 1;
            const frameWidth = walkSheet?.frame_width ?? 64;
            const frameHeight = walkSheet?.frame_height ?? 64;
            const scale = 64 / Math.max(frameWidth, frameHeight);
            const idlePos = frameCount > 1 ? (idleFrameIdx / (frameCount - 1)) * 100 : 0;

            return (
              <div
                key={pet.id}
                className={`group relative aspect-square bg-black/40 border rounded-xl overflow-hidden cursor-pointer transition-all hover:shadow-[0_0_15px_rgba(168,85,247,0.2)] ${
                  editingPet?.id === pet.id ? 'border-purple-500 ring-1 ring-purple-500' : 'border-gray-800 hover:border-purple-500/50'
                }`}
                onClick={() => openEdit(pet)}
              >
                <div className="absolute inset-0 flex flex-col items-center justify-center p-4 text-center">
                  {walkSheet?.url ? (
                    <div
                      className="mb-3 drop-shadow-[0_0_10px_rgba(0,0,0,0.5)] transition-transform group-hover:scale-110"
                      style={{ width: 64, height: 64, display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}
                    >
                      <div
                        style={{
                          width: `${frameWidth}px`,
                          height: `${frameHeight}px`,
                          backgroundImage: `url(${walkSheet.url})`,
                          backgroundSize: `${frameCount * 100}% 100%`,
                          backgroundPosition: `${idlePos}% 0px`,
                          backgroundRepeat: 'no-repeat',
                          imageRendering: 'pixelated',
                          transform: `scale(${scale})`,
                          transformOrigin: 'center center',
                        }}
                      />
                    </div>
                  ) : (
                    <img
                      src={pet.icon_url || '/placeholder.png'}
                      className="w-16 h-16 object-contain mb-3 drop-shadow-[0_0_10px_rgba(0,0,0,0.5)] transition-transform group-hover:scale-110"
                    />
                  )}
                  <div className="text-xs font-black text-white leading-tight mb-1">{pet.name}</div>
                  <div className="text-[10px] text-gray-500 font-bold">HP {pet.base_hp}</div>
                </div>

                <div className="absolute inset-0 bg-gray-900/95 backdrop-blur-sm opacity-0 group-hover:opacity-100 transition-opacity p-4 flex flex-col items-center justify-center z-10">
                  <h4 className="text-xs font-black text-white mb-2">{pet.name}</h4>
                  <div className="space-y-1 w-full">
                    <div className="flex justify-between text-[10px] text-gray-400 bg-gray-800/50 p-1 rounded">
                      <span>HP</span><span className="text-green-400 font-mono">{pet.base_hp}</span>
                    </div>
                    <div className="flex justify-between text-[10px] text-gray-400 bg-gray-800/50 p-1 rounded">
                      <span>DMG</span><span className="text-red-400 font-mono">{pet.base_dmg}</span>
                    </div>
                    {walkSheet?.url && (
                      <div className="flex justify-between text-[10px] text-cyan-400 bg-cyan-900/20 p-1 rounded border border-cyan-500/20">
                        <span>Walk Anim</span><span className="font-mono">✓</span>
                      </div>
                    )}
                  </div>
                  <div className="mt-3 text-[10px] text-purple-400 font-bold uppercase tracking-widest flex items-center gap-1">
                    <Pencil size={10} /> Click to Edit
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
