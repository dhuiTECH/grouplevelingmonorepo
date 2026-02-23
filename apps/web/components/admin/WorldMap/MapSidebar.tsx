'use client';
import React, { useRef } from 'react';
import { useMapStore, NodeType } from '@/lib/store/mapStore';
import { v4 as uuidv4 } from 'uuid';
import { Target, Map as MapIcon, User, Sword, Box, Trash2, Save, Upload, Image as ImageIcon, Plus, Eraser, MousePointer2, Settings, Maximize, XCircle } from 'lucide-react';

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
  const { nodes, selectedNodeId, updateNode, removeNode, customTiles, addCustomTile, removeCustomTile, selectedTileId, selectTile, setTool, selectedTool, activeNodeType, exportMap, updateCustomTile } = useMapStore();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const selectedNode = nodes.find(n => n.id === selectedNodeId);
  const selectedTile = customTiles.find(t => t.id === selectedTileId);

  const handleDragStart = (e: React.DragEvent, type: NodeType) => {
    e.dataTransfer.setData('nodeType', type);
    e.dataTransfer.effectAllowed = 'copy';
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      Array.from(e.target.files).forEach(file => {
        const reader = new FileReader();
        reader.onload = (event) => {
          if (event.target?.result) {
            let type = 'grassland';
            const name = file.name.toLowerCase();
            if (name.includes('water')) type = 'water';
            else if (name.includes('hill')) type = 'hill';
            else if (name.includes('soil') || name.includes('dirt')) type = 'soil';

            addCustomTile({
              id: uuidv4(),
              url: event.target.result as string,
              name: file.name,
              type
            });
          }
        };
        reader.readAsDataURL(file);
      });
    }
    if (fileInputRef.current) fileInputRef.current.value = '';
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

  return (
    <div className="w-72 bg-slate-900 border-r border-slate-800 flex flex-col h-full z-20 shrink-0">
      <div className="p-4 border-b border-slate-800">
        <h2 className="text-sm font-bold text-slate-100 uppercase tracking-widest">World Editor</h2>
      </div>
      <div className="p-4 border-b border-slate-800 grid grid-cols-2 gap-2">
         <button onClick={() => setTool('select')} className={`flex items-center justify-center gap-2 p-2 rounded text-xs font-bold transition-all ${selectedTool === 'select' ? 'bg-blue-600 text-white' : 'bg-slate-800 text-slate-400 hover:bg-slate-700'}`}>
            <MousePointer2 size={14} /> SELECT
         </button>
         <button onClick={() => setTool('erase')} className={`flex items-center justify-center gap-2 p-2 rounded text-xs font-bold transition-all ${selectedTool === 'erase' ? 'bg-red-600 text-white' : 'bg-slate-800 text-slate-400 hover:bg-slate-700'}`}>
            <Eraser size={14} /> ERASE
         </button>
      </div>
      <div className="flex-1 overflow-y-auto custom-scrollbar">
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
        <div className="p-4 border-b border-slate-800">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-xs font-bold text-slate-400 uppercase">Biome Painting</h3>
            <button onClick={() => fileInputRef.current?.click()} className="text-[10px] bg-slate-800 hover:bg-slate-700 text-slate-300 px-2 py-1 rounded border border-slate-700 flex items-center gap-1">
              <Plus size={10} /> ADD TILE
            </button>
            <input type="file" ref={fileInputRef} className="hidden" accept="image/png" multiple onChange={handleFileUpload} />
          </div>
          {customTiles.length === 0 ? (
            <div className="text-center py-4 border-2 border-dashed border-slate-800 rounded bg-slate-900/50">
              <ImageIcon size={20} className="mx-auto text-slate-600 mb-2" />
              <p className="text-[10px] text-slate-500">Upload PNG Tiles</p>
            </div>
          ) : (
            <div className="grid grid-cols-4 gap-2">
              {customTiles.map(tile => (
                <div key={tile.id} className="relative group">
                  <button onClick={() => selectTile(selectedTileId === tile.id ? null : tile.id)} className={`w-full aspect-square bg-slate-950 border rounded overflow-hidden ${selectedTileId === tile.id ? 'border-green-500 ring-1 ring-green-500/50' : 'border-slate-700 hover:border-slate-500'}`} title={tile.name}>
                    <img src={tile.url} className="w-full h-full object-cover image-pixelated" alt={tile.name} />
                    {selectedTileId === tile.id && <div className="absolute inset-0 bg-green-500/20 pointer-events-none" />}
                  </button>
                  <button 
                    onClick={(e) => { e.stopPropagation(); removeCustomTile(tile.id); }} 
                    className="absolute -top-1 -right-1 bg-red-600 text-white rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity z-10 hover:bg-red-500"
                  >
                    <XCircle size={12} />
                  </button>
                </div>
              ))}
            </div>
          )}
          {selectedTileId && (
            <div className="mt-2 flex items-center justify-between">
              <div className="text-[10px] text-green-400 font-mono flex items-center gap-1 animate-pulse">
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                PAINT MODE ACTIVE
              </div>
              {selectedTile && (
                <select value={selectedTile.type || 'grassland'} onChange={(e) => updateCustomTile(selectedTile.id, { type: e.target.value })} className="bg-slate-950 border border-slate-700 text-[10px] text-slate-300 rounded px-1 py-0.5 outline-none focus:border-blue-500">
                  <option value="grassland">Grassland</option>
                  <option value="water">Water</option>
                  <option value="hill">Hill</option>
                  <option value="soil">Soil</option>
                  <option value="urban">Urban</option>
                </select>
              )}
            </div>
          )}
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
