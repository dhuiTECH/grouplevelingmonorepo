'use client';
import React, { useRef, useState, useEffect, useCallback } from 'react';
import { TransformWrapper, TransformComponent, ReactZoomPanPinchRef } from 'react-zoom-pan-pinch';
import { useMapStore, useTickStore, NodeType, Tile } from '@/lib/store/mapStore';
// import { MapCanvas } from './MapCanvas'; // Replaced by PixiMapCanvas
import { PixiMapCanvas } from './PixiMapCanvas';
import { MapSidebar } from './MapSidebar';
import { MapDataSidebar } from './MapDataSidebar';
import { createNoise2D } from 'simplex-noise';
import {
  Plus, Minus, Maximize, Grid, Zap, Loader2, Target, Map as MapIcon,
  User, Sword, Box, Globe, Search, MousePointer2, Eraser, Wand2,
  GripVertical, Copy, Square, CheckSquare, Pipette, X, XCircle, Paintbrush, Bug,
  RotateCw, Lock, Unlock, Droplets
} from 'lucide-react';
import { WinluPalette } from './WinluPalette';
import { DebugOverlay } from './DebugOverlay';
import { generateAsset } from '@/lib/services/mapGeminiService';
import NodeEditModal, { NodeFormData } from '../NodeEditModal';
import { supabase } from '@/lib/supabase';

const WORLD_SIZE = 100000; 
const TILE_SIZE = 48;

// Helper to normalize URLs for comparison (ignoring query params)
const normalizeUrl = (url: string | undefined | null) => {
  if (!url) return '';
  return url.split('?')[0];
};

interface WorldMapEngineProps {
  shopItems?: any[];
}

// Coordinate Display Component to prevent full Engine re-renders
const CoordinateDisplay = React.memo(({ x, y, smoothX, smoothY }: { x: number; y: number; smoothX: number; smoothY: number }) => {
  return (
    <div className="flex items-center gap-2 border-l border-slate-700 pl-4 font-mono text-cyan-400">
      X: {x} Y: {y}
    </div>
  );
});
CoordinateDisplay.displayName = 'CoordinateDisplay';

// Brush Preview Component
const BrushPreview = React.memo(({
  isSpacePressed, selectedTool, selectedTileId, customTiles, cursorCoords, smoothCursorCoords, TILE_SIZE, WORLD_SIZE, brushSize, brushMode, selectedSmartType
}: any) => {
  if (isSpacePressed || (selectedTool !== 'paint' && selectedTool !== 'erase')) return null;
  
  // If painting, we need either a tile OR a smart type active
  if (selectedTool === 'paint' && !selectedTileId && selectedSmartType === 'off') return null;
  
  const tile = selectedTool === 'paint' ? customTiles.find((t: any) => t.id === selectedTileId) : null;
  const isSnapOff = tile && !tile.snapToGrid;

  const half = brushMode ? Math.floor(brushSize / 2) : 0;
  const isEven = brushMode && brushSize % 2 === 0;
  const previewTiles = [];

  for (let dy = -half; dy < (isEven ? half : half + 1); dy++) {
    for (let dx = -half; dx < (isEven ? half : half + 1); dx++) {
      previewTiles.push({ dx, dy });
    }
  }

  const leftPos = isSnapOff 
    ? smoothCursorCoords.x + WORLD_SIZE / 2 
    : cursorCoords.x * TILE_SIZE + WORLD_SIZE / 2;
  const topPos = isSnapOff 
    ? smoothCursorCoords.y + WORLD_SIZE / 2 
    : cursorCoords.y * TILE_SIZE + WORLD_SIZE / 2;

  return (
    <div 
      className="absolute pointer-events-none z-[60]"
      style={{
        left: leftPos,
        top: topPos,
      }}
    >
      {previewTiles.map(({ dx, dy }, i) => {
        if (selectedTool === 'erase') {
          return (
            <div 
              key={i}
              className="absolute bg-red-500/30 border border-red-500/50"
              style={{
                left: dx * TILE_SIZE,
                top: dy * TILE_SIZE,
                width: TILE_SIZE,
                height: TILE_SIZE,
              }}
            />
          );
        }

        // If we're painting but have no specific tile template (e.g. pure smart brush)
        // or if we just want the green box overlay
        if (!tile && selectedSmartType !== 'off') {
           return (
            <div 
              key={i}
              className="absolute bg-green-500/30 border border-green-500/50"
              style={{
                left: dx * TILE_SIZE,
                top: dy * TILE_SIZE,
                width: TILE_SIZE,
                height: TILE_SIZE,
              }}
            />
          );
        }

        if (!tile) return null;
        const displayHeight = tile.frameHeight || TILE_SIZE;
        const displayWidth = tile.frameWidth || displayHeight;

        // If snap is off, leftPos/topPos is the mouse. We want the tile centered/bottom-aligned on it.
        // If snap is on, leftPos/topPos is grid top-left. We want the tile centered/bottom-aligned on the grid cell.
        const left = isSnapOff
          ? dx * TILE_SIZE - (displayWidth / 2)
          : dx * TILE_SIZE - (displayWidth - TILE_SIZE) / 2;
        
        const top = isSnapOff
          ? dy * TILE_SIZE - displayHeight
          : dy * TILE_SIZE - (displayHeight - TILE_SIZE);

        return (
          <div 
            key={i}
            className="absolute"
            style={{
              left,
              top,
              width: displayWidth,
              height: displayHeight,
            }}
          >
            {/* Green overlay for placement */}
            <div className="absolute inset-0 bg-green-500/20 border border-green-500/40 z-10" />
            
            <div 
              className="absolute inset-0 opacity-50"
              style={{
                backgroundImage: `url(${tile.url})`,
                backgroundSize: 'auto 100%',
                backgroundPosition: '0 0',
                backgroundRepeat: 'no-repeat',
                imageRendering: 'pixelated',
                transform: `rotate(${tile.rotation || 0}deg)`,
                transformOrigin: 'center center'
              }}
            />
          </div>
        );
      })}
    </div>
  );
});
BrushPreview.displayName = 'BrushPreview';

