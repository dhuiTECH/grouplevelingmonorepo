"use client";

import React from 'react';
import { XCircle, Loader2, Upload, Plus, Trash2, ImageOff } from 'lucide-react';
import { motion } from 'framer-motion';
import DropZone from './DropZone';

export type NodeInteractionType = 'CITY' | 'SHOP' | 'BATTLE' | 'DIALOGUE' | 'PORTAL' | 'BOSS_RAID';

export type SceneActionTarget = 'OPEN_SHOP' | 'REST_INN' | 'START_QUEST' | 'OPEN_DIALOGUE' | 'NONE';

export interface DialogueScriptLine {
  npc_name: string;
  text: string;
  voice_line_url?: string;
  image_url?: string;
}

export interface SceneActionButton {
  label: string;
  target_event: SceneActionTarget;
}

export interface NodeFormData {
  name: string;
  icon_url: string;
  interaction_type: NodeInteractionType;
  welcome_text: string;
  available_services: string[];
  shop_id: string;
  enemy_id: string;
  dialogue_text: string;
  portal_target_x: number;
  portal_target_y: number;
  target_map_id: string;
  can_travel_to: boolean;
  modal_image_url: string;
  boss_template_id: string;
  raid_duration_type: 'TIMED' | 'UNTIL_DEAD';
  raid_duration_hours: number;
  boss_max_hp: number;
  is_random_event: boolean;
  // Scene & Dialogue Editor
  scene_background_url: string;
  scene_npc_sprite_url: string;
  npc_is_spritesheet: boolean;
  npc_frame_count: number;
  npc_frame_size: number;
  music_id?: string;
  speech_sound_url?: string;
  dialogue_script: DialogueScriptLine[];
  action_buttons: SceneActionButton[];
}

const CITY_SERVICES = ['Inn', 'Bank', 'Blacksmith'];

/** Slots that are creator-only (avatar, eyes, mouth, hair) — excluded from map shop stock dropdown */
const CREATOR_SLOT_IDS = new Set(['avatar', 'face_eyes', 'face_mouth', 'hair']);

interface NodeEditModalProps {
  open: boolean;
  onClose: () => void;
  mode: 'create' | 'edit';
  coords: { x: number; y: number };
  nodeData: NodeFormData;
  onChange: (data: NodeFormData) => void;
  onSave: () => void;
  saving: boolean;
  shopItems: any[];
  encounters: any[];
  maps: any[];
  stockedItems: any[];
  onAddStockItem: (itemId: string) => void;
  onRemoveStockItem: (exclusiveId: string) => void;
  iconGalleryUrls?: string[];
  onIconSelect?: (url: string) => void;
  uploadingIcon?: boolean;
  onUploadIcon?: (file: File) => void;
  iconInputRef?: React.RefObject<HTMLInputElement | null>;
  uploadingSceneBg?: boolean;
  uploadingNpcSprite?: boolean;
  onUploadSceneBg?: (file: File) => void;
  onUploadNpcSprite?: (file: File) => void;
  sceneBgInputRef?: React.RefObject<HTMLInputElement | null>;
  npcSpriteInputRef?: React.RefObject<HTMLInputElement | null>;
  musicTracks: any[];
  speechInputRef?: React.RefObject<HTMLInputElement | null>;
  nodeMusicInputRef?: React.RefObject<HTMLInputElement | null>;
  uploadingSpeech?: boolean;
  uploadingNodeMusic?: boolean;
  onUploadSpeech?: (file: File) => void;
  onUploadNodeMusic?: (file: File) => void;
  onRequestUploadDialogueImage?: (lineIndex: number) => void;
  uploadingDialogueImageLine?: number | null;
  onRequestUploadVoiceLine?: (lineIndex: number) => void;
  uploadingVoiceLineLine?: number | null;
}

