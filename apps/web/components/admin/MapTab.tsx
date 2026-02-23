"use client";

import React, { useState, useRef, useEffect } from 'react';
import { Loader2, XCircle, Trash2, Settings, Edit2, Upload, GripVertical } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { motion } from 'framer-motion';
import { WorldMapEngine } from './WorldMap/WorldMapEngine';
import NodeEditModal, { NodeFormData } from './NodeEditModal';
import DropZone from './DropZone';

export default function MapTab({ shopItems }: { shopItems: any[] }) {
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [newMapCoords, setNewMapCoords] = useState<{ x: number; y: number } | null>(null);
  const [uploadingMap, setUploadingMap] = useState(false);
  const [mapName, setMapName] = useState('');
  const [selectedMapFile, setSelectedMapFile] = useState<File | null>(null);
  const mapFileInputRef = useRef<HTMLInputElement>(null);
  const nodeIconInputRef = useRef<HTMLInputElement>(null);
  const sceneBgInputRef = useRef<HTMLInputElement>(null);
  const npcSpriteInputRef = useRef<HTMLInputElement>(null);
  const speechInputRef = useRef<HTMLInputElement>(null);
  const nodeMusicInputRef = useRef<HTMLInputElement>(null);
  const dialogueExpressionInputRef = useRef<HTMLInputElement>(null);
  const dialogueVoiceLineInputRef = useRef<HTMLInputElement>(null);
  const dialogueImageUploadLineRef = useRef<number | null>(null);
  const dialogueVoiceUploadLineRef = useRef<number | null>(null);
  const [uploadingNodeIcon, setUploadingNodeIcon] = useState(false);
  const [uploadingDialogueImageLine, setUploadingDialogueImageLine] = useState<number | null>(null);
  const [uploadingSceneBg, setUploadingSceneBg] = useState(false);
  const [uploadingNpcSprite, setUploadingNpcSprite] = useState(false);
  const [uploadingSpeech, setUploadingSpeech] = useState(false);
  const [uploadingNodeMusic, setUploadingNodeMusic] = useState(false);
  const [uploadingDialogueVoiceLineLine, setUploadingDialogueVoiceLineLine] = useState<number | null>(null);
  const [gridKey, setGridKey] = useState(Date.now());
  const [focusedTile, setFocusedTile] = useState<{ global_x: number; global_y: number } | null>(null);

  // We no longer need these since we are using WorldMapEngine
  // const [worldMapNodes, setWorldMapNodes] = useState<any[]>([]);
  // const [maps, setMaps] = useState<any[]>([]);
  
  const [showNodeModal, setShowNodeModal] = useState(false);
  const [nodeModalCoords, setNodeModalCoords] = useState<{x: number, y: number}>({x: 0, y: 0});
  const [activeMapId, setActiveMapId] = useState<string | null>(null);
    const [nodeFormData, setNodeFormData] = useState<NodeFormData>({
    name: '',
    icon_url: '/default-node.png',
    interaction_type: 'CITY' as 'CITY' | 'SHOP' | 'BATTLE' | 'DIALOGUE' | 'PORTAL' | 'BOSS_RAID',
    welcome_text: '',
    available_services: [] as string[],
    shop_id: '',
    enemy_id: '',
    dialogue_text: '',
    music_id: '',
    speech_sound_url: '',
    portal_target_x: 0,
    portal_target_y: 0,
    target_map_id: '' as string,
    can_travel_to: true,
    modal_image_url: '',
    boss_template_id: '',
    raid_duration_type: 'TIMED' as 'TIMED' | 'UNTIL_DEAD',
    raid_duration_hours: 2,
    boss_max_hp: 1000000,
    scene_background_url: '',
    scene_npc_sprite_url: '',
    npc_is_spritesheet: false,
    npc_frame_count: 4,
    npc_frame_size: 64,
    dialogue_script: [] as { npc_name: string; text: string; voice_line_url?: string }[],
    action_buttons: [] as { label: string; target_event: 'OPEN_SHOP' | 'REST_INN' | 'START_QUEST' | 'OPEN_DIALOGUE' | 'NONE' }[],
    is_random_event: false,
  });
  const [savingNode, setSavingNode] = useState(false);
  const [activeNodeId, setActiveNodeId] = useState<string | null>(null);
  const [stockedItems, setStockedItems] = useState<any[]>([]);
  const [iconGalleryUrls, setIconGalleryUrls] = useState<string[]>([]);
  const [placingSafehouse, setPlacingSafehouse] = useState(false);
  const [safehousePosition, setSafehousePosition] = useState<{ x: number; y: number } | null>(null);
  const [spawnMapId, setSpawnMapId] = useState<string | null>(null);
  const [maps, setMaps] = useState<any[]>([]);

  const [encounters, setEncounters] = useState<any[]>([]);
  const [musicTracks, setMusicTracks] = useState<any[]>([]);
  const [editingMapId, setEditingMapId] = useState<string | null>(null);

  useEffect(() => {
    loadMapsAndSafehouse();
    const fetchInitialData = async () => {
        loadEncounters();
        loadMusicTracks();
    };
    fetchInitialData();
  }, [gridKey]);

  const loadMusicTracks = async () => {
    const { data, error } = await supabase.from('game_music').select('*').order('name');
    if (error) console.error('Error loading music:', error);
    else setMusicTracks(data || []);
  };

  // WASD / Escape when a tile is focused
  useEffect(() => {
    if (focusedTile === null) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (target && (target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement || target instanceof HTMLSelectElement || target.isContentEditable)) return;
      const { global_x: gx, global_y: gy } = focusedTile;
      if (e.key === 'Escape') {
        setFocusedTile(null);
        e.preventDefault();
        return;
      }
      if (e.key === 'w' || e.key === 'W') {
        setFocusedTile({ global_x: gx, global_y: gy + 1 });
        e.preventDefault();
      } else if (e.key === 's' || e.key === 'S') {
        setFocusedTile({ global_x: gx, global_y: gy - 1 });
        e.preventDefault();
      } else if (e.key === 'a' || e.key === 'A') {
        setFocusedTile({ global_x: gx - 1, global_y: gy });
        e.preventDefault();
      } else if (e.key === 'd' || e.key === 'D') {
        setFocusedTile({ global_x: gx + 1, global_y: gy });
        e.preventDefault();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [focusedTile]);

  useEffect(() => {
    if (showNodeModal) fetchIconGallery();
  }, [showNodeModal]);

  const loadMapsAndSafehouse = async () => {
    const { data: mapsData, error } = await supabase.from('maps').select('id, name, global_x, global_y, center_x, center_y');
    if (error) {
      console.error('Error fetching maps:', error);
      return;
    }
    setMaps(mapsData || []);
    const list = mapsData || [];
    const spawn = list.find((m: any) => m.global_x === 0 && m.global_y === 0) || list[0];
    if (spawn != null && typeof spawn.center_x === 'number' && typeof spawn.center_y === 'number') {
      setSafehousePosition({ x: spawn.center_x, y: spawn.center_y });
      setSpawnMapId(spawn.id);
    } else if (spawn) {
      setSpawnMapId(spawn.id);
      setSafehousePosition({ x: 0, y: 0 });
    } else {
      setSafehousePosition(null);
      setSpawnMapId(null);
    }
  };

  const loadEncounters = async () => {
    const { data, error } = await supabase.from('encounter_pool').select('*').order('created_at', { ascending: false });
    if (error) console.error("Error loading encounters:", error);
    else setEncounters(data || []);
  };

  const loadStockedItems = async (shopNodeId: string) => {
    const { data: exclusives, error: exError } = await supabase
      .from('shop_exclusives')
      .select('id, item_id')
      .eq('shop_id', shopNodeId);
    if (exError) {
      console.error('Error loading shop stock:', exError);
      setStockedItems([]);
      return;
    }
    if (!exclusives?.length) {
      setStockedItems([]);
      return;
    }
    const itemIds = exclusives.map((r: any) => r.item_id).filter(Boolean);
    const { data: items, error: itemsError } = await supabase.from('shop_items').select('id, name, image_url, price').in('id', itemIds);
    if (itemsError) {
      console.error('Error loading shop items:', itemsError);
      setStockedItems([]);
      return;
    }
    const itemsById = (items || []).reduce((acc: any, i: any) => { acc[i.id] = i; return acc; }, {});
    setStockedItems((exclusives || []).map((r: any) => ({ ...r, shop_item: itemsById[r.item_id] || {} })));
  };

  const syncBossRaid = async (bossIdFromEncounterPool: string, bossMaxHp: number) => {
    const { data: existing } = await supabase.from('dungeon_raids').select('id').eq('boss_id', bossIdFromEncounterPool).maybeSingle();
    if (existing) {
      await supabase.from('dungeon_raids').update({ current_hp: bossMaxHp, is_active: true }).eq('id', existing.id);
    } else {
      await supabase.from('dungeon_raids').insert({ boss_id: bossIdFromEncounterPool, current_hp: bossMaxHp, is_active: true });
    }
  };

  const fetchIconGallery = async () => {
    const { data: list, error } = await supabase.storage.from('game-assets').list('nodes/icons', { limit: 100 });
    if (error) {
      console.error('Error listing icon gallery:', error);
      setIconGalleryUrls([]);
      return;
    }
    const urls = (list || [])
      .filter((f: any) => f.name && !f.name.endsWith('/'))
      .map((f: any) => {
        const { data } = supabase.storage.from('game-assets').getPublicUrl(`nodes/icons/${f.name}`);
        return `${data.publicUrl}?t=0`;
      });
    setIconGalleryUrls(urls);
  };

  const handleDeleteMap = async (mapId: string) => {
    if (!confirm('Delete this map? All nodes on it will be removed.')) return;
    const { error: nodesError } = await supabase.from('world_map_nodes').delete().eq('map_id', mapId);
    if (nodesError) {
      alert('Failed to delete map nodes: ' + nodesError.message);
      return;
    }
    const { error } = await supabase.from('maps').delete().eq('id', mapId);
    if (error) {
      alert('Failed to delete map: ' + error.message);
      return;
    }
    setGridKey(Date.now());
    loadMapsAndSafehouse();
  };

  const handleUploadNodeIcon = async (file: File) => {
    if (!file) return;
    setUploadingNodeIcon(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Not signed in.');
      const formData = new FormData();
      formData.append('file', file);
      formData.append('prefix', 'nodes/icons');
      const response = await fetch('/api/admin/assets/upload', {
        method: 'POST',
        headers: { Authorization: `Bearer ${session.access_token}` },
        body: formData,
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Upload failed');
      setNodeFormData(prev => ({ ...prev, icon_url: result.path }));
      if (nodeIconInputRef.current) nodeIconInputRef.current.value = '';
    } catch (e: any) {
      alert('Upload failed: ' + (e?.message || e));
    } finally {
      setUploadingNodeIcon(false);
    }
  };

  const uploadSceneAsset = async (file: File, prefix: 'nodes/scene-backgrounds' | 'nodes/npc-sprites', setUploading: (v: boolean) => void, setUrl: (url: string) => void, inputRef: React.RefObject<HTMLInputElement | null>) => {
    if (!file) return;
    setUploading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Not signed in.');
      const formData = new FormData();
      formData.append('file', file);
      formData.append('prefix', prefix);
      const response = await fetch('/api/admin/assets/upload', {
        method: 'POST',
        headers: { Authorization: `Bearer ${session.access_token}` },
        body: formData,
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Upload failed');
      setUrl(result.path);
      if (inputRef.current) inputRef.current.value = '';
    } catch (e: any) {
      alert('Upload failed: ' + (e?.message || e));
    } finally {
      setUploading(false);
    }
  };

  const handleUploadSceneBg = (file: File) =>
    uploadSceneAsset(file, 'nodes/scene-backgrounds', setUploadingSceneBg, (url) => setNodeFormData(prev => ({ ...prev, scene_background_url: url })), sceneBgInputRef);
  const handleUploadNpcSprite = (file: File) =>
    uploadSceneAsset(file, 'nodes/npc-sprites', setUploadingNpcSprite, (url) => setNodeFormData(prev => ({ ...prev, scene_npc_sprite_url: url })), npcSpriteInputRef);
  
  const handleUploadSpeech = async (file: File) => {
    if (!file) return;
    setUploadingSpeech(true);
    try {
      const path = `nodes/speech/${Date.now()}_${file.name.replace(/[^a-zA-Z0-9.-]/g, '_')}`;
      const { error } = await supabase.storage.from('game-assets').upload(path, file, { upsert: true });
      if (error) throw error;
      const { data } = supabase.storage.from('game-assets').getPublicUrl(path);
      setNodeFormData(prev => ({ ...prev, speech_sound_url: data.publicUrl }));
      if (speechInputRef.current) speechInputRef.current.value = '';
    } catch (e: any) {
      alert('Upload failed: ' + (e?.message || e));
    } finally {
      setUploadingSpeech(false);
    }
  };

  const handleUploadNodeMusic = async (file: File) => {
    if (!file) return;
    setUploadingNodeMusic(true);
    try {
      const path = `music/nodes/${Date.now()}_${file.name.replace(/[^a-zA-Z0-9.-]/g, '_')}`;
      const { error } = await supabase.storage.from('game-assets').upload(path, file, { upsert: true });
      if (error) throw error;
      const { data } = supabase.storage.from('game-assets').getPublicUrl(path);
      const trackName = file.name.replace(/\.[^/.]+$/, '');
      const { data: track, error: insertErr } = await supabase.from('game_music').insert({
        name: trackName,
        file_url: data.publicUrl,
        category: 'world',
      }).select('id').single();
      if (insertErr) throw insertErr;
      await loadMusicTracks();
      setNodeFormData(prev => ({ ...prev, music_id: track.id }));
      if (nodeMusicInputRef.current) nodeMusicInputRef.current.value = '';
    } catch (e: any) {
      alert('Upload failed: ' + (e?.message || e));
    } finally {
      setUploadingNodeMusic(false);
    }
  };

  const handleRequestUploadDialogueImage = (lineIndex: number) => {
    dialogueImageUploadLineRef.current = lineIndex;
    setUploadingDialogueImageLine(lineIndex);
    dialogueExpressionInputRef.current?.click();
  };

  const handleRequestUploadVoiceLine = (lineIndex: number) => {
    dialogueVoiceUploadLineRef.current = lineIndex;
    setUploadingDialogueVoiceLineLine(lineIndex);
    dialogueVoiceLineInputRef.current?.click();
  };

  const handleUploadDialogueExpression = async (file: File) => {
    const lineIndex = dialogueImageUploadLineRef.current;
    dialogueImageUploadLineRef.current = null;
    if (lineIndex == null || !file) return;
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Not signed in.');
      const formData = new FormData();
      formData.append('file', file);
      formData.append('prefix', 'nodes/dialogue-expressions');
      const response = await fetch('/api/admin/assets/upload', {
        method: 'POST',
        headers: { Authorization: `Bearer ${session.access_token}` },
        body: formData,
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Upload failed');
      setNodeFormData(prev => ({
        ...prev,
        dialogue_script: (prev.dialogue_script || []).map((line, i) =>
          i === lineIndex ? { ...line, image_url: result.path } : line
        ),
      }));
      if (dialogueExpressionInputRef.current) dialogueExpressionInputRef.current.value = '';
    } catch (e: any) {
      alert('Upload failed: ' + (e?.message || e));
    } finally {
      setUploadingDialogueImageLine(null);
    }
  };

  const handleUploadDialogueVoiceLine = async (file: File) => {
    const lineIndex = dialogueVoiceUploadLineRef.current;
    dialogueVoiceUploadLineRef.current = null;
    if (lineIndex == null || !file) return;
    try {
      const path = `nodes/voice-lines/${Date.now()}_${file.name.replace(/[^a-zA-Z0-9.-]/g, '_')}`;
      const { error } = await supabase.storage.from('game-assets').upload(path, file, { upsert: true });
      if (error) throw error;
      const { data } = supabase.storage.from('game-assets').getPublicUrl(path);

      setNodeFormData(prev => ({
        ...prev,
        dialogue_script: (prev.dialogue_script || []).map((line, i) =>
          i === lineIndex ? { ...line, voice_line_url: data.publicUrl } : line
        ),
      }));
      if (dialogueVoiceLineInputRef.current) dialogueVoiceLineInputRef.current.value = '';
    } catch (e: any) {
      alert('Upload failed: ' + (e?.message || e));
    } finally {
      setUploadingDialogueVoiceLineLine(null);
    }
  };

  const handleSelectEmptySlot = (x: number, y: number) => {
    setNewMapCoords({ x, y });
    setSelectedMapFile(null);
    setShowUploadModal(true);
  };

  const handleUploadMap = async () => {
    const file = selectedMapFile ?? mapFileInputRef.current?.files?.[0];
    if (!mapName.trim() || !file || !newMapCoords) {
      alert('Please fill all fields for the new map.');
      return;
    }
    setUploadingMap(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('name', mapName);
      formData.append('global_x', String(newMapCoords.x));
      formData.append('global_y', String(newMapCoords.y));

      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('No active session.');

      const response = await fetch('/api/admin/maps/upload', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${session.access_token}` },
        body: formData
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Upload failed');
      }

      alert('Map uploaded successfully!');
      setShowUploadModal(false);
      setMapName('');
      setSelectedMapFile(null);
      if (mapFileInputRef.current) mapFileInputRef.current.value = '';
      setGridKey(Date.now());
    } catch (error: any) {
      alert('Failed to upload map: ' + error.message);
    } finally {
      setUploadingMap(false);
    }
  };

  const saveSafehouseLocation = async (mapId: string, x: number, y: number) => {
      const { error } = await supabase.from('maps').update({ center_x: x, center_y: y }).eq('id', mapId);
      if (error) {
        alert('Failed to save spawn point: ' + error.message);
        return;
      }
      setSafehousePosition({ x, y });
      setPlacingSafehouse(false);
      loadMapsAndSafehouse();
    };

    const handleMapClick = (x: number, y: number, mapId: string) => {
        if (placingSafehouse) {
          saveSafehouseLocation(mapId, x, y);
          return;
        }
        setNodeModalCoords({ x, y });
        setActiveMapId(mapId);
        setActiveNodeId(null);
        setNodeFormData({
          name: '',
          icon_url: '/default-node.png',
          interaction_type: 'CITY',
          welcome_text: '',
          available_services: [],
          shop_id: '',
          enemy_id: '',
          dialogue_text: '',
          music_id: '',
          speech_sound_url: '',
          portal_target_x: 0,
          portal_target_y: 0,
          target_map_id: '',
          can_travel_to: true,
          modal_image_url: '',
          boss_template_id: '',
          raid_duration_type: 'TIMED',
          raid_duration_hours: 2,
          boss_max_hp: 1000000,
          scene_background_url: '',
          scene_npc_sprite_url: '',
          npc_is_spritesheet: false,
          npc_frame_count: 4,
          npc_frame_size: 64,
          dialogue_script: [],
          action_buttons: [],
          is_random_event: false,
        });
        setShowNodeModal(true);
    };

    const handleEditNode = (node: any) => {
        setNodeModalCoords({ x: node.x, y: node.y });
        setActiveMapId(node.map_id);
        setActiveNodeId(node.id);
        const data = node.interaction_data || {};
        const scene = data.scene || {};
        setNodeFormData({
          name: node.name || '',
          icon_url: node.icon_url || '/default-node.png',
          interaction_type: (node.interaction_type || 'CITY') as 'CITY' | 'SHOP' | 'BATTLE' | 'DIALOGUE' | 'PORTAL' | 'BOSS_RAID',
          welcome_text: data.welcome_text ?? '',
          available_services: Array.isArray(data.available_services) ? data.available_services : [],
          shop_id: data.shop_id ?? '',
          enemy_id: data.enemy_id ?? '',
          dialogue_text: data.dialogue_text ?? '',
          music_id: node.music_id ?? '',
          speech_sound_url: node.speech_sound_url ?? '',
          portal_target_x: typeof data.portal_target_x === 'number' ? data.portal_target_x : 0,
          portal_target_y: typeof data.portal_target_y === 'number' ? data.portal_target_y : 0,
          target_map_id: data.target_map_id ?? '',
          can_travel_to: data.can_travel_to !== false,
          modal_image_url: data.modal_image_url ?? node.modal_image_url ?? '',
          boss_template_id: data.boss_template_id ?? '',
          raid_duration_type: (data.raid_duration_type || 'TIMED') as 'TIMED' | 'UNTIL_DEAD',
          raid_duration_hours: typeof data.raid_duration_hours === 'number' ? data.raid_duration_hours : 2,
          boss_max_hp: typeof data.boss_max_hp === 'number' ? data.boss_max_hp : 1000000,
          scene_background_url: scene.scene_background_url ?? '',
          scene_npc_sprite_url: scene.scene_npc_sprite_url ?? '',
          npc_is_spritesheet: scene.npc_is_spritesheet === true,
          npc_frame_count: typeof scene.npc_frame_count === 'number' ? scene.npc_frame_count : 4,
          npc_frame_size: typeof scene.npc_frame_size === 'number' ? scene.npc_frame_size : 64,
          dialogue_script: Array.isArray(data.dialogue_script) ? data.dialogue_script : [],
          action_buttons: Array.isArray(data.action_buttons) ? data.action_buttons : [],
          is_random_event: node.is_random_event === true,
        });
        if ((node.interaction_type || '') === 'SHOP') {
          loadStockedItems(node.id);
        } else {
          setStockedItems([]);
        }
        setShowNodeModal(true);
    };

    const buildInteractionData = () => {
      const d = nodeFormData;
      return {
        welcome_text: d.welcome_text,
        available_services: d.available_services,
        shop_id: d.shop_id,
        enemy_id: d.enemy_id,
        dialogue_text: d.dialogue_text,
        portal_target_x: d.portal_target_x,
        portal_target_y: d.portal_target_y,
        target_map_id: d.target_map_id || null,
        can_travel_to: d.can_travel_to,
        boss_template_id: d.boss_template_id || null,
        boss_max_hp: d.boss_max_hp,
        raid_duration_type: d.raid_duration_type,
        raid_duration_hours: d.raid_duration_hours,
        modal_image_url: d.modal_image_url || null,
        scene: {
          scene_background_url: d.scene_background_url,
          scene_npc_sprite_url: d.scene_npc_sprite_url,
          npc_is_spritesheet: d.npc_is_spritesheet,
          npc_frame_count: d.npc_frame_count,
          npc_frame_size: d.npc_frame_size,
        },
        dialogue_script: d.dialogue_script,
        action_buttons: d.action_buttons,
      };
    };

    const saveNode = async () => {
        if (!nodeFormData.name.trim() || !activeMapId) return alert('Node Name and a Map ID are required.');
        setSavingNode(true);
        const interaction_data = buildInteractionData();
        const { data: saved, error } = await supabase.from('world_map_nodes').upsert({
            id: activeNodeId ?? undefined,
            map_id: activeMapId,
            type: nodeFormData.interaction_type,
            name: nodeFormData.name,
            x: nodeModalCoords.x,
            y: nodeModalCoords.y,
            icon_url: nodeFormData.icon_url || null,
            music_id: nodeFormData.music_id || null,
            speech_sound_url: nodeFormData.speech_sound_url || null,
            interaction_type: nodeFormData.interaction_type,
            interaction_data,
            modal_image_url: nodeFormData.modal_image_url || null,
            is_random_event: nodeFormData.is_random_event,
            encounter_id: nodeFormData.enemy_id || null,
        }).select('id').maybeSingle();
        if (error) {
          setSavingNode(false);
          alert('Failed to save node: ' + error.message);
          return;
        }
        if (nodeFormData.interaction_type === 'BOSS_RAID' && nodeFormData.boss_template_id) {
          await syncBossRaid(nodeFormData.boss_template_id, nodeFormData.boss_max_hp ?? 1000000);
        }
        setSavingNode(false);
        setShowNodeModal(false);
    };

    const onAddStockItem = async (itemId: string) => {
        if (!activeNodeId) return;
        const { error } = await supabase.from('shop_exclusives').insert({ shop_id: activeNodeId, item_id: itemId });
        if (error) alert('Failed to add item: ' + error.message);
        else loadStockedItems(activeNodeId);
    };

    const onRemoveStockItem = async (exclusiveId: string) => {
        const { error } = await supabase.from('shop_exclusives').delete().eq('id', exclusiveId);
        if (error) alert('Failed to remove item: ' + error.message);
        else if (activeNodeId) loadStockedItems(activeNodeId);
    };

    const handleNodeDrop = async (nodeId: string, mapId: string, x: number, y: number) => {
        const { error } = await supabase
            .from('world_map_nodes')
            .update({ map_id: mapId, x, y })
            .eq('id', nodeId);
        if (error) {
            alert('Failed to move node: ' + error.message);
            return;
        }
    };

  const handleSaveMapMusic = async (mapId: string, musicId: string | null) => {
    const { error } = await supabase.from('maps').update({ music_id: musicId || null }).eq('id', mapId);
    if (error) alert('Failed to update map music: ' + error.message);
    else {
        loadMapsAndSafehouse();
        setEditingMapId(null);
    }
  };

  return (
    <section className="space-y-6 animate-in fade-in duration-500 h-[calc(100vh-10rem)]">
        <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-black uppercase tracking-widest text-cyan-400 flex items-center gap-2">
                <Settings size={22} /> World Map Admin
            </h2>
        </div>
        
        <div className="w-full h-full rounded-2xl overflow-hidden border border-gray-800">
            <WorldMapEngine />
        </div>
    </section>
  );
}
