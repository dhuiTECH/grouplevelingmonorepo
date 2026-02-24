'use client';
import React, { useRef } from 'react';
import { useMapStore, NodeType } from '@/lib/store/mapStore';
import { v4 as uuidv4 } from 'uuid';
import { supabase } from '@/lib/supabase';
import { Target, Map as MapIcon, User, Sword, Box, Trash2, Save, Upload, Image as ImageIcon, Plus, Eraser, MousePointer2, Settings, Maximize, XCircle, Loader2, Zap, ChevronDown, AlertTriangle } from 'lucide-react';

const DRAGGABLE_NODES: { type: NodeType; label: string; icon: React.ReactNode }[] = [
  { type: 'spawn', label: 'Spawn Point', icon: <Target size={16} className="text-blue-400" /> },
  { type: 'poi', label: 'Point of Interest', icon: <MapIcon size={16} className="text-yellow-400" /> },
  { type: 'enemy', label: 'Enemy Spawner', icon: <Sword size={16} className="text-red-400" /> },
  { type: 'npc', label: 'NPC / Quest', icon: <User size={16} className="text-green-400" /> },
  { type: 'loot', label: 'Loot Chest', icon: <Box size={16} className="text-purple-400" /> },
];

interface MapSidebarProps {
  onEditNode?: (nodeId: string) => void;
  onGoToNode?: (nodeId: string) => void;
}

