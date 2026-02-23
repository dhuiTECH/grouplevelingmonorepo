"use client";

import React, { useEffect, useState } from 'react';
import { Loader2, Plus, Edit2, ScrollText, MapPin, XCircle } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { motion, AnimatePresence } from 'framer-motion';

interface Quest {
  id: string;
  title: string;
  description: string | null;
  quest_type: string;
  requirements: Record<string, unknown> | null;
  rewards: Record<string, unknown> | null;
  node_id: string | null;
  created_at: string;
}

interface WorldMapNodeOption {
  id: string;
  name: string;
  map_id: string;
  x: number;
  y: number;
}

interface EncounterOption {
  id: string;
  name: string;
}

const QUEST_TYPES = [
  { value: 'world', label: 'World' },
  { value: 'daily', label: 'Daily' },
  { value: 'weekly', label: 'Weekly' },
  { value: 'story', label: 'Story' },
  { value: 'side', label: 'Side' },
  { value: 'slayer', label: 'Slayer' },
  { value: 'boss', label: 'Boss' },
  { value: 'class', label: 'Class' },
  { value: 'event', label: 'Event' },
  { value: 'hidden', label: 'Hidden' },
] as const;

export default function QuestsTab() {
  const [quests, setQuests] = useState<Quest[]>([]);
  const [nodes, setNodes] = useState<WorldMapNodeOption[]>([]);
  const [encounters, setEncounters] = useState<EncounterOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({
    title: '',
    description: '',
    quest_type: 'world' as string,
    target_steps: 0,
    locations_count: 0,
    enemy_id: '' as string,
    kill_count: 0,
    min_level: 0,
    rewards_exp: 0,
    rewards_coins: 0,
    rewards_gems: 0,
    node_id: '' as string,
  });

  useEffect(() => {
    loadQuests();
    loadNodes();
    loadEncounters();
  }, []);

  const loadQuests = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.from('quests').select('*').order('created_at', { ascending: false });
      if (error) throw error;
      setQuests((data as Quest[]) ?? []);
    } catch (e: unknown) {
      console.error('Error loading quests:', e);
      setQuests([]);
    } finally {
      setLoading(false);
    }
  };

  const loadNodes = async () => {
    try {
      const { data, error } = await supabase.from('world_map_nodes').select('id, name, map_id, x, y').order('name');
      if (error) throw error;
      setNodes((data as WorldMapNodeOption[]) ?? []);
    } catch (e: unknown) {
      console.error('Error loading nodes:', e);
      setNodes([]);
    }
  };

  const loadEncounters = async () => {
    try {
      const { data, error } = await supabase.from('encounter_pool').select('id, name').order('name');
      if (error) throw error;
      setEncounters((data as EncounterOption[]) ?? []);
    } catch (e: unknown) {
      console.error('Error loading encounters:', e);
      setEncounters([]);
    }
  };

  const openCreate = () => {
    setEditingId(null);
    setForm({
      title: '',
      description: '',
      quest_type: 'world',
      target_steps: 0,
      locations_count: 0,
      enemy_id: '',
      kill_count: 0,
      min_level: 0,
      rewards_exp: 0,
      rewards_coins: 0,
      rewards_gems: 0,
      node_id: '',
    });
    setShowForm(true);
  };

  const openEdit = (q: Quest) => {
    setEditingId(q.id);
    const rewards = (q.rewards || {}) as { exp?: number; coins?: number; gems?: number };
    const requirements = (q.requirements || {}) as {
      target_steps?: number;
      locations_count?: number;
      enemy_id?: string;
      kill_count?: number;
      min_level?: number;
    };
    setForm({
      title: q.title,
      description: q.description ?? '',
      quest_type: q.quest_type,
      target_steps: requirements.target_steps ?? 0,
      locations_count: requirements.locations_count ?? 0,
      enemy_id: requirements.enemy_id ?? '',
      kill_count: requirements.kill_count ?? 0,
      min_level: requirements.min_level ?? 0,
      rewards_exp: rewards.exp ?? 0,
      rewards_coins: rewards.coins ?? 0,
      rewards_gems: rewards.gems ?? 0,
      node_id: q.node_id ?? '',
    });
    setShowForm(true);
  };

  const closeForm = () => {
    setShowForm(false);
    setEditingId(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title.trim()) return alert('Title is required');
    setSaving(true);
    try {
      const payload = {
        title: form.title.trim(),
        description: form.description.trim() || null,
        quest_type: form.quest_type,
        requirements: {
          ...(form.target_steps > 0 && { target_steps: form.target_steps }),
          ...(form.locations_count > 0 && { locations_count: form.locations_count }),
          ...(form.enemy_id && { enemy_id: form.enemy_id }),
          ...(form.kill_count > 0 && { kill_count: form.kill_count }),
          ...(form.min_level > 0 && { min_level: form.min_level }),
        },
        rewards: {
          ...(form.rewards_exp > 0 && { exp: form.rewards_exp }),
          ...(form.rewards_coins > 0 && { coins: form.rewards_coins }),
          ...(form.rewards_gems > 0 && { gems: form.rewards_gems }),
        },
        node_id: form.node_id || null,
      };

      if (editingId) {
        const { error } = await supabase.from('quests').update(payload).eq('id', editingId);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('quests').insert(payload);
        if (error) throw error;
      }
      closeForm();
      loadQuests();
    } catch (err: unknown) {
      alert('Failed to save quest: ' + (err instanceof Error ? err.message : err));
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this quest? User progress will be lost.')) return;
    try {
      const { error } = await supabase.from('quests').delete().eq('id', id);
      if (error) throw error;
      loadQuests();
      closeForm();
    } catch (err: unknown) {
      alert('Failed to delete: ' + (err instanceof Error ? err.message : err));
    }
  };

  const getNodeName = (nodeId: string | null) => {
    if (!nodeId) return null;
    return nodes.find((n) => n.id === nodeId)?.name ?? nodeId.slice(0, 8);
  };

  const getEnemyName = (enemyId: string | null) => {
    if (!enemyId) return null;
    return encounters.find((e) => e.id === enemyId)?.name ?? enemyId.slice(0, 8);
  };

  if (loading) {
    return (
      <section className="flex items-center justify-center min-h-[200px]">
        <Loader2 size={32} className="animate-spin text-cyan-400" />
      </section>
    );
  }

  return (
    <section className="space-y-6 animate-in fade-in duration-500">
      <div className="flex justify-between items-center">
        <h2 className="text-lg font-black uppercase tracking-widest text-cyan-400 flex items-center gap-2">
          <ScrollText size={22} /> Quests
        </h2>
        <button
          type="button"
          onClick={openCreate}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-black uppercase"
        >
          <Plus size={16} /> Add Quest
        </button>
      </div>

      <AnimatePresence>
        {showForm && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="p-6 rounded-2xl border-2 border-cyan-500/50 bg-gray-900 shadow-[0_0_30px_rgba(6,182,212,0.15)]"
          >
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-sm font-black uppercase text-cyan-400">
                {editingId ? 'Edit quest' : 'New quest'}
              </h3>
              <button type="button" onClick={closeForm} className="p-2 text-gray-500 hover:text-white rounded-lg hover:bg-gray-800">
                <XCircle size={20} />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-[10px] font-black uppercase text-gray-500 mb-1">Title *</label>
                <input
                  value={form.title}
                  onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                  placeholder="e.g. The Path of the Hunter"
                  className="w-full bg-black/40 border border-gray-700 rounded-lg px-3 py-2 text-white focus:border-cyan-500 outline-none"
                  required
                />
              </div>
              <div>
                <label className="block text-[10px] font-black uppercase text-gray-500 mb-1">Description</label>
                <textarea
                  value={form.description}
                  onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                  placeholder="What the player must do..."
                  rows={3}
                  className="w-full bg-black/40 border border-gray-700 rounded-lg px-3 py-2 text-white focus:border-cyan-500 outline-none resize-y"
                />
              </div>
              <div>
                <label className="block text-[10px] font-black uppercase text-gray-500 mb-1">Quest type</label>
                <select
                  value={form.quest_type}
                  onChange={(e) => setForm((f) => ({ ...f, quest_type: e.target.value }))}
                  className="w-full bg-black/40 border border-gray-700 rounded-lg px-3 py-2 text-white focus:border-cyan-500 outline-none"
                >
                  {QUEST_TYPES.map((t) => (
                    <option key={t.value} value={t.value}>
                      {t.label}
                    </option>
                  ))}
                </select>
              </div>
              <div className="p-3 rounded-xl bg-slate-800/50 border border-amber-800/50 space-y-3">
                <p className="text-[10px] font-black uppercase text-amber-400">Requirements (optional)</p>
                <p className="text-[9px] text-gray-500">Used by progress logic to auto-complete when met. Leave 0 to ignore.</p>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-black uppercase text-gray-500 mb-1">Target steps</label>
                    <input
                      type="number"
                      min={0}
                      value={form.target_steps}
                      onChange={(e) => setForm((f) => ({ ...f, target_steps: parseInt(e.target.value, 10) || 0 }))}
                      placeholder="0"
                      className="w-full bg-black/40 border border-gray-700 rounded-lg px-3 py-2 text-white focus:border-cyan-500 outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-black uppercase text-gray-500 mb-1">Locations to visit</label>
                    <input
                      type="number"
                      min={0}
                      value={form.locations_count}
                      onChange={(e) => setForm((f) => ({ ...f, locations_count: parseInt(e.target.value, 10) || 0 }))}
                      placeholder="0"
                      className="w-full bg-black/40 border border-gray-700 rounded-lg px-3 py-2 text-white focus:border-cyan-500 outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-black uppercase text-gray-500 mb-1">Kill target (monster/boss)</label>
                    <select
                      value={form.enemy_id}
                      onChange={(e) => setForm((f) => ({ ...f, enemy_id: e.target.value }))}
                      className="w-full bg-black/40 border border-gray-700 rounded-lg px-3 py-2 text-white focus:border-cyan-500 outline-none"
                    >
                      <option value="">— None —</option>
                      {encounters.map((e) => (
                        <option key={e.id} value={e.id}>
                          {e.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] font-black uppercase text-gray-500 mb-1">Kill count</label>
                    <input
                      type="number"
                      min={0}
                      value={form.kill_count}
                      onChange={(e) => setForm((f) => ({ ...f, kill_count: parseInt(e.target.value, 10) || 0 }))}
                      placeholder="1"
                      className="w-full bg-black/40 border border-gray-700 rounded-lg px-3 py-2 text-white focus:border-cyan-500 outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-black uppercase text-gray-500 mb-1">Min level</label>
                    <input
                      type="number"
                      min={0}
                      value={form.min_level}
                      onChange={(e) => setForm((f) => ({ ...f, min_level: parseInt(e.target.value, 10) || 0 }))}
                      placeholder="0"
                      className="w-full bg-black/40 border border-gray-700 rounded-lg px-3 py-2 text-white focus:border-cyan-500 outline-none"
                    />
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-[10px] font-black uppercase text-gray-500 mb-1">Reward XP</label>
                  <input
                    type="number"
                    min={0}
                    value={form.rewards_exp}
                    onChange={(e) => setForm((f) => ({ ...f, rewards_exp: parseInt(e.target.value, 10) || 0 }))}
                    className="w-full bg-black/40 border border-gray-700 rounded-lg px-3 py-2 text-white focus:border-cyan-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-black uppercase text-gray-500 mb-1">Reward coins</label>
                  <input
                    type="number"
                    min={0}
                    value={form.rewards_coins}
                    onChange={(e) => setForm((f) => ({ ...f, rewards_coins: parseInt(e.target.value, 10) || 0 }))}
                    className="w-full bg-black/40 border border-gray-700 rounded-lg px-3 py-2 text-white focus:border-cyan-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-black uppercase text-gray-500 mb-1">Reward gems</label>
                  <input
                    type="number"
                    min={0}
                    value={form.rewards_gems}
                    onChange={(e) => setForm((f) => ({ ...f, rewards_gems: parseInt(e.target.value, 10) || 0 }))}
                    className="w-full bg-black/40 border border-gray-700 rounded-lg px-3 py-2 text-white focus:border-cyan-500 outline-none"
                  />
                </div>
              </div>
              <div>
                <label className="block text-[10px] font-black uppercase text-gray-500 mb-1">
                  <MapPin size={12} className="inline mr-1" /> Link to map node (optional)
                </label>
                <select
                  value={form.node_id}
                  onChange={(e) => setForm((f) => ({ ...f, node_id: e.target.value }))}
                  className="w-full bg-black/40 border border-gray-700 rounded-lg px-3 py-2 text-white focus:border-cyan-500 outline-none"
                >
                  <option value="">— No node (quest not on map) —</option>
                  {nodes.map((n) => (
                    <option key={n.id} value={n.id}>
                      {n.name} ({n.x}, {n.y})
                    </option>
                  ))}
                </select>
                <p className="text-[9px] text-gray-500 mt-1">
                  If set, this node will show a ! / ? and the quest panel when the player interacts.
                </p>
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={closeForm} className="px-4 py-2 rounded-xl text-sm font-bold text-gray-400 hover:text-white uppercase">
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 py-2 bg-cyan-600 hover:bg-cyan-500 disabled:opacity-50 text-white rounded-xl font-black text-sm uppercase flex items-center justify-center gap-2"
                >
                  {saving ? <Loader2 size={16} className="animate-spin" /> : null}
                  {editingId ? 'Update' : 'Create'} quest
                </button>
                {editingId && (
                  <button
                    type="button"
                    onClick={() => handleDelete(editingId)}
                    className="px-4 py-2 rounded-xl bg-red-900/50 hover:bg-red-600 text-red-300 text-sm font-bold uppercase"
                  >
                    Delete
                  </button>
                )}
              </div>
            </form>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="space-y-2">
        <h3 className="text-sm font-black uppercase text-cyan-400 border-b border-gray-800 pb-2">
          All quests ({quests.length})
        </h3>
        {quests.length === 0 ? (
          <div className="p-8 rounded-xl border border-dashed border-gray-700 bg-black/20 text-center text-gray-500 text-sm">
            No quests yet. Add one to show on the world map (link to a node) or use via other systems.
          </div>
        ) : (
          <div className="space-y-2 max-h-[60vh] overflow-y-auto pr-2">
            {quests.map((q) => (
              <div
                key={q.id}
                className="flex items-center gap-4 p-4 rounded-xl bg-black/40 border border-gray-800 hover:border-cyan-800/50 transition-colors"
              >
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-white truncate">{q.title}</p>
                  <p className="text-[10px] text-gray-500 uppercase">{q.quest_type}</p>
                  {q.description && (
                    <p className="text-xs text-gray-400 mt-1 line-clamp-2">{q.description}</p>
                  )}
                  {q.node_id && (
                    <p className="text-[10px] text-cyan-400 mt-1 flex items-center gap-1">
                      <MapPin size={10} /> {getNodeName(q.node_id)}
                    </p>
                  )}
                  {((q.requirements as any)?.enemy_id) && (
                    <p className="text-[10px] text-amber-400 mt-1">
                      Kill: {getEnemyName((q.requirements as any).enemy_id)} × {(q.requirements as any).kill_count || 1}
                      {(q.requirements as any).min_level ? ` · Lv.${(q.requirements as any).min_level}+` : ''}
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {Number((q.rewards as any)?.exp || 0) > 0 && (
                    <span className="text-[10px] font-bold text-amber-400">{(q.rewards as any).exp} XP</span>
                  )}
                  {Number((q.rewards as any)?.coins || 0) > 0 && (
                    <span className="text-[10px] font-bold text-cyan-400">{(q.rewards as any).coins} coins</span>
                  )}
                  {Number((q.rewards as any)?.gems || 0) > 0 && (
                    <span className="text-[10px] font-bold text-purple-400">{(q.rewards as any).gems} gems</span>
                  )}
                  <button
                    type="button"
                    onClick={() => openEdit(q)}
                    className="p-2 rounded-lg bg-cyan-900/30 hover:bg-cyan-600 text-cyan-400"
                    title="Edit"
                  >
                    <Edit2 size={14} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