export const WorldMapEngine: React.FC<WorldMapEngineProps> = ({ shopItems = [] }) => {
  const transformComponentRef = useRef<ReactZoomPanPinchRef>(null);
  const dropTargetRef = useRef<HTMLDivElement>(null);
  const {
    addNode, updateNode, selectNode, selectedNodeId,
    addTileSimple, selectedTileId, customTiles, selectedTool,
    activeNodeType, removeTileAt, removeNode, batchAddTiles,
    loadTilesFromSupabase, isDraggingTile, draggingTileId,
    setDraggingTile, isDraggingNode, draggingNodeId, setDraggingNode,
    moveTile, removeTileById, rotateTile,
    isSmartMode, isRaiseMode, smartBrushLock, setSmartBrushLock, isFoamEnabled, autoTileSheetUrl, waterSheetUrl,
    selectedSmartType, setSelectedSmartType, setSelectedBlock, smartBrushLayer, setSmartBrushLayer, setRaiseMode, waterBaseTile, foamStripTile, setTool,
    sidebarWidth, setSidebarWidth, rightSidebarWidth, setRightSidebarWidth,
    favorites, setFavorite, selectTile,
    brushSize, setBrushSize, brushMode, setBrushMode,
    nodeSnapToGrid, setNodeSnapToGrid,
    isLoadingTiles, tiles, nodes, showDebugModal, setShowDebugModal, showDebugNumbers, setShowDebugNumbers, currentStamp, setCurrentStamp,
    dragGrabOffset, setDragGrabOffset, selection, setSelection
  } = useMapStore();
  
  const [isResizingLeft, setIsResizingLeft] = useState(false);
  const [isResizingRight, setIsResizingRight] = useState(false);

  // Resize Handlers for Sidebars
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (isResizingLeft) {
        const newWidth = Math.max(200, Math.min(600, e.clientX));
        setSidebarWidth(newWidth);
      }
      if (isResizingRight) {
        const newWidth = Math.max(200, Math.min(600, window.innerWidth - e.clientX));
        setRightSidebarWidth(newWidth);
      }
    };
    const handleMouseUp = () => {
      setIsResizingLeft(false);
      setIsResizingRight(false);
    };
    if (isResizingLeft || isResizingRight) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
    }
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isResizingLeft, isResizingRight, setSidebarWidth, setRightSidebarWidth]);

  const [isGenerating, setIsGenerating] = useState(false);
  const [seed, setSeed] = useState<string>(Math.random().toString(36).substring(7));
  
  // Transform State for Pixi
  const [scale, setScale] = useState(1);
  const [positionX, setPositionX] = useState(0);
  const [positionY, setPositionY] = useState(0);
  const [viewport, setViewport] = useState({ width: 1200, height: 800 }); // Reasonable default

  const [isSpacePressed, setIsSpacePressed] = useState(false);
  const [cursorCoords, setCursorCoords] = useState({ x: 0, y: 0 });
  const [smoothCursorCoords, setSmoothCursorCoords] = useState({ x: 0, y: 0 });

  // Modal State
  const [showNodeModal, setShowNodeModal] = useState(false);
  const [nodeFormData, setNodeFormData] = useState<NodeFormData | null>(null);
  const [encounters, setEncounters] = useState<any[]>([]);
  const [maps, setMaps] = useState<any[]>([]);
  const [musicTracks, setMusicTracks] = useState<any[]>([]);
  const [stockedItems, setStockedItems] = useState<any[]>([]);
  const [savingNode, setSavingNode] = useState(false);

  // Go To Coords State
  const [goToX, setGoToX] = useState('');
  const [goToY, setGoToY] = useState('');

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

  // Throttling refs for drag and brush operations
  const dragRafRef = useRef<number | null>(null);
  const pendingDragUpdateRef = useRef<{x: number, y: number} | null>(null);
  const brushRafRef = useRef<number | null>(null);
  const pendingBrushRef = useRef<{clientX: number, clientY: number, isShift: boolean} | null>(null);

  // Undo Stack State
  const [undoStack, setUndoStack] = useState<any[]>([]);

  // Zoom to Fit Logic
  const zoomToFit = useCallback((animate = true) => {
    if (!transformComponentRef.current) return;

    const allTiles = useMapStore.getState().tiles;
    const allNodes = useMapStore.getState().nodes;

    if (allTiles.length === 0 && allNodes.length === 0) {
      transformComponentRef.current.centerView(animate ? 400 : 0);
      return;
    }

    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;

    allTiles.forEach(t => {
      if (typeof t.x === 'number' && typeof t.y === 'number' && !isNaN(t.x) && !isNaN(t.y)) {
        minX = Math.min(minX, t.x);
        minY = Math.min(minY, t.y);
        maxX = Math.max(maxX, t.x);
        maxY = Math.max(maxY, t.y);
      }
    });

    allNodes.forEach(n => {
      if (typeof n.x === 'number' && typeof n.y === 'number' && !isNaN(n.x) && !isNaN(n.y)) {
        minX = Math.min(minX, n.x);
        minY = Math.min(minY, n.y);
        maxX = Math.max(maxX, n.x);
        maxY = Math.max(maxY, n.y);
      }
    });

    if (minX === Infinity || minY === Infinity) {
      transformComponentRef.current.centerView(animate ? 400 : 0);
      return;
    }

    // Padding
    minX -= 5; minY -= 5; maxX += 5; maxY += 5;

    const contentWidth = (maxX - minX + 1) * TILE_SIZE;
    const contentHeight = (maxY - minY + 1) * TILE_SIZE;

    const containerW = dropTargetRef.current?.clientWidth || viewport.width;
    const containerH = dropTargetRef.current?.clientHeight || viewport.height;

    if (containerW <= 0 || containerH <= 0) return;

    const scaleX = containerW / contentWidth;
    const scaleY = containerH / contentHeight;
    const targetScale = Math.max(0.005, Math.min(scaleX, scaleY, 0.8));

    const centerX = ((minX + maxX + 1) / 2) * TILE_SIZE + WORLD_SIZE / 2;
    const centerY = ((minY + maxY + 1) / 2) * TILE_SIZE + WORLD_SIZE / 2;

    const targetPosX = containerW / 2 - centerX * targetScale;
    const targetPosY = containerH / 2 - centerY * targetScale;

    transformComponentRef.current.setTransform(targetPosX, targetPosY, targetScale, animate ? 400 : 0, 'easeOut');
  }, [tiles.length, nodes.length]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Escape to clear selection and stamp
      if (e.key === 'Escape') {
        setSelection(null);
        setCurrentStamp(null);
        if (selectedTool === 'stamp') setTool('select');
        return;
      }
      
      // Zoom to Fit (F or 0)
      if (document.activeElement?.tagName !== 'INPUT' && document.activeElement?.tagName !== 'TEXTAREA') {
        if (e.key.toLowerCase() === 'f' || e.key === '0') {
          zoomToFit();
          return;
        }
        if (e.key.toLowerCase() === 'v') {
          setTool('select');
          return;
        }
        if (e.key.toLowerCase() === 'b' || e.key.toLowerCase() === 'p') {
          setTool('paint');
          return;
        }
        if (e.key.toLowerCase() === 'e') {
          setTool('erase');
          return;
        }
        if (e.key.toLowerCase() === 'o') {
          setTool('eyedropper');
          return;
        }
        if (e.key.toLowerCase() === 's' && !e.ctrlKey && !e.metaKey) {
          setTool('stamp');
          return;
        }
        if (e.key.toLowerCase() === 'r') {
          setTool('rotate');
          return;
        }
        if (e.key.toLowerCase() === 'd') {
          setShowDebugModal(true);
          return;
        }
      }
      // Copy (Ctrl+C)
      if ((e.ctrlKey || e.metaKey) && e.key === 'c') {
        handleCopySelection();
        return;
      }
      // Paste (Ctrl+V) - using current cursor coords
      if ((e.ctrlKey || e.metaKey) && e.key === 'v') {
        handlePasteStamp(cursorCoords.x, cursorCoords.y);
        return;
      }

      // Favorites Hotbar (1-9)
      if (e.key >= '1' && e.key <= '9') {
        const index = parseInt(e.key) - 1;
        const tileId = favorites[index];
        if (tileId) selectTile(tileId);
        return;
      }

      // Undo logic (Ctrl+Z or Cmd+Z)
      if ((e.ctrlKey || e.metaKey) && e.key === 'z') {
        e.preventDefault();
        handleUndo();
        return;
      }

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
  }, [zoomToFit, favorites, selectTile, cursorCoords.x, cursorCoords.y, setTool, undoStack]);

  const hasInitialZoomed = useRef(false);

  useEffect(() => {
    if (!isLoadingTiles && !hasInitialZoomed.current && (tiles.length > 0 || nodes.length > 0)) {
      const timer = setTimeout(() => {
        zoomToFit(false);
        hasInitialZoomed.current = true;
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [isLoadingTiles, zoomToFit, tiles.length, nodes.length]);

  useEffect(() => {
    if (dropTargetRef.current) {
      dropTargetRef.current.style.setProperty('--zoom-scale', '1');
    }
    const init = async () => {
      await loadTilesFromSupabase();
      fetchSupportData();
      fetchIconGallery();
      
      const updateViewportSize = () => {
        if (dropTargetRef.current) {
          setViewport({
            width: dropTargetRef.current.clientWidth,
            height: dropTargetRef.current.clientHeight
          });
        }
      };

      updateViewportSize();
      window.addEventListener('resize', updateViewportSize);

      return () => window.removeEventListener('resize', updateViewportSize);
    };
    init();
  }, [loadTilesFromSupabase, sidebarWidth, rightSidebarWidth]);

  useEffect(() => {
    // Initialize zoom scale for CSS
    if (dropTargetRef.current) {
      dropTargetRef.current.style.setProperty('--zoom-scale', '0.5');
    }
  }, []);

  const goToNode = useCallback((nodeId: string) => {
    selectNode(nodeId);
  
    const node = nodes.find(n => n.id === nodeId);
    if (!node || !transformComponentRef.current) {
      console.error(`[GoTo ERROR] Node ${nodeId} not found`);
      return;
    }
  
    const gridX = Number(node.x) || 0;
    const gridY = Number(node.y) || 0;
  
    const worldX = gridX * TILE_SIZE + WORLD_SIZE / 2 + TILE_SIZE / 2;
    const worldY = gridY * TILE_SIZE + WORLD_SIZE / 2 + TILE_SIZE / 2;
  
    const targetScale = 0.4;   // ←←← THIS IS WHAT YOU WANTED (wide view)
  
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        let viewportW = window.innerWidth - 440;
        let viewportH = window.innerHeight - 160;
  
        const container = dropTargetRef.current;
        if (container) {
          if (container.clientWidth > 500 && container.clientWidth < 3000) viewportW = container.clientWidth;
          if (container.clientHeight > 400 && container.clientHeight < 3000) viewportH = container.clientHeight;
        }
  
        const targetPosX = viewportW / 2 - worldX * targetScale;
        const targetPosY = viewportH / 2 - worldY * targetScale;
  
        console.log(`%c[GoTo SUCCESS] "${node.name}" → (${gridX}, ${gridY}) @ 0.5x`, 'color:#22ff88;font-weight:bold');
        console.log(`   Viewport: ${Math.round(viewportW)}×${Math.round(viewportH)}`);
  
        transformComponentRef.current!.setTransform(
          targetPosX,
          targetPosY,
          targetScale,
          320,
          'easeOut'
        );
      });
    });
  }, [nodes, selectNode]);

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

  const handleGoToCoords = () => {
  const x = Number(goToX);
  const y = Number(goToY);
  if (isNaN(x) || isNaN(y)) {
    alert('Please enter valid numbers for X and Y coordinates.');
    return;
  }

  const targetScale = 0.1;

  requestAnimationFrame(() => {
    const containerRect = dropTargetRef.current?.getBoundingClientRect();
    if (!containerRect || !transformComponentRef.current) return;

    // Calculate world pixel position manually
    const worldPixelX = x * TILE_SIZE + (WORLD_SIZE / 2) + (TILE_SIZE / 2);
    const worldPixelY = y * TILE_SIZE + (WORLD_SIZE / 2) + (TILE_SIZE / 2);

    const { positionX, positionY, scale: currentScale } = transformComponentRef.current.instance.transformState;
    const viewportCenterX = containerRect.width / 2;
    const viewportCenterY = containerRect.height / 2;

    const targetContentX = worldPixelX;
    const targetContentY = worldPixelY;

    // Easier version for coords:
    const newPositionX = (viewportCenterX) - targetContentX * targetScale;
    const newPositionY = (viewportCenterY) - targetContentY * targetScale;

    transformComponentRef.current.setTransform(newPositionX, newPositionY, targetScale, 280, 'easeOut');
  });
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

  // --- PAUL SOLT AUTO-TILING HELPERS ---
  const calculateAndUpdateTile = async (
    tx: number,
    ty: number,
    layer: number = 0,
    targetSmartType?: string,
    targetBlockCol?: number,
    targetBlockRow?: number
  ) => {
    const currentTiles = useMapStore.getState().tiles;
    const tile = currentTiles.find(t => t.x === tx && t.y === ty && (t.layer || 0) === (layer || 0));

    if (!tile || !tile.isAutoTile) return;

    // If target specs provided, only update tiles matching those specs
    if (targetSmartType !== undefined && tile.smartType !== targetSmartType) return;
    if (targetBlockCol !== undefined && tile.blockCol !== targetBlockCol) return;
    if (targetBlockRow !== undefined && tile.blockRow !== targetBlockRow) return;

    const elevation = tile.elevation || 0;

    const getBitmaskFresh = (x: number, y: number, elev: number) => {
      const has = (dx: number, dy: number) => {
        // FRESH STATE EVERY TIME — this fixes horizontal detection
        const currentTiles = useMapStore.getState().tiles;
        const n = currentTiles.find(t => t.x === x + dx && t.y === y + dy && (t.layer || 0) === (layer || 0));
        // Check smartType, elevation, AND block position (grass blocks don't connect to each other)
        return (
          n?.elevation === elev &&
          n?.smartType === tile.smartType &&
          n?.blockCol === tile.blockCol &&
          n?.blockRow === tile.blockRow
        );
      };
    
      const N = has(0, -1);
      const E = has(1, 0);
      const S = has(0, 1);
      const W = has(-1, 0);
    
      const NE = N && E && has(1, -1);
      const SE = S && E && has(1, 1);
      const SW = S && W && has(-1, 1);
      const NW = N && W && has(-1, -1);
    
      let mask = 0;
      if (N) mask |= 1;
      if (NE) mask |= 2;
      if (E) mask |= 4;
      if (SE) mask |= 8;
      if (S) mask |= 16;
      if (SW) mask |= 32;
      if (W) mask |= 64;
      if (NW) mask |= 128;
    
      // Debug (remove after testing)
      console.log(`Bitmask @ (${x},${y}): ${mask} (binary: ${mask.toString(2).padStart(8, '0')})`);
    
      return mask;
    };

    const newBitmask = getBitmaskFresh(tx, ty, elevation);
    
    let newFoamBitmask = 0;
    if (useMapStore.getState().isFoamEnabled && elevation === 1) {
       const hasFoam = (dx: number, dy: number) => {
          const n = currentTiles.find(t => t.x === tx + dx && t.y === ty + dy && (t.layer || 0) === 0);
          return (n?.elevation !== 1);
       };

       const N = hasFoam(0, -1);
       const E = hasFoam(1, 0);
       const S = hasFoam(0, 1);
       const W = hasFoam(-1, 0);
       
       const NE = N && E && hasFoam(1, -1);
       const SE = S && E && hasFoam(1, 1);
       const SW = S && W && hasFoam(-1, 1);
       const NW = N && W && hasFoam(-1, -1);

       let fmask = 0;
       if (N) fmask |= 1;
       if (NE) fmask |= 2;
       if (E) fmask |= 4;
       if (SE) fmask |= 8;
       if (S) fmask |= 16;
       if (SW) fmask |= 32;
       if (W) fmask |= 64;
       if (NW) fmask |= 128;
       newFoamBitmask = fmask;
    }

    if (tile.bitmask !== newBitmask || tile.foamBitmask !== newFoamBitmask) {
       useMapStore.setState((state) => ({
         tiles: state.tiles.map(t => 
           t.id === tile.id ? { ...t, bitmask: newBitmask, foamBitmask: newFoamBitmask } : t
         )
       }));

      addTileSimple(
        tx, ty, tile.type, tile.imageUrl, tile.isSpritesheet, 
        tile.frameCount, tile.frameWidth, tile.frameHeight, tile.animationSpeed, 
        tile.layer, tile.offsetX, tile.offsetY, tile.isWalkable, tile.snapToGrid, tile.isAutoFill,
        true, newBitmask, elevation, useMapStore.getState().isFoamEnabled, newFoamBitmask,
        tile.smartType, tile.rotation || 0,
        tile.blockCol, tile.blockRow
      );
    }
  };

  const updateTileAndNeighbors = async (
    tx: number,
    ty: number,
    layer: number = 0,
    isRemoving: boolean = false,
    smartType?: string,
    blockCol?: number,
    blockRow?: number
  ) => {
    // Standard 8-direction update for Winlu A2 Autotiling
    const neighbors = [
      { x: tx, y: ty },     // Center
      { x: tx, y: ty - 1 }, // N
      { x: tx + 1, y: ty }, // E
      { x: tx, y: ty + 1 }, // S
      { x: tx - 1, y: ty }, // W
      { x: tx + 1, y: ty - 1 }, // NE
      { x: tx + 1, y: ty + 1 }, // SE
      { x: tx - 1, y: ty + 1 }, // SW
      { x: tx - 1, y: ty - 1 }  // NW
    ];

    for (const pos of neighbors) {
      if (isRemoving && pos.x === tx && pos.y === ty) continue;

      // ONLY recalculate if the tile actually exists there AND it's an autotile!
      // If it's a manually pasted "dumb" tile (isAutoTile=false), we skip updating its math.
      const existingTile = useMapStore.getState().tiles.find(t => t.x === pos.x && t.y === pos.y && (t.layer || 0) === layer);
      if (existingTile && existingTile.isAutoTile) {
        await calculateAndUpdateTile(pos.x, pos.y, layer, existingTile.smartType, existingTile.blockCol, existingTile.blockRow);
      }
    }
  };

  const handleNodeMouseDown = (nodeId: string, e: React.MouseEvent) => {
    if (isSpacePressed) return;
    
    if (selectedTool === 'select' || selectedTool === 'node') {
      e.stopPropagation();
      const node = nodes.find(n => n.id === nodeId);
      if (node) {
        selectNode(nodeId);
        
        const { positionX, positionY, scale } = transformComponentRef.current!.instance.transformState;
        const rect = dropTargetRef.current!.getBoundingClientRect();
        const worldX = (e.clientX - rect.left - positionX) / scale;
        const worldY = (e.clientY - rect.top - positionY) / scale;
        
        const exactX = worldX - WORLD_SIZE / 2;
        const exactY = worldY - WORLD_SIZE / 2;
        
        // Node's display center is (node.x * TILE_SIZE + TILE_SIZE/2, node.y * TILE_SIZE + TILE_SIZE/2)
        // because of the absolute positioning and z-index div layout.
        const logicalX = node.x * TILE_SIZE + TILE_SIZE / 2;
        const logicalY = node.y * TILE_SIZE + TILE_SIZE / 2;
        
        setDragGrabOffset({
          x: exactX - logicalX,
          y: exactY - logicalY
        });
        
        setDraggingNode(nodeId);
      }
    } else if (selectedTool === 'erase') {
      e.stopPropagation();
      const node = nodes.find(n => n.id === nodeId);
      if (node) {
        setUndoStack(prev => [...prev, { action: 'erase_node', nodeData: node }]);
        removeNode(nodeId);
      }
    }
  };

  const [isSelecting, setIsSelecting] = useState(false);
  const [isDrawing, setIsDrawing] = useState(false);

  const getTopMostTileId = (gx: number, gy: number) => {
    const tilesAtPos = tiles.filter(t => t.x === gx && t.y === gy);
    if (tilesAtPos.length === 0) return null;
    return tilesAtPos.sort((a, b) => (b.layer || 0) - (a.layer || 0))[0].id;
  };

  const lastInteractionRef = useRef<{gx: number, gy: number, tool: string} | null>(null);

  const handleMapInteraction = async (clientX: number, clientY: number, isMove = false, isShift = false, forceErase = false, isAlt = false, buttons = 0) => {
    if (!transformComponentRef.current || !dropTargetRef.current || (isSpacePressed && !isMove)) return;
    const state = useMapStore.getState();
    const { positionX, positionY, scale } = transformComponentRef.current.instance.transformState;
    const rect = dropTargetRef.current.getBoundingClientRect();
    const worldX = (clientX - rect.left - positionX) / scale;
    const worldY = (clientY - rect.top - positionY) / scale;
    const gx = Math.floor((worldX - WORLD_SIZE / 2) / TILE_SIZE);
    const gy = Math.floor((worldY - WORLD_SIZE / 2) / TILE_SIZE);

    // Priority: Force Erase (Right Click) > Alt (Eyedropper) > Selected Tool
    const tool = forceErase ? 'erase' : (isAlt ? 'eyedropper' : selectedTool);

    // Node dragging logic - throttled with requestAnimationFrame
    if (state.isDraggingNode && state.draggingNodeId) {
      const node = state.nodes.find(n => n.id === state.draggingNodeId);
      if (node && state.dragGrabOffset) {
        const exactX = worldX - WORLD_SIZE / 2;
        const exactY = worldY - WORLD_SIZE / 2;

        let newX = (exactX - state.dragGrabOffset.x) / TILE_SIZE;
        let newY = (exactY - state.dragGrabOffset.y) / TILE_SIZE;

        if (nodeSnapToGrid) {
          // Snap to 0.5 increments to allow "lines in between" (edges/centers)
          newX = Math.round(newX * 2) / 2;
          newY = Math.round(newY * 2) / 2;
        }

        // Store pending update
        pendingDragUpdateRef.current = { x: newX, y: newY };

        // Throttle store updates with requestAnimationFrame
        if (!dragRafRef.current) {
          dragRafRef.current = requestAnimationFrame(() => {
            const pending = pendingDragUpdateRef.current;
            if (pending && (node.x !== pending.x || node.y !== pending.y)) {
              useMapStore.setState(s => ({
                nodes: s.nodes.map(n => n.id === node.id ? { ...n, x: pending.x, y: pending.y } : n)
              }));
            }
            dragRafRef.current = null;
          });
        }
      }
      return;
    }

    // Update coordinates - skip during drag operations to prevent lag
    if (!isDraggingTile && !state.isDraggingNode) {
      setSmoothCursorCoords({ x: worldX - WORLD_SIZE / 2, y: worldY - WORLD_SIZE / 2 });
      setCursorCoords({ x: gx, y: gy });
    }

    // PERFORMANCE: Skip interaction if we are moving and haven't entered a new grid cell
    // But allow continuous painting for brush mode OR if snap-to-grid is OFF for the selected tile
    if (isMove && !isDraggingTile) {
      const { brushMode: currentBrushMode, brushSize: currentBrushSize } = state;
      const isBrushMode = (tool === 'paint' || tool === 'erase') && currentBrushMode && currentBrushSize > 1;
      
      const selectedTile = tool === 'paint' ? state.customTiles.find(t => t.id === state.selectedTileId) : null;
      const isSnapOff = selectedTile && !selectedTile.snapToGrid;

      if (!isBrushMode && !isSnapOff && lastInteractionRef.current?.gx === gx && lastInteractionRef.current?.gy === gy && lastInteractionRef.current?.tool === tool) {
        return;
      }
    }
    
    if (!isMove || lastInteractionRef.current?.gx !== gx || lastInteractionRef.current?.gy !== gy || lastInteractionRef.current?.tool !== tool) {
       lastInteractionRef.current = { gx, gy, tool };
    }

    // CRITICAL: If this is a movement call and NO buttons are pressed, 
    // it's just a hover/track call. Do NOT perform any actions (paint/erase/etc).
    if (isMove && buttons === 0) return;

    if (tool === 'select') {
      return;
    }

    if (tool === 'paint') {
      const tile = customTiles.find(t => t.id === selectedTileId);
      if (tile || selectedSmartType !== 'off') {
        const activeTileLayer = tile ? tile.layer : state.layer;

        // Get current brush settings
        const { brushMode: currentBrushMode, brushSize: currentBrushSize } = state;

        // Determine brush area based on mode and size
        let brushArea = [{dx: 0, dy: 0}]; // Default: single tile

        if (currentBrushMode && currentBrushSize > 1) {
          // Brush mode enabled: use full brush area
          const half = Math.floor(currentBrushSize / 2);
          const isEven = currentBrushSize % 2 === 0;
          brushArea = [];
          for (let dy = -half; dy < (isEven ? half : half + 1); dy++) {
            for (let dx = -half; dx < (isEven ? half : half + 1); dx++) {
              brushArea.push({dx, dy});
            }
          }
        }

        const tasks = [];

        for (const {dx, dy} of brushArea) {
          const tx = gx + dx;
          const ty = gy + dy;

          let offsetX = 0;
          let offsetY = 0;

          if (tile && !tile.snapToGrid) {
            const exactX = worldX - WORLD_SIZE / 2 + (dx * TILE_SIZE);
            const exactY = worldY - WORLD_SIZE / 2 + (dy * TILE_SIZE);

            offsetX = Math.round(exactX - (tx * TILE_SIZE + TILE_SIZE / 2));
            offsetY = Math.round(exactY - (ty * TILE_SIZE + TILE_SIZE));
          }

          let isAutoTile = tile?.isAutoTile ?? false;
          let elevation = 0;
          let bitmask = 0;
          let hasFoam = isFoamEnabled;
          let foamBitmask = 0;
          let smartType = tile?.smartType;

          if (selectedSmartType !== 'off' && activeTileLayer === smartBrushLayer) {
             isAutoTile = true;
             smartType = selectedSmartType;
             if (isRaiseMode) elevation = 1;
             if (isShift) elevation = 0;
          }

          tasks.push((async () => {
            const prevTile = useMapStore.getState().tiles.find(t => t.x === tx && t.y === ty && (t.layer || 0) === (activeTileLayer || 0));

            // Only add to undo if it's the center tile or we are not moving (single click)
            if (!isMove || (dx === 0 && dy === 0)) {
              setUndoStack(prev => [...prev, {
                action: 'paint',
                x: tx,
                y: ty,
                layer: activeTileLayer || 0,
                previousTile: prevTile || null
              }]);
            }

            await addTileSimple(
              tx, ty, tile?.type || 'custom', tile?.url || '', tile?.isSpritesheet || false, tile?.frameCount || 0,
              tile?.frameWidth || 48, tile?.frameHeight || 48, tile?.animationSpeed || 0.1, activeTileLayer,
              offsetX, offsetY, tile?.isWalkable ?? true, tile?.snapToGrid ?? true, tile?.isAutoFill ?? false,
              isAutoTile, bitmask, elevation, hasFoam, foamBitmask, smartType, tile?.rotation || 0,
              state.selectedBlockCol, state.selectedBlockRow
            );

            if (isAutoTile) {
               await updateTileAndNeighbors(tx, ty, activeTileLayer || 0, false, smartType, state.selectedBlockCol, state.selectedBlockRow);
            }
          })());
        }
        await Promise.all(tasks);
      }
    } else if (tool === 'erase') {
      // Get current brush settings
      const { brushMode: currentBrushMode, brushSize: currentBrushSize } = useMapStore.getState();

      // Determine brush area based on mode and size
      let brushArea = [{dx: 0, dy: 0}]; // Default: single tile

      if (currentBrushMode && currentBrushSize > 1) {
        // Brush mode enabled: use full brush area
        const half = Math.floor(currentBrushSize / 2);
        const isEven = currentBrushSize % 2 === 0;
        brushArea = [];
        for (let dy = -half; dy < (isEven ? half : half + 1); dy++) {
          for (let dx = -half; dx < (isEven ? half : half + 1); dx++) {
            brushArea.push({dx, dy});
          }
        }
      }

      const tasks = [];

      for (const {dx, dy} of brushArea) {
        const tx = gx + dx;
        const ty = gy + dy;

        tasks.push((async () => {
          const removedTile = await removeTileAt(tx, ty, smartBrushLock);
          if (removedTile) {
            if (!isMove || (dx === 0 && dy === 0)) {
              setUndoStack(prev => [...prev, {
                action: 'erase_tile',
                x: tx,
                y: ty,
                layer: removedTile.layer || 0,
                previousTile: removedTile
              }]);
            }

            if (removedTile.isAutoTile) {
               // CRITICAL: We pass TRUE for `isRemoving` flag in the updated `updateTileAndNeighbors`
               await updateTileAndNeighbors(tx, ty, removedTile.layer || 0, true, removedTile.smartType, removedTile.blockCol, removedTile.blockRow);
            }
          }

          const n = nodes.find(node => node.x === tx && node.y === ty);
          if (n && !isMove) { // Only erase nodes on direct click, not brush drag
            setUndoStack(prev => [...prev, { action: 'erase_node', nodeData: n }]);
            removeNode(n.id);
          }
        })());
      }
      await Promise.all(tasks);
    } else if (tool === 'stamp') {
      if (currentStamp) {
        await handlePasteStamp(gx, gy);
      } else {
        if (!isMove) {
          setIsSelecting(true);
          setSelection({ start: { x: gx, y: gy }, end: { x: gx, y: gy } });
        } else if (isSelecting && selection) {
          setSelection({ ...selection, end: { x: gx, y: gy } });
        }
      }
    } else if (tool === 'eyedropper') {
      const topTile = tiles.filter(t => t.x === gx && t.y === gy)
        .sort((a, b) => (b.layer || 0) - (a.layer || 0))[0];

      if (topTile) {
        // Photoshop-style: grab the exact tile we clicked
        // and put it in the stamp tool so we can place it exactly as it is.
        // If it's a smart tile, we capture its bitmask/block/type but set isAutoTile: false.
        state.setCurrentStamp([{ 
          ...topTile, 
          id: undefined, // Let addTileSimple generate a new ID
          x: 0, 
          y: 0, 
          isAutoTile: false 
        }]);
        setTool('stamp');
        setIsDrawing(false); // CRITICAL: Stop drawing immediately after eyedropping to prevent accidental placement
        
        // Also select the template in the sidebar if possible
        const foundCustomTile = customTiles.find(ct => normalizeUrl(ct.url) === normalizeUrl(topTile.imageUrl));
        if (foundCustomTile) {
          selectTile(foundCustomTile.id);
        }
      }
    }
  };

  const handlePropMouseDown = (tileId: string, e: React.MouseEvent) => {
    if (isSpacePressed) return;

    // Middle click (button 1) = rotate 90 degrees
    if (e.button === 1) {
      e.stopPropagation();
      rotateTile(tileId, 90);
      return;
    }

    if (e.button === 2) {
      e.stopPropagation();
      const tile = tiles.find(t => t.id === tileId);
      if (tile) {
        setUndoStack(prev => [...prev, {
          action: 'erase_tile',
          x: tile.x,
          y: tile.y,
          layer: tile.layer || 0,
          previousTile: tile
        }]);
        removeTileById(tileId, smartBrushLock);
      }
      return;
    }

    if (selectedTool === 'erase') {
        // DO NOT STOP PROPAGATION HERE! 
        // We want the generic handleMapInteraction to process the grid coordinates for smooth dragging!
        return;
    } else if (selectedTool === 'select') {
      e.stopPropagation();
      const tile = tiles.find(t => t.id === tileId);
      if (tile) {
        const { positionX, positionY, scale } = transformComponentRef.current!.instance.transformState;
        const rect = dropTargetRef.current!.getBoundingClientRect();
        const worldX = (e.clientX - rect.left - positionX) / scale;
        const worldY = (e.clientY - rect.top - positionY) / scale;

        const exactX = worldX - WORLD_SIZE / 2;
        const exactY = worldY - WORLD_SIZE / 2;

        const logicalX = tile.x * TILE_SIZE + TILE_SIZE / 2;
        const logicalY = tile.y * TILE_SIZE + TILE_SIZE;

        setDragGrabOffset({
          x: exactX - (logicalX + (tile.offsetX || 0)),
          y: exactY - (logicalY + (tile.offsetY || 0))
        });

        setDraggingTile(tileId);
      }
    }
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if (isSpacePressed) return;
    if (e.button === 1) return; // Middle click drag

    setIsDrawing(true);
    const isRightClick = e.button === 2;
    
    // Determine tool and force erase
    // Right click triggers erase. To allow single-click erase, we must treat it as a click action.
    const forceErase = isRightClick; 
    const tool = forceErase ? 'erase' : selectedTool;

    // If it's a right click but we want to allow the transform-component to handle dragging,
    // we need to be careful. However, the user explicitly asked for right click to delete.
    // To allow BOTH, we can erase on mouse down, but that might interfere with drag start.
    // Usually, in editors, click = action, drag = pan.
    
    e.preventDefault();
    e.stopPropagation();

    // Rotate tool: rotate the top-most tile at click position
    if (tool === 'rotate') {
      const { positionX, positionY, scale } = transformComponentRef.current!.instance.transformState;
      const rect = dropTargetRef.current!.getBoundingClientRect();
      const worldX = (e.clientX - rect.left - positionX) / scale;
      const worldY = (e.clientY - rect.top - positionY) / scale;
      const gx = Math.floor((worldX - WORLD_SIZE / 2) / TILE_SIZE);
      const gy = Math.floor((worldY - WORLD_SIZE / 2) / TILE_SIZE);

      const topTileId = getTopMostTileId(gx, gy);
      if (topTileId) {
        e.stopPropagation();
        rotateTile(topTileId, e.shiftKey ? -90 : 90); // Shift+click = rotate counter-clockwise
      }
      return;
    }

    // Prop/Node handling
    if (tool === 'select' || tool === 'erase') {
      const { positionX, positionY, scale } = transformComponentRef.current!.instance.transformState;
      const rect = dropTargetRef.current!.getBoundingClientRect();
      const worldX = (e.clientX - rect.left - positionX) / scale;
      const worldY = (e.clientY - rect.top - positionY) / scale;
      const gx = Math.floor((worldX - WORLD_SIZE / 2) / TILE_SIZE);
      const gy = Math.floor((worldY - WORLD_SIZE / 2) / TILE_SIZE);

      const topTileId = getTopMostTileId(gx, gy);
      if (topTileId) {
        handlePropMouseDown(topTileId, e);
        if (tool === 'erase') return;
      }
    }

    if (tool !== 'select') {
      // Direct call to interaction logic
      // Use e.buttons to detect held buttons for continuous painting/erasing
      handleMapInteraction(e.clientX, e.clientY, false, e.shiftKey, forceErase, e.altKey, e.buttons || (isRightClick ? 2 : 1));
    }
  };

  const handleMouseUp = async () => {
    const state = useMapStore.getState();
    setIsDrawing(false);

    if (selectedTool === 'stamp' && isSelecting) {
      setIsSelecting(false);
      handleCopySelection(); // Auto-copy after dragging selection
      return;
    }

    if (state.isDraggingTile && state.draggingTileId) {
      const tile = state.tiles.find(t => t.id === state.draggingTileId);
      if (tile) {
        await moveTile(tile.id, tile.x, tile.y, tile.offsetX || 0, tile.offsetY || 0);
      }
      setDraggingTile(null);
      setDragGrabOffset(null);
    }

    if (state.isDraggingNode && state.draggingNodeId) {
      const node = state.nodes.find(n => n.id === state.draggingNodeId);
      if (node) {
        // Sync node position to DB
        await updateNode(node.id, { x: node.x, y: node.y });
      }
      setDraggingNode(null);
      setDragGrabOffset(null);
    }

    // Cancel any pending drag RAF updates
    if (dragRafRef.current) {
      cancelAnimationFrame(dragRafRef.current);
      dragRafRef.current = null;
    }
    pendingDragUpdateRef.current = null;

    // Cancel any pending brush RAF updates
    if (brushRafRef.current) {
      cancelAnimationFrame(brushRafRef.current);
      brushRafRef.current = null;
    }
    pendingBrushRef.current = null;
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    const nodeType = e.dataTransfer.getData('nodeType') as NodeType;

    if (!nodeType || !activeNodeType) return;

    const rect = dropTargetRef.current!.getBoundingClientRect();
    const worldX = (e.clientX - rect.left - positionX) / scale;
    const worldY = (e.clientY - rect.top - positionY) / scale;

    // Use grid coordinates if snapping to grid (with 0.5 precision), otherwise use world coordinates
    const nodeX = nodeSnapToGrid ? Math.round(((worldX - WORLD_SIZE / 2) / TILE_SIZE) * 2) / 2 : (worldX - WORLD_SIZE / 2) / TILE_SIZE;
    const nodeY = nodeSnapToGrid ? Math.round(((worldY - WORLD_SIZE / 2) / TILE_SIZE) * 2) / 2 : (worldY - WORLD_SIZE / 2) / TILE_SIZE;

    // Check for existing node at this position (with some tolerance)
    const tolerance = 0.1; 
    const exists = nodes.find(n =>
      Math.abs(n.x - nodeX) < tolerance && Math.abs(n.y - nodeY) < tolerance
    );

    if (!exists) {
      setUndoStack(prev => [...prev, { action: 'node_add', x: nodeX, y: nodeY }]);
      addNode({ x: nodeX, y: nodeY, type: nodeType, name: `New ${nodeType}`, iconUrl: '' });
    }
  };

  const handleCopySelection = () => {
    const state = useMapStore.getState();
    if (!state.selection) return;

    const startX = Math.min(state.selection.start.x, state.selection.end.x);
    const endX = Math.max(state.selection.start.x, state.selection.end.x);
    const startY = Math.min(state.selection.start.y, state.selection.end.y);
    const endY = Math.max(state.selection.start.y, state.selection.end.y);

    const capturedTiles = state.tiles.filter(t => 
      t.x >= startX && t.x <= endX && t.y >= startY && t.y <= endY
    ).map(t => ({ 
       ...t, 
       x: t.x - startX, 
       y: t.y - startY,
       isAutoTile: false // CRITICAL: Stop smart math on pasted tiles right from the source!
    })); 

    state.setCurrentStamp(capturedTiles);
    state.setSelection(null);
  };

  const handlePasteStamp = async (gx: number, gy: number) => {
    const state = useMapStore.getState();
    if (!state.currentStamp) return;

    // Paste them as dumb tiles, turning off autoTile flags so they don't trigger updates
    const newTiles = state.currentStamp.map(t => {
      const { id, ...rest } = t;
      return {
        ...rest,
        x: gx + t.x,
        y: gy + t.y,
        isAutoTile: false // Enforce dumbness on paste
      };
    });

    await state.batchAddTiles(newTiles);
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isSpacePressed) return;
    
    // Throttle move interaction to prevent lag
    // Stamp tool always needs move interaction for selection dragging/preview
    const { brushMode: currentBrushMode } = useMapStore.getState();
    const isPaintOrErase = selectedTool === 'paint' || selectedTool === 'erase';

    if (isDrawing && e.buttons > 0 && (!isPaintOrErase || currentBrushMode)) {
      e.stopPropagation();
      // Throttle brush operations to prevent lag
      pendingBrushRef.current = { 
        clientX: e.clientX, 
        clientY: e.clientY, 
        isShift: e.shiftKey,
        isAlt: e.altKey,
        buttons: e.buttons
      };

      if (!brushRafRef.current) {
        brushRafRef.current = requestAnimationFrame(() => {
          if (pendingBrushRef.current) {
            const isRightClick = pendingBrushRef.current.buttons === 2 || pendingBrushRef.current.buttons === 3;
            handleMapInteraction(
              pendingBrushRef.current.clientX,
              pendingBrushRef.current.clientY,
              true,
              pendingBrushRef.current.isShift,
              isRightClick,
              pendingBrushRef.current.isAlt,
              pendingBrushRef.current.buttons
            );
          }
          brushRafRef.current = null;
        });
      }
    } else {
      // Just track coords when hovering
      handleMapInteraction(e.clientX, e.clientY, true, e.shiftKey, false, e.altKey, e.buttons);
    }
  };

  const handleUndo = async () => {
    if (undoStack.length === 0) return;
    
    const lastAction = undoStack[undoStack.length - 1];
    setUndoStack(prev => prev.slice(0, -1));

    const { action, x, y, layer, previousTile, nodeData, previousFullTiles } = lastAction;

    if (action === 'autofill' && previousFullTiles) {
      useMapStore.setState({ tiles: previousFullTiles });
      
      const chunkCoords = new Set<string>();
      const GRID_RADIUS = 30; 
      for (let x = -GRID_RADIUS; x <= GRID_RADIUS; x++) {
        for (let y = -GRID_RADIUS; y <= GRID_RADIUS; y++) {
          chunkCoords.add(`${Math.floor(x / 16)},${Math.floor(y / 16)}`);
        }
      }

        for (const coord of chunkCoords) {
          const [cx, cy] = coord.split(',').map(Number);
          const chunkTiles = previousFullTiles.filter((t: any) => Math.floor(t.x / 16) === cx && Math.floor(t.y / 16) === cy);
          
          supabase.from('map_chunks').upsert({
            chunk_x: cx,
            chunk_y: cy,
            tile_data: chunkTiles.map((t: any) => {
              const { id, ...rest } = t;
              return rest;
            }),
            updated_at: new Date().toISOString()
          }, { onConflict: 'chunk_x,chunk_y' }).then(({ error }) => {
            if (error) console.error("Error reverting chunk during undo", error);
          });
        }
      
      alert("Autofill undone and synced to database.");
      return;
    }

    if (action === 'paint') {
      if (previousTile) {
        await addTileSimple(
          x, y, previousTile.type, previousTile.imageUrl, 
          previousTile.isSpritesheet, previousTile.frameCount, 
          previousTile.frameWidth, previousTile.frameHeight, 
          previousTile.animationSpeed, previousTile.layer,
          previousTile.offsetX, previousTile.offsetY,
          previousTile.isWalkable,
          previousTile.snapToGrid,
          previousTile.isAutoFill,
          previousTile.isAutoTile,
          previousTile.bitmask,
          previousTile.elevation,
          previousTile.hasFoam,
          previousTile.foamBitmask,
          previousTile.smartType,
          previousTile.rotation || 0
        );
      } else {
        const chunkX = Math.floor(x / 16); 
        const chunkY = Math.floor(y / 16);
        useMapStore.setState((state) => ({
          tiles: state.tiles.filter(t => !(t.x === x && t.y === y && (t.layer || 0) === layer))
        }));
        
        const { data: existingChunk } = await supabase.from('map_chunks').select('tile_data').eq('chunk_x', chunkX).eq('chunk_y', chunkY).maybeSingle();
        if (existingChunk?.tile_data) {
          const newTileData = existingChunk.tile_data.filter((t: any) => !(t.x === x && t.y === y && (t.layer || 0) === layer));
          await supabase.from('map_chunks').upsert({ chunk_x: chunkX, chunk_y: chunkY, tile_data: newTileData, updated_at: new Date().toISOString() }, { onConflict: 'chunk_x,chunk_y' });
        }
      }
    } else if (action === 'erase_tile') {
      if (previousTile) {
        await addTileSimple(
          x, y, previousTile.type, previousTile.imageUrl, 
          previousTile.isSpritesheet, previousTile.frameCount, 
          previousTile.frameWidth, previousTile.frameHeight, 
          previousTile.animationSpeed, previousTile.layer,
          previousTile.offsetX, previousTile.offsetY,
          previousTile.isWalkable,
          previousTile.snapToGrid,
          previousTile.isAutoFill,
          previousTile.isAutoTile,
          previousTile.bitmask,
          previousTile.elevation,
          previousTile.hasFoam,
          previousTile.foamBitmask,
          previousTile.smartType,
          previousTile.rotation || 0
        );
      }
    } else if (action === 'node_add') {
      const n = useMapStore.getState().nodes.find(node => node.x === x && node.y === y);
      if (n) await removeNode(n.id);
    } else if (action === 'erase_node') {
      if (nodeData) {
        await addNode({
          x: nodeData.x,
          y: nodeData.y,
          type: nodeData.type,
          name: nodeData.name,
          iconUrl: nodeData.iconUrl,
          properties: nodeData.properties
        });
      }
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
        
        const snapshotBefore = useMapStore.getState().tiles;
        setUndoStack(prev => [...prev, {
          action: 'autofill',
          previousFullTiles: snapshotBefore
        }]);

        const autoFillTiles = customTiles.filter(t => t.isAutoFill !== false);
        
        const waterTiles = autoFillTiles.filter(t => (t.layer ?? 0) < 0 || t.category === 'water_base');
        const groundTiles = autoFillTiles.filter(t => (t.layer ?? 0) === 0 && t.category !== 'water_base' && t.category !== 'foam_strip');
        const roadTiles = autoFillTiles.filter(t => (t.layer ?? 0) === 1 || t.category === 'road');
        const propTiles = autoFillTiles.filter(t => (t.layer ?? 0) >= 2 || t.category === 'prop');

        const tilesByType: Record<string, typeof groundTiles> = {
          water: waterTiles,
          grassland: groundTiles.filter(t => t.type === 'grassland' || t.name.toLowerCase().includes('grass')),
          hill: groundTiles.filter(t => t.type === 'hill' || t.name.toLowerCase().includes('hill')),
          soil: groundTiles.filter(t => t.type === 'soil' || t.name.toLowerCase().includes('soil') || t.name.toLowerCase().includes('dirt')),
        };

        const getTileForType = (type: string) => {
          const candidates = tilesByType[type];
          if (candidates && candidates.length > 0) return candidates[Math.floor(Math.random() * candidates.length)];
          
          if (type === 'water') {
             if (waterTiles.length > 0) return waterTiles[Math.floor(Math.random() * waterTiles.length)];
          } else {
             if (groundTiles.length > 0) return groundTiles[Math.floor(Math.random() * groundTiles.length)];
          }
          
          return groundTiles[Math.floor(Math.random() * groundTiles.length)] || waterTiles[0] || autoFillTiles[0];
        };

        if (autoFillTiles.length === 0) {
          alert("No tiles have 'Auto-Fill' enabled!");
          return;
        }

        const currentTiles = useMapStore.getState().tiles;

        for (let x = -GRID_RADIUS; x <= GRID_RADIUS; x++) {
          for (let y = -GRID_RADIUS; y <= GRID_RADIUS; y++) {
            const elevation = noise2D(x / 12, y / 12);
            let tileType = 'grassland';
            let targetLayer = 0;

            if (elevation < -0.3) {
              tileType = 'water';
              targetLayer = -1;
            } else if (elevation > 0.6) {
              tileType = 'hill';
            } else if (elevation <= 0.1) {
              tileType = 'soil';
            }
            
            const groundExists = currentTiles.some(t => t.x === x && t.y === y && (t.layer || 0) === targetLayer);
            if (!groundExists) {
              const selectedTile = getTileForType(tileType);
              if (selectedTile) {
                newTiles.push({ 
                  x, 
                  y, 
                  imageUrl: selectedTile.url, 
                  type: (selectedTile.type || tileType) as any,
                  isSpritesheet: selectedTile.isSpritesheet,
                  frameCount: selectedTile.frameCount,
                  frameWidth: selectedTile.frameWidth,
                  frameHeight: selectedTile.frameHeight,
                  animationSpeed: selectedTile.animationSpeed,
                  isWalkable: selectedTile.isWalkable,
                  layer: targetLayer,
                  snapToGrid: selectedTile.snapToGrid,
                  isAutoFill: selectedTile.isAutoFill,
                  isAutoTile: selectedTile.isAutoTile,
                  rotation: selectedTile.rotation || 0
                });
              }
            }

            if (propTiles.length > 0 && tileType !== 'water') {
              const propExists = currentTiles.some(t => t.x === x && t.y === y && (t.layer || 0) >= 2);
              if (!propExists && Math.random() < 0.08) {
                let validProps = propTiles;
                
                if (tileType === 'grassland') {
                  const foliage = propTiles.filter(p => p.name.toLowerCase().includes('tree') || p.name.toLowerCase().includes('bush') || p.name.toLowerCase().includes('flower'));
                  if (foliage.length > 0) validProps = foliage;
                } else if (tileType === 'soil' || tileType === 'hill') {
                  const rocks = propTiles.filter(p => p.name.toLowerCase().includes('rock') || p.name.toLowerCase().includes('stone'));
                  if (rocks.length > 0) validProps = rocks;
                }

                const selectedProp = validProps[Math.floor(Math.random() * validProps.length)];
                
                if (selectedProp) {
                  let propOffsetX = 0;
                  let propOffsetY = 0;
                  if (!selectedProp.snapToGrid) {
                    propOffsetX = Math.floor(Math.random() * 24) - 12;
                    propOffsetY = Math.floor(Math.random() * 24) - 12;
                  }

                  newTiles.push({
                    x,
                    y,
                    imageUrl: selectedProp.url,
                    type: 'object',
                    isSpritesheet: selectedProp.isSpritesheet,
                    frameCount: selectedProp.frameCount,
                    frameWidth: selectedProp.frameWidth,
                    frameHeight: selectedProp.frameHeight,
                    animationSpeed: selectedProp.animationSpeed,
                    layer: selectedProp.layer || 2,
                    offsetX: propOffsetX,
                    offsetY: propOffsetY,
                    isWalkable: selectedProp.isWalkable ?? false,
                    snapToGrid: selectedProp.snapToGrid ?? false,
                    isAutoFill: selectedProp.isAutoFill,
                    isAutoTile: selectedProp.isAutoTile,
                    rotation: selectedProp.rotation || 0
                  });
                }
              }
            }
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

  useEffect(() => {
    const incrementTick = useTickStore.getState().incrementTick;
    const interval = setInterval(() => {
      incrementTick();
    }, 100); // 10 ticks per second
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="flex w-full h-full bg-[#0a0a0a] overflow-hidden font-mono text-slate-300">
      <MapSidebar onEditNode={handleEditNodeProperties} onGoToNode={goToNode} />
      
      {/* Resizer Left */}
      <div 
        onMouseDown={(e) => { e.preventDefault(); setIsResizingLeft(true); }}
        className={`w-1 z-30 cursor-col-resize hover:bg-cyan-500/50 transition-colors ${isResizingLeft ? 'bg-cyan-500' : 'bg-slate-800'}`}
      />

      <div className="flex-1 relative flex flex-col min-w-0">
        {/* Toolbar */}
        <div className="absolute top-4 left-4 right-4 z-10 flex justify-between items-center pointer-events-none">
          <div className="flex gap-1.5 items-center pointer-events-auto max-w-[calc(100%-40px)] flex-wrap">
            <div className="bg-slate-900/95 backdrop-blur-md border border-slate-700/50 rounded-xl p-1 flex gap-0.5 shadow-2xl">
              <button onClick={() => transformComponentRef.current?.zoomIn()} className="p-2 hover:bg-slate-800 rounded-lg text-slate-300 hover:text-cyan-400 transition-all"><Plus size={16} /></button>
              <button onClick={() => transformComponentRef.current?.zoomOut()} className="p-2 hover:bg-slate-800 rounded-lg text-slate-300 hover:text-cyan-400 transition-all"><Minus size={16} /></button>
              <button onClick={() => zoomToFit()} className="p-2 hover:bg-slate-800 rounded-lg text-slate-300 hover:text-cyan-400 transition-all" title="Zoom to Fit (F)"><Maximize size={16} /></button>
            </div>
            
            <div className="flex items-center gap-1.5 bg-slate-900/95 backdrop-blur-md border border-slate-700/50 rounded-xl p-1 shadow-2xl">
              <input type="text" value={seed} onChange={(e) => setSeed(e.target.value)} className="w-16 bg-black/50 border border-slate-700 rounded px-1.5 py-1 text-[9px] text-cyan-400 outline-none font-bold text-center" />
              <button onClick={handleAutoFill} disabled={isGenerating} className="bg-cyan-600 hover:bg-cyan-500 text-white px-2.5 py-1.5 rounded-lg text-[10px] font-black flex items-center gap-1.5 uppercase tracking-tighter shadow-lg shadow-cyan-900/20">
                {isGenerating ? <Loader2 className="animate-spin" size={12} /> : <Globe size={12} />} Fill
              </button>
              {undoStack.length > 0 && undoStack[undoStack.length - 1].action === 'autofill' && (
                <button 
                  onClick={handleUndo} 
                  className="bg-red-600 hover:bg-red-500 text-white px-2 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-tighter shadow-lg"
                >
                  Undo
                </button>
              )}
            </div>

            <div className="bg-slate-900/95 backdrop-blur-md border border-slate-700/50 rounded-xl p-1 flex gap-0.5 shadow-2xl items-center">
              <button onClick={() => setTool('select')} className={`p-1.5 rounded-lg transition-all ${selectedTool === 'select' ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/40' : 'text-slate-400 hover:bg-slate-800'}`} title="Select Tool (V)">
                <MousePointer2 size={18} />
              </button>
              <button onClick={() => setTool('paint')} className={`p-1.5 rounded-lg transition-all ${selectedTool === 'paint' ? 'bg-green-600 text-white shadow-lg shadow-green-900/40' : 'text-slate-400 hover:bg-slate-800'}`} title="Paint Tool (B)">
                <Paintbrush size={18} />
              </button>
              
              {(selectedTool === 'paint' || selectedTool === 'erase') && (
                <div className="flex items-center gap-1.5 px-1.5 border-l border-slate-700/50">
                    <button
                      onClick={() => setBrushMode(!brushMode)}
                      className={`px-1.5 py-1 rounded text-[9px] font-black transition-all flex items-center gap-1 ${brushMode ? 'bg-purple-600 text-white' : 'bg-slate-800 text-slate-500 hover:bg-slate-700'}`}
                      title="Toggle Brush Mode (Shift)"
                    >
                      <Square size={10} />
                      BRUSH
                    </button>
                    {brushMode && (
                      <div className="flex gap-0.5">
                        {[1, 3, 5, 10].map(size => (
                          <button
                            key={size}
                            onClick={() => setBrushSize(size)}
                            className={`w-5 h-5 rounded flex items-center justify-center text-[9px] font-bold transition-all ${brushSize === size ? 'bg-cyan-600 text-white' : 'bg-slate-800 text-slate-500 hover:bg-slate-700'}`}
                          >
                            {size === 10 ? '10' : size}
                          </button>
                        ))}
                      </div>
                    )}
                </div>
              )}
              
              <div className="h-6 w-px bg-slate-700 mx-0.5" />
              
              <WinluPalette compact />

              <div className="h-6 w-px bg-slate-700 mx-0.5" />

              <div className="flex gap-0.5 px-0.5">
                <button
                  onClick={() => setSelectedSmartType(selectedSmartType === 'off' ? 'grass' : 'off')}
                  className={`p-1.5 rounded-lg transition-all flex items-center gap-1 ${selectedSmartType !== 'off' ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/40' : 'text-slate-400 hover:bg-slate-800'}`}
                  title="Toggle Smart Brush (Z)"
                >
                  <Zap size={16} className={selectedSmartType !== 'off' ? "fill-white" : ""} />
                </button>
                {selectedSmartType !== 'off' && (
                  <div className="flex items-center gap-0.5 bg-slate-800/50 rounded-lg p-0.5 border border-slate-700/50">
                      <button 
                          onClick={() => setSmartBrushLayer(smartBrushLayer - 1)}
                          className="p-1 rounded text-slate-400 hover:bg-slate-700 hover:text-white transition-colors"
                          title="Lower Layer"
                      >
                          <Minus size={10} />
                      </button>
                      <span className="text-[10px] font-bold w-6 text-center text-cyan-400" title={`Current Layer: ${smartBrushLayer}`}>
                          L{smartBrushLayer}
                      </span>
                      <button 
                          onClick={() => setSmartBrushLayer(smartBrushLayer + 1)}
                          className="p-1 rounded text-slate-400 hover:bg-slate-700 hover:text-white transition-colors"
                          title="Raise Layer"
                      >
                          <Plus size={10} />
                      </button>
                  </div>
                )}
                <button
                  onClick={() => setSmartBrushLock(!smartBrushLock)}
                  className={`p-1.5 rounded-lg transition-all flex items-center gap-1 ${smartBrushLock ? 'bg-red-600/20 text-red-400 border border-red-500/50' : 'text-slate-400 hover:bg-slate-800'}`}
                  title="Lock Smart Tiles"
                >
                  {smartBrushLock ? <Lock size={16} /> : <Unlock size={16} />}
                </button>
                <button
                  onClick={() => setRaiseMode(!isRaiseMode)}
                  className={`p-1.5 rounded-lg transition-all flex items-center gap-1 ${isRaiseMode ? 'bg-amber-600 text-white shadow-lg shadow-amber-900/40' : 'text-slate-400 hover:bg-slate-800'}`}
                  title="Toggle Raise Mode (R)"
                >
                  <Box size={16} />
                </button>
                <button
                  onClick={() => setShowDebugNumbers(!showDebugNumbers)}
                  className={`p-1.5 rounded-lg transition-all flex items-center gap-1 ${showDebugNumbers ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-900/40' : 'text-slate-400 hover:bg-slate-800'}`}
                  title="Debug Numbers"
                >
                  <span className="text-[10px] font-black">#</span>
                </button>
                <button
                  onClick={() => setShowDebugModal(true)}
                  className="p-1.5 rounded-lg transition-all text-slate-400 hover:bg-slate-800"
                  title="Open Debugger (D)"
                >
                  <Bug size={16} />
                </button>
              </div>

              <div className="h-6 w-px bg-slate-700 mx-0.5" />

              <div className="flex gap-0.5 px-0.5">
                <button onClick={() => setTool('erase')} className={`p-1.5 rounded-lg transition-all ${selectedTool === 'erase' ? 'bg-red-600 text-white shadow-lg shadow-red-900/40' : 'text-slate-400 hover:bg-slate-800'}`} title="Eraser Tool (E)">
                  <Eraser size={18} />
                </button>
                <button onClick={() => setTool('eyedropper')} className={`p-1.5 rounded-lg transition-all ${selectedTool === 'eyedropper' ? 'bg-orange-500 text-white shadow-lg shadow-orange-900/40' : 'text-slate-400 hover:bg-slate-800'}`} title="Eyedropper Tool (Alt + Click)">
                  <Pipette size={18} />
                </button>
                <button onClick={() => setTool('stamp')} className={`p-1.5 rounded-lg transition-all ${selectedTool === 'stamp' ? 'bg-purple-600 text-white shadow-lg shadow-purple-900/40' : 'text-slate-400 hover:bg-slate-800'}`} title="Stamp Tool (S)">
                  <Copy size={18} />
                </button>
                {(currentStamp || selection) && (
                  <button 
                    onClick={() => {
                      setCurrentStamp(null);
                      setSelection(null);
                      if (selectedTool === 'stamp') setTool('select');
                    }}
                    className="p-1.5 rounded-lg text-red-400 hover:bg-red-900/30 transition-all border border-red-900/30"
                    title="Clear Selection/Stamp (Esc)"
                  >
                    <XCircle size={18} />
                  </button>
                )}
                <button onClick={() => setTool('rotate')} className={`p-1.5 rounded-lg transition-all ${selectedTool === 'rotate' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-900/40' : 'text-slate-400 hover:bg-slate-800'}`} title="Rotate Tool (R)">
                  <RotateCw size={18} />
                </button>
              </div>
            </div>
          </div>

          <div className={`px-2 py-1 rounded-lg border text-[9px] font-black uppercase flex items-center gap-3 transition-all pointer-events-auto ${isSpacePressed ? 'bg-green-900/30 border-green-500 text-green-400' : 'bg-slate-900/90 border-slate-800 text-slate-500 shadow-2xl'}`}>
            <div className="flex items-center gap-1.5">
              <div className={`w-1.5 h-1.5 rounded-full ${isSpacePressed ? 'bg-green-500 animate-pulse' : 'bg-slate-700'}`} />
              {isSpacePressed ? 'Pan' : 'Space: Pan'}
            </div>
            
            {/* SMART BRUSH INDICATOR */}
            {selectedSmartType !== 'off' && (
              <div className="flex items-center gap-1.5 border-l border-slate-700 pl-3 text-purple-400">
                <Wand2 size={10} className="animate-pulse" />
                <span>{selectedSmartType.toUpperCase()}</span>
                <span className="text-[8px] bg-slate-800 px-1 py-0.5 rounded border border-slate-600">L{smartBrushLayer}</span>
                {isRaiseMode && <span className="bg-purple-900/50 px-1 rounded text-[7px] border border-purple-500/50">RAISE</span>}
              </div>
            )}

            <CoordinateDisplay 
              x={cursorCoords.x} 
              y={cursorCoords.y} 
              smoothX={smoothCursorCoords.x} 
              smoothY={smoothCursorCoords.y} 
            />
          </div>
        </div>

        {/* Viewport */}
        <div className={`flex-1 bg-[#6b705c] relative overflow-hidden ${isSpacePressed || isDraggingTile || isDraggingNode ? 'cursor-grabbing' : 'cursor-crosshair'}`} ref={dropTargetRef}>
          
              {/* Layer 1: The stationary Pixi Canvas (Internal container handles the panning) */}
          <div className="absolute inset-0 z-0 pointer-events-none">
            <PixiMapCanvas 
              width={viewport.width} 
              height={viewport.height} 
              worldSize={WORLD_SIZE}
              transform={{ x: positionX, y: positionY, scale }} 
              onPropMouseDown={handlePropMouseDown}
              onNodeMouseDown={handleNodeMouseDown}
              waterBaseTile={waterBaseTile()}
              foamStripTile={foamStripTile()}
              showDebugNumbers={showDebugNumbers}
              nodes={nodes}
              cursorCoords={cursorCoords}
              selectedTool={selectedTool}
              isSpacePressed={isSpacePressed}
              brushMode={brushMode}
              brushSize={brushSize}
              selectedTileId={selectedTileId}
              customTiles={customTiles}
            />
          </div>

          <TransformWrapper 
            ref={transformComponentRef} 
            initialScale={0.5} 
            minScale={0.001} 
            maxScale={10} 
            centerOnInit={false}
            initialPositionX={-(WORLD_SIZE / 2 * 0.5) + (viewport.width / 2)}
            initialPositionY={-(WORLD_SIZE / 2 * 0.5) + (viewport.height / 2)}
            onTransformed={(p) => {
              setScale(p.state.scale);
              setPositionX(p.state.positionX);
              setPositionY(p.state.positionY);
              
              if (dropTargetRef.current) {
                dropTargetRef.current.style.setProperty('--zoom-scale', p.state.scale.toString());
              }
            }}
            limitToBounds={false} 
            wheel={{ step: 0.2 }} 
            doubleClick={{ disabled: true }}
            panning={{ 
              disabled: !isSpacePressed && (selectedTool !== 'select' || isDraggingTile),
              velocityDisabled: true // Prevent "flinging" feel
            }}
          >
            <TransformComponent wrapperClass="w-full h-full">
              <div
                className="map-canvas-container"
                style={{
                  width: WORLD_SIZE,
                  height: WORLD_SIZE,
                  position: 'relative',
                  backgroundColor: 'transparent', // IMPORTANT: Transparent so Pixi shows through
                }}
                onMouseDown={handleMouseDown}
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUp}
                onMouseLeave={handleMouseUp}
                onContextMenu={(e) => e.preventDefault()}
                onDrop={handleDrop}
                onDragOver={(e) => e.preventDefault()}
                onDragEnter={(e) => e.preventDefault()}
              >
                
                {/* Layer 2: Grid Highlight */}
                {!isSpacePressed && (selectedTool === 'paint' || selectedTool === 'erase') && (
                  (() => {
                    const selTile = customTiles.find(t => t.id === selectedTileId);
                    const h = selTile?.frameHeight || TILE_SIZE;
                    const w = selTile?.frameWidth || h;
                    
                    return (
                      <div 
                        className="absolute pointer-events-none" 
                        style={{
                          left: (selTile?.snapToGrid !== false ? cursorCoords.x * TILE_SIZE : smoothCursorCoords.x - w / 2) + WORLD_SIZE / 2,
                          top: (selTile?.snapToGrid !== false ? cursorCoords.y * TILE_SIZE : smoothCursorCoords.y - h / 2) + WORLD_SIZE / 2,
                          width: w,
                          height: h,
                          backgroundColor: 'rgba(56, 189, 248, 0.2)', 
                          border: '1px solid rgba(56, 189, 248, 0.7)',
                          zIndex: 60,
                          opacity: 0.5 + Math.sin(Date.now() / 150) * 0.3
                        }}
                      />
                    );
                  })()
                )}

      <div 
        onMouseDown={(e) => { e.preventDefault(); setIsResizingRight(true); }}
        className={`w-1 z-30 cursor-col-resize hover:bg-cyan-500/50 transition-colors ${isResizingRight ? 'bg-cyan-500' : 'bg-slate-800'}`}
      />

      <MapDataSidebar onEditNode={handleEditNodeProperties} onGoToNode={goToNode} />
                {nodes.map(node => (
                  <div
                    key={node.id}
                    onMouseDown={(e) => handleNodeMouseDown(node.id, e)}
                    onDoubleClick={() => handleEditNodeProperties(node.id)}
                    className={`absolute z-50 flex items-center justify-center rounded-full transition-transform transform-gpu ${selectedNodeId === node.id ? 'ring-4 ring-cyan-400 ring-offset-2 ring-offset-slate-900 shadow-2xl' : 'shadow-lg'}`}
                    style={{
                      left: node.x * TILE_SIZE + WORLD_SIZE / 2,
                      top: node.y * TILE_SIZE + WORLD_SIZE / 2,
                      width: TILE_SIZE,
                      height: TILE_SIZE,
                      cursor: isSpacePressed ? 'grabbing' : (selectedTool === 'select' || selectedTool === 'node' ? 'pointer' : 'crosshair'),
                    }}
                  >
                    <div className="absolute inset-0 bg-slate-800/80 rounded-full border-2 border-slate-600" />
                    {node.iconUrl ? (
                      <img src={node.iconUrl} alt={node.name} className="w-3/5 h-3/5 object-contain" style={{ imageRendering: 'pixelated' }} />
                    ) : (
                      <div className="text-white">
                        {node.type === 'spawn' && <Target size={20} />}
                        {node.type === 'enemy' && <Sword size={20} />}
                        {node.type === 'npc' && <User size={20} />}
                        {node.type === 'loot' && <Box size={20} />}
                        {node.type === 'poi' && <MapIcon size={20} />}
                      </div>
                    )}
                  </div>
                ))}
                
                {/* Layer 4: Brush and Selection Previews */}
                <BrushPreview 
                  isSpacePressed={isSpacePressed} 
                  selectedTool={selectedTool} 
                  selectedTileId={selectedTileId} 
                  customTiles={customTiles}
                  cursorCoords={cursorCoords}
                  smoothCursorCoords={smoothCursorCoords}
                  TILE_SIZE={TILE_SIZE}
                  WORLD_SIZE={WORLD_SIZE}
                  brushSize={brushSize}
                  brushMode={brushMode}
                  selectedSmartType={selectedSmartType}
                />
                
                {/* Stamp Tool Preview */}
                {selectedTool === 'stamp' && currentStamp && !isSpacePressed && (
                   <div 
                      className="absolute pointer-events-none z-[70] opacity-60"
                      style={{
                        left: cursorCoords.x * TILE_SIZE + WORLD_SIZE / 2,
                        top: cursorCoords.y * TILE_SIZE + WORLD_SIZE / 2,
                      }}
                   >
                     {currentStamp.map(tile => {
                       const customTile = customTiles.find(ct => normalizeUrl(ct.url) === normalizeUrl(tile.imageUrl));
                       if (!customTile) return null;
                       
                       const displayWidth = customTile.frameWidth || TILE_SIZE;
                       const displayHeight = customTile.frameHeight || TILE_SIZE;
                       
                       return (
                         <div key={`${tile.x}-${tile.y}`}
                           className="absolute"
                           style={{
                             left: tile.x * TILE_SIZE,
                             top: tile.y * TILE_SIZE,
                             width: displayWidth,
                             height: displayHeight,
                             backgroundImage: `url(${customTile.url})`,
                             backgroundSize: 'cover',
                             imageRendering: 'pixelated'
                           }}
                         />
                       );
                     })}
                   </div>
                )}


                {/* High-Visibility Black Grid Overlay */}
                <div 
                  className="absolute inset-0 pointer-events-none"
                  style={{
                    zIndex: 50,
                    backgroundImage: `
                      linear-gradient(to right, rgba(0,0,0,0.1) calc(1px / var(--zoom-scale, 1)), transparent calc(1px / var(--zoom-scale, 1))),
                      linear-gradient(to bottom, rgba(0,0,0,0.1) calc(1px / var(--zoom-scale, 1)), transparent calc(1px / var(--zoom-scale, 1))),
                      linear-gradient(to right, rgba(0,0,0,0.25) calc(1px / var(--zoom-scale, 1)), transparent calc(1px / var(--zoom-scale, 1))),
                      linear-gradient(to bottom, rgba(0,0,0,0.25) calc(1px / var(--zoom-scale, 1)), transparent calc(1px / var(--zoom-scale, 1)))
                    `,
                    backgroundSize: `${TILE_SIZE}px ${TILE_SIZE}px, ${TILE_SIZE}px ${TILE_SIZE}px, ${TILE_SIZE * 10}px ${TILE_SIZE * 10}px, ${TILE_SIZE * 10}px ${TILE_SIZE * 10}px`,
                  backgroundPosition: `${WORLD_SIZE / 2}px ${WORLD_SIZE / 2}px`
                }}
              />
              </div>
            </TransformComponent>
          </TransformWrapper>
        </div>

        {/* Hotbar */}
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 z-20 flex gap-2 p-2 bg-slate-900/90 backdrop-blur-md border border-slate-700/50 rounded-2xl shadow-2xl">
          {favorites.map((tileId, idx) => {
            const tile = customTiles.find(t => t.id === tileId);
            return (
              <button 
                key={idx}
                onClick={() => tileId && selectTile(tileId)}
                onContextMenu={(e) => {
                  e.preventDefault();
                  if (selectedTileId) setFavorite(idx, selectedTileId);
                }}
                className={`w-12 h-12 rounded-xl border-2 flex flex-col items-center justify-center relative transition-all group ${tileId ? 'bg-slate-800 border-slate-600 hover:border-cyan-400' : 'bg-slate-950 border-slate-800 border-dashed hover:border-slate-600'}`}
              >
                {tile ? (
                  <div 
                    className="w-8 h-8"
                    style={{
                      backgroundImage: `url(${tile.url})`,
                      backgroundSize: tile.isSpritesheet && tile.frameCount ? `${tile.frameCount * 100}% 100%` : 'contain',
                      backgroundPosition: 'center',
                      backgroundRepeat: 'no-repeat',
                      imageRendering: 'pixelated'
                    }}
                  />
                ) : (
                  <span className="text-[10px] text-slate-700 font-bold">{idx + 1}</span>
                )}
                <div className="absolute -top-2 -right-2 w-4 h-4 bg-slate-800 rounded-full border border-slate-600 flex items-center justify-center text-[8px] font-bold text-slate-400">
                  {idx + 1}
                </div>
                {!tileId && <Plus size={10} className="absolute inset-0 m-auto text-slate-800 opacity-0 group-hover:opacity-100" />}
              </button>
            );
          })}
        </div>
      </div>

      <div 
        onMouseDown={(e) => { e.preventDefault(); setIsResizingRight(true); }}
        className={`w-1 z-30 cursor-col-resize hover:bg-cyan-500/50 transition-colors ${isResizingRight ? 'bg-cyan-500' : 'bg-slate-800'}`}
      />

      <MapDataSidebar onEditNode={handleEditNodeProperties} onGoToNode={goToNode} />

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

      {showDebugModal && (
        <DebugOverlay
          winluSheetUrl={autoTileSheetUrl}
          waterSheetUrl={waterSheetUrl}
          onClose={() => setShowDebugModal(false)}
        />
      )}

      {/* Hidden Upload Inputs */}
      <input type="file" ref={dialogueExpressionInputRef} className="hidden" accept="image/*" onChange={handleUploadDialogueExpression} />
      <input type="file" ref={dialogueVoiceLineInputRef} className="hidden" accept="audio/*" onChange={handleUploadDialogueVoiceLine} />
    </div>
  );
};
