'use client';
import React, { useRef, useState, useEffect, useCallback } from 'react';
import { TransformWrapper, TransformComponent, ReactZoomPanPinchRef } from 'react-zoom-pan-pinch';
import { useMapStore, NodeType, Tile } from '@/lib/store/mapStore';
import { MapCanvas } from './MapCanvas';
import { MapSidebar } from './MapSidebar';
import { createNoise2D } from 'simplex-noise';
import { Plus, Minus, Maximize, Grid, Zap, Loader2, Target, Map as MapIcon, User, Sword, Box, Globe, Search } from 'lucide-react';
import { generateAsset } from '@/lib/services/mapGeminiService';
import NodeEditModal, { NodeFormData } from '../NodeEditModal';
import { supabase } from '@/lib/supabase';

const WORLD_SIZE = 128000; 
const TILE_SIZE = 64;

interface WorldMapEngineProps {
  shopItems?: any[];
}

export const WorldMapEngine: React.FC<WorldMapEngineProps> = ({ shopItems = [] }) => {
  const transformComponentRef = useRef<ReactZoomPanPinchRef>(null);
  const dropTargetRef = useRef<HTMLDivElement>(null);
  const { nodes, addNode, updateNode, selectNode, selectedNodeId, addTileSimple, selectedTileId, customTiles, selectedTool, activeNodeType, removeTileAt, removeNode, batchAddTiles, loadTilesFromSupabase } = useMapStore();
  
  const [isGenerating, setIsGenerating] = useState(false);
  const [seed, setSeed] = useState<string>(Math.random().toString(36).substring(7));
  const [scale, setScale] = useState(1);
  const [isSpacePressed, setIsSpacePressed] = useState(false);

  // Modal State
  const [showNodeModal, setShowNodeModal] = useState(false);
  const [nodeFormData, setNodeFormData] = useState<NodeFormData | null>(null);
  const [encounters, setEncounters] = useState<any[]>([]);
  const [maps, setMaps] = useState<any[]>([]);
  const [musicTracks, setMusicTracks] = useState<any[]>([]);
  const [stockedItems, setStockedItems] = useState<any[]>([]);
  const [savingNode, setSavingNode] = useState(false);
  
  // Asset Upload State
  const [uploadingIcon, setUploadingIcon] = useState(false);
  const [uploadingSceneBg, setUploadingSceneBg] = useState(false);
  const [uploadingNpcSprite, setUploadingNpcSprite] = useState(false);
  const [uploadingSpeech, setUploadingSpeech] = useState(false);
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

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space') {
        if (document.activeElement?.tagName !== 'INPUT' && document.activeElement?.tagName !== 'TEXTAREA') {
          setIsSpacePressed(true);
          e.preventDefault();
        }
      }
    };
    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.code === 'Space') setIsSpacePressed(false);
    };
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, []);

  const [cursorCoords, setCursorCoords] = useState({ x: 0, y: 0 });

  useEffect(() => {
    if (dropTargetRef.current) {
      dropTargetRef.current.style.setProperty('--zoom-scale', '1');
    }
    const init = async () => {
      await loadTilesFromSupabase();
      fetchSupportData();
      fetchIconGallery();
    };
    init();
  }, [loadTilesFromSupabase]);

  // No auto-centering on every node change - it was annoying the user.
  // We rely on TransformWrapper's centerOnInit for the initial view.

  useEffect(() => {
    // Initialize zoom scale for CSS
    if (dropTargetRef.current) {
      dropTargetRef.current.style.setProperty('--zoom-scale', '0.5');
    }
  }, []);

  const goToNode = (nodeId: string) => {
    const node = nodes.find(n => n.id === nodeId);
    if (!node || !transformComponentRef.current || !dropTargetRef.current) return;
    
    selectNode(nodeId);
    const targetScale = 0.5; // Good overview zoom

    // 1. Get viewport dimensions accurately from the wrapper ref
    const viewportWidth = dropTargetRef.current.clientWidth;
    const viewportHeight = dropTargetRef.current.clientHeight;

    // 2. Calculate target world pixels
    // Origin is at WORLD_SIZE / 2
    const targetWorldX = (node.x * TILE_SIZE) + (WORLD_SIZE / 2) + (TILE_SIZE / 2);
    const targetWorldY = (node.y * TILE_SIZE) + (WORLD_SIZE / 2) + (TILE_SIZE / 2);

    // 3. Math: viewport_center = (world_pixel * scale) + translation
    // translation = viewport_center - (world_pixel * scale)
    const x = (viewportWidth / 2) - (targetWorldX * targetScale);
    const y = (viewportHeight / 2) - (targetWorldY * targetScale);

    transformComponentRef.current.setTransform(x, y, targetScale, 600, 'easeOut');
  };

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

  const handleEditNodeProperties = async (nodeId: string) => {
    const node = nodes.find(n => n.id === nodeId);
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
      npc_frame_size: node.properties?.scene?.npc_frame_size || 64,
      dialogue_script: node.properties?.dialogue_script || [],
      action_buttons: node.properties?.action_buttons || [],
    });
    setShowNodeModal(true);
  };

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
      // Extract path from Supabase URL: .../public/game-assets/nodes/icons/file.png
      // We need just "nodes/icons/file.png"
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

  const handleMapInteraction = (clientX: number, clientY: number, isMove = false) => {
    if (!transformComponentRef.current || !dropTargetRef.current || (isSpacePressed && !isMove)) return;
    const { positionX, positionY, scale } = transformComponentRef.current.instance.transformState;
    const rect = dropTargetRef.current.getBoundingClientRect();
    const worldX = (clientX - rect.left - positionX) / scale;
    const worldY = (clientY - rect.top - positionY) / scale;
    const gx = Math.floor((worldX - WORLD_SIZE / 2) / TILE_SIZE);
    const gy = Math.floor((worldY - WORLD_SIZE / 2) / TILE_SIZE);

    if (isMove) {
      setCursorCoords({ x: gx, y: gy });
      return;
    }

    if (selectedTool === 'paint' && selectedTileId) {
      const tile = customTiles.find(t => t.id === selectedTileId);
      if (tile) addTileSimple(gx, gy, 'custom', tile.url);
    } else if (selectedTool === 'node' && activeNodeType) {
      const exists = nodes.find(n => n.x === gx && n.y === gy);
      if (!exists) addNode({ x: gx, y: gy, type: activeNodeType, name: `New ${activeNodeType}`, iconUrl: '' });
    } else if (selectedTool === 'erase') {
      removeTileAt(gx, gy);
      const n = nodes.find(node => node.x === gx && node.y === gy);
      if (n) removeNode(n.id);
    }
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button !== 0) return;
    if (selectedTool !== 'select' && !isSpacePressed) {
      e.stopPropagation();
      handleMapInteraction(e.clientX, e.clientY);
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    handleMapInteraction(e.clientX, e.clientY, true);
    if (selectedTool !== 'select' && e.buttons === 1 && !isSpacePressed) {
      e.stopPropagation();
      handleMapInteraction(e.clientX, e.clientY);
    }
  };

  const handleAutoFill = async () => {
    if (customTiles.length === 0) {
      alert("Please upload some custom tiles first!");
      return;
    }
    setIsGenerating(true);
    setTimeout(() => {
      try {
        let seedValue = 0;
        for(let i = 0; i < seed.length; i++) {
            seedValue = ((seedValue << 5) - seedValue) + seed.charCodeAt(i);
            seedValue |= 0;
        }
        let state = seedValue;
        const random = () => {
            state += 0x6D2B79F5;
            let t = state;
            t = Math.imul(t ^ t >>> 15, t | 1);
            t ^= t + Math.imul(t ^ t >>> 7, t | 61);
            return ((t ^ t >>> 14) >>> 0) / 4294967296;
        }
        const noise2D = createNoise2D(random);
        const newTiles: Omit<Tile, 'id'>[] = [];
        const GRID_RADIUS = 30; 
        const tilesByType: Record<string, typeof customTiles> = {
          water: customTiles.filter(t => t.type === 'water' || t.name.toLowerCase().includes('water')),
          grassland: customTiles.filter(t => t.type === 'grassland' || t.name.toLowerCase().includes('grass')),
          hill: customTiles.filter(t => t.type === 'hill' || t.name.toLowerCase().includes('hill')),
          soil: customTiles.filter(t => t.type === 'soil' || t.name.toLowerCase().includes('soil') || t.name.toLowerCase().includes('dirt')),
        };
        const getTileForType = (type: string) => {
          const candidates = tilesByType[type];
          if (candidates && candidates.length > 0) return candidates[Math.floor(Math.random() * candidates.length)];
          return customTiles[Math.floor(Math.random() * customTiles.length)];
        };
        for (let x = -GRID_RADIUS; x <= GRID_RADIUS; x++) {
          for (let y = -GRID_RADIUS; y <= GRID_RADIUS; y++) {
            const elevation = noise2D(x / 12, y / 12);
            let tileType = 'grassland';
            if (elevation < -0.3) tileType = 'water';
            else if (elevation > 0.6) tileType = 'hill';
            else if (elevation <= 0.1) tileType = 'soil';
            const selectedTile = getTileForType(tileType);
            newTiles.push({ x, y, imageUrl: selectedTile.url, type: tileType as any });
          }
        }
        batchAddTiles(newTiles);
      } catch (error) {
        console.error("Auto-fill failed", error);
      } finally {
        setIsGenerating(false);
      }
    }, 100);
  };

  const onAddStockItemSync = (itemId: string) => onAddStockItem(itemId);
  const onRemoveStockItemSync = (exclusiveId: string) => onRemoveStockItem(exclusiveId);

  return (
    <div className="flex w-full h-full bg-[#0a0a0a] overflow-hidden font-mono text-slate-300">
      <MapSidebar onEditNode={handleEditNodeProperties} onGoToNode={goToNode} />
      
      <div className="flex-1 relative flex flex-col">
        {/* Toolbar */}
        <div className="absolute top-4 left-4 z-10 flex gap-2 items-center">
          <div className="bg-slate-900/95 backdrop-blur-md border border-slate-700/50 rounded-xl p-1.5 flex gap-1 shadow-2xl">
            <button onClick={() => transformComponentRef.current?.zoomIn()} className="p-2.5 hover:bg-slate-800 rounded-lg text-slate-300 hover:text-cyan-400 transition-all"><Plus size={20} /></button>
            <button onClick={() => transformComponentRef.current?.zoomOut()} className="p-2.5 hover:bg-slate-800 rounded-lg text-slate-300 hover:text-cyan-400 transition-all"><Minus size={20} /></button>
            <button onClick={() => transformComponentRef.current?.centerView()} className="p-2.5 hover:bg-slate-800 rounded-lg text-slate-300 hover:text-cyan-400 transition-all"><Maximize size={20} /></button>
          </div>
          <div className="flex items-center gap-2 bg-slate-900/95 backdrop-blur-md border border-slate-700/50 rounded-xl p-2 shadow-2xl">
            <input type="text" value={seed} onChange={(e) => setSeed(e.target.value)} className="w-24 bg-black/50 border border-slate-700 rounded px-2 py-1 text-[10px] text-cyan-400 outline-none font-bold" />
            <button onClick={handleAutoFill} disabled={isGenerating} className="bg-cyan-600 hover:bg-cyan-500 text-white px-4 py-2 rounded-lg text-xs font-black flex items-center gap-2 uppercase tracking-tighter">
              {isGenerating ? <Loader2 className="animate-spin" size={14} /> : <Globe size={14} />} Auto-Fill
            </button>
          </div>
          <div className={`px-3 py-2 rounded-lg border text-[10px] font-black uppercase flex items-center gap-4 transition-all ${isSpacePressed ? 'bg-green-900/30 border-green-500 text-green-400' : 'bg-slate-900/90 border-slate-800 text-slate-500'}`}>
            <div className="flex items-center gap-2">
              <div className={`w-2 h-2 rounded-full ${isSpacePressed ? 'bg-green-500 animate-pulse' : 'bg-slate-700'}`} />
              {isSpacePressed ? 'Panning Mode' : 'Space: Pan'}
            </div>
            <div className="flex items-center gap-2 border-l border-slate-700 pl-4 font-mono text-cyan-400">
              X: {cursorCoords.x} Y: {cursorCoords.y}
            </div>
            <div className="flex items-center gap-2 border-l border-slate-700 pl-4 font-mono text-slate-400">
              Scale: {scale.toFixed(2)}x
            </div>
          </div>
        </div>

        {/* Viewport */}
        <div className={`flex-1 bg-[#6b705c] relative overflow-hidden ${isSpacePressed ? 'cursor-grabbing' : 'cursor-crosshair'}`} ref={dropTargetRef}>
          <TransformWrapper 
            ref={transformComponentRef} 
            initialScale={1.0} 
            minScale={0.1} 
            maxScale={10} 
            centerOnInit
            onTransformed={(p) => {
              setScale(p.state.scale);
              if (dropTargetRef.current) {
                dropTargetRef.current.style.setProperty('--zoom-scale', p.state.scale.toString());
              }
            }}
            limitToBounds={false} 
            wheel={{ step: 0.2 }} 
            panning={{ disabled: !isSpacePressed && selectedTool !== 'select' }}
          >
            <TransformComponent wrapperClass="w-full h-full">
              <div 
                style={{ 
                  width: WORLD_SIZE, 
                  height: WORLD_SIZE, 
                  position: 'relative', 
                  backgroundColor: '#6b705c',
                }} 
                onMouseDown={handleMouseDown} 
                onMouseMove={handleMouseMove}
              >
                <MapCanvas width={WORLD_SIZE} height={WORLD_SIZE} scale={1} />
                
                {/* High-Visibility Black Grid Overlay */}
                <div 
                  className="absolute inset-0 pointer-events-none"
                  style={{
                    zIndex: 50,
                    backgroundImage: `
                      linear-gradient(to right, rgba(0,0,0,0.2) calc(1px / var(--zoom-scale, 1)), transparent calc(1px / var(--zoom-scale, 1))),
                      linear-gradient(to bottom, rgba(0,0,0,0.2) calc(1px / var(--zoom-scale, 1)), transparent calc(1px / var(--zoom-scale, 1))),
                      linear-gradient(to right, rgba(0,0,0,0.5) calc(2px / var(--zoom-scale, 1)), transparent calc(2px / var(--zoom-scale, 1))),
                      linear-gradient(to bottom, rgba(0,0,0,0.5) calc(2px / var(--zoom-scale, 1)), transparent calc(2px / var(--zoom-scale, 1)))
                    `,
                    backgroundSize: `${TILE_SIZE}px ${TILE_SIZE}px, ${TILE_SIZE}px ${TILE_SIZE}px, ${TILE_SIZE * 10}px ${TILE_SIZE * 10}px, ${TILE_SIZE * 10}px ${TILE_SIZE * 10}px`,
                    backgroundPosition: '0 0'
                  }}
                />
                
                {nodes.map(node => (
                  <div 
                    key={node.id} 
                    id={`node-${node.id}`} 
                    onClick={(e) => { e.stopPropagation(); selectNode(node.id); }} 
                    onContextMenu={(e) => { e.preventDefault(); e.stopPropagation(); selectNode(node.id); handleEditNodeProperties(node.id); }}
                    style={{ 
                      position: 'absolute', 
                      left: node.x * TILE_SIZE + WORLD_SIZE / 2, 
                      top: node.y * TILE_SIZE + WORLD_SIZE / 2, 
                      width: TILE_SIZE, 
                      height: TILE_SIZE,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      zIndex: 100
                    }} 
                    className={`group transition-transform hover:scale-125 ${selectedNodeId === node.id ? 'z-[200]' : ''}`}
                  >
                    <div className={`w-10 h-10 rounded-full shadow-2xl flex items-center justify-center border-2 transition-all ${selectedNodeId === node.id ? 'bg-cyan-500 border-white scale-110' : 'bg-slate-900 border-slate-600 hover:border-cyan-400'}`}>
                      {node.type === 'spawn' && <Target size={20} className="text-white" />}
                      {node.type === 'enemy' && <Sword size={20} className="text-red-400" />}
                      {node.type === 'npc' && <User size={20} className="text-green-400" />}
                      {node.type === 'loot' && <Box size={20} className="text-purple-400" />}
                      {node.type === 'poi' && <MapIcon size={20} className="text-yellow-400" />}
                    </div>
                    <div className={`absolute -bottom-8 left-1/2 -translate-x-1/2 whitespace-nowrap px-2 py-1 bg-black/90 text-white text-[10px] font-black rounded border border-slate-700 pointer-events-none transition-opacity ${selectedNodeId === node.id ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}>
                      {node.name.toUpperCase()}
                    </div>
                  </div>
                ))}
              </div>
            </TransformComponent>
          </TransformWrapper>
        </div>
      </div>

      {showNodeModal && nodeFormData && (
        <NodeEditModal
          open={showNodeModal}
          onClose={() => setShowNodeModal(false)}
          mode="edit"
          coords={{ x: nodes.find(n => n.id === selectedNodeId)?.x || 0, y: nodes.find(n => n.id === selectedNodeId)?.y || 0 }}
          nodeData={nodeFormData}
          onChange={setNodeFormData}
          onSave={handleSaveNodeDetails}
          saving={savingNode}
          shopItems={shopItems}
          encounters={encounters}
          maps={maps}
          stockedItems={stockedItems}
          onAddStockItem={onAddStockItemSync}
          onRemoveStockItem={onRemoveStockItemSync}
          musicTracks={musicTracks}
          iconGalleryUrls={iconGalleryUrls}
          onIconSelect={(url) => setNodeFormData({ ...nodeFormData, icon_url: url })}
          onDeleteIcon={handleDeleteIcon}
          uploadingIcon={uploadingIcon}
          onUploadIcon={handleUploadIcon}
          iconInputRef={nodeIconInputRef}
          uploadingSceneBg={uploadingSceneBg}
          onUploadSceneBg={(f) => handleUploadAsset(f, 'nodes/scene-backgrounds', setUploadingSceneBg).then(p => p && setNodeFormData({...nodeFormData, scene_background_url: p}))}
          sceneBgInputRef={sceneBgInputRef}
          uploadingNpcSprite={uploadingNpcSprite}
          onUploadNpcSprite={(f) => handleUploadAsset(f, 'nodes/npc-sprites', setUploadingNpcSprite).then(p => p && setNodeFormData({...nodeFormData, scene_npc_sprite_url: p}))}
          npcSpriteInputRef={npcSpriteInputRef}
          onUploadNodeMusic={handleUploadNodeMusic}
          uploadingNodeMusic={uploadingNodeMusic}
          nodeMusicInputRef={nodeMusicInputRef}
          onRequestUploadDialogueImage={(idx) => { currentUploadIdx.current = idx; dialogueExpressionInputRef.current?.click(); }}
          uploadingDialogueImageLine={uploadingDialogueImageLine}
          onRequestUploadVoiceLine={(idx) => { currentUploadIdx.current = idx; dialogueVoiceLineInputRef.current?.click(); }}
          uploadingVoiceLineLine={uploadingVoiceLineLine}
        />
      )}

      {/* Hidden Upload Inputs */}
      <input type="file" ref={dialogueExpressionInputRef} className="hidden" accept="image/*" onChange={handleUploadDialogueExpression} />
      <input type="file" ref={dialogueVoiceLineInputRef} className="hidden" accept="audio/*" onChange={handleUploadDialogueVoiceLine} />
    </div>
  );
};
