'use client';
import React, { useRef } from 'react';
import { useMapStore, NodeType } from '@/lib/store/mapStore';
import { v4 as uuidv4 } from 'uuid';
import { supabase } from '@/lib/supabase';
import { 
  Target, Map as MapIcon, User, Sword, Box, Trash2, Save, Upload, 
  Image as ImageIcon, Plus, Eraser, MousePointer2, Settings, Maximize, 
  XCircle, Loader2, Zap, ChevronDown, AlertTriangle, Eye, EyeOff, Lock, Unlock, Pin,
  Grid
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

export const MapSidebar: React.FC<MapSidebarProps> = ({ onEditNode, onGoToNode }) => {
  const { 
    nodes, selectedNodeId, updateNode, removeNode, customTiles, addCustomTile, removeCustomTile, 
    selectedTileId, selectTile, setTool, selectedTool, activeNodeType, exportMap, updateCustomTile,
    isSmartMode, setSmartMode, isRaiseMode, setRaiseMode, isFoamEnabled, setFoamEnabled,
    autoTileSheetUrl, setAutoTileSheetUrl, 
    selectedSmartType, setSelectedSmartType, dirtSheetUrl, setDirtSheetUrl,
    selectedWaterBaseId, setSelectedWaterBaseId, selectedFoamStripId, setSelectedFoamStripId,
    waterBaseTile, foamStripTile, sidebarWidth, layerSettings, setLayerVisibility, setLayerLocked,
    favorites, setFavorite
  } = useMapStore();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const roadInputRef = useRef<HTMLInputElement>(null); // NEW
  const propInputRef = useRef<HTMLInputElement>(null); // NEW
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

  const [activeTab, setActiveTab] = React.useState<'water' | 'ground' | 'road' | 'prop'>('ground');

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

  const processFiles = async (files: FileList | File[], category: 'tile' | 'prop' | 'road' | 'water_base' | 'foam_strip' = 'tile') => {
    setUploadingTiles(true);
    const fileArray = Array.from(files);
    
    for (const file of fileArray) {
      if (!file.type.includes('png')) {
        console.warn(`Skipping ${file.name}: Only PNG files are allowed.`);
        continue;
      }

      try {
        const dimensions = await getImageDimensions(file);
        if (dimensions.width % 48 !== 0 || dimensions.height % 48 !== 0) {
          alert(`Skipping ${file.name}: Dimensions (${dimensions.width}x${dimensions.height}) must be divisible by 48.`);
          continue;
        }

        const publicUrl = await handleUploadAsset(file, 'tiles');
        if (publicUrl) {
          let type = 'grassland';
          const name = file.name.toLowerCase();
          if (name.includes('water') && category !== 'water_base' && category !== 'foam_strip') type = 'water';
          else if (category === 'road' || name.includes('road') || name.includes('path')) type = 'road';
          else if (name.includes('hill')) type = 'hill';
          else if (name.includes('soil') || name.includes('dirt')) type = 'soil';

          // -1 = Water, 0 = Ground, 1 = Road, 2 = Prop
          let layer = 0;
          if (category === 'water_base' || category === 'foam_strip') layer = -1;
          else if (category === 'road') layer = 1;
          else if (category === 'prop') layer = 2;

          const newTile = {
            id: uuidv4(),
            url: publicUrl,
            name: file.name,
            type,
            layer,
            isWalkable: true,
            isAutoFill: true,
            isSpritesheet: false,
            frameCount: 1,
            frameWidth: dimensions.width,
            frameHeight: dimensions.height,
            animationSpeed: 0.8,
            category,
            isAutoTile: false,
            snapToGrid: false,
            rotation: 0
          };
          await addCustomTile(newTile);

          if (category === 'water_base') {
            setSelectedWaterBaseId(newTile.id);
          } else if (category === 'foam_strip') {
            setSelectedFoamStripId(newTile.id);
          }
        }
      } catch (err) {
        console.error(`Error processing ${file.name}:`, err);
      }
    }
    setUploadingTiles(false);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>, category: 'tile' | 'prop' | 'road' | 'water_base' | 'foam_strip' = 'tile') => {
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
      let category: 'tile' | 'road' | 'prop' | 'water_base' = 'tile';
      if (activeTab === 'road') category = 'road';
      else if (activeTab === 'prop') category = 'prop';
      else if (activeTab === 'water') category = 'water_base';
      processFiles(e.dataTransfer.files, category);
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
    <div 
      style={{ width: sidebarWidth }}
      className="bg-slate-900 border-r border-slate-800 flex flex-col h-full z-20 shrink-0"
    >
      <div className="p-4 border-b border-slate-800 flex justify-between items-center">
        <h2 className="text-sm font-bold text-slate-100 uppercase tracking-widest">World Editor</h2>
        <button onClick={handleExport} className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded border border-slate-700 transition-colors" title="Export Map">
          <Save size={14} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto custom-scrollbar">
        {/* Layer Manager */}
        <div className="p-4 border-b border-slate-800 bg-slate-950/20">
          <h3 className="text-xs font-bold text-slate-400 uppercase mb-3 flex items-center gap-2">
            <Grid size={12} /> Layers
          </h3>
          <div className="space-y-1">
            {Array.from(new Set([-1, 0, 1, 2, ...customTiles.map(t => t.layer || 0)])).sort((a, b) => a - b).map(layerId => (
              <div key={layerId} className="flex items-center justify-between p-2 rounded bg-slate-900/50 border border-slate-800/50">
                <span className="text-[10px] font-bold text-slate-300 uppercase tracking-tight">
                  {layerId < 0 ? `Water Layer (${layerId})` : layerId === 0 ? 'Ground Layer (0)' : layerId === 1 ? 'Road Layer (1)' : `Prop Layer (${layerId})`}
                </span>
                <div className="flex gap-1">
                  <button 
                    onClick={() => setLayerVisibility(layerId, !!layerSettings[layerId]?.hidden)}
                    className={`p-1 rounded transition-colors ${!layerSettings[layerId]?.hidden ? 'text-cyan-400 hover:bg-cyan-900/20' : 'text-slate-600 hover:bg-slate-800'}`}
                  >
                    {!layerSettings[layerId]?.hidden ? <Eye size={14} /> : <EyeOff size={14} />}
                  </button>
                  <button 
                    onClick={() => setLayerLocked(layerId, !layerSettings[layerId]?.locked)}
                    className={`p-1 rounded transition-colors ${layerSettings[layerId]?.locked ? 'text-amber-500 hover:bg-amber-900/20' : 'text-slate-600 hover:bg-slate-800'}`}
                  >
                    {layerSettings[layerId]?.locked ? <Lock size={14} /> : <Unlock size={14} />}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Tilesets Section */}
        <div className="p-4 border-b border-slate-800">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-xs font-bold text-slate-400 uppercase">Tilesets</h3>
            <div className="flex gap-1">
              <button 
                onClick={() => {
                  if (activeTab === 'ground') fileInputRef.current?.click();
                  else if (activeTab === 'road') roadInputRef.current?.click();
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
            </div>
          </div>
          
          <div className="flex bg-slate-950 rounded border border-slate-800 p-1 mb-3">
            <button 
              onClick={() => setActiveTab('water')}
              className={`flex-1 py-1.5 rounded text-[10px] font-bold transition-all ${activeTab === 'water' ? 'bg-slate-800 text-white shadow-sm ring-1 ring-slate-700' : 'text-slate-500 hover:text-slate-300'}`}
            >
              WATER
            </button>
            <button 
              onClick={() => setActiveTab('ground')}
              className={`flex-1 py-1.5 rounded text-[10px] font-bold transition-all ${activeTab === 'ground' ? 'bg-slate-800 text-white shadow-sm ring-1 ring-slate-700' : 'text-slate-500 hover:text-slate-300'}`}
            >
              GROUND
            </button>
            <button 
              onClick={() => setActiveTab('road')}
              className={`flex-1 py-1.5 rounded text-[10px] font-bold transition-all ${activeTab === 'road' ? 'bg-slate-800 text-white shadow-sm ring-1 ring-slate-700' : 'text-slate-500 hover:text-slate-300'}`}
            >
              ROADS
            </button>
            <button 
              onClick={() => setActiveTab('prop')}
              className={`flex-1 py-1.5 rounded text-[10px] font-bold transition-all ${activeTab === 'prop' ? 'bg-slate-800 text-white shadow-sm ring-1 ring-slate-700' : 'text-slate-500 hover:text-slate-300'}`}
            >
              PROPS
            </button>
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

          {(activeTab === 'ground' || activeTab === 'road') && (
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
                   className={`flex-1 flex items-center justify-center gap-1 py-1.5 rounded text-[10px] font-bold border transition-all ${isRaiseMode ? 'bg-amber-600/20 border-amber-500 text-amber-400 shadow-[0_0_10px_rgba(245,158,11,0.2)]' : 'bg-slate-900 border-slate-700 text-slate-500 hover:border-slate-500'}`}
                 >
                   <Box size={12} /> RAISE
                 </button>
              </div>

              {/* Sheet Loading (truncated for brevity but same logic) */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-[9px] font-bold text-slate-500 uppercase tracking-wider">Grass Sheet (9x9 Randomizer)</label>
                  <button onClick={() => autoTileInputRef.current?.click()} className="text-[9px] bg-slate-800 hover:bg-slate-700 text-slate-300 px-1.5 py-0.5 rounded border border-slate-700 hover:border-slate-500 transition-colors">LOAD</button>
                  <input type="file" ref={autoTileInputRef} className="hidden" accept="image/png" onChange={handleAutoTileSheetUpload} />
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
                  <input type="file" ref={dirtInputRef} className="hidden" accept="image/png" onChange={handleDirtSheetUpload} />
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
              </div>
            </div>
          )}

          <div 
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            className={`transition-all duration-200 rounded-lg p-2 ${isDragging ? 'bg-blue-600/20 ring-2 ring-blue-500 ring-dashed' : ''}`}
          >
            {customTiles.filter(t => {
              const category = t.category;
              const type = t.type;
              const layer = t.layer || 0;

              if (activeTab === 'water') {
                return category === 'water_base' || category === 'foam_strip';
              }
              if (activeTab === 'ground') {
                return category === 'tile' || (!category && layer === 0);
              }
              if (activeTab === 'road') {
                return category === 'road' || (!category && layer === 1);
              }
              // Prop Tab
              return category === 'prop' || (!category && layer >= 2);
            }).length === 0 ? (
              <div className="text-center py-6 border-2 border-dashed border-slate-800 rounded bg-slate-900/50 flex flex-col items-center justify-center">
                <Upload size={24} className={`mb-2 transition-colors ${isDragging ? 'text-blue-400 animate-bounce' : 'text-slate-600'}`} />
                <p className="text-[10px] text-slate-500 font-bold uppercase tracking-tight">
                  {isDragging ? 'Drop to Upload' : `Drop ${activeTab.toUpperCase()} PNGs`}
                </p>
                <p className="text-[8px] text-slate-600 mt-1">or click "Add Tile"</p>
              </div>
            ) : (
              <div className="grid grid-cols-4 gap-2">
                {customTiles.filter(t => {
                  const category = t.category;
                  const layer = t.layer || 0;

                  if (activeTab === 'water') {
                    return category === 'water_base' || category === 'foam_strip';
                  }
                  if (activeTab === 'ground') {
                    return category === 'tile' || (!category && layer === 0);
                  }
                  if (activeTab === 'road') {
                    return category === 'road' || (!category && layer === 1);
                  }
                  // Prop Tab
                  return category === 'prop' || (!category && layer >= 2);
                }).map(tile => (
                  <div key={tile.id} className="relative group">
                    <button onClick={() => selectTile(selectedTileId === tile.id ? null : tile.id)} className={`w-full aspect-square bg-slate-950 border rounded overflow-hidden transition-all flex items-center justify-center ${selectedTileId === tile.id ? 'border-green-500 ring-1 ring-green-500/50 scale-95 shadow-inner' : 'border-slate-700 hover:border-slate-500'}`} title={tile.name}>
                      {tile.isSpritesheet && tile.frameCount && tile.frameCount > 1 ? (
                        <div 
                          className="w-full h-full"
                          style={{
                            backgroundImage: `url(${tile.url})`,
                            backgroundSize: `${tile.frameCount * 100}% 100%`,
                            backgroundPosition: '0 0',
                            backgroundRepeat: 'no-repeat',
                            imageRendering: 'pixelated'
                          }}
                        />
                      ) : (
                        <div 
                          className="w-full h-full"
                          style={{
                            backgroundImage: `url(${tile.url})`,
                            backgroundSize: 'contain',
                            backgroundPosition: 'center',
                            backgroundRepeat: 'no-repeat',
                            imageRendering: 'pixelated'
                          }}
                        />
                      )}
                      {selectedTileId === tile.id && <div className="absolute inset-0 bg-green-500/20 pointer-events-none" />}
                    </button>
                    {/* Favorite Pin Button */}
                    <button 
                      onClick={(e) => { 
                        e.stopPropagation(); 
                        const firstEmpty = favorites.findIndex(f => f === null);
                        if (firstEmpty !== -1) setFavorite(firstEmpty, tile.id);
                        else setFavorite(0, tile.id); // Default to first slot if full
                      }} 
                      className="absolute -top-1 -left-1 bg-slate-800 text-slate-400 rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity z-10 hover:text-cyan-400 shadow-lg border border-slate-700"
                      title="Pin to Hotbar"
                    >
                      <Pin size={10} />
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
            <div className="mt-4 flex flex-col gap-2 w-full border-t border-slate-800 pt-4">
              <div className="text-[10px] text-green-400 font-mono flex items-center gap-1 animate-pulse">
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                TILE PROPERTIES
              </div>

              <div className="flex items-center justify-between">
                <label className="text-[10px] text-slate-500 uppercase font-bold">Category</label>
                <select 
                  value={currentlyEditedTile.category || 'tile'} 
                  onChange={(e) => updateCustomTile(currentlyEditedTile.id, { category: e.target.value as any })} 
                  className="bg-slate-950 border border-slate-700 text-[10px] text-slate-300 rounded px-1 py-0.5 outline-none focus:border-blue-500"
                >
                  <option value="tile">Ground Tile</option>
                  <option value="road">Road</option>
                  <option value="prop">Prop</option>
                  <option value="water_base">Water Base</option>
                  <option value="foam_strip">Foam Strip</option>
                </select>
              </div>

              <div className="flex items-center justify-between">
                <label className="text-[10px] text-slate-500 uppercase font-bold">Biome</label>
                <select value={currentlyEditedTile.type || 'grassland'} onChange={(e) => updateCustomTile(currentlyEditedTile.id, { type: e.target.value })} className="bg-slate-950 border border-slate-700 text-[10px] text-slate-300 rounded px-1 py-0.5 outline-none focus:border-blue-500">
                  <option value="grassland">Grassland</option>
                  <option value="water">Water</option>
                  <option value="road">Road</option>
                  <option value="hill">Hill</option>
                  <option value="soil">Soil</option>
                  <option value="urban">Urban</option>
                  <option value="object">Object (Prop)</option>
                </select>
              </div>
              
              <div className="flex items-center justify-between">
                <label className="text-[10px] text-slate-500 uppercase font-bold">Layer</label>
                <div className="flex items-center gap-2">
                  <input 
                    type="number" 
                    value={currentlyEditedTile.layer !== undefined ? currentlyEditedTile.layer : 0} 
                    onChange={(e) => updateCustomTile(currentlyEditedTile.id, { layer: parseInt(e.target.value) || 0 })}
                    className="w-16 bg-slate-950 border border-slate-700 text-[10px] text-cyan-400 rounded px-1 py-0.5 outline-none focus:border-blue-500 text-center font-bold"
                  />
                </div>
              </div>

              <div className="flex items-center justify-between">
                <label className="text-[10px] text-slate-500 uppercase font-bold">Size</label>
                <div className="flex items-center gap-1">
                  <input 
                    type="number" 
                    value={currentlyEditedTile.frameWidth || 48} 
                    onChange={(e) => updateCustomTile(currentlyEditedTile.id, { frameWidth: parseInt(e.target.value) || 48 })}
                    className="w-12 bg-slate-950 border border-slate-700 text-[10px] text-cyan-400 rounded px-1 py-0.5 outline-none focus:border-blue-500 text-center font-bold"
                  />
                  <span className="text-slate-500 text-[10px]">x</span>
                  <input 
                    type="number" 
                    value={currentlyEditedTile.frameHeight || 48} 
                    onChange={(e) => updateCustomTile(currentlyEditedTile.id, { frameHeight: parseInt(e.target.value) || 48 })}
                    className="w-12 bg-slate-950 border border-slate-700 text-[10px] text-cyan-400 rounded px-1 py-0.5 outline-none focus:border-blue-500 text-center font-bold"
                  />
                  <button
                    onClick={() => updateCustomTile(currentlyEditedTile.id, { frameWidth: 48, frameHeight: 48 })}
                    className="ml-1 px-1.5 py-0.5 bg-slate-800 hover:bg-slate-700 text-[9px] text-slate-300 rounded border border-slate-700 transition-colors"
                    title="Reset to 1x1 Tile (48x48)"
                  >
                    1x1
                  </button>
                  <button
                    onClick={() => updateCustomTile(currentlyEditedTile.id, { frameWidth: 144, frameHeight: 144 })}
                    className="ml-0.5 px-1.5 py-0.5 bg-slate-800 hover:bg-slate-700 text-[9px] text-slate-300 rounded border border-slate-700 transition-colors"
                    title="Set to 3x3 Tile (144x144)"
                  >
                    3x3
                  </button>
                </div>
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
                <label className="text-[10px] text-slate-500 uppercase font-bold">Rotation (Deg)</label>
                <input 
                  type="number" 
                  value={currentlyEditedTile.rotation || 0} 
                  onChange={(e) => updateCustomTile(currentlyEditedTile.id, { rotation: parseInt(e.target.value) || 0 })}
                  className="w-16 bg-slate-950 border border-slate-700 text-[10px] text-cyan-400 rounded px-1 py-0.5 outline-none focus:border-blue-500 text-center font-bold"
                />
              </div>

              <div className="flex items-center justify-between">
                <label className="text-[10px] text-slate-500 uppercase font-bold">Auto-Fill</label>
                <button 
                  onClick={() => updateCustomTile(currentlyEditedTile.id, { isAutoFill: currentlyEditedTile.isAutoFill === false ? true : false })}
                  className={`px-2 py-0.5 rounded text-[10px] font-bold transition-all ${currentlyEditedTile.isAutoFill !== false ? 'bg-cyan-600 text-white' : 'bg-slate-800 text-slate-500'}`}
                >
                  {currentlyEditedTile.isAutoFill !== false ? 'ON' : 'OFF'}
                </button>
              </div>

              <div className="flex items-center justify-between">
                <label className="text-[10px] text-slate-500 uppercase font-bold">Is Auto-Tile</label>
                <button 
                  onClick={() => updateCustomTile(currentlyEditedTile.id, { isAutoTile: !currentlyEditedTile.isAutoTile })}
                  className={`px-2 py-0.5 rounded text-[10px] font-bold transition-all ${currentlyEditedTile.isAutoTile ? 'bg-purple-600 text-white' : 'bg-slate-800 text-slate-500'}`}
                >
                  {currentlyEditedTile.isAutoTile ? 'ON' : 'OFF'}
                </button>
              </div>

              {/* Additional Advanced Properties (Spritesheet etc) */}
              <div className="mt-2 space-y-2 border-t border-slate-800/50 pt-2">
                <div className="flex items-center justify-between">
                  <label className="text-[10px] text-slate-600 uppercase font-bold italic">Spritesheet</label>
                  <button 
                    onClick={() => updateCustomTile(currentlyEditedTile.id, { 
                      isSpritesheet: !currentlyEditedTile.isSpritesheet, 
                      frameCount: !currentlyEditedTile.isSpritesheet ? 4 : 1,
                      animationSpeed: !currentlyEditedTile.isSpritesheet ? 0.8 : 1,
                    })}
                    className={`px-2 py-0.5 rounded text-[10px] font-bold transition-all ${currentlyEditedTile.isSpritesheet ? 'bg-cyan-900/40 text-cyan-400 border border-cyan-500/50' : 'bg-slate-800 text-slate-700'}`}
                  >
                    {currentlyEditedTile.isSpritesheet ? 'ACTIVE' : 'OFF'}
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
                        min="0.1"
                        value={currentlyEditedTile.animationSpeed || 1} 
                        onChange={(e) => updateCustomTile(currentlyEditedTile.id, { animationSpeed: parseFloat(e.target.value) || 1 })}
                        className="w-16 bg-slate-950 border border-slate-700 text-[10px] text-cyan-400 rounded px-1 py-0.5 outline-none focus:border-blue-500 text-center font-bold"
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
      
      <div className="p-4 border-t border-slate-800 bg-slate-900/50 shrink-0">
         <div className="flex gap-2">
            <button className="flex-1 bg-slate-800 hover:bg-slate-700 text-slate-300 text-[10px] font-bold py-2 rounded flex items-center justify-center gap-2 transition-colors border border-slate-700">
               <Upload size={12} /> IMPORT
            </button>
            <button onClick={handleExport} className="flex-1 bg-blue-600 hover:bg-blue-500 text-white text-[10px] font-bold py-2 rounded flex items-center justify-center gap-2 transition-colors shadow-lg shadow-blue-900/20">
               <Save size={12} /> EXPORT
            </button>
         </div>
      </div>
    </div>
  );
};