export default function NodeEditModal({
  open,
  onClose,
  mode,
  coords,
  nodeData,
  onChange,
  onSave,
  saving,
  shopItems,
  encounters,
  maps,
  stockedItems,
  onAddStockItem,
  onRemoveStockItem,
  iconGalleryUrls = [],
  onIconSelect,
  uploadingIcon = false,
  onUploadIcon,
  iconInputRef,
  uploadingSceneBg = false,
  uploadingNpcSprite = false,
  onUploadSceneBg,
  onUploadNpcSprite,
  sceneBgInputRef,
  npcSpriteInputRef,
  musicTracks,
  speechInputRef,
  nodeMusicInputRef,
  uploadingSpeech = false,
  uploadingNodeMusic = false,
  onUploadSpeech,
  onUploadNodeMusic,
  onRequestUploadDialogueImage,
  uploadingDialogueImageLine = null,
  onRequestUploadVoiceLine,
  uploadingVoiceLineLine = null,
}: NodeEditModalProps) {
  const [activeTab, setActiveTab] = React.useState<'general' | 'visuals' | 'storyline' | 'logic'>('general');
  const [currentPreviewIndex, setCurrentPreviewIndex] = React.useState(0);

  if (!open) return null;

  const toggleService = (s: string) => {
    const next = nodeData.available_services.includes(s)
      ? nodeData.available_services.filter((x) => x !== s)
      : [...nodeData.available_services, s];
    onChange({ ...nodeData, available_services: next });
  };

  const currentPreviewLine = nodeData.dialogue_script?.[currentPreviewIndex] || {};

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-gray-950 border-2 border-cyan-500/50 rounded-2xl w-full max-w-[1200px] h-[90vh] flex flex-col overflow-hidden shadow-[0_0_50px_rgba(6,182,212,0.3)]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex justify-between items-center p-4 border-b border-cyan-800/50 bg-cyan-950/20 shrink-0">
          <h3 className="text-lg font-black uppercase text-cyan-400 flex items-center gap-3">
            <span className="bg-cyan-900/40 px-2 py-1 rounded text-cyan-300 text-xs tracking-widest border border-cyan-700/50">
              {mode === 'edit' ? 'Edit Mode' : 'Create Mode'}
            </span>
            {nodeData.name || 'Unnamed Node'} <span className="text-gray-500 text-sm">at ({coords.x}, {coords.y})</span>
          </h3>
          <button type="button" onClick={onClose} className="p-2 text-gray-400 hover:text-white rounded-lg hover:bg-red-500/20 hover:text-red-400 transition-colors">
            <XCircle size={24} />
          </button>
        </div>

        {/* Main Content Area */}
        <div className="flex flex-1 overflow-hidden">
          
          {/* Left Side: Editor */}
          <div className="flex-1 flex flex-col border-r border-cyan-800/50 overflow-hidden bg-gray-900/50">
            {/* Tabs */}
            <div className="flex border-b border-gray-800 shrink-0 bg-black/40">
              {[
                { id: 'general', label: 'General' },
                { id: 'visuals', label: 'Scene Visuals' },
                { id: 'storyline', label: 'Storyline' },
                { id: 'logic', label: 'Logic & Actions' },
              ].map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`flex-1 py-3 text-xs font-black uppercase tracking-wider transition-all border-b-2 ${
                    activeTab === tab.id 
                      ? 'border-cyan-400 text-cyan-400 bg-cyan-900/10' 
                      : 'border-transparent text-gray-500 hover:text-gray-300 hover:bg-gray-800/50'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Scrollable Tab Content */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              
              {/* --- GENERAL TAB --- */}
              {activeTab === 'general' && (
                <div className="space-y-6 animate-in fade-in duration-300">
                  <div className="p-4 rounded-xl bg-black/40 border border-gray-800 space-y-4">
                    <div>
                      <label className="block text-[10px] font-black uppercase text-gray-500 mb-1">Location name</label>
                      <input
                        value={nodeData.name}
                        onChange={(e) => onChange({ ...nodeData, name: e.target.value })}
                        placeholder="e.g. Temple of Trials"
                        className="w-full bg-black border border-gray-700 rounded-lg px-3 py-2 text-white focus:border-cyan-500 outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] font-black uppercase text-gray-500 mb-1">Icon</label>
                      <div className="flex gap-2 mb-2">
                        <img src={nodeData.icon_url || '/default-node.png'} alt="" className="w-10 h-10 rounded object-cover border border-cyan-700/50 bg-black" />
                        <input
                          value={nodeData.icon_url}
                          onChange={(e) => onChange({ ...nodeData, icon_url: e.target.value })}
                          placeholder="https://... or /default-node.png"
                          className="flex-1 bg-black border border-gray-700 rounded-lg px-3 py-2 text-white focus:border-cyan-500 outline-none"
                        />
                        {onUploadIcon && iconInputRef && (
                          <>
                            <input
                              type="file"
                              ref={iconInputRef}
                              accept="image/png,image/jpeg,image/webp"
                              className="hidden"
                              onChange={(e) => {
                                const f = e.target.files?.[0];
                                if (f) onUploadIcon(f);
                              }}
                            />
                            <button
                              type="button"
                              onClick={() => iconInputRef.current?.click()}
                              disabled={uploadingIcon}
                              className="px-4 py-2 bg-cyan-700 hover:bg-cyan-600 disabled:bg-gray-700 text-white rounded-lg text-xs font-bold uppercase flex items-center gap-2 shrink-0"
                            >
                              {uploadingIcon ? <Loader2 size={14} className="animate-spin" /> : <Upload size={14} />}
                              Upload
                            </button>
                          </>
                        )}
                      </div>
                      {iconGalleryUrls.length > 0 && onIconSelect && (
                        <div className="mt-2 flex flex-wrap gap-1 p-2 bg-black/40 rounded border border-gray-800 max-h-32 overflow-y-auto">
                          {iconGalleryUrls.map((url) => (
                            <button
                              key={url}
                              type="button"
                              onClick={() => onIconSelect(url)}
                              className="w-8 h-8 rounded border border-cyan-700/50 overflow-hidden hover:border-cyan-400"
                            >
                              <img src={url} alt="" className="w-full h-full object-cover" />
                            </button>
                          ))}
                        </div>
                      )}
                    </div>

                    <div>
                      <label className="block text-[10px] font-black uppercase text-gray-500 mb-1">Interaction Type</label>
                      <select
                        value={nodeData.interaction_type}
                        onChange={(e) => onChange({ ...nodeData, interaction_type: e.target.value as NodeInteractionType })}
                        className="w-full bg-black border border-gray-700 rounded-lg px-3 py-2 text-white focus:border-cyan-500 outline-none"
                      >
                        <option value="CITY">City</option>
                        <option value="SHOP">Shop</option>
                        <option value="BATTLE">Battle</option>
                        <option value="DIALOGUE">Dialogue</option>
                        <option value="PORTAL">Portal</option>
                        <option value="BOSS_RAID">Boss raid</option>
                      </select>
                    </div>
                  </div>

                  <div className="p-4 rounded-xl bg-black/40 border border-gray-800 space-y-3">
                    <label className="flex items-center gap-3 cursor-pointer p-2 hover:bg-gray-800/50 rounded">
                      <input
                        type="checkbox"
                        checked={nodeData.can_travel_to}
                        onChange={(e) => onChange({ ...nodeData, can_travel_to: e.target.checked })}
                        className="rounded border-gray-600 bg-black text-cyan-500 w-4 h-4"
                      />
                      <div className="flex flex-col">
                        <span className="text-sm text-gray-200 font-bold">Fast Travel Waypoint</span>
                        <span className="text-[10px] text-gray-500 uppercase">Allow players to teleport here directly</span>
                      </div>
                    </label>

                    <label className="flex items-center gap-3 cursor-pointer p-2 hover:bg-gray-800/50 rounded">
                      <input
                        type="checkbox"
                        checked={nodeData.is_random_event}
                        onChange={(e) => onChange({ ...nodeData, is_random_event: e.target.checked })}
                        className="rounded border-gray-600 bg-black text-purple-500 w-4 h-4"
                      />
                      <div className="flex flex-col">
                        <span className="text-sm text-gray-200 font-bold">Random RNG Event</span>
                        <span className="text-[10px] text-gray-500 uppercase">Include this node in the random event pool after runs</span>
                      </div>
                    </label>
                  </div>
                </div>
              )}

              {/* --- VISUALS & AUDIO TAB --- */}
              {activeTab === 'visuals' && (
                <div className="space-y-6 animate-in fade-in duration-300">
                  <div className="p-4 rounded-xl bg-black/40 border border-cyan-800/50 space-y-4">
                    <h4 className="text-xs font-black uppercase text-cyan-400">Scene Background</h4>
                    <div className="flex gap-2 items-center">
                      <input
                        value={nodeData.scene_background_url}
                        onChange={(e) => onChange({ ...nodeData, scene_background_url: e.target.value })}
                        placeholder="https://... or leave empty"
                        className="flex-1 min-w-0 bg-black border border-gray-700 rounded-lg px-3 py-2 text-white focus:border-cyan-500 outline-none"
                      />
                      {sceneBgInputRef && onUploadSceneBg && (
                        <>
                          <input
                            ref={sceneBgInputRef}
                            type="file"
                            accept="image/png,image/jpeg,image/webp"
                            className="hidden"
                            onChange={(e) => { const f = e.target.files?.[0]; if (f) onUploadSceneBg(f); }}
                          />
                          <button
                            type="button"
                            onClick={() => sceneBgInputRef.current?.click()}
                            disabled={uploadingSceneBg}
                            className="shrink-0 px-4 py-2 rounded-lg border border-cyan-600 bg-cyan-900/40 text-cyan-300 text-[10px] font-bold uppercase flex items-center gap-2 hover:bg-cyan-800/50 disabled:opacity-50"
                          >
                            {uploadingSceneBg ? <Loader2 size={14} className="animate-spin" /> : <Upload size={14} />}
                            Upload PNG
                          </button>
                        </>
                      )}
                    </div>
                  </div>

                  <div className="p-4 rounded-xl bg-black/40 border border-cyan-800/50 space-y-4">
                    <h4 className="text-xs font-black uppercase text-cyan-400">NPC Sprite</h4>
                    <div className="flex gap-2 items-center">
                      <input
                        value={nodeData.scene_npc_sprite_url}
                        onChange={(e) => onChange({ ...nodeData, scene_npc_sprite_url: e.target.value })}
                        placeholder="https://... or leave empty"
                        className="flex-1 min-w-0 bg-black border border-gray-700 rounded-lg px-3 py-2 text-white focus:border-cyan-500 outline-none"
                      />
                      {npcSpriteInputRef && onUploadNpcSprite && (
                        <>
                          <input
                            ref={npcSpriteInputRef}
                            type="file"
                            accept="image/png,image/jpeg,image/webp"
                            className="hidden"
                            onChange={(e) => { const f = e.target.files?.[0]; if (f) onUploadNpcSprite(f); }}
                          />
                          <button
                            type="button"
                            onClick={() => npcSpriteInputRef.current?.click()}
                            disabled={uploadingNpcSprite}
                            className="shrink-0 px-4 py-2 rounded-lg border border-cyan-600 bg-cyan-900/40 text-cyan-300 text-[10px] font-bold uppercase flex items-center gap-2 hover:bg-cyan-800/50 disabled:opacity-50"
                          >
                            {uploadingNpcSprite ? <Loader2 size={14} className="animate-spin" /> : <Upload size={14} />}
                            Upload PNG
                          </button>
                        </>
                      )}
                    </div>
                    <label className="flex items-center gap-2 cursor-pointer pt-2">
                      <input
                        type="checkbox"
                        checked={nodeData.npc_is_spritesheet}
                        onChange={(e) => onChange({ ...nodeData, npc_is_spritesheet: e.target.checked })}
                        className="rounded border-gray-600 bg-black text-cyan-500"
                      />
                      <span className="text-xs text-gray-300">NPC is a spritesheet (requires animation)</span>
                    </label>
                    {nodeData.npc_is_spritesheet && (
                      <div className="flex gap-4 p-3 bg-black/50 rounded-lg border border-gray-800">
                        <div>
                          <label className="block text-[10px] font-black uppercase text-gray-500 mb-1">Frame count</label>
                          <input
                            type="number"
                            min={1}
                            value={nodeData.npc_frame_count}
                            onChange={(e) => onChange({ ...nodeData, npc_frame_count: Math.max(1, parseInt(e.target.value, 10) || 4) })}
                            className="w-24 bg-black border border-gray-700 rounded px-3 py-1.5 text-white text-sm"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] font-black uppercase text-gray-500 mb-1">Frame size (px)</label>
                          <input
                            type="number"
                            min={1}
                            value={nodeData.npc_frame_size}
                            onChange={(e) => onChange({ ...nodeData, npc_frame_size: Math.max(1, parseInt(e.target.value, 10) || 64) })}
                            className="w-24 bg-black border border-gray-700 rounded px-3 py-1.5 text-white text-sm"
                          />
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="p-4 rounded-xl bg-black/40 border border-purple-800/50 space-y-4">
                    <h4 className="text-xs font-black uppercase text-purple-400">Audio Settings</h4>
                    <div>
                      <label className="block text-[10px] font-black uppercase text-gray-500 mb-1">Background Music</label>
                      <DropZone
                        accept="audio/mpeg,audio/wav,audio/ogg,audio/mp3,audio/*"
                        disabled={uploadingNodeMusic}
                        onFiles={(files) => files[0] && onUploadNodeMusic?.(files[0])}
                        single
                        className="p-2"
                      >
                        <div className="flex gap-2 items-center">
                          <select
                            value={nodeData.music_id || ''}
                            onChange={(e) => onChange({ ...nodeData, music_id: e.target.value })}
                            className="flex-1 min-w-0 bg-black border border-gray-700 rounded-lg px-3 py-2 text-white focus:border-cyan-500 outline-none"
                          >
                            <option value="">None / Inherit from Map</option>
                            {musicTracks.map((track) => (
                              <option key={track.id} value={track.id}>
                                {track.name} ({track.category})
                              </option>
                            ))}
                          </select>
                          {nodeMusicInputRef && onUploadNodeMusic && (
                            <>
                              <input
                                ref={nodeMusicInputRef}
                                type="file"
                                accept="audio/mpeg,audio/wav,audio/ogg,audio/mp3"
                                className="hidden"
                                onChange={(e) => { const f = e.target.files?.[0]; if (f) onUploadNodeMusic(f); e.target.value = ''; }}
                              />
                              <button
                                type="button"
                                onClick={() => nodeMusicInputRef.current?.click()}
                                disabled={uploadingNodeMusic}
                                className="shrink-0 px-4 py-2 rounded-lg border border-purple-600 bg-purple-900/40 text-purple-300 text-[10px] font-bold uppercase flex items-center gap-2 hover:bg-purple-800/50 disabled:opacity-50"
                              >
                                {uploadingNodeMusic ? <Loader2 size={14} className="animate-spin" /> : <Upload size={14} />}
                                Upload MP3
                              </button>
                            </>
                          )}
                        </div>
                      </DropZone>
                    </div>
                  </div>
                </div>
              )}

              {/* --- STORYLINE TAB --- */}
              {activeTab === 'storyline' && (
                <div className="space-y-4 animate-in fade-in duration-300">
                  <div className="flex items-center justify-between p-4 bg-cyan-900/10 border border-cyan-800/30 rounded-xl">
                    <div>
                      <h4 className="text-sm font-black uppercase text-cyan-400">Storyline Sequence</h4>
                      <p className="text-[10px] text-cyan-600/80 uppercase tracking-wide">Click a card to preview it on the right</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        const next = [...(nodeData.dialogue_script || []), { npc_name: '', text: '', voice_line_url: undefined, image_url: undefined }];
                        onChange({ ...nodeData, dialogue_script: next });
                        setCurrentPreviewIndex(next.length - 1);
                      }}
                      className="px-4 py-2 bg-cyan-600 hover:bg-cyan-500 text-white rounded-lg text-[10px] font-black uppercase shadow-[0_0_15px_rgba(6,182,212,0.4)] flex items-center gap-2 transition-all"
                    >
                      <Plus size={14} /> Add Line
                    </button>
                  </div>
                  
                  <div className="space-y-3">
                    {(!nodeData.dialogue_script || nodeData.dialogue_script.length === 0) && (
                      <div className="text-center p-8 border border-dashed border-gray-700 rounded-xl text-gray-500 text-sm">
                        No dialogue lines added. The scene will immediately show action buttons or end.
                      </div>
                    )}
                    
                    {(nodeData.dialogue_script || []).map((line, idx) => (
                      <div 
                        key={idx} 
                        className={`flex gap-4 p-4 rounded-xl border-2 transition-all cursor-pointer ${
                          idx === currentPreviewIndex 
                            ? 'border-cyan-500 bg-cyan-950/40 shadow-[0_0_20px_rgba(6,182,212,0.1)]' 
                            : 'border-gray-800 bg-black/40 hover:border-gray-600'
                        }`}
                        onClick={() => setCurrentPreviewIndex(idx)}
                      >
                        {/* Portrait Column */}
                        <div className="shrink-0 space-y-2 flex flex-col items-center">
                          <div className="w-8 h-8 rounded-full bg-gray-800 text-gray-500 flex items-center justify-center text-xs font-bold font-mono">
                            {idx + 1}
                          </div>
                          <div 
                            onClick={(e) => { e.stopPropagation(); onRequestUploadDialogueImage?.(idx); }}
                            className="w-16 h-16 rounded-lg bg-black border border-gray-700 overflow-hidden hover:border-cyan-400 transition-colors relative group"
                            title="Click to upload expression portrait"
                          >
                            {line.image_url ? (
                                <img src={line.image_url} className="w-full h-full object-cover" />
                            ) : (
                                <div className="w-full h-full flex flex-col items-center justify-center text-[8px] text-gray-500 p-1 text-center">
                                  <ImageOff size={16} className="mb-1 opacity-50" />
                                  PORTRAIT
                                </div>
                            )}
                            {uploadingDialogueImageLine === idx && (
                              <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                                <Loader2 size={20} className="animate-spin text-cyan-400" />
                              </div>
                            )}
                          </div>
                          <button 
                            onClick={(e) => { 
                              e.stopPropagation();
                              const next = (nodeData.dialogue_script || []).filter((_, i) => i !== idx);
                              onChange({ ...nodeData, dialogue_script: next });
                              if (currentPreviewIndex >= next.length) setCurrentPreviewIndex(Math.max(0, next.length - 1));
                            }} 
                            className="p-1.5 text-red-500/50 hover:text-red-400 hover:bg-red-500/10 rounded-md transition-colors"
                            title="Delete line"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>

                        {/* Content Column */}
                        <div className="flex-1 space-y-3 min-w-0">
                          <input 
                            value={line.npc_name} 
                            onChange={(e) => {
                              const next = [...(nodeData.dialogue_script || [])];
                              next[idx] = { ...next[idx], npc_name: e.target.value };
                              onChange({ ...nodeData, dialogue_script: next });
                            }}
                            placeholder="Speaker Name"
                            className="w-1/2 min-w-[150px] bg-black/60 border border-gray-700 rounded px-3 py-1.5 text-xs text-cyan-400 font-bold tracking-wider uppercase focus:border-cyan-500 outline-none"
                          />
                          <textarea 
                            value={line.text}
                            onChange={(e) => {
                              const next = [...(nodeData.dialogue_script || [])];
                              next[idx] = { ...next[idx], text: e.target.value };
                              onChange({ ...nodeData, dialogue_script: next });
                            }}
                            placeholder="What they say..."
                            className="w-full bg-black/60 border border-gray-700 rounded px-3 py-2 text-sm text-white min-h-[80px] resize-y focus:border-cyan-500 outline-none"
                          />
                          
                          {/* Voice Line row */}
                          <div className="flex items-center gap-2">
                            <input
                              value={line.voice_line_url ?? ''}
                              onChange={(e) => {
                                const next = [...(nodeData.dialogue_script || [])];
                                next[idx] = { ...next[idx], voice_line_url: e.target.value || undefined };
                                onChange({ ...nodeData, dialogue_script: next });
                              }}
                              placeholder="Voice line MP3 URL (optional)"
                              className="flex-1 bg-black/40 border border-gray-800 rounded px-2 py-1 text-[10px] text-gray-400 focus:border-purple-500 outline-none"
                            />
                            {onRequestUploadVoiceLine && (
                              <button
                                type="button"
                                onClick={(e) => { e.stopPropagation(); onRequestUploadVoiceLine(idx); }}
                                disabled={uploadingVoiceLineLine !== null}
                                className="px-2 py-1 rounded border border-purple-800 bg-purple-900/30 text-purple-400 text-[9px] font-bold uppercase flex items-center gap-1 hover:bg-purple-800/50 transition-colors"
                              >
                                {uploadingVoiceLineLine === idx ? <Loader2 size={10} className="animate-spin" /> : <Upload size={10} />}
                                Upload Voice
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* --- LOGIC & ACTIONS TAB --- */}
              {activeTab === 'logic' && (
                <div className="space-y-6 animate-in fade-in duration-300">
                  
                  {/* Common logic blocks based on interaction type */}
                  {['CITY', 'SHOP', 'DIALOGUE', 'BATTLE'].includes(nodeData.interaction_type) && (
                    <div className="p-4 rounded-xl bg-black/40 border border-cyan-800/50 space-y-4">
                      <div className="flex items-center justify-between">
                        <h4 className="text-xs font-black uppercase text-cyan-400">Post-Dialogue Actions</h4>
                        <button
                          type="button"
                          onClick={() => onChange({ ...nodeData, action_buttons: [...(nodeData.action_buttons || []), { label: '', target_event: 'NONE' }] })}
                          className="px-3 py-1 bg-cyan-900/40 border border-cyan-700/50 text-cyan-300 rounded text-[10px] font-bold uppercase hover:bg-cyan-800/60"
                        >
                          + Add Button
                        </button>
                      </div>
                      <p className="text-[10px] text-gray-500 leading-relaxed">
                        If no buttons are added, the scene will just show a "Close" button at the end. For BATTLE nodes, a "Fight" button is automatically added if you don't override it here.
                      </p>
                      
                      <div className="space-y-2">
                        {(nodeData.action_buttons || []).map((btn, idx) => (
                          <div key={idx} className="flex gap-2 items-center bg-gray-800/50 rounded-lg p-2 border border-gray-700">
                            <input
                              value={btn.label}
                              onChange={(e) => {
                                const next = [...(nodeData.action_buttons || [])];
                                next[idx] = { ...next[idx], label: e.target.value };
                                onChange({ ...nodeData, action_buttons: next });
                              }}
                              placeholder="Button text (e.g. Enter Shop)"
                              className="flex-1 bg-black border border-gray-700 rounded px-3 py-2 text-xs text-white focus:border-cyan-500 outline-none"
                            />
                            <select
                              value={btn.target_event}
                              onChange={(e) => {
                                const next = [...(nodeData.action_buttons || [])];
                                next[idx] = { ...next[idx], target_event: e.target.value as SceneActionTarget };
                                onChange({ ...nodeData, action_buttons: next });
                              }}
                              className="w-[140px] bg-black border border-gray-700 rounded px-2 py-2 text-xs text-cyan-400 focus:border-cyan-500 outline-none"
                            >
                              <option value="NONE">Close Modal</option>
                              <option value="OPEN_SHOP">Open Shop</option>
                              <option value="REST_INN">Rest / Inn</option>
                              <option value="START_QUEST">Start Quest</option>
                              <option value="OPEN_DIALOGUE">Open Dialogue</option>
                              <option value="START_BATTLE">Start Battle</option>
                            </select>
                            <button
                              type="button"
                              onClick={() => onChange({ ...nodeData, action_buttons: (nodeData.action_buttons || []).filter((_, i) => i !== idx) })}
                              className="p-2 text-red-500/50 hover:text-red-400 hover:bg-red-500/10 rounded"
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {nodeData.interaction_type === 'SHOP' && (
                    <div className="p-4 rounded-xl bg-black/40 border border-green-800/50 space-y-4">
                      <h4 className="text-xs font-black uppercase text-green-400">Shop Inventory</h4>
                      <div className="space-y-2 max-h-48 overflow-y-auto rounded-lg border border-gray-800 p-2 bg-black/50">
                        {stockedItems.length === 0 ? (
                          <p className="text-xs text-gray-500 text-center py-4">Inventory is empty.</p>
                        ) : (
                          stockedItems.map((row: any) => (
                            <div key={row.id} className="flex items-center justify-between bg-gray-800/80 rounded px-3 py-2">
                              <div className="flex items-center gap-3">
                                {row.shop_item?.image_url && (
                                  <img src={row.shop_item.image_url} alt="" className="w-8 h-8 object-contain rounded bg-black border border-gray-700" />
                                )}
                                <span className="text-sm text-white font-bold">{row.shop_item?.name ?? row.item_id?.slice(0, 8)}</span>
                              </div>
                              <button
                                type="button"
                                onClick={() => onRemoveStockItem(row.id)}
                                className="text-[10px] text-red-400 hover:text-red-300 uppercase font-black px-2 py-1 bg-red-900/20 rounded border border-red-900/50"
                              >
                                Remove
                              </button>
                            </div>
                          ))
                        )}
                      </div>
                      <div className="flex gap-2 pt-2">
                        <select
                          value=""
                          onChange={(e) => {
                            const id = e.target.value;
                            if (id) onAddStockItem(id);
                            e.target.value = '';
                          }}
                          className="flex-1 bg-black border border-gray-700 rounded-lg px-3 py-2 text-white focus:border-green-500 outline-none text-sm"
                        >
                          <option value="">Select item to add…</option>
                          {shopItems
                            .filter((item) => item.is_sellable !== true)
                            .filter((item) => !item.is_gacha_exclusive)
                            .filter((item) => !CREATOR_SLOT_IDS.has(item.slot))
                            .filter((item) => !stockedItems.some((s: any) => s.item_id === item.id))
                            .map((item) => (
                              <option key={item.id} value={item.id}>
                                {item.name}
                              </option>
                            ))}
                        </select>
                      </div>
                    </div>
                  )}

                  {nodeData.interaction_type === 'BATTLE' && (
                    <div className="p-4 rounded-xl bg-black/40 border border-red-800/50 space-y-4">
                      <h4 className="text-xs font-black uppercase text-red-400">Battle Encounter Configuration</h4>
                      <div>
                        <label className="block text-[10px] font-black uppercase text-gray-500 mb-1">Enemy / Mob</label>
                        <select
                          value={nodeData.enemy_id}
                          onChange={(e) => onChange({ ...nodeData, enemy_id: e.target.value })}
                          className="w-full bg-black border border-gray-700 rounded-lg px-3 py-3 text-white focus:border-red-500 outline-none text-sm font-bold"
                        >
                          <option value="">Select an encounter…</option>
                          {encounters.map((enc) => (
                            <option key={enc.id} value={enc.id}>
                              {enc.name}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                  )}

                  {nodeData.interaction_type === 'PORTAL' && (
                    <div className="p-4 rounded-xl bg-black/40 border border-purple-800/50 space-y-4">
                      <h4 className="text-xs font-black uppercase text-purple-400">Portal Destination</h4>
                      <div>
                        <label className="block text-[10px] font-black uppercase text-gray-500 mb-1">Target map</label>
                        <select
                          value={nodeData.target_map_id}
                          onChange={(e) => onChange({ ...nodeData, target_map_id: e.target.value })}
                          className="w-full bg-black border border-gray-700 rounded-lg px-3 py-2 text-white focus:border-purple-500 outline-none"
                        >
                          <option value="">Select destination map…</option>
                          {maps.map((m) => (
                            <option key={m.id} value={m.id}>
                              {m.name ?? m.id?.slice(0, 8)} ({m.global_x}, {m.global_y})
                            </option>
                          ))}
                        </select>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-[10px] font-black uppercase text-gray-500 mb-1">Target X</label>
                          <input
                            type="number"
                            value={nodeData.portal_target_x}
                            onChange={(e) => onChange({ ...nodeData, portal_target_x: parseInt(e.target.value, 10) || 0 })}
                            className="w-full bg-black border border-gray-700 rounded-lg px-3 py-2 text-white focus:border-purple-500 outline-none font-mono"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] font-black uppercase text-gray-500 mb-1">Target Y</label>
                          <input
                            type="number"
                            value={nodeData.portal_target_y}
                            onChange={(e) => onChange({ ...nodeData, portal_target_y: parseInt(e.target.value, 10) || 0 })}
                            className="w-full bg-black border border-gray-700 rounded-lg px-3 py-2 text-white focus:border-purple-500 outline-none font-mono"
                          />
                        </div>
                      </div>
                    </div>
                  )}

                  {nodeData.interaction_type === 'BOSS_RAID' && (
                    <div className="p-4 rounded-xl bg-black/40 border border-orange-800/50 space-y-4">
                      <h4 className="text-xs font-black uppercase text-orange-400">Boss Raid Settings</h4>
                      <div>
                        <label className="block text-[10px] font-black uppercase text-gray-500 mb-1">Boss Template</label>
                        <select
                          value={nodeData.boss_template_id}
                          onChange={(e) => onChange({ ...nodeData, boss_template_id: e.target.value })}
                          className="w-full bg-black border border-gray-700 rounded-lg px-3 py-2 text-white focus:border-orange-500 outline-none"
                        >
                          <option value="">Select boss template…</option>
                          {encounters.map((enc) => (
                            <option key={enc.id} value={enc.id}>
                              {enc.name}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="block text-[10px] font-black uppercase text-gray-500 mb-1">Boss Global Max HP</label>
                        <input
                          type="number"
                          min={1}
                          value={nodeData.boss_max_hp}
                          onChange={(e) => onChange({ ...nodeData, boss_max_hp: parseInt(e.target.value, 10) || 1000000 })}
                          className="w-full bg-black border border-gray-700 rounded-lg px-3 py-2 text-white focus:border-orange-500 outline-none font-mono text-lg"
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-[10px] font-black uppercase text-gray-500 mb-1">Duration Type</label>
                          <select
                            value={nodeData.raid_duration_type}
                            onChange={(e) => onChange({ ...nodeData, raid_duration_type: e.target.value as 'TIMED' | 'UNTIL_DEAD' })}
                            className="w-full bg-black border border-gray-700 rounded-lg px-3 py-2 text-white focus:border-orange-500 outline-none"
                          >
                            <option value="TIMED">Timed (Hours)</option>
                            <option value="UNTIL_DEAD">Until Dead</option>
                          </select>
                        </div>
                        {nodeData.raid_duration_type === 'TIMED' && (
                          <div>
                            <label className="block text-[10px] font-black uppercase text-gray-500 mb-1">Duration (hours)</label>
                            <input
                              type="number"
                              min={0}
                              value={nodeData.raid_duration_hours}
                              onChange={(e) => onChange({ ...nodeData, raid_duration_hours: parseInt(e.target.value, 10) || 2 })}
                              className="w-full bg-black border border-gray-700 rounded-lg px-3 py-2 text-white focus:border-orange-500 outline-none font-mono"
                            />
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {nodeData.interaction_type === 'CITY' && (
                    <div className="p-4 rounded-xl bg-black/40 border border-blue-800/50 space-y-4">
                      <h4 className="text-xs font-black uppercase text-blue-400">City Services</h4>
                      <div className="flex flex-wrap gap-3">
                        {CITY_SERVICES.map((s) => (
                          <label key={s} className="flex items-center gap-2 cursor-pointer bg-gray-900/50 px-3 py-2 rounded-lg border border-gray-800 hover:border-gray-600 transition-colors">
                            <input
                              type="checkbox"
                              checked={nodeData.available_services.includes(s)}
                              onChange={() => toggleService(s)}
                              className="rounded border-gray-600 bg-black text-blue-500 w-4 h-4"
                            />
                            <span className="text-sm text-white font-bold">{s}</span>
                          </label>
                        ))}
                      </div>
                    </div>
                  )}

                </div>
              )}
            </div>

            {/* Editor Footer */}
            <div className="p-4 border-t border-gray-800 bg-black/60 flex gap-4 shrink-0">
              <button 
                type="button" 
                onClick={onClose} 
                className="px-6 py-3 rounded-xl text-sm font-bold text-gray-400 hover:text-white hover:bg-gray-800 transition-colors uppercase"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={onSave}
                disabled={saving}
                className="flex-1 py-3 bg-cyan-600 hover:bg-cyan-500 text-white rounded-xl font-black text-sm uppercase disabled:opacity-50 flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(6,182,212,0.3)]"
              >
                {saving ? <Loader2 size={18} className="animate-spin" /> : null}
                {saving ? 'Saving...' : 'Save & Close'}
              </button>
            </div>
          </div>

          {/* Right Side: Live Mobile Preview */}
          <div className="w-[45%] min-w-[380px] bg-black border-l border-cyan-800/50 flex flex-col items-center justify-center relative overflow-hidden">
            {/* Ambient Background Glow based on current state */}
            <div className="absolute inset-0 bg-cyan-900/10" />
            
            <div className="mb-4">
              <span className="text-[10px] font-black uppercase tracking-[0.3em] text-cyan-500/50">Mobile Live Preview</span>
            </div>

            {/* Mobile Phone Frame */}
            <div className="relative aspect-[9/19.5] w-[320px] bg-slate-900 rounded-[2.5rem] border-[10px] border-gray-900 shadow-2xl overflow-hidden shadow-cyan-900/20">
              
              {/* Scene Background */}
              <div className="absolute inset-0 bg-black">
                {nodeData.scene_background_url ? (
                  <img src={nodeData.scene_background_url} className="w-full h-full object-cover opacity-70 contrast-125" />
                ) : (
                  <div className="w-full h-full bg-gradient-to-b from-gray-800 to-black flex items-center justify-center">
                    <span className="text-gray-700 text-xs font-bold uppercase">No Background Set</span>
                  </div>
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-black via-black/20 to-transparent" />
              </div>

              {/* NPC Sprite */}
              {(nodeData.scene_npc_sprite_url || currentPreviewLine?.image_url) && (
                <div className="absolute inset-0 flex items-center justify-center pb-[30%] pointer-events-none">
                  <img 
                    src={currentPreviewLine?.image_url || nodeData.scene_npc_sprite_url} 
                    className="max-h-[65%] w-auto object-contain drop-shadow-[0_0_30px_rgba(6,182,212,0.4)] transition-all duration-300"
                  />
                </div>
              )}

              {/* Modal Top Header (Close Button) */}
              <div className="absolute top-6 right-4 p-1.5 rounded-full bg-black/50 border border-white/10">
                <XCircle size={16} className="text-white/70" />
              </div>

              {/* JRPG Dialogue Box area */}
              <div className="absolute bottom-0 left-0 right-0 p-3 pb-8">
                {(nodeData.dialogue_script && nodeData.dialogue_script.length > 0) ? (
                  <div className="bg-slate-950/90 backdrop-blur-md border-t-2 border-x-2 border-cyan-500/40 rounded-t-2xl p-4 min-h-[160px] shadow-[0_-10px_30px_rgba(0,0,0,0.8)] flex flex-col relative overflow-hidden">
                    {/* Name Tag */}
                    {(currentPreviewLine?.npc_name || nodeData.name) && (
                      <div className="mb-2">
                        <span className="text-[9px] font-black uppercase tracking-widest text-cyan-400 bg-cyan-950/60 px-2 py-0.5 rounded-sm border border-cyan-500/30 inline-block">
                          {currentPreviewLine?.npc_name || nodeData.name}
                        </span>
                      </div>
                    )}
                    
                    {/* Text Area */}
                    <div className="flex-1">
                      <p className="text-[13px] font-bold text-gray-200 leading-relaxed">
                        {currentPreviewLine?.text || '...'}
                      </p>
                    </div>

                    {/* Progress Indicator */}
                    <div className="absolute bottom-0 left-0 h-1 bg-cyan-500/20 w-full">
                      <div 
                        className="h-full bg-cyan-400 shadow-[0_0_5px_#22d3ee] transition-all duration-300"
                        style={{ width: `${((currentPreviewIndex + 1) / Math.max(1, nodeData.dialogue_script.length)) * 100}%` }}
                      />
                    </div>
                  </div>
                ) : (
                  // Fallback generic info box if no dialogue script
                  <div className="bg-slate-950/90 backdrop-blur-md border border-gray-700/50 rounded-2xl p-4 flex flex-col items-center text-center space-y-3">
                    <h4 className="text-[10px] font-black uppercase text-cyan-400">{nodeData.name || 'Location Name'}</h4>
                    <p className="text-[11px] text-gray-400">{nodeData.welcome_text || 'Select an action below.'}</p>
                    <div className="flex flex-wrap justify-center gap-2 pt-2 w-full">
                      {(nodeData.action_buttons && nodeData.action_buttons.length > 0) ? (
                        nodeData.action_buttons.map((btn, i) => (
                          <div key={i} className="px-3 py-1.5 bg-cyan-800/80 rounded border border-cyan-600 text-[9px] font-bold text-white uppercase w-full">
                            {btn.label || 'Action'}
                          </div>
                        ))
                      ) : (
                        <div className="px-3 py-1.5 bg-gray-800 rounded text-[9px] font-bold text-gray-400 uppercase w-full">Close</div>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Status Bar Fake overlay */}
              <div className="absolute top-0 w-full h-6 flex justify-between items-center px-6 pointer-events-none">
                <span className="text-[10px] font-bold text-white">9:41</span>
                <div className="flex gap-1 items-center">
                  <div className="w-3 h-2 bg-white rounded-sm" />
                  <div className="w-4 h-2 bg-white rounded-sm" />
                </div>
              </div>

            </div>
          </div>
        </div>

      </motion.div>
    </div>
  );
}
