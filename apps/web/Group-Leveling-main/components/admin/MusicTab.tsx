"use client";

import React, { useEffect, useRef, useState } from 'react';
import { Loader2, Pencil, Plus, Trash2, Upload, Music2, Play, Pause, Search, X } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { motion, AnimatePresence } from 'framer-motion';
import DropZone from './DropZone';

interface MusicTrack {
  id: string;
  name: string;
  file_url: string;
  category: 'battle' | 'world' | 'menu' | 'shop' | 'dungeon' | 'other';
  created_at: string;
  updated_at: string;
}

const CATEGORIES = [
  { id: 'battle', label: 'Battle', color: 'text-red-400', bg: 'bg-red-900/20', border: 'border-red-500/30' },
  { id: 'world', label: 'World/Map', color: 'text-green-400', bg: 'bg-green-900/20', border: 'border-green-500/30' },
  { id: 'menu', label: 'Main Menu', color: 'text-blue-400', bg: 'bg-blue-900/20', border: 'border-blue-500/30' },
  { id: 'shop', label: 'Shop', color: 'text-yellow-400', bg: 'bg-yellow-900/20', border: 'border-yellow-500/30' },
  { id: 'dungeon', label: 'Dungeon', color: 'text-purple-400', bg: 'bg-purple-900/20', border: 'border-purple-500/30' },
  { id: 'other', label: 'Other', color: 'text-gray-400', bg: 'bg-gray-900/20', border: 'border-gray-500/30' },
] as const;