export const MapSidebar: React.FC<MapSidebarProps> = ({ onEditNode, onGoToNode }) => {
  const { 
    nodes, selectedNodeId, updateNode, removeNode, customTiles, addCustomTile, removeCustomTile, 
    selectedTileId, selectTile, setTool, selectedTool, activeNodeType, exportMap, updateCustomTile,
    isSmartMode, setSmartMode, isRaiseMode, setRaiseMode, isFoamEnabled, setFoamEnabled,
    autoTileSheetUrl, setAutoTileSheetUrl, 
    selectedSmartType, setSelectedSmartType, dirtSheetUrl, setDirtSheetUrl,
    selectedWaterBaseId, setSelectedWaterBaseId, selectedFoamStripId, setSelectedFoamStripId,
    waterBaseTile, foamStripTile
  } = useMapStore();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const autoTileInputRef = useRef<HTMLInputElement>(null);
  const dirtInputRef = useRef<HTMLInputElement>(null);
  const waterBaseUploadRef = useRef<HTMLInputElement>(null); // NEW
  const foamStripUploadRef = useRef<HTMLInputElement>(null); // NEW
  
  const [isDragging, setIsDragging] = React.useState(false);
  const [uploadingTiles, setUploadingTiles] = React.useState(false);
  const selectedNode = nodes.find(n => n.id === selectedNodeId);
  const selectedCustomTile = customTiles.find(t => t.id === selectedTileId);

  // Determine the currently edited tile for the properties section
  const currentlyEditedTile = selectedCustomTile || 
    (selectedWaterBaseId && waterBaseTile()?.id === selectedTileId ? waterBaseTile() : undefined) ||
    (selectedFoamStripId && foamStripTile()?.id === selectedTileId ? foamStripTile() : undefined);

  const [activeTab, setActiveTab] = React.useState<'ground' | 'prop'>('ground');

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

  const processFiles = async (files: FileList | File[], category: 'tile' | 'prop' | 'water_base' | 'foam_strip' = 'tile') => {
    setUploadingTiles(true);
    const fileArray = Array.from(files);
    
    for (const file of fileArray) {
      if (!file.type.startsWith('image/')) continue;
      
      const publicUrl = await handleUploadAsset(file, 'tiles');
      if (publicUrl) {
        let type = 'grassland';
        const name = file.name.toLowerCase();
        if (name.includes('water') && category !== 'water_base' && category !== 'foam_strip') type = 'water';
        else if (name.includes('hill')) type = 'hill';
        else if (name.includes('soil') || name.includes('dirt')) type = 'soil';

        const newTile = {
          id: uuidv4(),
          url: publicUrl,
          name: file.name,
          type,
          layer: category === 'prop' ? 1 : 0, // Default layer based on category
          isWalkable: true,
          isAutoFill: true,
          isSpritesheet: false,
          frameCount: 1,
          frameWidth: 64,
          frameHeight: 64,
          animationSpeed: 0.8,
          category
        };
        await addCustomTile(newTile);

        if (category === 'water_base') {
          setSelectedWaterBaseId(newTile.id);
        } else if (category === 'foam_strip') {
          setSelectedFoamStripId(newTile.id);
        }
      }
    }
    setUploadingTiles(false);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>, category: 'tile' | 'prop' | 'water_base' | 'foam_strip' = 'tile') => {
    if (e.target.files && e.target.files.length > 0) {
      processFiles(e.target.files, category);
    }
    if (fileInputRef.current) fileInputRef.current.value = '';
    if (waterBaseUploadRef.current) waterBaseUploadRef.current.value = '';
    if (foamStripUploadRef.current) foamStripUploadRef.current.value = '';
  };

  const handleDragStart = (e: React.DragEvent, type: NodeType) => {
    e.dataTransfer.setData('nodeType', type);
    e.dataTransfer.effectAllowed = 'copy';
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
      processFiles(e.dataTransfer.files, activeTab === 'ground' ? 'tile' : 'prop');
    }
  };

  const handleExport = () => {
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

  return (
    <div className="w-72 bg-slate-900 border-r border-slate-800 flex flex-col h-full z-20 shrink-0">
      <div className="p-4 border-b border-slate-800">
        <h2 className="text-sm font-bold text-slate-100 uppercase tracking-widest">World Editor</h2>
      </div>
      <div className="flex-1 overflow-y-auto custom-scrollbar">
        <div className="p-4 border-b border-slate-800 grid grid-cols-2 gap-2">
           <button onClick={() => setTool('select')} className={`flex items-center justify-center gap-2 p-2 rounded text-xs font-bold transition-all ${selectedTool === 'select' ? 'bg-blue-600 text-white' : 'bg-slate-800 text-slate-400 hover:bg-slate-700'}`}>
              <MousePointer2 size={14} /> SELECT
           </button>
           <button onClick={() => setTool('erase')} className={`flex items-center justify-center gap-2 p-2 rounded text-xs font-bold transition-all ${selectedTool === 'erase' ? 'bg-red-600 text-white' : 'bg-slate-800 text-slate-400 hover:bg-slate-700'}`}>
              <Eraser size={14} /> ERASE
           </button>
        </div>
        <div className="p-4 border-b border-slate-800">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-xs font-bold text-slate-400 uppercase">Tilesets</h3>
            <button 
              onClick={() => fileInputRef.current?.click()} 
              disabled={uploadingTiles}
              className="text-[10px] bg-slate-800 hover:bg-slate-700 text-slate-300 px-2 py-1 rounded border border-slate-700 flex items-center gap-1 disabled:opacity-50"
            >
              {uploadingTiles ? <Loader2 className="animate-spin" size={10} /> : <Plus size={10} />} ADD TILE
            </button>
            <input type="file" ref={fileInputRef} className="hidden" accept="image/png" multiple onChange={handleFileUpload} />
          </div>
          
          <div className="flex bg-slate-950 rounded border border-slate-800 p-1 mb-3">
            <button 
              onClick={() => setActiveTab('ground')}
              className={`flex-1 py-1 rounded text-[10px] font-bold transition-all ${activeTab === 'ground' ? 'bg-slate-800 text-white shadow-sm' : 'text-slate-500 hover:text-slate-300'}`}
            >
              GROUND
            </button>
            <button 
              onClick={() => setActiveTab('prop')}
              className={`flex-1 py-1 rounded text-[10px] font-bold transition-all ${activeTab === 'prop' ? 'bg-slate-800 text-white shadow-sm' : 'text-slate-500 hover:text-slate-300'}`}
            >
              PROPS
            </button>
          </div>

          {activeTab === 'ground' && (
            <div className="mb-4 bg-slate-950/30 p-2 rounded border border-slate-800 space-y-3">
              <div className="flex items-center gap-2">
                 <div className="flex-1 relative">
                   <select 
                     value={selectedSmartType}
                     onChange={(e) => setSelectedSmartType(e.target.value)}
                     className={`w-full appearance-none py-1.5 pl-7 pr-2 rounded text-[10px] font-bold border outline-none cursor-pointer transition-all ${selectedSmartType !== 'off' ? 'bg-blue-600/20 border-blue-500 text-blue-400 shadow-[0_0_10px_rgba(59,130,246,0.2)]' : 'bg-slate-900 border-slate-700 text-slate-500 hover:border-slate-500'}`}
                   >
                     <option value="off">SMART: OFF</option>
                     <option value="grass">SMART: GRASS</option>
                     <option value="dirt">SMART: DIRT</option>
                   </select>
                   <Zap size={12} className={`absolute left-2 top-1/2 -translate-y-1/2 pointer-events-none ${selectedSmartType !== 'off' ? "fill-blue-400 text-blue-400" : "text-slate-500"}`} />
                   <ChevronDown size={12} className={`absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none ${selectedSmartType !== 'off' ? "text-blue-400" : "text-slate-500"}`} />
                 </div>
                 <button 
                   onClick={() => setRaiseMode(!isRaiseMode)}
                   className={`flex-1 flex items-center justify-center gap-1 py-1.5 rounded text-[10px] font-bold border transition-all ${isRaiseMode ? 'bg-amber-600/20 border-amber-500 text-amber-400' : 'bg-slate-900 border-slate-700 text-slate-500 hover:border-slate-500'}`}
                 >
                   <Box size={12} /> RAISE
                 </button>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-[9px] font-bold text-slate-500 uppercase tracking-wider">Grass Sheet</label>
                  <button onClick={() => autoTileInputRef.current?.click()} className="text-[9px] bg-slate-800 hover:bg-slate-700 text-slate-300 px-1.5 py-0.5 rounded border border-slate-700 hover:border-slate-500 transition-colors">LOAD</button>
                  <input type="file" ref={autoTileInputRef} className="hidden" accept="image/png" onChange={(e) => setAutoTileSheetUrl(e.target.files?.[0] ? URL.createObjectURL(e.target.files[0]) : null)} />
                </div>
                {autoTileSheetUrl ? (
                  <div className="relative h-8 bg-slate-950 rounded border border-slate-800 overflow-hidden group mb-2">
                     <img src={autoTileSheetUrl} className="w-full h-full object-cover opacity-60 group-hover:opacity-100 transition-opacity" alt="Auto Tile Sheet" />
                     <button onClick={() => setAutoTileSheetUrl(null)} className="absolute top-0.5 right-0.5 bg-red-500 text-white rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-600 shadow-lg">
                        <XCircle size={8} />
                     </button>
                  </div>
                ) : (
                  <div onClick={() => autoTileInputRef.current?.click()} className="h-8 bg-slate-900/50 rounded border border-dashed border-slate-800 hover:border-slate-600 flex items-center justify-center cursor-pointer transition-colors group mb-2">
                    <span className="text-[8px] text-slate-700 group-hover:text-slate-500 font-bold uppercase">No Sheet Loaded</span>
                  </div>
                )}

                <div className="flex items-center justify-between mb-1">
                  <label className="text-[9px] font-bold text-slate-500 uppercase tracking-wider">Dirt Path Sheet</label>
                  <button onClick={() => dirtInputRef.current?.click()} className="text-[9px] bg-slate-800 hover:bg-slate-700 text-slate-300 px-1.5 py-0.5 rounded border border-slate-700 hover:border-slate-500 transition-colors">LOAD</button>
                  <input type="file" ref={dirtInputRef} className="hidden" accept="image/png" onChange={(e) => setDirtSheetUrl(e.target.files?.[0] ? URL.createObjectURL(e.target.files[0]) : null)} />
                </div>
                {dirtSheetUrl ? (
                  <div className="relative h-8 bg-slate-950 rounded border border-slate-800 overflow-hidden group">
                     <img src={dirtSheetUrl} className="w-full h-full object-cover opacity-60 group-hover:opacity-100 transition-opacity" alt="Dirt Sheet" />
                     <button onClick={() => setDirtSheetUrl(null)} className="absolute top-0.5 right-0.5 bg-red-500 text-white rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-600 shadow-lg">
                        <XCircle size={8} />
                     </button>
                  </div>
                ) : (
                  <div onClick={() => dirtInputRef.current?.click()} className="h-8 bg-slate-900/50 rounded border border-dashed border-slate-800 hover:border-slate-600 flex items-center justify-center cursor-pointer transition-colors group">
                    <span className="text-[8px] text-slate-700 group-hover:text-slate-500 font-bold uppercase">Empty (Uses Grass Fallback)</span>
                  </div>
                )}

                {selectedSmartType === 'dirt' && !dirtSheetUrl && (
                  <div className="mt-2 flex items-center gap-2 p-2 bg-amber-900/20 border border-amber-500/30 rounded text-[9px] text-amber-400 animate-in slide-in-from-top-1 fade-in">
                    <AlertTriangle size={12} />
                    <span>Dirt sheet missing — using Grass fallback</span>
                  </div>
                )}
              </div>

              <div className="pt-2 border-t border-slate-800 mt-2">
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
                    <div>
                       <div className="flex items-center justify-between mb-1">
                          <span className="text-[8px] text-slate-500 font-bold uppercase">Base</span>
                          <button onClick={() => waterBaseUploadRef.current?.click()} className="text-[8px] bg-slate-800 hover:bg-slate-700 text-slate-300 px-1.5 py-0.5 rounded border border-slate-700 hover:border-slate-500 transition-colors">LOAD</button>
                       </div>
                       <select 
                         value={selectedWaterBaseId || ''}
                         onChange={(e) => setSelectedWaterBaseId(e.target.value || null)}
                         className="w-full bg-slate-950 border border-slate-700 text-[10px] text-slate-300 rounded px-1 py-0.5 outline-none focus:border-blue-500 mb-2"
                       >
                         <option value="">None</option>
                         {waterTiles.map(tile => (
                           <option key={tile.id} value={tile.id}>{tile.name}</option>
                         ))}
                       </select>
                       <input type="file" ref={waterBaseUploadRef} className="hidden" accept="image/png" onChange={(e) => handleFileUpload(e, 'water_base')} />
                    </div>
                    <div>
                       <div className="flex items-center justify-between mb-1">
                          <span className="text-[8px] text-slate-500 font-bold uppercase">Foam Strip</span>
                          <button onClick={() => foamStripUploadRef.current?.click()} className="text-[8px] bg-slate-800 hover:bg-slate-700 text-slate-300 px-1.5 py-0.5 rounded border border-slate-700 hover:border-slate-500 transition-colors">LOAD</button>
                       </div>
                       <select 
                         value={selectedFoamStripId || ''}
                         onChange={(e) => setSelectedFoamStripId(e.target.value || null)}
                         className="w-full bg-slate-950 border border-slate-700 text-[10px] text-slate-300 rounded px-1 py-0.5 outline-none focus:border-blue-500 mb-2"
                       >
                         <option value="">None</option>
                         {foamTiles.map(tile => (
                           <option key={tile.id} value={tile.id}>{tile.name}</option>
                         ))}
                       </select>
                       <input type="file" ref={foamStripUploadRef} className="hidden" accept="image/png" onChange={(e) => handleFileUpload(e, 'foam_strip')} />
                    </div>
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
            {customTiles.filter(t => activeTab === 'ground' ? (!t.layer || t.layer === 0) : t.layer === 1).length === 0 ? (
              <div className="text-center py-6 border-2 border-dashed border-slate-800 rounded bg-slate-900/50 flex flex-col items-center justify-center">
                <Upload size={24} className={`mb-2 transition-colors ${isDragging ? 'text-blue-400 animate-bounce' : 'text-slate-600'}`} />
                <p className="text-[10px] text-slate-500 font-bold uppercase tracking-tight">
                  {isDragging ? 'Drop to Upload' : `Drop ${activeTab === 'ground' ? 'Ground' : 'Prop'} PNGs`}
                </p>
                <p className="text-[8px] text-slate-600 mt-1">or click "Add Tile"</p>
              </div>
            ) : (
              <div className="grid grid-cols-4 gap-2">
                {customTiles.filter(t => activeTab === 'ground' ? (!t.layer || t.layer === 0) : t.layer === 1).map(tile => (
                  <div key={tile.id} className="relative group">
                    <button onClick={() => selectTile(selectedTileId === tile.id ? null : tile.id)} className={`w-full aspect-square bg-slate-950 border rounded overflow-hidden ${selectedTileId === tile.id ? 'border-green-500 ring-1 ring-green-500/50' : 'border-slate-700 hover:border-slate-500'}`} title={tile.name}>
                      <img src={tile.url} className="w-full h-full object-cover image-pixelated" alt={tile.name} />
                      {selectedTileId === tile.id && <div className="absolute inset-0 bg-green-500/20 pointer-events-none" />}
                    </button>
                    <button 
                      onClick={(e) => { e.stopPropagation(); removeCustomTile(tile.id); }} 
                      className="absolute -top-1 -right-1 bg-red-600 text-white rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity z-10 hover:bg-red-500 shadow-lg"
                    >
                      <XCircle size={12} />
                    </button>
                  </div>
                ))}
                {isDragging && (
                  <div className="aspect-square border-2 border-dashed border-blue-500 rounded bg-blue-500/10 flex items-center justify-center animate-pulse">
                    <Plus size={16} className="text-blue-500" />
                  </div>
                )}
              </div>
            )}
          </div>
          {currentlyEditedTile && (
            <div className="mt-2 flex flex-col gap-2 w-full mt-2 border-t border-slate-800 pt-2">
              <div className="text-[10px] text-green-400 font-mono flex items-center gap-1 animate-pulse">
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                EDITING PROPERTIES
              </div>

              <div className="flex items-center justify-between">
                <label className="text-[10px] text-slate-500 uppercase font-bold">Biome</label>
                <select value={currentlyEditedTile.type || 'grassland'} onChange={(e) => updateCustomTile(currentlyEditedTile.id, { type: e.target.value })} className="bg-slate-950 border border-slate-700 text-[10px] text-slate-300 rounded px-1 py-0.5 outline-none focus:border-blue-500">
                  <option value="grassland">Grassland</option>
                  <option value="water">Water</option>
                  <option value="hill">Hill</option>
                  <option value="soil">Soil</option>
                  <option value="urban">Urban</option>
                  <option value="object">Object (Prop)</option>
                </select>
              </div>
              
              <div className="flex items-center justify-between">
                <label className="text-[10px] text-slate-500 uppercase font-bold">Layer</label>
                <div className="flex bg-slate-950 rounded border border-slate-700 p-0.5">
                  <button 
                    onClick={() => {
                      updateCustomTile(currentlyEditedTile.id, { layer: 0 });
                      setActiveTab('ground');
                    }}
                    className={`px-2 py-0.5 rounded text-[8px] font-bold transition-all ${!currentlyEditedTile.layer ? 'bg-cyan-600 text-white' : 'text-slate-500 hover:text-slate-300'}`}
                  >
                    GROUND
                  </button>
                  <button 
                    onClick={() => {
                      updateCustomTile(currentlyEditedTile.id, { layer: 1 });
                      setActiveTab('prop');
                    }}
                    className={`px-2 py-0.5 rounded text-[8px] font-bold transition-all ${currentlyEditedTile.layer === 1 ? 'bg-cyan-600 text-white' : 'text-slate-500 hover:text-slate-300'}`}
                  >
                    PROP
                  </button>
                </div>
              </div>
              
              <div className="flex items-center justify-between">
                <label className="text-[10px] text-slate-500 uppercase font-bold">Spritesheet</label>
                <button 
                  onClick={() => updateCustomTile(currentlyEditedTile.id, { 
                    isSpritesheet: !currentlyEditedTile.isSpritesheet, 
                    frameCount: !currentlyEditedTile.isSpritesheet ? 4 : 1,
                    animationSpeed: !currentlyEditedTile.isSpritesheet ? 0.8 : 1,
                    frameWidth: 64,
                    frameHeight: 64
                  })}
                  className={`px-2 py-0.5 rounded text-[10px] font-bold transition-all ${currentlyEditedTile.isSpritesheet ? 'bg-cyan-600 text-white' : 'bg-slate-800 text-slate-500'}`}
                >
                  {currentlyEditedTile.isSpritesheet ? 'ON' : 'OFF'}
                </button>
              </div>

              <div className="flex items-center justify-between">
                <label className="text-[10px] text-slate-500 uppercase font-bold">Auto-Fill</label>
                <button 
                  onClick={() => updateCustomTile(currentlyEditedTile.id, { isAutoFill: currentlyEditedTile.isAutoFill !== false ? false : true })}
                  className={`px-2 py-0.5 rounded text-[10px] font-bold transition-all ${currentlyEditedTile.isAutoFill !== false ? 'bg-cyan-600 text-white' : 'bg-slate-800 text-slate-500'}`}
                >
                  {currentlyEditedTile.isAutoFill !== false ? 'ON' : 'OFF'}
                </button>
              </div>

              <div className="flex items-center justify-between">
                <label className="text-[10px] text-slate-500 uppercase font-bold">Snap to Grid</label>
                <button 
                  onClick={() => updateCustomTile(currentlyEditedTile.id, { snapToGrid: !currentlyEditedTile.snapToGrid })}
                  className={`px-2 py-0.5 rounded text-[10px] font-bold transition-all ${currentlyEditedTile.snapToGrid ? 'bg-cyan-600 text-white' : 'bg-slate-800 text-slate-500'}`}
                >
                  {currentlyEditedTile.snapToGrid ? 'ON' : 'OFF'}
                </button>
              </div>
              
              <div className="flex items-center justify-between">
                <label className="text-[10px] text-slate-500 uppercase font-bold">Walkable</label>
                <button 
                  onClick={() => updateCustomTile(currentlyEditedTile.id, { isWalkable: !currentlyEditedTile.isWalkable })}
                  className={`px-2 py-0.5 rounded text-[10px] font-bold transition-all ${currentlyEditedTile.isWalkable !== false ? 'bg-green-600 text-white' : 'bg-red-600 text-white'}`}
                >
                  {currentlyEditedTile.isWalkable !== false ? 'YES' : 'NO'}
                </button>
              </div>

              {currentlyEditedTile.isSpritesheet && (
                <div className="space-y-2 bg-slate-950/50 p-2 rounded border border-slate-800">
                  <div className="flex items-center justify-between">
                    <label className="text-[10px] text-slate-500 uppercase font-bold">Frames</label>
                    <input 
                      type="number" 
                      value={currentlyEditedTile.frameCount || 1} 
                      onChange={(e) => updateCustomTile(currentlyEditedTile.id, { frameCount: parseInt(e.target.value) || 1 })}
                      className="w-12 bg-slate-950 border border-slate-700 text-[10px] text-cyan-400 rounded px-1 py-0.5 outline-none focus:border-blue-500 text-center font-bold"
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <label className="text-[10px] text-slate-500 uppercase font-bold">Speed (s)</label>
                    <input 
                      type="number" 
                      step="0.1"
                      value={currentlyEditedTile.animationSpeed || 0.8} 
                      onChange={(e) => updateCustomTile(currentlyEditedTile.id, { animationSpeed: parseFloat(e.target.value) || 0.1 })}
                      className="w-12 bg-slate-950 border border-slate-700 text-[10px] text-cyan-400 rounded px-1 py-0.5 outline-none focus:border-blue-500 text-center font-bold"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="flex flex-col gap-1">
                      <label className="text-[8px] text-slate-600 uppercase font-bold">Width</label>
                      <input 
                        type="number" 
                        value={currentlyEditedTile.frameWidth || 64} 
                        onChange={(e) => updateCustomTile(currentlyEditedTile.id, { frameWidth: parseInt(e.target.value) || 1 })}
                        className="w-full bg-slate-950 border border-slate-700 text-[10px] text-slate-400 rounded px-1 py-0.5 outline-none focus:border-blue-500 text-center"
                      />
                    </div>
                    <div className="flex flex-col gap-1">
                      <label className="text-[8px] text-slate-600 uppercase font-bold">Height</label>
                      <input 
                        type="number" 
                        value={currentlyEditedTile.frameHeight || 64} 
                        onChange={(e) => updateCustomTile(currentlyEditedTile.id, { frameHeight: parseInt(e.target.value) || 1 })}
                        className="w-full bg-slate-950 border border-slate-700 text-[10px] text-slate-400 rounded px-1 py-0.5 outline-none focus:border-blue-500 text-center"
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
        
        <div className="p-4 border-b border-slate-800">
          <h3 className="text-xs font-bold text-slate-400 uppercase mb-3">Nodes on Map</h3>
          <div className="max-h-40 overflow-y-auto space-y-1 mb-4 custom-scrollbar pr-2">
            {nodes.length === 0 ? (
              <p className="text-[10px] text-slate-600 italic">No nodes placed yet</p>
            ) : (
              nodes.map(node => (
                <button
                  key={node.id}
                  onClick={() => onGoToNode?.(node.id)}
                  className={`w-full text-left p-2 rounded text-[10px] flex items-center justify-between transition-colors ${selectedNodeId === node.id ? 'bg-blue-900/40 text-blue-300 border border-blue-800' : 'bg-slate-950/50 text-slate-400 hover:bg-slate-800 border border-transparent'}`}
                >
                  <div className="flex items-center gap-2 truncate">
                    <div className="w-2 h-2 rounded-full" style={{ backgroundColor: node.type === 'spawn' ? '#3b82f6' : node.type === 'enemy' ? '#ef4444' : node.type === 'npc' ? '#22c55e' : '#a855f7' }} />
                    <span className="truncate font-bold">{node.name}</span>
                  </div>
                  <span className="text-[8px] opacity-50 font-mono">({node.x},{node.y})</span>
                </button>
              ))
            )}
          </div>
          <h3 className="text-xs font-bold text-slate-400 uppercase mb-3">Node Palette</h3>
          <div className="grid grid-cols-2 gap-2">
            {DRAGGABLE_NODES.map(node => (
              <button key={node.type} draggable onDragStart={(e) => handleDragStart(e, node.type)} onClick={() => setTool('node', node.type)} className={`p-2 rounded flex flex-col items-center gap-1 transition-all border ${selectedTool === 'node' && activeNodeType === node.type ? 'bg-blue-900/50 border-blue-500 shadow-[0_0_10px_rgba(59,130,246,0.2)]' : 'bg-slate-800 border-slate-700 hover:border-blue-500/50 hover:bg-slate-700'}`}>
                {node.icon}
                <span className="text-[10px] font-medium text-slate-300">{node.label}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="p-4">
          {selectedNode ? (
            <div className="space-y-4 animate-in slide-in-from-right-4 fade-in duration-200">
              <div className="flex items-center justify-between">
                 <h3 className="text-xs font-bold text-blue-400 uppercase">Properties</h3>
                 <div className="flex gap-1">
                   {onEditNode && (
                     <button onClick={() => onEditNode(selectedNode.id)} className="text-cyan-400 hover:text-cyan-300 p-1 hover:bg-cyan-900/20 rounded" title="Edit JRPG Scene">
                       <Settings size={14} />
                     </button>
                   )}
                   {onGoToNode && (
                     <button onClick={() => onGoToNode(selectedNode.id)} className="text-yellow-400 hover:text-yellow-300 p-1 hover:bg-yellow-900/20 rounded" title="Go to Node">
                       <Maximize size={14} />
                     </button>
                   )}
                   <button onClick={() => removeNode(selectedNode.id)} className="text-red-400 hover:text-red-300 p-1 hover:bg-red-900/20 rounded" title="Delete Node">
                     <Trash2 size={14} />
                   </button>
                 </div>
              </div>
              <div className="space-y-3">
                <div>
                  <label className="text-[10px] text-slate-500 uppercase font-bold block mb-1">Name</label>
                  <input type="text" value={selectedNode.name} onChange={(e) => updateNode(selectedNode.id, { name: e.target.value })} className="w-full bg-slate-950 border border-slate-800 rounded px-2 py-1 text-xs text-slate-200 focus:border-blue-500 outline-none" />
                </div>
                <div className="grid grid-cols-2 gap-2">
                   <div>
                      <label className="text-[10px] text-slate-500 uppercase font-bold block mb-1">World X</label>
                      <div className="bg-slate-950 border border-slate-800 rounded px-2 py-1 text-xs text-slate-400 font-mono">{selectedNode.x}</div>
                   </div>
                   <div>
                      <label className="text-[10px] text-slate-500 uppercase font-bold block mb-1">World Y</label>
                      <div className="bg-slate-950 border border-slate-800 rounded px-2 py-1 text-xs text-slate-400 font-mono">{selectedNode.y}</div>
                   </div>
                </div>
                <div>
                  <label className="text-[10px] text-slate-500 uppercase font-bold block mb-1">Type</label>
                  <div className="bg-slate-950 border border-slate-800 rounded px-2 py-1 text-xs text-slate-400 font-mono capitalize">{selectedNode.type}</div>
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center py-10 opacity-50">
               <MapIcon size={32} className="mx-auto mb-2 text-slate-600" />
               <p className="text-xs text-slate-500">Select a node to edit properties</p>
            </div>
          )}
        </div>
      </div>
      <div className="p-4 border-t border-slate-800 bg-slate-900/50 shrink-0">
         <div className="flex gap-2">
            <button className="flex-1 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold py-2 rounded flex items-center justify-center gap-2 transition-colors">
               <Upload size={14} /> IMPORT
            </button>
            <button onClick={handleExport} className="flex-1 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold py-2 rounded flex items-center justify-center gap-2 transition-colors shadow-lg shadow-blue-900/20">
               <Save size={14} /> EXPORT
            </button>
         </div>
      </div>
    </div>
  );
};
