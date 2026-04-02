"use client";

import React, { useEffect, useRef, useState } from 'react';
import { Loader2, Pencil, Plus, Trash2, Upload, Music2, Image as ImageIcon } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { motion } from 'framer-motion';
import MiniBattleSimulator from './MiniBattleSimulator';
import { SkillSearchSelect } from './SkillSearchSelect';
import { BattleBackgroundPicker } from './BattleBackgroundPicker';

interface Skill {
  id: string;
  name: string;
}

interface BattleMusicPreset {
  id: string;
  display_name: string;
  file_url: string | null;
}

export default function MobsTab() {
  const encounterIconInputRef = useRef<HTMLInputElement>(null);
  const encounterBgInputRef = useRef<HTMLInputElement>(null);
  const encounterWalkingInputRef = useRef<HTMLInputElement>(null);
  const encounterSoundInputRef = useRef<HTMLInputElement>(null);
  const deathSoundInputRef = useRef<HTMLInputElement>(null);
  const battleMusicInputRef = useRef<HTMLInputElement>(null);

  const [encounters, setEncounters] = useState<any[]>([]);
  const [maps, setMaps] = useState<{ id: string; name: string; global_x: number; global_y: number }[]>([]);
  const [showEncounterForm, setShowEncounterForm] = useState(false);
  const [editingEncounterId, setEditingEncounterId] = useState<string | null>(null);
  const [savingEncounter, setSavingEncounter] = useState(false);
  const [uploadingEncounterIcon, setUploadingEncounterIcon] = useState(false);
  const [uploadingEncounterBg, setUploadingEncounterBg] = useState(false);
  const [uploadingEncounterWalking, setUploadingEncounterWalking] = useState(false);
  const [uploadingEncounterSound, setUploadingEncounterSound] = useState(false);
  const [uploadingDeathSound, setUploadingDeathSound] = useState(false);
  const [uploadingBattleMusic, setUploadingBattleMusic] = useState(false);
  const [scalingStats, setScalingStats] = useState(false);
  const [scaleResult, setScaleResult] = useState<string | null>(null);
  const [skills, setSkills] = useState<Skill[]>([]);
  const [battlePresets, setBattlePresets] = useState<BattleMusicPreset[]>([]);
  const [previewScale, setPreviewScale] = useState<number>(1);

  const [encounterForm, setEncounterForm] = useState({
    event_type: 'MONSTER' as 'MONSTER' | 'LOOT' | 'PET' | 'NPC' | 'TRAP',
    name: '',
    spawn_chance: 10,
    icon_url: '',
    background_url: '',
    display_mode: 'MODAL' as 'MODAL' | 'TEXT',
    coins: 0,
    exp: 0,
    gems: 0,
    hp: 1000,
    damage: 25,
    level_min: 1,
    level_max: 99,
    test_skill_id: '',
    attack_slots: [null, null, null, null] as (string | null)[],
    monster_is_spritesheet: false,
    monster_frame_count: 4,
    monster_frame_width: 64,
    monster_frame_height: 64,
    monster_animation_speed: 800,
    monster_start_frame: 0,
    monster_end_frame: 0,
    monster_idle_loop_start: 0,
    monster_idle_loop_end: 0,
    // Walking animation (Optional)
    walking_url: '',
    walking_is_spritesheet: false,
    walking_frame_count: 4,
    walking_frame_width: 64,
    walking_frame_height: 64,
    walking_animation_speed: 800,
    // Sounds
    sound_encounter_url: '',
    sound_death_url: '',
    battle_music_type: '',
    battle_music_url: '',
    // New RNG + scaling fields
    weight: 10,
    exp_reward_base: 20,
    difficulty_multiplier: 1.0,
    metadata: {
      base_catch_rate: 0.3,
      flee_rate: 0.1,
    },
    map_id: '' as string,
    dialogue_enabled: false,
    dialogue_npc_name: '',
    dialogue_npc_sprite_url: '',
    dialogue_background_url: '',
    dialogue_script: [] as { text: string; image_url?: string }[],
  });

  useEffect(() => {
    const loadInitial = async () => {
      const { data: skillsData, error: skillsError } = await supabase.from('skills').select('id, name');
      if (skillsError) console.error('Error fetching skills:', skillsError);
      else setSkills(skillsData || []);
      const { data: mapsData, error: mapsError } = await supabase.from('maps').select('id, name, global_x, global_y');
      if (mapsError) console.error('Error fetching maps:', mapsError);
      else setMaps(mapsData || []);
      const { data: presetsData, error: presetsError } = await supabase
        .from('battle_music_presets')
        .select('id, display_name, file_url')
        .order('id', { ascending: true });
      if (presetsError) {
        console.error('Error fetching battle music presets:', presetsError);
      } else {
        setBattlePresets((presetsData as BattleMusicPreset[]) || []);
      }
      loadEncounters();
    };
    loadInitial();
  }, []);

  const loadEncounters = async () => {
    const { data, error } = await supabase.from('encounter_pool').select('*').order('created_at', { ascending: false });
    if (error) console.error('Error loading encounters:', error);
    else setEncounters(data || []);
  };

  const fillFormFromEncounter = (enc: any) => {
    const meta = enc.metadata || {};
    const rewards = meta.rewards || {};
    const stats = meta.stats || {};
    const levelRange = meta.level_range || {};
    const visuals = meta.visuals || {};
    const sounds = meta.sounds || {};
    const attacks = (meta as any).attacks || {};
    const slots = Array.isArray(attacks.slots) ? attacks.slots : [];
    const normalizedSlots: (string | null)[] = [
      slots[0] ?? null,
      slots[1] ?? null,
      slots[2] ?? null,
      slots[3] ?? null,
    ];
    const spritesheet = visuals.spritesheet;
    const walkingSpritesheet = visuals.walking_spritesheet;
    setEncounterForm({
      event_type: enc.event_type || 'MONSTER',
      name: enc.name || '',
      spawn_chance: enc.spawn_chance ?? 10,
      icon_url: enc.icon_url || '',
      background_url: visuals.bg_url || '',
      display_mode: enc.display_mode || meta.display_mode || 'MODAL',
      coins: rewards.coins ?? 0,
      exp: rewards.exp ?? 0,
      gems: rewards.gems ?? 0,
      hp: enc.base_hp ?? stats.hp ?? 1000,
      damage: enc.base_dmg ?? stats.damage ?? 25,
      level_min: enc.level_min ?? enc.min_level ?? levelRange.min ?? 1,
      level_max: enc.level_max ?? enc.max_level ?? levelRange.max ?? 99,
      test_skill_id: '',
      monster_is_spritesheet: !!spritesheet,
      monster_frame_count: spritesheet?.frame_count ?? 4,
      monster_frame_width: spritesheet?.frame_width ?? spritesheet?.frame_size ?? 64,
      monster_frame_height: spritesheet?.frame_height ?? spritesheet?.frame_size ?? 64,
      monster_animation_speed: spritesheet?.duration_ms ?? 800,
      monster_start_frame: spritesheet?.start_frame ?? 0,
      monster_end_frame: spritesheet?.end_frame ?? (spritesheet?.frame_count ? spritesheet.frame_count - 1 : 0),
      monster_idle_loop_start: spritesheet?.idle_loop_range?.[0] ?? 0,
      monster_idle_loop_end: spritesheet?.idle_loop_range?.[1] ?? 0,
      // Walking
      walking_url: walkingSpritesheet?.url || '',
      walking_is_spritesheet: !!walkingSpritesheet,
      walking_frame_count: walkingSpritesheet?.frame_count ?? 4,
      walking_frame_width: walkingSpritesheet?.frame_width ?? 64,
      walking_frame_height: walkingSpritesheet?.frame_height ?? 64,
      walking_animation_speed: walkingSpritesheet?.duration_ms ?? 800,
      sound_encounter_url: sounds.encounter_url || '',
      sound_death_url: sounds.death_url || '',
      battle_music_type: sounds.battle_music_type || '',
      battle_music_url: sounds.battle_music_url || '',
      weight: enc.spawn_weight ?? enc.weight ?? 10,
      exp_reward_base: enc.exp_reward_base ?? rewards.base_exp ?? 20,
      difficulty_multiplier: enc.scaling_factor ?? enc.difficulty_multiplier ?? 1.0,
      metadata: {
        ...meta,
        base_catch_rate: meta.base_catch_rate ?? 0.3,
        flee_rate: meta.flee_rate ?? 0.1,
      },
      map_id: enc.map_id || '',
      attack_slots: normalizedSlots,
      dialogue_enabled: !!enc.pre_battle_dialogue?.enabled,
      dialogue_npc_name: enc.pre_battle_dialogue?.scene?.npc_name || '',
      dialogue_npc_sprite_url: enc.pre_battle_dialogue?.scene?.npc_sprite_url || '',
      dialogue_background_url: enc.pre_battle_dialogue?.scene?.background_url || '',
      dialogue_script: Array.isArray(enc.pre_battle_dialogue?.script) ? enc.pre_battle_dialogue.script : [],
    });
  };

  const startEditEncounter = (enc: any) => {
    setEditingEncounterId(enc.id);
    fillFormFromEncounter(enc);
    setShowEncounterForm(true);
  };

  const cancelEdit = () => {
    setEditingEncounterId(null);
    setShowEncounterForm(false);
  };

  const handleUploadEncounterIcon = async (file: File) => {
    if (!file) return;
    setUploadingEncounterIcon(true);
    try {
      const filePath = `encounters/monsters/${Date.now()}_${file.name.replace(/[^a-zA-Z0-9.-]/g, '_')}`;
      const { error } = await supabase.storage.from('game-assets').upload(filePath, file, { 
        upsert: true,
        cacheControl: '31536000'
      });
      if (error) throw error;
      const { data } = supabase.storage.from('game-assets').getPublicUrl(filePath);
      setEncounterForm((prev) => ({ ...prev, icon_url: `${data.publicUrl}?t=${Date.now()}` }));
      if (encounterIconInputRef.current) encounterIconInputRef.current.value = '';
    } catch (e: any) {
      alert('Upload failed: ' + (e?.message || e));
    } finally {
      setUploadingEncounterIcon(false);
    }
  };

  const handleUploadEncounterBg = async (file: File) => {
    if (!file) return;
    setUploadingEncounterBg(true);
    try {
      const filePath = `encounters/backgrounds/${Date.now()}_${file.name.replace(/[^a-zA-Z0-9.-]/g, '_')}`;
      const { error } = await supabase.storage.from('game-assets').upload(filePath, file, { 
        upsert: true,
        cacheControl: '31536000'
      });
      if (error) throw error;
      const { data } = supabase.storage.from('game-assets').getPublicUrl(filePath);
      setEncounterForm((prev) => ({ ...prev, background_url: `${data.publicUrl}?t=${Date.now()}` }));
      if (encounterBgInputRef.current) encounterBgInputRef.current.value = '';
    } catch (e: any) {
      alert('Upload failed: ' + (e?.message || e));
    } finally {
      setUploadingEncounterBg(false);
    }
  };

  const handleUploadEncounterWalking = async (file: File) => {
    if (!file) return;
    setUploadingEncounterWalking(true);
    try {
      const filePath = `encounters/monsters/${Date.now()}_walking_${file.name.replace(/[^a-zA-Z0-9.-]/g, '_')}`;
      const { error } = await supabase.storage.from('game-assets').upload(filePath, file, { 
        upsert: true,
        cacheControl: '31536000'
      });
      if (error) throw error;
      const { data } = supabase.storage.from('game-assets').getPublicUrl(filePath);
      setEncounterForm((prev) => ({ ...prev, walking_url: `${data.publicUrl}?t=${Date.now()}` }));
      if (encounterWalkingInputRef.current) encounterWalkingInputRef.current.value = '';
    } catch (e: any) {
      alert('Upload failed: ' + (e?.message || e));
    } finally {
      setUploadingEncounterWalking(false);
    }
  };

  const handleUploadEncounterSound = async (file: File) => {
    if (!file) return;
    setUploadingEncounterSound(true);
    try {
      const filePath = `encounters/sounds/${Date.now()}_encounter_${file.name.replace(/[^a-zA-Z0-9.-]/g, '_')}`;
      const { error } = await supabase.storage.from('game-assets').upload(filePath, file, { 
        upsert: true,
        cacheControl: '31536000'
      });
      if (error) throw error;
      const { data } = supabase.storage.from('game-assets').getPublicUrl(filePath);
      setEncounterForm((prev) => ({ ...prev, sound_encounter_url: `${data.publicUrl}?t=${Date.now()}` }));
      if (encounterSoundInputRef.current) encounterSoundInputRef.current.value = '';
    } catch (e: any) {
      alert('Upload failed: ' + (e?.message || e));
    } finally {
      setUploadingEncounterSound(false);
    }
  };

  const handleUploadDeathSound = async (file: File) => {
    if (!file) return;
    setUploadingDeathSound(true);
    try {
      const filePath = `encounters/sounds/${Date.now()}_death_${file.name.replace(/[^a-zA-Z0-9.-]/g, '_')}`;
      const { error } = await supabase.storage.from('game-assets').upload(filePath, file, { 
        upsert: true,
        cacheControl: '31536000'
      });
      if (error) throw error;
      const { data } = supabase.storage.from('game-assets').getPublicUrl(filePath);
      setEncounterForm((prev) => ({ ...prev, sound_death_url: `${data.publicUrl}?t=${Date.now()}` }));
      if (deathSoundInputRef.current) deathSoundInputRef.current.value = '';
    } catch (e: any) {
      alert('Upload failed: ' + (e?.message || e));
    } finally {
      setUploadingDeathSound(false);
    }
  };

  const handleUploadBattleMusic = async (file: File) => {
    if (!file) return;
    setUploadingBattleMusic(true);
    try {
      const safeName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
      const filePath = `encounters/music/${Date.now()}_battle_${safeName}`;
      const { error } = await supabase.storage.from('game-assets').upload(filePath, file, { 
        upsert: true,
        cacheControl: '31536000'
      });
      if (error) throw error;
      const { data } = supabase.storage.from('game-assets').getPublicUrl(filePath);
      setEncounterForm((prev) => ({ ...prev, battle_music_url: `${data.publicUrl}?t=${Date.now()}` }));
      if (battleMusicInputRef.current) battleMusicInputRef.current.value = '';
    } catch (e: any) {
      alert('Upload failed: ' + (e?.message || e));
    } finally {
      setUploadingBattleMusic(false);
    }
  };

  const handleUploadPresetMusic = async (presetId: string, file: File) => {
    if (!file) return;
    try {
      const safeName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
      const filePath = `battle-presets/${presetId}_${Date.now()}_${safeName}`;
      const { error } = await supabase.storage.from('game-assets').upload(filePath, file, { 
        upsert: true,
        cacheControl: '31536000'
      });
      if (error) throw error;
      const { data } = supabase.storage.from('game-assets').getPublicUrl(filePath);
      const publicUrl = `${data.publicUrl}?t=${Date.now()}`;

      const { error: updateError } = await supabase
        .from('battle_music_presets')
        .update({ file_url: publicUrl })
        .eq('id', presetId);

      if (updateError) throw updateError;

      setBattlePresets((prev) =>
        prev.map((p) => (p.id === presetId ? { ...p, file_url: publicUrl } : p)),
      );
    } catch (e: any) {
      alert('Failed to upload preset music: ' + (e?.message || e));
    }
  };

  const handleRenamePreset = async (presetId: string, displayName: string) => {
    setBattlePresets((prev) => prev.map((p) => (p.id === presetId ? { ...p, display_name: displayName } : p)));
    try {
      const { error } = await supabase
        .from('battle_music_presets')
        .update({ display_name: displayName })
        .eq('id', presetId);
      if (error) throw error;
    } catch (e: any) {
      console.error('Failed to rename preset:', e);
    }
  };

  const handleAddEncounter = async () => {
    if (!encounterForm.name.trim()) return alert('Please enter an encounter name.');
    setSavingEncounter(true);
    const petMeta = encounterForm.metadata || {};
    const dialoguePayload = encounterForm.dialogue_enabled
      ? {
          enabled: true,
          scene: {
            npc_name: encounterForm.dialogue_npc_name || encounterForm.name,
            npc_sprite_url: encounterForm.dialogue_npc_sprite_url || '',
            background_url: encounterForm.dialogue_background_url || '',
          },
          script: encounterForm.dialogue_script.filter((l) => l.text.trim()),
        }
      : null;
    const { error } = await supabase.from('encounter_pool').insert({
      event_type: encounterForm.event_type,
      name: encounterForm.name,
      spawn_chance: encounterForm.spawn_chance,
      icon_url: encounterForm.icon_url,
      map_id: encounterForm.map_id || null,
      spawn_weight: encounterForm.weight,
      min_level: encounterForm.level_min,
      level_min: encounterForm.level_min,
      max_level: encounterForm.level_max,
      level_max: encounterForm.level_max,
      base_hp: encounterForm.hp,
      hp_base: encounterForm.hp,
      base_dmg: encounterForm.damage,
      dmg_base: encounterForm.damage,
      scaling_factor: encounterForm.difficulty_multiplier,
      pre_battle_dialogue: dialoguePayload,
      metadata: {
        ...petMeta,
        rewards: { exp: encounterForm.exp, coins: encounterForm.coins, gems: encounterForm.gems, base_exp: encounterForm.exp_reward_base },
        stats: { hp: encounterForm.hp, damage: encounterForm.damage },
        display_mode: encounterForm.display_mode,
        level_range: { min: encounterForm.level_min, max: encounterForm.level_max },
        visuals: {
          bg_url: encounterForm.background_url,
          monster_url: encounterForm.icon_url,
          layout: 'SIDE_VIEW',
          spritesheet: encounterForm.monster_is_spritesheet
            ? { 
                is_horizontal: true, 
                frame_count: encounterForm.monster_frame_count, 
                frame_width: encounterForm.monster_frame_width,
                frame_height: encounterForm.monster_frame_height,
                duration_ms: encounterForm.monster_animation_speed,
                start_frame: encounterForm.monster_start_frame,
                end_frame: encounterForm.monster_end_frame,
                idle_loop_range: (encounterForm.monster_idle_loop_start > 0 || encounterForm.monster_idle_loop_end > 0) 
                  ? [encounterForm.monster_idle_loop_start, encounterForm.monster_idle_loop_end] 
                  : undefined
              }
            : undefined,
          walking_spritesheet: encounterForm.walking_is_spritesheet
            ? {
                url: encounterForm.walking_url,
                is_horizontal: true,
                frame_count: encounterForm.walking_frame_count,
                frame_width: encounterForm.walking_frame_width,
                frame_height: encounterForm.walking_frame_height,
                duration_ms: encounterForm.walking_animation_speed,
              }
            : undefined,
        },
        base_catch_rate: petMeta.base_catch_rate,
        flee_rate: petMeta.flee_rate,
        catchable: encounterForm.event_type === 'PET',
        sounds: {
          encounter_url: encounterForm.sound_encounter_url,
          death_url: encounterForm.sound_death_url,
          battle_music_type: encounterForm.battle_music_type,
          battle_music_url: encounterForm.battle_music_url,
        },
        attacks: {
          slots: encounterForm.attack_slots,
        },
      },
    });
    setSavingEncounter(false);
    if (error) {
      alert('Failed to add encounter: ' + error.message);
    } else {
      setShowEncounterForm(false);
      setEditingEncounterId(null);
      loadEncounters();
    }
  };

  const handleUpdateEncounter = async () => {
    if (!editingEncounterId || !encounterForm.name.trim()) {
      if (!encounterForm.name.trim()) alert('Please enter an encounter name.');
      return;
    }
    setSavingEncounter(true);
    const petMeta = encounterForm.metadata || {};
    const dialoguePayload = encounterForm.dialogue_enabled
      ? {
          enabled: true,
          scene: {
            npc_name: encounterForm.dialogue_npc_name || encounterForm.name,
            npc_sprite_url: encounterForm.dialogue_npc_sprite_url || '',
            background_url: encounterForm.dialogue_background_url || '',
          },
          script: encounterForm.dialogue_script.filter((l) => l.text.trim()),
        }
      : null;
    const { error } = await supabase
      .from('encounter_pool')
      .update({
        event_type: encounterForm.event_type,
        name: encounterForm.name,
        spawn_chance: encounterForm.spawn_chance,
        icon_url: encounterForm.icon_url,
        map_id: encounterForm.map_id || null,
        spawn_weight: encounterForm.weight,
        min_level: encounterForm.level_min,
        level_min: encounterForm.level_min,
        max_level: encounterForm.level_max,
        level_max: encounterForm.level_max,
        base_hp: encounterForm.hp,
        hp_base: encounterForm.hp,
        base_dmg: encounterForm.damage,
        dmg_base: encounterForm.damage,
        scaling_factor: encounterForm.difficulty_multiplier,
        pre_battle_dialogue: dialoguePayload,
        metadata: {
          ...petMeta,
          rewards: { exp: encounterForm.exp, coins: encounterForm.coins, gems: encounterForm.gems, base_exp: encounterForm.exp_reward_base },
          stats: { hp: encounterForm.hp, damage: encounterForm.damage },
          display_mode: encounterForm.display_mode,
          level_range: { min: encounterForm.level_min, max: encounterForm.level_max },
          visuals: {
            bg_url: encounterForm.background_url,
            monster_url: encounterForm.icon_url,
            layout: 'SIDE_VIEW',
            spritesheet: encounterForm.monster_is_spritesheet
              ? {
                  is_horizontal: true,
                  frame_count: encounterForm.monster_frame_count,
                  frame_width: encounterForm.monster_frame_width,
                  frame_height: encounterForm.monster_frame_height,
                  duration_ms: encounterForm.monster_animation_speed,
                  start_frame: encounterForm.monster_start_frame,
                  end_frame: encounterForm.monster_end_frame,
                  idle_loop_range: (encounterForm.monster_idle_loop_start > 0 || encounterForm.monster_idle_loop_end > 0)
                    ? [encounterForm.monster_idle_loop_start, encounterForm.monster_idle_loop_end]
                    : undefined,
                }
              : undefined,
            walking_spritesheet: encounterForm.walking_is_spritesheet
              ? {
                  url: encounterForm.walking_url,
                  is_horizontal: true,
                  frame_count: encounterForm.walking_frame_count,
                  frame_width: encounterForm.walking_frame_width,
                  frame_height: encounterForm.walking_frame_height,
                  duration_ms: encounterForm.walking_animation_speed,
                }
              : undefined,
          },
          base_catch_rate: petMeta.base_catch_rate,
          flee_rate: petMeta.flee_rate,
          catchable: encounterForm.event_type === 'PET',
          sounds: {
            encounter_url: encounterForm.sound_encounter_url,
            death_url: encounterForm.sound_death_url,
            battle_music_type: encounterForm.battle_music_type,
            battle_music_url: encounterForm.battle_music_url,
          },
          attacks: {
            slots: encounterForm.attack_slots,
          },
        },
      })
      .eq('id', editingEncounterId);
    setSavingEncounter(false);
    if (error) {
      alert('Failed to update encounter: ' + error.message);
    } else {
      setShowEncounterForm(false);
      setEditingEncounterId(null);
      loadEncounters();
    }
  };

  const deleteEncounter = async (id: string) => {
    if (confirm('Delete this encounter? This will also remove associated storage assets.')) {
      try {
        // 1. Fetch encounter data to get asset URLs
        const { data: enc, error: fetchError } = await supabase
          .from('encounter_pool')
          .select('icon_url, metadata')
          .eq('id', id)
          .single();

        if (fetchError) throw fetchError;

        // 2. Delete from DB
        const { error: deleteError } = await supabase.from('encounter_pool').delete().eq('id', id);
        if (deleteError) throw deleteError;

        // 3. Cleanup storage assets
        if (enc) {
          const BUCKET = 'game-assets';
          const visuals = enc.metadata?.visuals || {};
          const sounds = enc.metadata?.sounds || {};
          
          const assetsToDelete = [
            enc.icon_url,
            visuals.bg_url,
            visuals.walking_spritesheet?.url,
            sounds.encounter_url,
            sounds.death_url,
            sounds.battle_music_url
          ].filter(Boolean);

          for (const url of assetsToDelete) {
            try {
              const pathPart = url.split(`/${BUCKET}/`)[1]?.split('?')[0];
              if (pathPart) {
                console.log(`🗑️ Deleting encounter asset: ${pathPart}`);
                await supabase.storage.from(BUCKET).remove([pathPart]);
              }
            } catch (storageErr) {
              console.error(`Failed to delete storage asset ${url}:`, storageErr);
            }
          }
        }

        loadEncounters();
      } catch (e: any) {
        alert('Failed to delete encounter: ' + e.message);
      }
    }
  };

  const scaleAllMobsStats = async () => {
    if (!confirm('Set HP and Damage for all mobs based on their level? (HP 1000+ scaling by level)')) return;
    setScalingStats(true);
    setScaleResult(null);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (session?.access_token) headers['Authorization'] = `Bearer ${session.access_token}`;
      const res = await fetch('/api/admin/encounters/scale-stats', { method: 'POST', headers });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setScaleResult(data.error || data.details || 'Failed');
        return;
      }
      setScaleResult(`Updated ${data.updated ?? 0} mob(s).`);
      loadEncounters();
    } catch (e: any) {
      setScaleResult(e?.message || 'Request failed');
    } finally {
      setScalingStats(false);
    }
  };

  return (
    <section className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-wrap justify-between items-center gap-2">
        <h2 className="text-lg font-black uppercase tracking-widest text-red-400 flex items-center gap-2">
          Global Mobs / Encounter Pool
        </h2>
        <div className="flex items-center gap-2">
          {scaleResult && (
            <span className="text-xs text-green-400 font-medium">{scaleResult}</span>
          )}
          <button
            type="button"
            onClick={scaleAllMobsStats}
            disabled={scalingStats || encounters.length === 0}
            className="px-3 py-2 bg-gray-700 hover:bg-gray-600 disabled:opacity-50 text-white rounded-lg text-[10px] font-black uppercase flex items-center gap-1"
          >
            {scalingStats ? <Loader2 size={14} className="animate-spin" /> : null}
            Set HP by level (all mobs)
          </button>
          <button
            onClick={() => {
              if (showEncounterForm && editingEncounterId) setEditingEncounterId(null);
              setShowEncounterForm(!showEncounterForm);
            }}
            className="px-3 py-2 bg-red-600 hover:bg-red-500 text-white rounded-lg text-[10px] font-black uppercase flex items-center gap-1"
          >
            <Plus size={14} /> {editingEncounterId ? 'Cancel Edit' : 'Add Encounter'}
          </button>
        </div>
      </div>

      <div className="bg-gray-900/40 p-6 rounded-2xl border border-gray-800">
        <h3 className="text-sm font-black uppercase text-gray-400 mb-4 flex items-center gap-2">
          Encounter List ({encounters.length})
        </h3>
        {showEncounterForm && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            className="mb-6 p-4 bg-black/50 rounded-xl border border-red-900/30 space-y-4"
          >
            <div>
              <label className="block text-[10px] font-black uppercase text-gray-500 mb-1">
                Event Type
              </label>
              <select
                value={encounterForm.event_type}
                onChange={(e) =>
                  setEncounterForm((prev) => ({
                    ...prev,
                    event_type: e.target.value as typeof prev.event_type,
                  }))
                }
                className="w-full bg-black border border-gray-700 rounded-lg p-2 text-sm text-white"
              >
                <option value="MONSTER">Monster</option>
                <option value="PET">Pet</option>
                <option value="LOOT">Loot</option>
                <option value="NPC">NPC</option>
                <option value="TRAP">Trap</option>
              </select>
            </div>

            <input
              value={encounterForm.name}
              onChange={(e) => setEncounterForm((prev) => ({ ...prev, name: e.target.value }))}
              placeholder="Encounter Name"
              className="w-full bg-black border border-gray-700 rounded-lg p-2 text-sm text-white"
            />

            <div>
              <label className="block text-[10px] font-black uppercase text-gray-500 mb-1">Map</label>
              <select
                value={encounterForm.map_id}
                onChange={(e) => setEncounterForm((prev) => ({ ...prev, map_id: e.target.value }))}
                className="w-full bg-black border border-gray-700 rounded-lg p-2 text-sm text-white"
              >
                <option value="">Global / no map</option>
                {maps.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name ?? m.id?.slice(0, 8)} ({m.global_x}, {m.global_y})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[10px] font-black uppercase text-gray-500 mb-1">Monster / Icon</label>
              <div className="flex gap-2">
                <input
                  value={encounterForm.icon_url}
                  onChange={(e) => setEncounterForm((prev) => ({ ...prev, icon_url: e.target.value }))}
                  placeholder="Icon URL or upload below"
                  className="flex-1 bg-black border border-gray-700 rounded-lg p-2 text-sm text-white"
                />
                <input
                  type="file"
                  ref={encounterIconInputRef}
                  accept="image/png,image/jpeg,image/webp"
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) handleUploadEncounterIcon(f);
                  }}
                />
                <button
                  type="button"
                  onClick={() => encounterIconInputRef.current?.click()}
                  disabled={uploadingEncounterIcon}
                  className="px-3 py-2 bg-red-700 hover:bg-red-600 disabled:bg-gray-700 text-white rounded-lg text-[10px] font-bold uppercase flex items-center gap-1 shrink-0"
                >
                  {uploadingEncounterIcon ? <Loader2 size={12} className="animate-spin" /> : <Upload size={12} />}
                  {uploadingEncounterIcon ? 'Uploading…' : 'Upload PNG'}
                </button>
              </div>
            </div>

            <div className="space-y-4">
              <label className="block text-[10px] font-black uppercase text-gray-500 mb-1">Background</label>
              <div className="flex gap-2">
                <input
                  value={encounterForm.background_url}
                  onChange={(e) => setEncounterForm((prev) => ({ ...prev, background_url: e.target.value }))}
                  placeholder="Background URL or upload below"
                  className="flex-1 bg-black border border-gray-700 rounded-lg p-2 text-sm text-white"
                />
                <input
                  type="file"
                  ref={encounterBgInputRef}
                  accept="image/png,image/jpeg,image/webp"
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) handleUploadEncounterBg(f);
                  }}
                />
                <button
                  type="button"
                  onClick={() => encounterBgInputRef.current?.click()}
                  disabled={uploadingEncounterBg}
                  className="px-3 py-2 bg-red-700 hover:bg-red-600 disabled:bg-gray-700 text-white rounded-lg text-[10px] font-bold uppercase flex items-center gap-1 shrink-0"
                >
                  {uploadingEncounterBg ? <Loader2 size={12} className="animate-spin" /> : <Upload size={12} />}
                  {uploadingEncounterBg ? 'Uploading…' : 'Upload PNG'}
                </button>
              </div>
              
              <BattleBackgroundPicker
                selectedImageUrl={encounterForm.background_url}
                onSelect={(url) => setEncounterForm(prev => ({ ...prev, background_url: url }))}
              />
            </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-[10px] font-black uppercase text-gray-500 mb-1 text-cyan-400">Encounter Sound</label>
                <div className="flex gap-2">
                  <input
                    value={encounterForm.sound_encounter_url}
                    onChange={(e) => setEncounterForm((prev) => ({ ...prev, sound_encounter_url: e.target.value }))}
                    placeholder="Sound URL or upload"
                    className="flex-1 bg-black border border-gray-700 rounded-lg p-2 text-[10px] text-white"
                  />
                  <input
                    type="file"
                    ref={encounterSoundInputRef}
                    accept="audio/*"
                    className="hidden"
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (f) handleUploadEncounterSound(f);
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => encounterSoundInputRef.current?.click()}
                    disabled={uploadingEncounterSound}
                    className="px-2 py-1 bg-cyan-900/50 hover:bg-cyan-800 disabled:bg-gray-700 text-cyan-400 rounded-lg text-[10px] font-bold uppercase flex items-center gap-1 shrink-0"
                  >
                    {uploadingEncounterSound ? <Loader2 size={10} className="animate-spin" /> : <Upload size={10} />}
                    {uploadingEncounterSound ? '...' : 'MP3'}
                  </button>
                </div>
                {encounterForm.sound_encounter_url && (
                  <audio src={encounterForm.sound_encounter_url} controls className="h-6 w-full mt-1 opacity-50 hover:opacity-100 transition-opacity" />
                )}
              </div>

              <div>
                <label className="block text-[10px] font-black uppercase text-gray-500 mb-1 text-purple-400">Death Sound</label>
                <div className="flex gap-2">
                  <input
                    value={encounterForm.sound_death_url}
                    onChange={(e) => setEncounterForm((prev) => ({ ...prev, sound_death_url: e.target.value }))}
                    placeholder="Sound URL or upload"
                    className="flex-1 bg-black border border-gray-700 rounded-lg p-2 text-[10px] text-white"
                  />
                  <input
                    type="file"
                    ref={deathSoundInputRef}
                    accept="audio/*"
                    className="hidden"
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (f) handleUploadDeathSound(f);
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => deathSoundInputRef.current?.click()}
                    disabled={uploadingDeathSound}
                    className="px-2 py-1 bg-purple-900/50 hover:bg-purple-800 disabled:bg-gray-700 text-purple-400 rounded-lg text-[10px] font-bold uppercase flex items-center gap-1 shrink-0"
                  >
                    {uploadingDeathSound ? <Loader2 size={10} className="animate-spin" /> : <Upload size={10} />}
                    {uploadingDeathSound ? '...' : 'MP3'}
                  </button>
                </div>
                {encounterForm.sound_death_url && (
                  <audio src={encounterForm.sound_death_url} controls className="h-6 w-full mt-1 opacity-50 hover:opacity-100 transition-opacity" />
                )}
              </div>

              <div className="md:col-span-2 space-y-3">
                <div>
                  <label className="block text-[10px] font-black uppercase text-gray-500 mb-1 text-yellow-400">
                    Battle Music Loop (Preset Theme)
                  </label>
                  <select
                    value={encounterForm.battle_music_type}
                    onChange={(e) => setEncounterForm((prev) => ({ ...prev, battle_music_type: e.target.value }))}
                    className="w-full bg-black border border-gray-700 rounded-lg p-2 text-sm text-white"
                  >
                    <option value="">Default (No specific track)</option>
                    <option value="battle_1">Battle Theme 1 (Standard)</option>
                    <option value="battle_2">Battle Theme 2 (Fast/Aggressive)</option>
                    <option value="battle_3">Battle Theme 3 (Boss/Epic)</option>
                    <option value="battle_4">Battle Theme 4 (Dungeon/Dark)</option>
                    <option value="battle_5">Battle Theme 5 (Victory/Light)</option>
                  </select>
                  <p className="text-[9px] text-gray-500 mt-1">
                    Select one of the 5 preset battle themes. If a custom override is set below, it will take priority.
                  </p>
                </div>

                <div>
                  <label className="block text-[10px] font-black uppercase text-gray-500 mb-1 text-amber-400">
                    Battle Music Override (Custom)
                  </label>
                  <div className="flex gap-2">
                    <input
                      value={encounterForm.battle_music_url}
                      onChange={(e) => setEncounterForm((prev) => ({ ...prev, battle_music_url: e.target.value }))}
                      placeholder="Custom battle music URL or upload"
                      className="flex-1 bg-black border border-gray-700 rounded-lg p-2 text-[10px] text-white"
                    />
                    <input
                      type="file"
                      ref={battleMusicInputRef}
                      accept="audio/*"
                      className="hidden"
                      onChange={(e) => {
                        const f = e.target.files?.[0];
                        if (f) handleUploadBattleMusic(f);
                      }}
                    />
                    <button
                      type="button"
                      onClick={() => battleMusicInputRef.current?.click()}
                      disabled={uploadingBattleMusic}
                      className="px-2 py-1 bg-amber-900/50 hover:bg-amber-800 disabled:bg-gray-700 text-amber-400 rounded-lg text-[10px] font-bold uppercase flex items-center gap-1 shrink-0"
                    >
                      {uploadingBattleMusic ? <Loader2 size={10} className="animate-spin" /> : <Upload size={10} />}
                      {uploadingBattleMusic ? '...' : 'MP3'}
                    </button>
                  </div>
                  {encounterForm.battle_music_url && (
                    <audio
                      src={encounterForm.battle_music_url}
                      controls
                      className="h-6 w-full mt-1 opacity-50 hover:opacity-100 transition-opacity"
                    />
                  )}
                  <p className="text-[9px] text-gray-500 mt-1">
                    If provided, this custom track will loop during the battle instead of the preset theme.
                  </p>
                </div>
              </div>
            </div>

            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={encounterForm.monster_is_spritesheet}
                onChange={(e) => setEncounterForm((prev) => ({ ...prev, monster_is_spritesheet: e.target.checked }))}
                className="rounded border-gray-600 bg-black text-red-500"
              />
              <span className="text-xs text-gray-300">Monster is a horizontal spritesheet</span>
            </label>


            {encounterForm.monster_is_spritesheet && (
              <div className="flex flex-wrap gap-4">
                <div>
                  <label className="block text-[10px] font-black uppercase text-gray-500 mb-1">Frames</label>
                  <input
                    type="number"
                    min={1}
                    value={encounterForm.monster_frame_count}
                    onChange={(e) =>
                      setEncounterForm((prev) => ({
                        ...prev,
                        monster_frame_count: Math.max(1, parseInt(e.target.value, 10) || 1),
                      }))
                    }
                    className="w-20 bg-black border border-gray-700 rounded-lg p-2 text-sm text-white"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-black uppercase text-gray-500 mb-1">Speed (ms)</label>
                  <input
                    type="number"
                    min={10}
                    step={50}
                    value={encounterForm.monster_animation_speed}
                    onChange={(e) =>
                      setEncounterForm((prev) => ({
                        ...prev,
                        monster_animation_speed: Math.max(10, parseInt(e.target.value, 10) || 800),
                      }))
                    }
                    className="w-24 bg-black border border-gray-700 rounded-lg p-2 text-sm text-white"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-black uppercase text-gray-500 mb-1">Width (px)</label>
                  <input
                    type="number"
                    min={1}
                    value={encounterForm.monster_frame_width}
                    onChange={(e) =>
                      setEncounterForm((prev) => ({
                        ...prev,
                        monster_frame_width: Math.max(1, parseInt(e.target.value, 10) || 64),
                      }))
                    }
                    className="w-24 bg-black border border-gray-700 rounded-lg p-2 text-sm text-white"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-black uppercase text-gray-500 mb-1">Height (px)</label>
                  <input
                    type="number"
                    min={1}
                    value={encounterForm.monster_frame_height}
                    onChange={(e) =>
                      setEncounterForm((prev) => ({
                        ...prev,
                        monster_frame_height: Math.max(1, parseInt(e.target.value, 10) || 64),
                      }))
                    }
                    className="w-24 bg-black border border-gray-700 rounded-lg p-2 text-sm text-white"
                  />
                </div>
                <div className="flex flex-col gap-1 border-l-2 border-orange-500/30 pl-3">
                  <span className="text-[9px] font-black uppercase text-orange-400 mb-1">Intro (Optional)</span>
                  <div className="flex gap-2">
                    <div>
                      <label className="block text-[8px] font-black uppercase text-gray-500 mb-1">Start</label>
                      <input
                        type="number"
                        min={0}
                        value={encounterForm.monster_start_frame}
                        onChange={(e) =>
                          setEncounterForm((prev) => ({
                            ...prev,
                            monster_start_frame: Math.max(0, parseInt(e.target.value, 10) || 0),
                          }))
                        }
                        className="w-16 bg-black border border-gray-700 rounded-lg p-2 text-sm text-white"
                      />
                    </div>
                    <div>
                      <label className="block text-[8px] font-black uppercase text-gray-500 mb-1">End</label>
                      <input
                        type="number"
                        min={0}
                        value={encounterForm.monster_end_frame}
                        onChange={(e) =>
                          setEncounterForm((prev) => ({
                            ...prev,
                            monster_end_frame: Math.max(0, parseInt(e.target.value, 10) || 0),
                          }))
                        }
                        className="w-16 bg-black border border-gray-700 rounded-lg p-2 text-sm text-white"
                      />
                    </div>
                  </div>
                </div>

                <div className="flex flex-col gap-1 border-l-2 border-purple-500/30 pl-3">
                  <span className="text-[9px] font-black uppercase text-purple-400 mb-1">Idle Loop (Optional)</span>
                  <div className="flex gap-2">
                    <div>
                      <label className="block text-[8px] font-black uppercase text-gray-500 mb-1">Start</label>
                      <input
                        type="number"
                        min={0}
                        value={encounterForm.monster_idle_loop_start}
                        onChange={(e) =>
                          setEncounterForm((prev) => ({
                            ...prev,
                            monster_idle_loop_start: Math.max(0, parseInt(e.target.value, 10) || 0),
                          }))
                        }
                        className="w-16 bg-black border border-gray-700 rounded-lg p-2 text-sm text-white"
                      />
                    </div>
                    <div>
                      <label className="block text-[8px] font-black uppercase text-gray-500 mb-1">End</label>
                      <input
                        type="number"
                        min={0}
                        value={encounterForm.monster_idle_loop_end}
                        onChange={(e) =>
                          setEncounterForm((prev) => ({
                            ...prev,
                            monster_idle_loop_end: Math.max(0, parseInt(e.target.value, 10) || 0),
                          }))
                        }
                        className="w-16 bg-black border border-gray-700 rounded-lg p-2 text-sm text-white"
                      />
                    </div>
                  </div>
                </div>
                <div>
                  <label className="block text-[10px] font-black uppercase text-gray-500 mb-1">Preview Scale</label>
                  <select
                    value={previewScale}
                    onChange={(e) => setPreviewScale(parseFloat(e.target.value))}
                    className="w-28 bg-black border border-gray-700 rounded-lg p-2 text-xs text-white"
                  >
                    <option value={0.75}>0.75x</option>
                    <option value={1}>1x</option>
                    <option value={1.5}>1.5x</option>
                    <option value={2}>2x</option>
                  </select>
                </div>
                <p className="text-[9px] text-gray-500 w-full mt-2 italic">
                  Tip: Leave Intro and Loop at 0 to just play the whole sheet. Use Intro for the entrance animation and Loop for the idle state.
                </p>
              </div>
            )}

            <label className="flex items-center gap-2 cursor-pointer mt-4 border-t border-gray-800 pt-4">
              <input
                type="checkbox"
                checked={encounterForm.walking_is_spritesheet}
                onChange={(e) => setEncounterForm((prev) => ({ ...prev, walking_is_spritesheet: e.target.checked }))}
                className="rounded border-gray-600 bg-black text-cyan-500"
              />
              <span className="text-xs text-gray-300">Has walking animation (horizontal spritesheet)</span>
            </label>

            {encounterForm.walking_is_spritesheet && (
              <div className="space-y-4">
                <div className="flex gap-2">
                  <input
                    value={encounterForm.walking_url}
                    onChange={(e) => setEncounterForm((prev) => ({ ...prev, walking_url: e.target.value }))}
                    placeholder="Walking Spritesheet URL or upload below"
                    className="flex-1 bg-black border border-gray-700 rounded-lg p-2 text-sm text-white"
                  />
                  <input
                    type="file"
                    ref={encounterWalkingInputRef}
                    accept="image/png,image/jpeg,image/webp"
                    className="hidden"
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (f) handleUploadEncounterWalking(f);
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => encounterWalkingInputRef.current?.click()}
                    disabled={uploadingEncounterWalking}
                    className="px-3 py-2 bg-cyan-700 hover:bg-cyan-600 disabled:bg-gray-700 text-white rounded-lg text-[10px] font-bold uppercase flex items-center gap-1 shrink-0"
                  >
                    {uploadingEncounterWalking ? <Loader2 size={12} className="animate-spin" /> : <Upload size={12} />}
                    {uploadingEncounterWalking ? 'Uploading…' : 'Upload Walking'}
                  </button>
                </div>

                <div className="flex flex-wrap gap-4">
                  <div>
                    <label className="block text-[10px] font-black uppercase text-gray-500 mb-1">Frames</label>
                    <input
                      type="number"
                      min={1}
                      value={encounterForm.walking_frame_count}
                      onChange={(e) =>
                        setEncounterForm((prev) => ({
                          ...prev,
                          walking_frame_count: Math.max(1, parseInt(e.target.value, 10) || 1),
                        }))
                      }
                      className="w-20 bg-black border border-gray-700 rounded-lg p-2 text-sm text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-black uppercase text-gray-500 mb-1">Speed (ms)</label>
                    <input
                      type="number"
                      min={10}
                      step={50}
                      value={encounterForm.walking_animation_speed}
                      onChange={(e) =>
                        setEncounterForm((prev) => ({
                          ...prev,
                          walking_animation_speed: Math.max(10, parseInt(e.target.value, 10) || 800),
                        }))
                      }
                      className="w-24 bg-black border border-gray-700 rounded-lg p-2 text-sm text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-black uppercase text-gray-500 mb-1">Width (px)</label>
                    <input
                      type="number"
                      min={1}
                      value={encounterForm.walking_frame_width}
                      onChange={(e) =>
                        setEncounterForm((prev) => ({
                          ...prev,
                          walking_frame_width: Math.max(1, parseInt(e.target.value, 10) || 64),
                        }))
                      }
                      className="w-24 bg-black border border-gray-700 rounded-lg p-2 text-sm text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-black uppercase text-gray-500 mb-1">Height (px)</label>
                    <input
                      type="number"
                      min={1}
                      value={encounterForm.walking_frame_height}
                      onChange={(e) =>
                        setEncounterForm((prev) => ({
                          ...prev,
                          walking_frame_height: Math.max(1, parseInt(e.target.value, 10) || 64),
                        }))
                      }
                      className="w-24 bg-black border border-gray-700 rounded-lg p-2 text-sm text-white"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* HP & Damage */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
              <div>
                <label className="block text-[10px] font-black uppercase text-gray-500 mb-1">
                  HP
                </label>
                <input
                  type="number"
                  min={1}
                  value={encounterForm.hp}
                  onChange={(e) =>
                    setEncounterForm((prev) => ({
                      ...prev,
                      hp: Math.max(1, parseInt(e.target.value, 10) || 100),
                    }))
                  }
                  className="w-full bg-black border border-gray-700 rounded-lg px-3 py-2 text-sm text-white"
                />
              </div>
              <div>
                <label className="block text-[10px] font-black uppercase text-gray-500 mb-1">
                  Damage
                </label>
                <input
                  type="number"
                  min={0}
                  value={encounterForm.damage}
                  onChange={(e) =>
                    setEncounterForm((prev) => ({
                      ...prev,
                      damage: Math.max(0, parseInt(e.target.value, 10) || 10),
                    }))
                  }
                  className="w-full bg-black border border-gray-700 rounded-lg px-3 py-2 text-sm text-white"
                />
              </div>
            </div>

            {/* Spawn weight & level / scaling */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
              <div>
                <label className="block text-[10px] font-black uppercase text-gray-500 mb-1">
                  Spawn weight
                </label>
                <input
                  type="number"
                  min={1}
                  value={encounterForm.weight}
                  onChange={(e) =>
                    setEncounterForm((prev) => ({
                      ...prev,
                      weight: Math.max(1, parseInt(e.target.value, 10) || 1),
                    }))
                  }
                  className="w-full bg-black border border-gray-700 rounded-lg px-3 py-2 text-sm text-white"
                />
              </div>
              <div>
                <label className="block text-[10px] font-black uppercase text-gray-500 mb-1">
                  Min level
                </label>
                <input
                  type="number"
                  min={1}
                  value={encounterForm.level_min}
                  onChange={(e) =>
                    setEncounterForm((prev) => ({
                      ...prev,
                      level_min: parseInt(e.target.value, 10) || 1,
                    }))
                  }
                  className="w-full bg-black border border-gray-700 rounded-lg px-3 py-2 text-sm text-white"
                />
              </div>
              <div>
                <label className="block text-[10px] font-black uppercase text-gray-500 mb-1">
                  Max level
                </label>
                <input
                  type="number"
                  min={1}
                  value={encounterForm.level_max}
                  onChange={(e) =>
                    setEncounterForm((prev) => ({
                      ...prev,
                      level_max: parseInt(e.target.value, 10) || 99,
                    }))
                  }
                  className="w-full bg-black border border-gray-700 rounded-lg px-3 py-2 text-sm text-white"
                />
              </div>
              <div>
                <label className="block text-[10px] font-black uppercase text-gray-500 mb-1">
                  Base EXP
                </label>
                <input
                  type="number"
                  min={0}
                  value={encounterForm.exp_reward_base}
                  onChange={(e) =>
                    setEncounterForm((prev) => ({
                      ...prev,
                      exp_reward_base: parseInt(e.target.value, 10) || 0,
                    }))
                  }
                  className="w-full bg-black border border-gray-700 rounded-lg px-3 py-2 text-sm text-white"
                />
              </div>
              <div>
                <label className="block text-[10px] font-black uppercase text-gray-500 mb-1">
                  Difficulty x
                </label>
                <input
                  type="number"
                  step="0.1"
                  min={0}
                  value={encounterForm.difficulty_multiplier}
                  onChange={(e) =>
                    setEncounterForm((prev) => ({
                      ...prev,
                      difficulty_multiplier: parseFloat(e.target.value) || 1.0,
                    }))
                  }
                  className="w-full bg-black border border-gray-700 rounded-lg px-3 py-2 text-sm text-white"
                />
              </div>
            </div>

            <div className="mt-4 p-3 rounded-lg border border-gray-800 bg-black/40 space-y-2">
              <div className="flex items-center justify-between gap-2">
                <span className="text-[10px] font-black uppercase text-gray-400">
                  Attack Skill Slots
                </span>
                <span className="text-[9px] text-gray-500">
                  Empty = Basic Attack
                </span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                {[0, 1, 2, 3].map((index) => (
                  <SkillSearchSelect
                    key={index}
                    label={`Slot ${index + 1}`}
                    skills={skills}
                    value={encounterForm.attack_slots?.[index] ?? null}
                    onChange={(skillId) => {
                      setEncounterForm((prev) => {
                        const current = (prev.attack_slots ??
                          [null, null, null, null]) as (string | null)[];
                        const next = [...current] as (string | null)[];
                        next[index] = skillId;
                        return { ...prev, attack_slots: next };
                      });
                    }}
                    placeholder="Select a skill or Basic Attack"
                  />
                ))}
              </div>
            </div>

            <SkillSearchSelect
              label="Test Skill"
              skills={skills}
              value={encounterForm.test_skill_id}
              onChange={(skillId) => setEncounterForm((prev) => ({ ...prev, test_skill_id: skillId || '' }))}
              placeholder="Select Skill to Test..."
            />

            <MiniBattleSimulator
              monsterUrl={encounterForm.icon_url}
              backgroundUrl={encounterForm.background_url}
              testSkillId={encounterForm.test_skill_id}
              monsterIsSpritesheet={encounterForm.monster_is_spritesheet}
              monsterFrameCount={encounterForm.monster_frame_count}
              monsterFrameWidth={encounterForm.monster_frame_width}
              monsterFrameHeight={encounterForm.monster_frame_height}
              monsterAnimationSpeed={encounterForm.monster_animation_speed}
              monsterStartFrame={encounterForm.monster_start_frame}
              monsterEndFrame={encounterForm.monster_end_frame}
              monsterIdleLoopRange={(encounterForm.monster_idle_loop_start > 0 || encounterForm.monster_idle_loop_end > 0)
                ? [encounterForm.monster_idle_loop_start, encounterForm.monster_idle_loop_end]
                : undefined}
              previewScale={previewScale}
              eventType={encounterForm.event_type}
              baseHP={encounterForm.hp}
              metadata={encounterForm.metadata}
            />

            {encounterForm.attack_slots && (
              <div className="mt-1 text-[10px] text-gray-400">
                <span className="font-black uppercase mr-1">Attacks:</span>
                {encounterForm.attack_slots.map((slot, index) => {
                  const skill = slot ? skills.find((s) => s.id === slot) : null;
                  const label = skill ? skill.name : 'Basic Attack';
                  return (
                    <span key={index} className="inline-block mr-2">
                      {index + 1}. {label}
                    </span>
                  );
                })}
              </div>
            )}

            <div className="mt-4 p-3 rounded-lg border border-gray-800 bg-black/40 space-y-2">
              <div className="flex items-center justify-between gap-2">
                <span className="text-[10px] font-black uppercase text-amber-400">
                  Pre-Battle Dialogue
                </span>
                <label className="flex items-center gap-2 cursor-pointer">
                  <span className="text-[9px] text-gray-500">{encounterForm.dialogue_enabled ? 'ON' : 'OFF'}</span>
                  <input
                    type="checkbox"
                    checked={encounterForm.dialogue_enabled}
                    onChange={(e) => setEncounterForm((prev) => ({ ...prev, dialogue_enabled: e.target.checked }))}
                    className="w-4 h-4 accent-amber-500"
                  />
                </label>
              </div>
              {encounterForm.dialogue_enabled && (
                <div className="space-y-2">
                  <input
                    type="text"
                    placeholder="NPC Name (defaults to encounter name)"
                    value={encounterForm.dialogue_npc_name}
                    onChange={(e) => setEncounterForm((prev) => ({ ...prev, dialogue_npc_name: e.target.value }))}
                    className="w-full bg-black border border-gray-700 rounded-lg px-3 py-2 text-sm text-white"
                  />
                  <input
                    type="text"
                    placeholder="NPC Sprite URL (defaults to encounter icon)"
                    value={encounterForm.dialogue_npc_sprite_url}
                    onChange={(e) => setEncounterForm((prev) => ({ ...prev, dialogue_npc_sprite_url: e.target.value }))}
                    className="w-full bg-black border border-gray-700 rounded-lg px-3 py-2 text-sm text-white"
                  />
                  <input
                    type="text"
                    placeholder="Dialogue Background URL"
                    value={encounterForm.dialogue_background_url}
                    onChange={(e) => setEncounterForm((prev) => ({ ...prev, dialogue_background_url: e.target.value }))}
                    className="w-full bg-black border border-gray-700 rounded-lg px-3 py-2 text-sm text-white"
                  />
                  <div className="space-y-1">
                    <span className="text-[9px] font-bold uppercase text-gray-500">Script Lines</span>
                    {encounterForm.dialogue_script.map((line, idx) => (
                      <div key={idx} className="flex gap-1 items-start">
                        <span className="text-[9px] text-gray-600 mt-2.5 w-4 shrink-0">{idx + 1}.</span>
                        <input
                          type="text"
                          placeholder="Dialogue text..."
                          value={line.text}
                          onChange={(e) => {
                            setEncounterForm((prev) => {
                              const next = [...prev.dialogue_script];
                              next[idx] = { ...next[idx], text: e.target.value };
                              return { ...prev, dialogue_script: next };
                            });
                          }}
                          className="flex-1 bg-black border border-gray-700 rounded px-2 py-1.5 text-xs text-white"
                        />
                        <input
                          type="text"
                          placeholder="Image URL (opt)"
                          value={line.image_url || ''}
                          onChange={(e) => {
                            setEncounterForm((prev) => {
                              const next = [...prev.dialogue_script];
                              next[idx] = { ...next[idx], image_url: e.target.value || undefined };
                              return { ...prev, dialogue_script: next };
                            });
                          }}
                          className="w-32 bg-black border border-gray-700 rounded px-2 py-1.5 text-xs text-white"
                        />
                        <button
                          type="button"
                          onClick={() => {
                            setEncounterForm((prev) => ({
                              ...prev,
                              dialogue_script: prev.dialogue_script.filter((_, i) => i !== idx),
                            }));
                          }}
                          className="text-red-500 hover:text-red-400 text-xs px-1 mt-1"
                        >
                          x
                        </button>
                      </div>
                    ))}
                    <button
                      type="button"
                      onClick={() => {
                        setEncounterForm((prev) => ({
                          ...prev,
                          dialogue_script: [...prev.dialogue_script, { text: '' }],
                        }));
                      }}
                      className="text-[10px] text-amber-400 hover:text-amber-300 font-bold uppercase"
                    >
                      + Add Line
                    </button>
                  </div>
                </div>
              )}
            </div>

            <div className="flex gap-2">
            {editingEncounterId && (
              <button
                type="button"
                onClick={cancelEdit}
                className="py-2 px-4 border border-gray-600 text-gray-300 rounded-lg font-bold text-xs uppercase"
              >
                Cancel
              </button>
            )}
            <button
              onClick={editingEncounterId ? handleUpdateEncounter : handleAddEncounter}
              disabled={savingEncounter}
              className="flex-1 py-2 bg-red-600 hover:bg-red-500 text-white rounded-lg font-black text-xs uppercase flex items-center justify-center gap-2"
            >
              {savingEncounter ? <Loader2 size={14} className="animate-spin" /> : editingEncounterId ? 'Update Encounter' : 'Add to Pool'}
            </button>
          </div>
          </motion.div>
        )}

        <div className="grid grid-cols-2 md:grid-cols-4 xl:grid-cols-6 gap-4 max-h-[600px] overflow-y-auto custom-scrollbar p-2">
          {encounters.map((enc: any) => (
            <div
              key={enc.id}
              className="relative group bg-black/40 border border-gray-800 rounded-xl overflow-hidden hover:border-red-500/50 transition-all aspect-square flex flex-col items-center justify-center text-center p-3"
            >
              {/* Thumbnail Logic: Sprite Sheet Frame 1 vs Static Icon */}
              <div className="w-16 h-16 mb-2 flex items-center justify-center overflow-hidden drop-shadow-[0_0_10px_rgba(0,0,0,0.5)]">
                {(() => {
                  const visuals = enc.metadata?.visuals || {};
                  const spritesheet = visuals.spritesheet;
                  const imageUrl = enc.icon_url || visuals.monster_url || '/default-node.png';
                  
                  if (spritesheet && spritesheet.frame_count > 1) {
                    return (
                      <div 
                        className="w-full h-full"
                        style={{
                          backgroundImage: `url(${imageUrl})`,
                          backgroundSize: `${spritesheet.frame_count * 100}% 100%`,
                          backgroundPosition: '0 0',
                          backgroundRepeat: 'no-repeat',
                          imageRendering: 'pixelated'
                        }}
                      />
                    );
                  }

                  return (
                    <div 
                      className="w-full h-full"
                      style={{
                        backgroundImage: `url(${imageUrl})`,
                        backgroundSize: 'contain',
                        backgroundPosition: 'center',
                        backgroundRepeat: 'no-repeat',
                        imageRendering: 'pixelated'
                      }}
                    />
                  );
                })()}
              </div>
              <p className="text-xs font-black text-white leading-tight line-clamp-2">{enc.name}</p>
              
              <div className="mt-1 flex flex-wrap gap-1 justify-center">
                <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-blue-900/40 text-blue-400 border border-blue-800">
                  Lv.{enc.min_level || enc.level_min || 1}-{enc.max_level || enc.level_max || 99}
                </span>
              </div>

              {/* Hover Overlay */}
              <div className="absolute inset-0 bg-gray-900/95 backdrop-blur-sm opacity-0 group-hover:opacity-100 transition-opacity p-3 flex flex-col z-10">
                <div className="flex-1 overflow-y-auto custom-scrollbar space-y-1">
                  <p className="text-xs font-black text-white text-center mb-2">{enc.name}</p>
                  
                  <div className="flex justify-between items-center text-[10px] text-gray-400 bg-gray-800/50 p-1 rounded">
                    <span>Type</span>
                    <span className="text-red-400 font-bold uppercase">{enc.event_type}</span>
                  </div>
                  <div className="flex justify-between items-center text-[10px] text-gray-400 bg-gray-800/50 p-1 rounded">
                    <span>HP</span>
                    <span className="text-green-400 font-mono">{enc.base_hp || enc.hp_base || '?'}</span>
                  </div>
                  <div className="flex justify-between items-center text-[10px] text-gray-400 bg-gray-800/50 p-1 rounded">
                    <span>Spawn</span>
                    <span className="text-yellow-400 font-mono">{enc.spawn_chance}%</span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 mt-2 pt-2 border-t border-gray-800">
                  <button
                    onClick={() => startEditEncounter(enc)}
                    className="p-2 bg-gray-700 hover:bg-gray-600 text-white rounded flex items-center justify-center transition-all"
                    title="Edit"
                  >
                    <Pencil size={14} />
                  </button>
                  <button
                    onClick={() => deleteEncounter(enc.id)}
                    className="p-2 bg-red-900/50 hover:bg-red-600 text-red-200 hover:text-white rounded flex items-center justify-center transition-all"
                    title="Delete"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Battle Music Presets Manager */}
      <div className="bg-black/50 p-4 mt-6 rounded-2xl border border-yellow-900/40 space-y-3">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Music2 size={16} className="text-yellow-400" />
            <h3 className="text-[11px] font-black uppercase tracking-widest text-yellow-400">
              Battle Music Presets
            </h3>
          </div>
          <p className="text-[9px] text-gray-400">
            Upload MP3s once here; encounters just pick a preset.
          </p>
        </div>
        <div className="space-y-2 max-h-64 overflow-y-auto">
          {battlePresets.map((preset) => (
            <div
              key={preset.id}
              className="flex flex-col sm:flex-row sm:items-center gap-2 bg-yellow-950/20 border border-yellow-900/60 rounded-lg p-2"
            >
              <div className="flex-1 min-w-0 space-y-1">
                <div className="flex items-center gap-2">
                  <span className="text-[9px] font-black uppercase text-yellow-300 px-1.5 py-0.5 rounded bg-yellow-900/40">
                    {preset.id}
                  </span>
                  <input
                    value={preset.display_name}
                    onChange={(e) => handleRenamePreset(preset.id, e.target.value)}
                    className="flex-1 bg-black/30 border border-gray-700 rounded px-2 py-1 text-[10px] text-white"
                  />
                </div>
                <div className="text-[9px] text-gray-400 truncate">
                  {preset.file_url ? preset.file_url : 'No MP3 uploaded yet'}
                </div>
              </div>
              <div className="flex items-center gap-2 sm:w-56">
                <input
                  type="file"
                  accept="audio/*"
                  className="hidden"
                  id={`preset-upload-${preset.id}`}
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) handleUploadPresetMusic(preset.id, f);
                    e.target.value = '';
                  }}
                />
                <label
                  htmlFor={`preset-upload-${preset.id}`}
                  className="px-2 py-1 bg-yellow-800/60 hover:bg-yellow-700 text-yellow-100 rounded text-[9px] font-black uppercase border border-yellow-500/50 cursor-pointer text-center whitespace-nowrap"
                >
                  Upload MP3
                </label>
                {preset.file_url && (
                  <audio
                    src={preset.file_url}
                    controls
                    className="h-7 flex-1 opacity-60 hover:opacity-100 transition-opacity"
                  />
                )}
              </div>
            </div>
          ))}
          {battlePresets.length === 0 && (
            <div className="text-[10px] text-gray-500">
              No presets found. Run the SQL in <code>add-battle-music-presets.sql</code> to seed them.
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