export default function MusicTab() {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const [tracks, setTracks] = useState<MusicTrack[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingTrackId, setEditingTrackId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [playingTrackId, setPlayingTrackId] = useState<string | null>(null);

  const [form, setForm] = useState({
    name: '',
    file_url: '',
    category: 'battle' as MusicTrack['category'],
  });

  useEffect(() => {
    loadTracks();
  }, []);

  const loadTracks = async () => {
    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const response = await fetch('/api/admin/music', {
        headers: {
          'Authorization': `Bearer ${session?.access_token}`
        }
      });
      const data = await response.json();
      if (data.tracks) {
        setTracks(data.tracks);
      }
    } catch (err) {
      console.error('Error loading music tracks:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleUpload = async (file: File) => {
    if (!file) return;
    setUploading(true);
    try {
      const safeName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
      const filePath = `music/${Date.now()}_${safeName}`;
      
      const { error: uploadError } = await supabase.storage
        .from('game-assets')
        .upload(filePath, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { data } = supabase.storage.from('game-assets').getPublicUrl(filePath);
      setForm(prev => ({ ...prev, file_url: data.publicUrl, name: prev.name || file.name.split('.')[0] }));
      
      if (fileInputRef.current) fileInputRef.current.value = '';
    } catch (err: any) {
      alert('Upload failed: ' + (err.message || err));
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name || !form.file_url) return alert('Name and File URL are required');

    setSaving(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const method = editingTrackId ? 'PATCH' : 'POST';
      const response = await fetch('/api/admin/music', {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.access_token}`
        },
        body: JSON.stringify(editingTrackId ? { id: editingTrackId, ...form } : form)
      });

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.error || 'Failed to save track');
      }

      setShowForm(false);
      setEditingTrackId(null);
      setForm({ name: '', file_url: '', category: 'battle' });
      loadTracks();
    } catch (err: any) {
      alert('Save failed: ' + (err.message || err));
    } finally {
      setSaving(false);
    }
  };

  const startEdit = (track: MusicTrack) => {
    setEditingTrackId(track.id);
    setForm({
      name: track.name,
      file_url: track.file_url,
      category: track.category,
    });
    setShowForm(true);
  };

  const deleteTrack = async (id: string) => {
    if (!confirm('Are you sure you want to delete this track?')) return;
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const response = await fetch(`/api/admin/music?id=${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${session?.access_token}`
        }
      });
      
      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.error || 'Failed to delete track');
      }
      
      loadTracks();
    } catch (err: any) {
      alert('Delete failed: ' + (err.message || err));
    }
  };

  const togglePlay = (track: MusicTrack) => {
    if (playingTrackId === track.id) {
      audioRef.current?.pause();
      setPlayingTrackId(null);
    } else {
      if (audioRef.current) {
        audioRef.current.src = track.file_url;
        audioRef.current.play();
        setPlayingTrackId(track.id);
      }
    }
  };

  const filteredTracks = tracks.filter(track => {
    const matchesSearch = track.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = categoryFilter === 'all' || track.category === categoryFilter;
    return matchesSearch && matchesCategory;
  });

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-lg font-black uppercase tracking-widest text-cyan-400 flex items-center gap-2">
            <Music2 size={24} /> Game Music Manager
          </h2>
          <p className="text-xs text-gray-500 uppercase tracking-tighter mt-1">Manage background music for all game areas</p>
        </div>
        <button
          onClick={() => {
            if (showForm && editingTrackId) {
              setEditingTrackId(null);
              setForm({ name: '', file_url: '', category: 'battle' });
            }
            setShowForm(!showForm);
          }}
          className="px-4 py-2 bg-cyan-600 hover:bg-cyan-500 text-white rounded-lg text-xs font-black uppercase flex items-center gap-2 shadow-[0_0_15px_rgba(6,182,212,0.3)] transition-all"
        >
          {showForm && editingTrackId ? <X size={16} /> : <Plus size={16} />}
          {showForm && editingTrackId ? 'Cancel Edit' : 'Add New Track'}
        </button>
      </div>

      <AnimatePresence>
        {showForm && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="bg-gray-900/60 border border-cyan-900/30 p-6 rounded-2xl space-y-4"
          >
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase text-gray-500">Track Name</label>
                  <input
                    value={form.name}
                    onChange={e => setForm(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="e.g. Boss Battle Theme"
                    className="w-full bg-black border border-gray-800 rounded-lg px-4 py-2 text-sm text-white focus:border-cyan-500 outline-none"
                    required
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase text-gray-500">Category</label>
                  <select
                    value={form.category}
                    onChange={e => setForm(prev => ({ ...prev, category: e.target.value as MusicTrack['category'] }))}
                    className="w-full bg-black border border-gray-800 rounded-lg px-4 py-2 text-sm text-white focus:border-cyan-500 outline-none"
                  >
                    {CATEGORIES.map(cat => (
                      <option key={cat.id} value={cat.id}>{cat.label}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase text-gray-500">Audio File URL</label>
                <DropZone
                  accept="audio/mpeg,audio/wav,audio/ogg,audio/*"
                  disabled={uploading}
                  onFiles={(files) => files[0] && handleUpload(files[0])}
                  single
                  className="p-2"
                >
                  <div className="flex gap-2">
                    <input
                      value={form.file_url}
                      onChange={e => setForm(prev => ({ ...prev, file_url: e.target.value }))}
                      placeholder="https://... or drag audio here"
                      className="flex-1 bg-black border border-gray-800 rounded-lg px-4 py-2 text-sm text-white focus:border-cyan-500 outline-none"
                      required
                    />
                    <input
                      type="file"
                      ref={fileInputRef}
                      accept="audio/mpeg,audio/wav,audio/ogg"
                      className="hidden"
                      onChange={e => e.target.files?.[0] && handleUpload(e.target.files[0])}
                    />
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={uploading}
                      className="px-4 py-2 bg-gray-800 hover:bg-gray-700 disabled:bg-gray-900 text-white rounded-lg text-xs font-bold uppercase flex items-center gap-2 border border-gray-700"
                    >
                      {uploading ? <Loader2 size={16} className="animate-spin" /> : <Upload size={16} />}
                      {uploading ? 'Uploading...' : 'Upload MP3'}
                    </button>
                  </div>
                </DropZone>
              </div>

              {form.file_url && (
                <div className="p-3 bg-black/40 rounded-lg border border-gray-800">
                  <audio src={form.file_url} controls className="w-full h-8 opacity-60 hover:opacity-100 transition-opacity" />
                </div>
              )}

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowForm(false);
                    setEditingTrackId(null);
                    setForm({ name: '', file_url: '', category: 'battle' });
                  }}
                  className="px-4 py-2 text-gray-500 hover:text-white text-xs font-black uppercase"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-8 py-2 bg-cyan-600 hover:bg-cyan-500 disabled:bg-gray-800 text-white rounded-lg text-xs font-black uppercase shadow-lg shadow-cyan-500/20"
                >
                  {saving ? <Loader2 size={16} className="animate-spin mx-auto" /> : (editingTrackId ? 'Update Track' : 'Save Track')}
                </button>
              </div>
            </form>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="relative md:col-span-2">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={16} />
          <input
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Search tracks by name..."
            className="w-full bg-gray-900/40 border border-gray-800 rounded-xl pl-10 pr-4 py-2 text-sm text-white focus:border-cyan-500/50 outline-none"
          />
        </div>
        <select
          value={categoryFilter}
          onChange={e => setCategoryFilter(e.target.value)}
          className="bg-gray-900/40 border border-gray-800 rounded-xl px-4 py-2 text-sm text-white focus:border-cyan-500/50 outline-none cursor-pointer"
        >
          <option value="all">All Categories</option>
          {CATEGORIES.map(cat => (
            <option key={cat.id} value={cat.id}>{cat.label}</option>
          ))}
        </select>
      </div>

      <div className="bg-gray-900/40 border border-gray-800 rounded-2xl overflow-hidden">
        {loading ? (
          <div className="p-20 flex flex-col items-center justify-center space-y-4">
            <Loader2 className="animate-spin text-cyan-500" size={32} />
            <p className="text-xs text-gray-500 uppercase font-black">Loading Tracks...</p>
          </div>
        ) : filteredTracks.length === 0 ? (
          <div className="p-20 text-center space-y-4">
            <Music2 className="text-gray-700 mx-auto" size={48} />
            <p className="text-xs text-gray-500 uppercase font-black">No music tracks found</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-gray-800 bg-black/40">
                  <th className="px-6 py-4 text-[10px] font-black uppercase text-gray-500 tracking-widest">Track</th>
                  <th className="px-6 py-4 text-[10px] font-black uppercase text-gray-500 tracking-widest">Category</th>
                  <th className="px-6 py-4 text-[10px] font-black uppercase text-gray-500 tracking-widest">Added</th>
                  <th className="px-6 py-4 text-[10px] font-black uppercase text-gray-500 tracking-widest text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800/50">
                {filteredTracks.map(track => {
                  const category = CATEGORIES.find(c => c.id === track.category) || CATEGORIES[5];
                  const isPlaying = playingTrackId === track.id;

                  return (
                    <tr key={track.id} className="group hover:bg-cyan-500/[0.02] transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-4">
                          <button
                            onClick={() => togglePlay(track)}
                            className={`w-10 h-10 rounded-full flex items-center justify-center transition-all ${
                              isPlaying 
                                ? 'bg-cyan-500 text-black shadow-[0_0_15px_rgba(6,182,212,0.5)]' 
                                : 'bg-gray-800 text-gray-400 hover:bg-gray-700 hover:text-white'
                            }`}
                          >
                            {isPlaying ? <Pause size={18} fill="currentColor" /> : <Play size={18} fill="currentColor" className="ml-0.5" />}
                          </button>
                          <div>
                            <p className="text-sm font-bold text-white group-hover:text-cyan-400 transition-colors">{track.name}</p>
                            <p className="text-[10px] text-gray-500 truncate max-w-[200px]">{track.file_url.split('/').pop()}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`px-2 py-1 rounded text-[9px] font-black uppercase border ${category.color} ${category.bg} ${category.border}`}>
                          {category.label}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <p className="text-[10px] text-gray-500 font-medium">
                          {new Date(track.created_at).toLocaleDateString()}
                        </p>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex justify-end gap-2">
                          <button
                            onClick={() => startEdit(track)}
                            className="p-2 text-gray-500 hover:text-blue-400 hover:bg-blue-400/10 rounded-lg transition-all"
                            title="Edit Track"
                          >
                            <Pencil size={16} />
                          </button>
                          <button
                            onClick={() => deleteTrack(track.id)}
                            className="p-2 text-gray-500 hover:text-red-400 hover:bg-red-400/10 rounded-lg transition-all"
                            title="Delete Track"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <audio
        ref={audioRef}
        onEnded={() => setPlayingTrackId(null)}
        className="hidden"
      />
    </div>
  );
}
