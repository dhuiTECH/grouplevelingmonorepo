'use client';
import React, { useRef } from 'react';
import { useMapStore, NodeType, CustomTile } from '@/lib/store/mapStore';
import { WinluPalette } from './WinluPalette';
import { v4 as uuidv4 } from 'uuid';
import { supabase } from '@/lib/supabase';
import { Reorder, useDragControls } from 'framer-motion';
import { 
  Target, Map as MapIcon, User, Sword, Box, Trash2, Save, Upload, 
  Image as ImageIcon, Plus, Eraser, MousePointer2, Settings, Maximize, 
  XCircle, Loader2, Zap, ChevronDown, AlertTriangle, Eye, EyeOff, Lock, Unlock, Pin,
  Grid, GripVertical
} from 'lucide-react';

interface MapSidebarProps {
  onEditNode?: (nodeId: string) => void;
  onGoToNode?: (nodeId: string) => void;
}

const getImageDimensions = (file: File): Promise<{ width: number; height: number }> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        resolve({ width: img.width, height: img.height });
      };
      img.onerror = () => reject(new Error('Failed to load image'));
      img.src = e.target?.result as string;
    };
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsDataURL(file);
  });
};

export const MapSidebar: React.FC<MapSidebarProps> = React.memo(({ onEditNode, onGoToNode }) => {
  const { 
    tiles, nodes, selectedNodeId, updateNode, removeNode, customTiles, addCustomTile, removeCustomTile, 
    selectedTileId, selectTile, setTool, selectedTool, activeNodeType, exportMap, updateCustomTile,
    isSmartMode, setSmartMode, isRaiseMode, setRaiseMode, isFoamEnabled, setFoamEnabled,
    autoTileSheetUrl, setAutoTileSheetUrl, 
    selectedSmartType, setSelectedSmartType, dirtSheetUrl, setDirtSheetUrl,
    waterSheetUrl, setWaterSheetUrl,
    selectedWaterBaseId, setSelectedWaterBaseId, selectedFoamStripId, setSelectedFoamStripId,
    waterBaseTile, foamStripTile, sidebarWidth, layerSettings, setLayerVisibility, setLayerLocked,
    favorites, setFavorite, loadTilesFromSupabase, forceSyncAllChunks
  } = useMapStore();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const roadInputRef = useRef<HTMLInputElement>(null);
  const propInputRef = useRef<HTMLInputElement>(null);
  const structureInputRef = useRef<HTMLInputElement>(null);
  const mountainInputRef = useRef<HTMLInputElement>(null);
  const bigStructureInputRef = useRef<HTMLInputElement>(null);
  const autoTileInputRef = useRef<HTMLInputElement>(null);
  const dirtInputRef = useRef<HTMLInputElement>(null);
  const waterInputRef = useRef<HTMLInputElement>(null);
  const waterBaseUploadRef = useRef<HTMLInputElement>(null);
  const foamStripUploadRef = useRef<HTMLInputElement>(null);
  
  const [isDragging, setIsDragging] = React.useState(false);
  const [uploadingTiles, setUploadingTiles] = React.useState(false);
  const selectedNode = nodes.find(n => n.id === selectedNodeId);
  const selectedCustomTile = customTiles.find(t => t.id === selectedTileId);

  const currentlyEditedTile = selectedCustomTile || 
    (selectedWaterBaseId && waterBaseTile()?.id === selectedTileId ? waterBaseTile() : undefined) ||
    (selectedFoamStripId && foamStripTile()?.id === selectedTileId ? foamStripTile() : undefined);

  const [activeTab, setActiveTab] = React.useState<'water' | 'ground' | 'road' | 'prop' | 'structure' | 'mountain' | 'big_structure'>('ground');

  const { reorderCustomTiles } = useMapStore();

  const filteredTiles = React.useMemo(() => {
    return customTiles.filter(t => {
      if (activeTab === 'water') return t.category === 'water_base' || t.category === 'foam_strip';
      if (activeTab === 'ground') return t.category === 'tile' || (!t.category && (t.layer || 0) === 0);
      if (activeTab === 'road') return t.category === 'road' || (!t.category && (t.layer || 0) === 1);
      if (activeTab === 'structure') return t.category === 'structure';
      if (activeTab === 'mountain') return t.category === 'mountain';
      if (activeTab === 'big_structure') return t.category === 'big_structure';
      return t.category === 'prop' || (!t.category && (t.layer || 0) >= 2);
    });
  }, [customTiles, activeTab]);

  const handleReorder = (newFilteredOrder: CustomTile[]) => {
    // We need to merge the reordered filtered tiles back into the full customTiles array
    // maintaining the relative order of non-filtered tiles.
    const newFullOrder = [...customTiles];
    
    // Find indices of currently filtered tiles in the full array
    const filteredIds = new Set(filteredTiles.map(t => t.id));
    let filteredIdx = 0;
    
    for (let i = 0; i < newFullOrder.length; i++) {
      if (filteredIds.has(newFullOrder[i].id)) {
        newFullOrder[i] = newFilteredOrder[filteredIdx++];
      }
    }
    
    reorderCustomTiles(newFullOrder);
  };

  const handleUploadAsset = async (file: File, prefix: string) => {
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
      console.error('Upload failed:', e.message);
      return null;
    }
  };

  const handleAutoTileSheetUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const publicUrl = await handleUploadAsset(file, 'tiles/auto');
    if (publicUrl) {
      await setAutoTileSheetUrl(publicUrl);
    }
    if (autoTileInputRef.current) autoTileInputRef.current.value = '';
  };

  const handleDirtSheetUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const publicUrl = await handleUploadAsset(file, 'tiles/auto');
    if (publicUrl) {
      await setDirtSheetUrl(publicUrl);
    }
    if (dirtInputRef.current) dirtInputRef.current.value = '';
  };

  const handleWaterSheetUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const publicUrl = await handleUploadAsset(file, 'tiles/auto');
    if (publicUrl) {
      await setWaterSheetUrl(publicUrl);
    }
    if (waterInputRef.current) waterInputRef.current.value = '';
  };

  const processFiles = async (files: FileList | File[], category: 'tile' | 'prop' | 'road' | 'water_base' | 'foam_strip' | 'structure' | 'mountain' | 'big_structure' = 'tile') => {
    setUploadingTiles(true);
    const fileArray = Array.from(files);
    
    for (const file of fileArray) {
      if (!file.type.includes('png')) continue;

      try {
        const dimensions = await getImageDimensions(file);
        const publicUrl = await handleUploadAsset(file, 'tiles');
        if (publicUrl) {
          let type = 'grassland';
          const name = file.name.toLowerCase();
          if (name.includes('water') && category !== 'water_base' && category !== 'foam_strip') type = 'water';
          else if (category === 'road' || name.includes('road') || name.includes('path')) type = 'road';
          else if (name.includes('hill')) type = 'hill';
          else if (name.includes('soil') || name.includes('dirt')) type = 'soil';

          let layer = 0;
          if (category === 'water_base' || category === 'foam_strip') layer = -1;
          else if (category === 'road') layer = 1;
          else if (category === 'prop' || category === 'structure' || category === 'mountain' || category === 'big_structure') layer = 2;

          const newTile = {
            id: uuidv4(),
            url: publicUrl,
            name: file.name,
            type,
            layer,
            isWalkable: true,
            isAutoFill: false,
            isSpritesheet: false,
            frameCount: 1,
            frameWidth: dimensions.width,
            frameHeight: dimensions.height,
            animationSpeed: 0.8,
            category,
            isAutoTile: false,
            snapToGrid: true,
            rotation: 0
          };
          await addCustomTile(newTile);

          if (category === 'water_base') setSelectedWaterBaseId(newTile.id);
          else if (category === 'foam_strip') setSelectedFoamStripId(newTile.id);
        }
      } catch (err) {
        console.error(`Error processing ${file.name}:`, err);
      }
    }
    setUploadingTiles(false);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>, category: 'tile' | 'prop' | 'road' | 'water_base' | 'foam_strip' | 'structure' | 'mountain' | 'big_structure' = 'tile') => {
    if (e.target.files && e.target.files.length > 0) {
      processFiles(e.target.files, category);
    }
    if (fileInputRef.current) fileInputRef.current.value = '';
    if (roadInputRef.current) roadInputRef.current.value = '';
    if (propInputRef.current) propInputRef.current.value = '';
    if (structureInputRef.current) structureInputRef.current.value = '';
    if (mountainInputRef.current) mountainInputRef.current.value = '';
    if (bigStructureInputRef.current) bigStructureInputRef.current.value = '';
    if (waterBaseUploadRef.current) waterBaseUploadRef.current.value = '';
    if (foamStripUploadRef.current) foamStripUploadRef.current.value = '';
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      let category: 'tile' | 'road' | 'prop' | 'water_base' | 'structure' | 'mountain' | 'big_structure' = 'tile';
      if (activeTab === 'road') category = 'road';
      else if (activeTab === 'prop') category = 'prop';
      else if (activeTab === 'water') category = 'water_base';
      else if (activeTab === 'structure') category = 'structure';
      else if (activeTab === 'mountain') category = 'mountain';
      else if (activeTab === 'big_structure') category = 'big_structure';
      processFiles(e.dataTransfer.files, category);
    }
  };

  const handleExport = async () => {
    await forceSyncAllChunks();
    const json = exportMap();
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `map-export-${Date.now()}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const waterTiles = customTiles.filter(t => t.category === 'water_base');
  const foamTiles = customTiles.filter(t => t.category === 'foam_strip');

  const [reorderMode, setReorderMode] = React.useState(false);

  return (
    <div 
      style={{ width: sidebarWidth }}
      className="bg-slate-900 border-r border-slate-800 flex flex-col h-full z-20 shrink-0"
    >
      <div className="p-4 border-b border-slate-800 flex justify-between items-center">
        <h2 className="text-sm font-bold text-slate-100 uppercase tracking-widest">World Editor</h2>
        <div className="flex gap-2">
          <button 
            onClick={() => setReorderMode(!reorderMode)} 
            className={`p-1.5 rounded border transition-colors ${reorderMode ? 'bg-orange-600 border-orange-500 text-white' : 'bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700'}`}
            title="Toggle Reorder Mode (Drag to Sort Tiles)"
          >
            <GripVertical size={14} />
          </button>
          <button onClick={handleExport} className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded border border-slate-700 transition-colors" title="Export Map">
            <Save size={14} />
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto custom-scrollbar">
        {/* 1. Tilesets Section */}
        <div className="p-4 border-b border-slate-800">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-xs font-bold text-slate-400 uppercase">Tilesets</h3>
            <div className="flex gap-1">
              <button 
                onClick={() => {
                  if (activeTab === 'ground') fileInputRef.current?.click();
                  else if (activeTab === 'road') roadInputRef.current?.click();
                  else if (activeTab === 'structure') structureInputRef.current?.click();
                  else if (activeTab === 'mountain') mountainInputRef.current?.click();
                  else if (activeTab === 'big_structure') bigStructureInputRef.current?.click();
                  else propInputRef.current?.click();
                }} 
                disabled={uploadingTiles}
                className="text-[10px] bg-slate-800 hover:bg-slate-700 text-slate-300 px-2 py-1 rounded border border-slate-700 flex items-center gap-1 disabled:opacity-50 transition-all"
              >
                {uploadingTiles ? <Loader2 className="animate-spin" size={10} /> : <Plus size={10} />} ADD TILE
              </button>
              <input type="file" ref={fileInputRef} className="hidden" accept="image/png" multiple onChange={(e) => handleFileUpload(e, 'tile')} />
              <input type="file" ref={roadInputRef} className="hidden" accept="image/png" multiple onChange={(e) => handleFileUpload(e, 'road')} />
              <input type="file" ref={propInputRef} className="hidden" accept="image/png" multiple onChange={(e) => handleFileUpload(e, 'prop')} />
              <input type="file" ref={structureInputRef} className="hidden" accept="image/png" multiple onChange={(e) => handleFileUpload(e, 'structure')} />
              <input type="file" ref={mountainInputRef} className="hidden" accept="image/png" multiple onChange={(e) => handleFileUpload(e, 'mountain')} />
              <input type="file" ref={bigStructureInputRef} className="hidden" accept="image/png" multiple onChange={(e) => handleFileUpload(e, 'big_structure')} />
            </div>
          </div>
          
          <div className="flex bg-slate-950 rounded border border-slate-800 p-1 mb-3 overflow-x-auto custom-scrollbar no-scrollbar">
            {['water', 'ground', 'road', 'prop', 'structure', 'big_structure', 'mountain'].map((tab) => (
              <button 
                key={tab}
                onClick={() => setActiveTab(tab as any)}
                className={`flex-none px-3 py-1.5 rounded text-[10px] font-bold transition-all ${activeTab === tab ? 'bg-slate-800 text-white shadow-sm ring-1 ring-slate-700' : 'text-slate-500 hover:text-slate-300'}`}
              >
                {tab === 'big_structure' ? 'BIG STRUCT' : tab.toUpperCase()}
              </button>
            ))}
          </div>

          {activeTab === 'water' && (
            <div className="mb-4 bg-slate-950/30 p-2 rounded border border-slate-800 space-y-3">
              <div className="pt-2">
                 <div className="flex items-center justify-between mb-2">
                    <label className="text-[9px] font-bold text-cyan-500 uppercase tracking-wider">Water System</label>
                    <button 
                      onClick={() => setFoamEnabled(!isFoamEnabled)}
                      className={`text-[8px] px-1.5 py-0.5 rounded font-bold uppercase tracking-wide transition-all ${isFoamEnabled ? 'bg-cyan-900/50 text-cyan-400 border border-cyan-500/50 shadow-[0_0_8px_rgba(6,182,212,0.3)]' : 'bg-slate-800 text-slate-500 border border-slate-700'}`}
                    >
                      {isFoamEnabled ? 'Foam: ON' : 'Foam: OFF'}
                    </button>
                 </div>
                 
                 <div className="grid grid-cols-2 gap-2">
                    {[
                      { label: 'Base', id: selectedWaterBaseId, setId: setSelectedWaterBaseId, tiles: waterTiles, ref: waterBaseUploadRef, cat: 'water_base' },
                      { label: 'Foam Strip', id: selectedFoamStripId, setId: setSelectedFoamStripId, tiles: foamTiles, ref: foamStripUploadRef, cat: 'foam_strip' }
                    ].map((item) => (
                      <div key={item.label}>
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-[8px] text-slate-500 font-bold uppercase">{item.label}</span>
                          <button onClick={() => item.ref.current?.click()} className="text-[8px] bg-slate-800 hover:bg-slate-700 text-slate-300 px-1.5 py-0.5 rounded border border-slate-700 transition-colors">LOAD</button>
                        </div>
                        <select 
                          value={item.id || ''}
                          onChange={(e) => item.setId(e.target.value || null)}
                          className="w-full bg-slate-950 border border-slate-700 text-[10px] text-slate-300 rounded px-1 py-0.5 outline-none focus:border-blue-500 mb-2"
                        >
                          <option value="">None</option>
                          {item.tiles.map(tile => <option key={tile.id} value={tile.id}>{tile.name}</option>)}
                        </select>
                        <input type="file" ref={item.ref} className="hidden" accept="image/png" onChange={(e) => handleFileUpload(e, item.cat as any)} />
                      </div>
                    ))}
                 </div>
               </div>
            </div>
          )}

          <div 
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            className={`transition-all duration-200 rounded-lg p-2 ${isDragging ? 'bg-blue-600/20 ring-2 ring-blue-500 ring-dashed' : ''}`}
          >
            {filteredTiles.length === 0 ? (
              <div className="text-center py-6 border-2 border-dashed border-slate-800 rounded bg-slate-900/50 flex flex-col items-center justify-center">
                <Upload size={24} className={`mb-2 transition-colors ${isDragging ? 'text-blue-400 animate-bounce' : 'text-slate-600'}`} />
                <p className="text-[10px] text-slate-500 font-bold uppercase tracking-tight">
                  {isDragging ? 'Drop to Upload' : `Drop ${activeTab.toUpperCase()} PNGs`}
                </p>
              </div>
            ) : reorderMode ? (
              <Reorder.Group 
                axis="y" 
                values={filteredTiles} 
                onReorder={handleReorder}
                className="space-y-1"
              >
                {filteredTiles.map(tile => (
                  <Reorder.Item 
                    key={tile.id} 
                    value={tile}
                    className="relative group flex items-center gap-2 p-1.5 bg-slate-950 border border-slate-800 rounded hover:border-orange-500/50 transition-colors"
                  >
                    <div className="shrink-0 cursor-grab active:cursor-grabbing text-slate-600 hover:text-orange-400">
                      <GripVertical size={14} />
                    </div>
                    
                    <div 
                      className="w-8 h-8 shrink-0 bg-black border border-slate-800 rounded overflow-hidden"
                    >
                      <div 
                        className="w-full h-full"
                        style={{
                          backgroundImage: `url(${tile.url})`,
                          backgroundSize: tile.isSpritesheet && tile.frameCount ? `${tile.frameCount * 100}% 100%` : 'contain',
                          backgroundPosition: 'center',
                          backgroundRepeat: 'no-repeat',
                          imageRendering: 'pixelated'
                        }}
                      />
                    </div>

                    <div className="flex-1 min-w-0">
                      <p className="text-[9px] font-bold text-slate-400 truncate uppercase tracking-tighter">
                        {tile.name.replace('.png', '').substring(0, 15)}
                      </p>
                    </div>

                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                       <button onClick={(e) => { e.stopPropagation(); removeCustomTile(tile.id); }} className="p-1 bg-red-600/20 text-red-500 hover:bg-red-600 hover:text-white rounded transition-all">
                        <Trash2 size={10} />
                      </button>
                    </div>
                  </Reorder.Item>
                ))}
              </Reorder.Group>
            ) : (
              <div className="grid grid-cols-4 gap-2">
                {filteredTiles.map(tile => (
                  <div key={tile.id} className="relative group">
                    <button onClick={() => selectTile(selectedTileId === tile.id ? null : tile.id)} className={`w-full aspect-square bg-slate-950 border rounded overflow-hidden transition-all flex items-center justify-center ${selectedTileId === tile.id ? 'border-green-500 ring-1 ring-green-500/50 scale-95 shadow-inner' : 'border-slate-700 hover:border-slate-500'}`}>
                      <div 
                        className="w-full h-full"
                        style={{
                          backgroundImage: `url(${tile.url})`,
                          backgroundSize: tile.isSpritesheet && tile.frameCount ? `${tile.frameCount * 100}% 100%` : 'contain',
                          backgroundPosition: 'center',
                          backgroundRepeat: 'no-repeat',
                          imageRendering: 'pixelated'
                        }}
                      />
                      {selectedTileId === tile.id && <div className="absolute inset-0 bg-green-500/20 pointer-events-none" />}
                    </button>
                    <button onClick={(e) => { e.stopPropagation(); const firstEmpty = favorites.findIndex(f => f === null); setFavorite(firstEmpty !== -1 ? firstEmpty : 0, tile.id); }} className="absolute -top-1 -left-1 bg-slate-800 text-slate-400 rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity z-10 hover:text-cyan-400 shadow-lg border border-slate-700">
                      <Pin size={10} />
                    </button>
                    <button onClick={(e) => { e.stopPropagation(); removeCustomTile(tile.id); }} className="absolute -top-1 -right-1 bg-red-600 text-white rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity z-10 hover:bg-red-500 shadow-lg">
                      <XCircle size={12} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* 2. Layer Manager Section (Moved below Tilesets) */}
        <div className="p-4 border-b border-slate-800 bg-slate-950/20">
          <h3 className="text-xs font-bold text-slate-400 uppercase mb-3 flex items-center gap-2">
            <Grid size={12} /> Layers
          </h3>
          <div className="space-y-1">
            {Array.from(new Set([-1, 0, 1, 2, ...customTiles.map(t => t.layer || 0)])).sort((a, b) => a - b).map(layerId => (
              <div key={layerId} className="flex items-center justify-between p-2 rounded bg-slate-900/50 border border-slate-800/50">
                <span className="text-[10px] font-bold text-slate-300 uppercase tracking-tight">
                  {layerId < 0 ? `Water (${layerId})` : layerId === 0 ? 'Ground (0)' : layerId === 1 ? 'Road (1)' : `Prop (${layerId})`}
                </span>
                <div className="flex gap-1">
                  <button onClick={() => setLayerVisibility(layerId, !!layerSettings[layerId]?.hidden)} className={`p-1 rounded ${!layerSettings[layerId]?.hidden ? 'text-cyan-400' : 'text-slate-600'}`}>
                    {!layerSettings[layerId]?.hidden ? <Eye size={14} /> : <EyeOff size={14} />}
                  </button>
                  <button onClick={() => setLayerLocked(layerId, !layerSettings[layerId]?.locked)} className={`p-1 rounded ${layerSettings[layerId]?.locked ? 'text-amber-500' : 'text-slate-600'}`}>
                    {layerSettings[layerId]?.locked ? <Lock size={14} /> : <Unlock size={14} />}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* 3. Tile Properties Section */}
        {currentlyEditedTile && (
          <div className="p-4 border-b border-slate-800 bg-slate-900/30 space-y-2">
            <div className="text-[10px] text-green-400 font-mono flex items-center gap-1 mb-2">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div> TILE PROPERTIES
            </div>
            <div className="grid grid-cols-2 gap-x-4 gap-y-2">
              <div className="flex flex-col gap-1">
                <label className="text-[9px] text-slate-500 uppercase font-bold">Category</label>
                <select value={currentlyEditedTile.category || 'tile'} onChange={(e) => updateCustomTile(currentlyEditedTile.id, { category: e.target.value as any })} className="bg-slate-950 border border-slate-700 text-[10px] text-slate-300 rounded px-1 py-1">
                  <option value="tile">Ground</option><option value="road">Road</option><option value="prop">Prop</option><option value="water_base">Water</option><option value="foam_strip">Foam</option><option value="structure">Structure</option><option value="mountain">Mountain</option><option value="big_structure">Big Structure</option>
                </select>
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-[9px] text-slate-500 uppercase font-bold">Biome</label>
                <select value={currentlyEditedTile.type || 'grassland'} onChange={(e) => updateCustomTile(currentlyEditedTile.id, { type: e.target.value })} className="bg-slate-950 border border-slate-700 text-[10px] text-slate-300 rounded px-1 py-1">
                  <option value="grassland">Grass</option><option value="water">Water</option><option value="road">Road</option><option value="hill">Hill</option><option value="soil">Soil</option>
                </select>
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-[9px] text-slate-500 uppercase font-bold">Layer</label>
                <input type="number" value={currentlyEditedTile.layer ?? 0} onChange={(e) => updateCustomTile(currentlyEditedTile.id, { layer: parseInt(e.target.value) || 0 })} className="bg-slate-950 border border-slate-700 text-[10px] text-cyan-400 rounded px-1 py-1 font-bold text-center" />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-[9px] text-slate-500 uppercase font-bold">Rotation</label>
                <input type="number" value={currentlyEditedTile.rotation || 0} onChange={(e) => updateCustomTile(currentlyEditedTile.id, { rotation: parseInt(e.target.value) || 0 })} className="bg-slate-950 border border-slate-700 text-[10px] text-cyan-400 rounded px-1 py-1 font-bold text-center" />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-[9px] text-slate-500 uppercase font-bold">Width</label>
                <input type="number" value={currentlyEditedTile.frameWidth || 48} onChange={(e) => updateCustomTile(currentlyEditedTile.id, { frameWidth: parseInt(e.target.value) || 48 })} className="bg-slate-950 border border-slate-700 text-[10px] text-cyan-400 rounded px-1 py-1 font-bold text-center" />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-[9px] text-slate-500 uppercase font-bold">Height</label>
                <input type="number" value={currentlyEditedTile.frameHeight || 48} onChange={(e) => updateCustomTile(currentlyEditedTile.id, { frameHeight: parseInt(e.target.value) || 48 })} className="bg-slate-950 border border-slate-700 text-[10px] text-cyan-400 rounded px-1 py-1 font-bold text-center" />
              </div>
            </div>
            {/* Toggles Grid */}
            <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-800/50">
              <div className="flex items-center justify-between bg-slate-950/30 p-1.5 rounded border border-slate-800/50">
                <label className="text-[8px] text-slate-500 uppercase font-bold">Snap Grid</label>
                <button 
                  onClick={() => updateCustomTile(currentlyEditedTile.id, { snapToGrid: !currentlyEditedTile.snapToGrid })}
                  className={`px-1.5 py-0.5 rounded text-[8px] font-bold ${currentlyEditedTile.snapToGrid ? 'bg-blue-900/50 text-blue-400 border border-blue-500/30' : 'bg-slate-800 text-slate-600'}`}
                >
                  {currentlyEditedTile.snapToGrid ? 'ON' : 'OFF'}
                </button>
              </div>
              <div className="flex items-center justify-between bg-slate-950/30 p-1.5 rounded border border-slate-800/50">
                <label className="text-[8px] text-slate-500 uppercase font-bold">Walkable</label>
                <button 
                  onClick={() => updateCustomTile(currentlyEditedTile.id, { isWalkable: !currentlyEditedTile.isWalkable })}
                  className={`px-1.5 py-0.5 rounded text-[8px] font-bold ${currentlyEditedTile.isWalkable ? 'bg-green-900/50 text-green-400 border border-green-500/30' : 'bg-slate-800 text-slate-600'}`}
                >
                  {currentlyEditedTile.isWalkable ? 'YES' : 'NO'}
                </button>
              </div>
              <div className="flex items-center justify-between bg-slate-950/30 p-1.5 rounded border border-slate-800/50">
                <label className="text-[8px] text-slate-500 uppercase font-bold">AutoFill</label>
                <button 
                  onClick={() => updateCustomTile(currentlyEditedTile.id, { isAutoFill: !currentlyEditedTile.isAutoFill })}
                  className={`px-1.5 py-0.5 rounded text-[8px] font-bold ${currentlyEditedTile.isAutoFill ? 'bg-purple-900/50 text-purple-400 border border-purple-500/30' : 'bg-slate-800 text-slate-600'}`}
                >
                  {currentlyEditedTile.isAutoFill ? 'ON' : 'OFF'}
                </button>
              </div>
              <div className="flex items-center justify-between bg-slate-950/30 p-1.5 rounded border border-slate-800/50">
                <label className="text-[8px] text-slate-500 uppercase font-bold">AutoTile</label>
                <button 
                  onClick={() => updateCustomTile(currentlyEditedTile.id, { isAutoTile: !currentlyEditedTile.isAutoTile })}
                  className={`px-1.5 py-0.5 rounded text-[8px] font-bold ${currentlyEditedTile.isAutoTile ? 'bg-cyan-900/50 text-cyan-400 border border-cyan-500/30' : 'bg-slate-800 text-slate-600'}`}
                >
                  {currentlyEditedTile.isAutoTile ? 'ON' : 'OFF'}
                </button>
              </div>
            </div>

            {/* Advanced (Spritesheet) */}
            <div className="pt-2 border-t border-slate-800/50 flex items-center justify-between">
              <label className="text-[9px] text-slate-500 uppercase font-bold italic">Spritesheet</label>
              <button onClick={() => updateCustomTile(currentlyEditedTile.id, { isSpritesheet: !currentlyEditedTile.isSpritesheet, frameCount: currentlyEditedTile.isSpritesheet ? 1 : 4 })} className={`text-[9px] px-2 py-0.5 rounded font-bold ${currentlyEditedTile.isSpritesheet ? 'bg-cyan-900/50 text-cyan-400' : 'bg-slate-800 text-slate-600'}`}>
                {currentlyEditedTile.isSpritesheet ? 'ON' : 'OFF'}
              </button>
            </div>
            
            {currentlyEditedTile.isSpritesheet && (
              <div className="grid grid-cols-2 gap-2 mt-2 bg-slate-950/50 p-2 rounded border border-slate-800">
                <div className="flex flex-col gap-1">
                  <label className="text-[8px] text-slate-500 font-bold">Frames</label>
                  <input 
                    type="number" 
                    value={currentlyEditedTile.frameCount || 1} 
                    onChange={(e) => updateCustomTile(currentlyEditedTile.id, { frameCount: parseInt(e.target.value) || 1 })}
                    className="bg-slate-900 border border-slate-700 text-[9px] text-cyan-400 rounded px-1 py-0.5 text-center"
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-[8px] text-slate-500 font-bold">Speed</label>
                  <input 
                    type="number" 
                    step="0.1"
                    value={currentlyEditedTile.animationSpeed || 0.8} 
                    onChange={(e) => updateCustomTile(currentlyEditedTile.id, { animationSpeed: parseFloat(e.target.value) || 0.8 })}
                    className="bg-slate-900 border border-slate-700 text-[9px] text-cyan-400 rounded px-1 py-0.5 text-center"
                  />
                </div>
              </div>
            )}
          </div>
        )}
      </div>
      
      {/* 4. Sheet Uploaders (Pinned to bottom, as requested) */}
      <div className="border-t border-slate-800 bg-slate-950/40 p-4 space-y-4 shrink-0">
        <div className="space-y-3">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Grass Sheet (9x9)</label>
              <button onClick={() => autoTileInputRef.current?.click()} className="text-[9px] bg-slate-800 hover:bg-slate-700 text-slate-300 px-2 py-0.5 rounded border border-slate-700 font-bold transition-colors">LOAD</button>
              <input type="file" ref={autoTileInputRef} className="hidden" accept="image/png" onChange={handleAutoTileSheetUpload} />
            </div>
            {autoTileSheetUrl ? (
              <div className="relative h-10 bg-slate-950 rounded border border-slate-800 overflow-hidden group">
                 <img src={autoTileSheetUrl} className="w-full h-full object-cover opacity-60 group-hover:opacity-100 transition-opacity" alt="Grass" />
                 <button onClick={() => setAutoTileSheetUrl(null)} className="absolute top-1 right-1 bg-red-600 text-white rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity"><XCircle size={10} /></button>
              </div>
            ) : (
              <div onClick={() => autoTileInputRef.current?.click()} className="h-10 bg-slate-900/30 rounded border border-dashed border-slate-800 flex items-center justify-center cursor-pointer">
                <span className="text-[9px] text-slate-700 font-black uppercase">No Grass Sheet</span>
              </div>
            )}
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Dirt Sheet</label>
              <button onClick={() => dirtInputRef.current?.click()} className="text-[9px] bg-slate-800 hover:bg-slate-700 text-slate-300 px-2 py-0.5 rounded border border-slate-700 font-bold transition-colors">LOAD</button>
              <input type="file" ref={dirtInputRef} className="hidden" accept="image/png" onChange={handleDirtSheetUpload} />
            </div>
            {dirtSheetUrl ? (
              <div className="relative h-10 bg-slate-950 rounded border border-slate-800 overflow-hidden group">
                 <img src={dirtSheetUrl} className="w-full h-full object-cover opacity-60 group-hover:opacity-100 transition-opacity" alt="Dirt" />
                 <button onClick={() => setDirtSheetUrl(null)} className="absolute top-1 right-1 bg-red-600 text-white rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity"><XCircle size={10} /></button>
              </div>
            ) : (
              <div onClick={() => dirtInputRef.current?.click()} className="h-10 bg-slate-900/30 rounded border border-dashed border-slate-800 flex items-center justify-center cursor-pointer">
                <span className="text-[9px] text-slate-700 font-black uppercase">No Dirt Sheet</span>
              </div>
            )}
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Water Sheet</label>
              <button onClick={() => waterInputRef.current?.click()} className="text-[9px] bg-slate-800 hover:bg-slate-700 text-slate-300 px-2 py-0.5 rounded border border-slate-700 font-bold transition-colors">LOAD</button>
              <input type="file" ref={waterInputRef} className="hidden" accept="image/png" onChange={handleWaterSheetUpload} />
            </div>
            {waterSheetUrl ? (
              <div className="relative h-10 bg-slate-950 rounded border border-slate-800 overflow-hidden group">
                 <img src={waterSheetUrl} className="w-full h-full object-cover opacity-60 group-hover:opacity-100 transition-opacity" alt="Water" />
                 <button onClick={() => setWaterSheetUrl(null)} className="absolute top-1 right-1 bg-red-600 text-white rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity"><XCircle size={10} /></button>
              </div>
            ) : (
              <div onClick={() => waterInputRef.current?.click()} className="h-10 bg-slate-900/30 rounded border border-dashed border-slate-800 flex items-center justify-center cursor-pointer">
                <span className="text-[9px] text-slate-700 font-black uppercase">No Water Sheet</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Import/Export buttons */}
      <div className="p-4 border-t border-slate-800 bg-slate-900 shrink-0">
         <div className="flex gap-2">
            <button className="flex-1 bg-slate-800 hover:bg-slate-700 text-slate-300 text-[10px] font-bold py-2 rounded flex items-center justify-center gap-2 border border-slate-700"><Upload size={12} /> IMPORT</button>
            <button onClick={handleExport} className="flex-1 bg-blue-600 hover:bg-blue-500 text-white text-[10px] font-bold py-2 rounded flex items-center justify-center gap-2 shadow-lg"><Save size={12} /> EXPORT</button>
         </div>
      </div>
    </div>
  );
});
