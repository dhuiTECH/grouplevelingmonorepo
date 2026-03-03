import { useState, useRef, useCallback } from 'react';
import { useMapStore } from '@/lib/store/mapStore';
import { supabase } from '@/lib/supabase';
import { NodeFormData } from '../../NodeEditModal';

export const useMapData = () => {
  const { nodes, updateNode, selectedNodeId, loadTilesFromSupabase, sidebarWidth, rightSidebarWidth } = useMapStore();
  
  const [showNodeModal, setShowNodeModal] = useState(false);
  const [nodeFormData, setNodeFormData] = useState<NodeFormData | null>(null);
  const [encounters, setEncounters] = useState<any[]>([]);
  const [maps, setMaps] = useState<any[]>([]);
  const [musicTracks, setMusicTracks] = useState<any[]>([]);
  const [stockedItems, setStockedItems] = useState<any[]>([]);
  const [savingNode, setSavingNode] = useState(false);

  const [uploadingIcon, setUploadingIcon] = useState(false);
  const [uploadingSceneBg, setUploadingSceneBg] = useState(false);
  const [uploadingNpcSprite, setUploadingNpcSprite] = useState(false);
  const [uploadingNodeMusic, setUploadingNodeMusic] = useState(false);
  const [uploadingDialogueImageLine, setUploadingDialogueImageLine] = useState<number | null>(null);
  const [uploadingVoiceLineLine, setUploadingVoiceLineLine] = useState<number | null>(null);
  const [iconGalleryUrls, setIconGalleryUrls] = useState<string[]>([]);

  const nodeIconInputRef = useRef<HTMLInputElement>(null);
  const sceneBgInputRef = useRef<HTMLInputElement>(null);
  const npcSpriteInputRef = useRef<HTMLInputElement>(null);
  const nodeMusicInputRef = useRef<HTMLInputElement>(null);
  const dialogueExpressionInputRef = useRef<HTMLInputElement>(null);
  const dialogueVoiceLineInputRef = useRef<HTMLInputElement>(null);
  const currentUploadIdx = useRef<number | null>(null);

  const fetchSupportData = async () => {
    const [encRes, mapsRes, musRes] = await Promise.all([
      supabase.from('encounter_pool').select('*').order('name'),
      supabase.from('maps').select('*').order('name'),
      supabase.from('game_music').select('*').order('name')
    ]);
    setEncounters(encRes.data || []);
    setMaps(mapsRes.data || []);
    setMusicTracks(musRes.data || []);
  };

  const fetchIconGallery = async () => {
    const { data: list } = await supabase.storage.from('game-assets').list('nodes/icons', { limit: 100 });
    if (list) {
      const urls = list
        .filter(f => f.name && !f.name.endsWith('/'))
        .map(f => {
          const { data } = supabase.storage.from('game-assets').getPublicUrl(`nodes/icons/${f.name}`);
          return data.publicUrl;
        });
      setIconGalleryUrls(urls);
    }
  };

  const loadStockedItems = async (shopNodeId: string) => {
    const { data: exclusives } = await supabase
      .from('shop_exclusives')
      .select('id, item_id, shop_items(*)')
      .eq('shop_id', shopNodeId);
    
    if (exclusives) {
      setStockedItems(exclusives.map(e => ({
        id: e.id,
        item_id: e.item_id,
        shop_item: e.shop_items
      })));
    }
  };

  const handleEditNodeProperties = useCallback(async (nodeId: string) => {
    const node = useMapStore.getState().nodes.find(n => n.id === nodeId);
    if (!node) return;

    if (node.type === 'npc' || node.type === 'loot') {
      await loadStockedItems(node.id);
    } else {
      setStockedItems([]);
    }

    setNodeFormData({
      name: node.name,
      icon_url: node.iconUrl || '/default-node.png',
      interaction_type: (node.properties?.interaction_type || 'DIALOGUE') as any,
      welcome_text: node.properties?.welcome_text || '',
      available_services: node.properties?.available_services || [],
      shop_id: node.properties?.shop_id || '',
      enemy_id: node.properties?.enemy_id || '',
      dialogue_text: node.properties?.dialogue_text || '',
      portal_target_x: node.properties?.portal_target_x || 0,
      portal_target_y: node.properties?.portal_target_y || 0,
      target_map_id: node.properties?.target_map_id || '',
      can_travel_to: node.properties?.can_travel_to !== false,
      modal_image_url: node.properties?.modal_image_url || '',
      boss_template_id: node.properties?.boss_template_id || '',
      raid_duration_type: node.properties?.raid_duration_type || 'TIMED',
      raid_duration_hours: node.properties?.raid_duration_hours || 2,
      boss_max_hp: node.properties?.boss_max_hp || 1000000,
      is_random_event: node.properties?.is_random_event || false,
      scene_background_url: node.properties?.scene?.scene_background_url || '',
      scene_npc_sprite_url: node.properties?.scene?.scene_npc_sprite_url || '',
      npc_is_spritesheet: node.properties?.scene?.npc_is_spritesheet || false,
      npc_frame_count: node.properties?.scene?.npc_frame_count || 4,
      npc_frame_size: node.properties?.scene?.npc_frame_size || 48,
      dialogue_script: node.properties?.dialogue_script || [],
      action_buttons: node.properties?.action_buttons || [],
    });
    setShowNodeModal(true);
  }, [nodes]);

  const handleSaveNodeDetails = async () => {
    if (!selectedNodeId || !nodeFormData) return;
    setSavingNode(true);
    await updateNode(selectedNodeId, {
      name: nodeFormData.name,
      iconUrl: nodeFormData.icon_url,
      properties: {
        ...nodeFormData,
        scene: {
          scene_background_url: nodeFormData.scene_background_url,
          scene_npc_sprite_url: nodeFormData.scene_npc_sprite_url,
          npc_is_spritesheet: nodeFormData.npc_is_spritesheet,
          npc_frame_count: nodeFormData.npc_frame_count,
          npc_frame_size: nodeFormData.npc_frame_size,
        }
      }
    });
    setSavingNode(false);
    setShowNodeModal(false);
  };

  const handleUploadAsset = async (file: File, prefix: string, setUploading: (v: boolean) => void) => {
    setUploading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Not signed in');
      const formData = new FormData();
      formData.append('file', file);
      formData.append('prefix', prefix);
      const res = await fetch('/api/admin/assets/upload', {
        method: 'POST',
        headers: { Authorization: `Bearer ${session.access_token}` },
        body: formData,
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result.error || 'Upload failed');
      return result.path;
    } catch (e: any) {
      alert('Upload failed: ' + e.message);
      return null;
    } finally {
      setUploading(false);
    }
  };

  const handleUploadIcon = async (file: File) => {
    const path = await handleUploadAsset(file, 'nodes/icons', setUploadingIcon);
    if (path && nodeFormData) {
      setNodeFormData({ ...nodeFormData, icon_url: path });
      fetchIconGallery();
    }
  };

  const handleDeleteIcon = async (url: string) => {
    if (!confirm('Are you sure you want to delete this icon from the library?')) return;
    try {
      const pathPart = url.split('/game-assets/')[1]?.split('?')[0];
      if (!pathPart) throw new Error('Invalid icon URL');

      const { error } = await supabase.storage.from('game-assets').remove([pathPart]);
      if (error) throw error;

      fetchIconGallery();
      if (nodeFormData?.icon_url === url) {
        setNodeFormData({ ...nodeFormData, icon_url: '/default-node.png' });
      }
    } catch (e: any) {
      alert('Delete failed: ' + e.message);
    }
  };

  const onAddStockItem = async (itemId: string) => {
    if (!selectedNodeId) return;
    const { error } = await supabase.from('shop_exclusives').insert({ shop_id: selectedNodeId, item_id: itemId });
    if (error) alert('Failed to add item: ' + error.message);
    else loadStockedItems(selectedNodeId);
  };

  const onRemoveStockItem = async (exclusiveId: string) => {
    const { error } = await supabase.from('shop_exclusives').delete().eq('id', exclusiveId);
    if (error) alert('Failed to remove item: ' + error.message);
    else if (selectedNodeId) loadStockedItems(selectedNodeId);
  };

  const handleUploadNodeMusic = async (file: File) => {
    if (!file || !nodeFormData) return;
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
      await fetchSupportData();
      setNodeFormData({ ...nodeFormData, music_id: track.id });
      if (nodeMusicInputRef.current) nodeMusicInputRef.current.value = '';
    } catch (e: any) {
      alert('Upload failed: ' + (e?.message || e));
    } finally {
      setUploadingNodeMusic(false);
    }
  };

  const handleUploadDialogueExpression = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    const idx = currentUploadIdx.current;
    if (!file || idx === null || !nodeFormData) return;
    setUploadingDialogueImageLine(idx);
    const path = await handleUploadAsset(file, 'nodes/dialogue-expressions', () => {});
    if (path) {
      const script = [...nodeFormData.dialogue_script];
      script[idx] = { ...script[idx], image_url: path };
      setNodeFormData({ ...nodeFormData, dialogue_script: script });
    }
    setUploadingDialogueImageLine(null);
  };

  const handleUploadDialogueVoiceLine = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    const idx = currentUploadIdx.current;
    if (!file || idx === null || !nodeFormData) return;
    setUploadingVoiceLineLine(idx);
    const path = await handleUploadAsset(file, 'nodes/voice-lines', () => {});
    if (path) {
      const script = [...nodeFormData.dialogue_script];
      script[idx] = { ...script[idx], voice_line_url: path };
      setNodeFormData({ ...nodeFormData, dialogue_script: script });
    }
    setUploadingVoiceLineLine(null);
  };

  return {
    showNodeModal, setShowNodeModal,
    nodeFormData, setNodeFormData,
    encounters, maps, musicTracks, stockedItems, savingNode,
    uploadingIcon, uploadingSceneBg, uploadingNpcSprite, uploadingNodeMusic,
    uploadingDialogueImageLine, uploadingVoiceLineLine, iconGalleryUrls,
    nodeIconInputRef, sceneBgInputRef, npcSpriteInputRef, nodeMusicInputRef,
    dialogueExpressionInputRef, dialogueVoiceLineInputRef, currentUploadIdx,
    fetchSupportData, fetchIconGallery, loadStockedItems,
    handleEditNodeProperties, handleSaveNodeDetails, handleUploadAsset,
    handleUploadIcon, handleDeleteIcon, onAddStockItem, onRemoveStockItem,
    handleUploadNodeMusic, handleUploadDialogueExpression, handleUploadDialogueVoiceLine,
    loadTilesFromSupabase,
    setUploadingSceneBg, setUploadingNpcSprite
  };
};
