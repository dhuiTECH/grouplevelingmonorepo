'use client';
import React from 'react';
import { useMapStore, NodeType } from '@/lib/store/mapStore';
import { Target, Map as MapIcon, User, Sword, Box, Trash2, Maximize, Settings, Grid } from 'lucide-react';

const DRAGGABLE_NODES: { type: NodeType; label: string; icon: React.ReactNode }[] = [
  { type: 'spawn', label: 'Spawn Point', icon: <Target size={16} className="text-blue-400" /> },
  { type: 'poi', label: 'Point of Interest', icon: <MapIcon size={16} className="text-yellow-400" /> },
  { type: 'enemy', label: 'Enemy Spawner', icon: <Sword size={16} className="text-red-400" /> },
  { type: 'npc', label: 'NPC / Quest', icon: <User size={16} className="text-green-400" /> },
  { type: 'loot', label: 'Loot Chest', icon: <Box size={16} className="text-purple-400" /> },
];

interface MapDataSidebarProps {
  onEditNode?: (nodeId: string) => void;
  onGoToNode?: (nodeId: string) => void;
}

export const MapDataSidebar: React.FC<MapDataSidebarProps> = React.memo(({ onEditNode, onGoToNode }) => {
  const nodes = useMapStore(state => state.nodes);
  const selectedNodeId = useMapStore(state => state.selectedNodeId);
  const updateNode = useMapStore(state => state.updateNode);
  const removeNode = useMapStore(state => state.removeNode);
  const setTool = useMapStore(state => state.setTool);
  const selectedTool = useMapStore(state => state.selectedTool);
  const activeNodeType = useMapStore(state => state.activeNodeType);
  const rightSidebarWidth = useMapStore(state => state.rightSidebarWidth);
  const nodeSnapToGrid = useMapStore(state => state.nodeSnapToGrid);
  const setNodeSnapToGrid = useMapStore(state => state.setNodeSnapToGrid);
  
  const isLoadingTiles = useMapStore(state => state.isLoadingTiles);
  
  const selectedNode = nodes.find(n => n.id === selectedNodeId);

  const handleDragStart = (e: React.DragEvent, type: NodeType) => {
    e.dataTransfer.setData('nodeType', type);
    e.dataTransfer.effectAllowed = 'copy';
  };

  return (
    <div 
      style={{ width: rightSidebarWidth }}
      className="bg-slate-900 border-l border-slate-800 flex flex-col h-full z-20 shrink-0"
    >
      <div className="p-4 border-b border-slate-800 flex justify-between items-center">
        <h2 className="text-sm font-bold text-slate-100 uppercase tracking-widest">Map Data</h2>
        {isLoadingTiles && <div className="animate-spin text-cyan-400" aria-hidden><Settings size={14} /></div>}
      </div>

      <div className="flex-1 overflow-y-auto custom-scrollbar">
        {/* Map Information */}
        <div className="p-4 border-b border-slate-800 bg-slate-950/20">
          <h3 className="text-xs font-bold text-slate-400 uppercase mb-3 flex items-center gap-2">
            <MapIcon size={12} /> Map Info
          </h3>
          <div className="space-y-2">
            <div className="flex items-center justify-between text-[10px]">
              <span className="text-slate-500 font-bold">Active Map:</span>
              <span className="text-cyan-400 font-mono">WORLD_MAIN</span>
            </div>
            <div className="flex items-center justify-between text-[10px]">
              <span className="text-slate-500 font-bold">Region:</span>
              <span className="text-slate-300">Central Plains</span>
            </div>
          </div>
        </div>

        {/* Nodes on Map */}
        <div className="p-4 border-b border-slate-800">
          <h3 className="text-xs font-bold text-slate-400 uppercase mb-3">Nodes on Map ({nodes.length})</h3>
          <div className="max-h-64 overflow-y-auto space-y-1 mb-4 custom-scrollbar pr-2">
            {nodes.length === 0 ? (
              <p className="text-[10px] text-slate-600 italic">{isLoadingTiles ? 'Loading nodes...' : 'No nodes placed yet'}</p>
            ) : (
              nodes.map(node => (
                <button
                  key={node.id}
                  onClick={() => onGoToNode?.(node.id)}
                  className={`w-full text-left p-2 rounded text-[10px] flex items-center justify-between transition-colors ${selectedNodeId === node.id ? 'bg-blue-900/40 text-blue-300 border border-blue-800' : 'bg-slate-950/50 text-slate-400 hover:bg-slate-800 border border-transparent'}`}
                >
                  <div className="flex items-center gap-2 truncate">
                    <div className="w-2 h-2 rounded-full" style={{ backgroundColor: node.type === 'spawn' ? '#3b82f6' : node.type === 'enemy' ? '#ef4444' : node.type === 'npc' ? '#22c55e' : '#a855f7' }} />
                    <span className="truncate font-bold">{node.name || 'Unnamed Node'}</span>
                  </div>
                  <span className="text-[8px] opacity-50 font-mono">({Math.round(Number(node.x))},{Math.round(Number(node.y))})</span>
                </button>
              ))
            )}
          </div>
        </div>

        {/* Node Palette */}
        <div className="p-4 border-b border-slate-800">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-xs font-bold text-slate-400 uppercase">Node Palette</h3>
            <button
              onClick={() => setNodeSnapToGrid(!nodeSnapToGrid)}
              className={`px-2 py-1 rounded text-[10px] font-bold transition-all flex items-center gap-1 ${nodeSnapToGrid ? 'bg-orange-600 text-white' : 'bg-slate-800 text-slate-500 hover:bg-slate-700'}`}
              title={nodeSnapToGrid ? "Disable grid snapping for nodes" : "Enable grid snapping for nodes"}
            >
              <Grid size={12} />
              SNAP
            </button>
          </div>
          <div className="grid grid-cols-2 gap-2">
            {DRAGGABLE_NODES.map(node => (
              <button
                key={node.type}
                draggable
                onDragStart={(e) => handleDragStart(e, node.type)}
                onClick={() => setTool('node', node.type)}
                className={`p-2 rounded flex flex-col items-center gap-1 transition-all border ${selectedTool === 'node' && activeNodeType === node.type ? 'bg-blue-900/50 border-blue-500 shadow-[0_0_10px_rgba(59,130,246,0.2)]' : 'bg-slate-800 border-slate-700 hover:border-blue-500/50 hover:bg-slate-700'}`}
              >
                {node.icon}
                <span className="text-[10px] font-medium text-slate-300">{node.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Selected Node Properties */}
        <div className="p-4">
          {selectedNode ? (
            <div className="space-y-4 animate-in slide-in-from-right-4 fade-in duration-200">
              <div className="flex items-center justify-between">
                 <h3 className="text-xs font-bold text-blue-400 uppercase">Node Properties</h3>
                 <div className="flex gap-1">
                   {onEditNode && (
                     <button onClick={() => onEditNode(selectedNode.id)} className="text-cyan-400 hover:text-cyan-300 p-1 hover:bg-cyan-900/20 rounded" title="Edit Properties">
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
               <p className="text-xs text-slate-500">Select a node to edit</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
});
