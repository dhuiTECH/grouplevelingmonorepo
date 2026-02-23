'use client';
import React, { useRef, useState, useEffect } from 'react';
import { TransformWrapper, TransformComponent, ReactZoomPanPinchRef } from 'react-zoom-pan-pinch';
import { useMapStore, NodeType, Tile } from '@/lib/store/mapStore';
import { MapCanvas } from './MapCanvas';
import { MapSidebar } from './MapSidebar';
import { createNoise2D } from 'simplex-noise';
import { Plus, Minus, Maximize, Grid, Zap, Loader2, Target, Map, User, Sword, Box, Globe } from 'lucide-react';
import { generateAsset } from '@/lib/services/mapGeminiService';

const WORLD_SIZE = 8192;
const TILE_SIZE = 64;

export const WorldMapEngine: React.FC = () => {
  const transformComponentRef = useRef<ReactZoomPanPinchRef>(null);
  const dropTargetRef = useRef<HTMLDivElement>(null);
  const { nodes, addNode, updateNode, selectNode, selectedNodeId, addTileSimple, selectedTileId, customTiles, selectedTool, activeNodeType, removeTileAt, removeNode, batchAddTiles } = useMapStore();
  const [isGenerating, setIsGenerating] = useState(false);
  const [seed, setSeed] = useState<string>(Math.random().toString(36).substring(7));

  const handleMapInteraction = (clientX: number, clientY: number) => {
    if (!transformComponentRef.current || !dropTargetRef.current) return;
    const { positionX, positionY, scale } = transformComponentRef.current.instance.transformState;
    const rect = dropTargetRef.current.getBoundingClientRect();
    const worldX = (clientX - rect.left - positionX) / scale;
    const worldY = (clientY - rect.top - positionY) / scale;
    const relativeGridX = Math.floor((worldX - WORLD_SIZE / 2) / TILE_SIZE);
    const relativeGridY = Math.floor((worldY - WORLD_SIZE / 2) / TILE_SIZE);

    if (selectedTool === 'paint' && selectedTileId) {
      const tile = customTiles.find(t => t.id === selectedTileId);
      if (tile) {
        addTileSimple(relativeGridX, relativeGridY, 'custom', tile.url);
      }
    } else if (selectedTool === 'node' && activeNodeType) {
      const existingNode = nodes.find(n => n.x === relativeGridX && n.y === relativeGridY);
      if (!existingNode) {
        addNode({ x: relativeGridX, y: relativeGridY, type: activeNodeType, name: `New ${activeNodeType}`, iconUrl: '' });
      }
    } else if (selectedTool === 'erase') {
      removeTileAt(relativeGridX, relativeGridY);
      const nodeAtLoc = nodes.find(n => n.x === relativeGridX && n.y === relativeGridY);
      if (nodeAtLoc) removeNode(nodeAtLoc.id);
    }
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button !== 0) return;
    if (selectedTool !== 'select') {
      e.stopPropagation();
      handleMapInteraction(e.clientX, e.clientY);
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (selectedTool !== 'select' && e.buttons === 1) {
      e.stopPropagation();
      handleMapInteraction(e.clientX, e.clientY);
    }
  };

  const handleNodeContextMenu = (e: React.MouseEvent, nodeId: string) => {
    e.preventDefault();
    e.stopPropagation();
    selectNode(nodeId);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const type = e.dataTransfer.getData('nodeType') as NodeType;
    if (type && transformComponentRef.current) {
      const { positionX, positionY, scale } = transformComponentRef.current.instance.transformState;
      const rect = dropTargetRef.current?.getBoundingClientRect();
      if (!rect) return;
      const clientX = e.clientX - rect.left;
      const clientY = e.clientY - rect.top;
      const worldX = (clientX - positionX) / scale;
      const worldY = (clientY - positionY) / scale;
      const gridX = Math.floor(worldX / TILE_SIZE);
      const gridY = Math.floor(worldY / TILE_SIZE);
      addNode({ x: gridX, y: gridY, type, name: `New ${type}`, iconUrl: '' });
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
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
        const GRID_RADIUS = 25; 
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
            const elevation = noise2D(x / 10, y / 10);
            let tileType = 'grassland';
            if (elevation < -0.2) tileType = 'water';
            else if (elevation > 0.5) tileType = 'hill';
            else if (elevation <= 0) tileType = 'soil';
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

  const handleGenerateTile = async () => {
    setIsGenerating(true);
    try {
      await new Promise(resolve => setTimeout(resolve, 1500));
      const x = Math.floor(Math.random() * 10) - 5;
      const y = Math.floor(Math.random() * 10) - 5;
      const canvas = document.createElement('canvas');
      canvas.width = 64; canvas.height = 64;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.fillStyle = `hsl(${Math.random() * 360}, 70%, 50%)`;
        ctx.fillRect(0, 0, 64, 64);
        for(let i=0; i<20; i++) {
            ctx.fillStyle = 'rgba(0,0,0,0.2)';
            ctx.fillRect(Math.random()*64, Math.random()*64, 4, 4);
        }
      }
      addTileSimple(x, y, 'grass', canvas.toDataURL());
    } catch (error) {
      console.error("Generation failed", error);
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="flex w-full h-full bg-slate-950 overflow-hidden">
      <MapSidebar />
      <div className="flex-1 relative flex flex-col">
        <div className="absolute top-4 left-4 z-10 flex gap-2 items-center">
          <div className="bg-slate-900/90 backdrop-blur border border-slate-700 rounded-lg p-1 flex gap-1 shadow-xl">
            <button onClick={() => transformComponentRef.current?.zoomIn()} className="p-2 hover:bg-slate-800 rounded text-slate-300 hover:text-white transition-colors" title="Zoom In"><Plus size={18} /></button>
            <button onClick={() => transformComponentRef.current?.zoomOut()} className="p-2 hover:bg-slate-800 rounded text-slate-300 hover:text-white transition-colors" title="Zoom Out"><Minus size={18} /></button>
            <button onClick={() => transformComponentRef.current?.centerView()} className="p-2 hover:bg-slate-800 rounded text-slate-300 hover:text-white transition-colors" title="Center View"><Maximize size={18} /></button>
          </div>
          <div className="flex items-center gap-2 bg-slate-900/90 backdrop-blur border border-slate-700 rounded-lg p-1.5 shadow-xl">
            <input type="text" value={seed} onChange={(e) => setSeed(e.target.value)} placeholder="Seed" className="w-20 bg-slate-950 border border-slate-700 rounded px-2 py-1 text-xs text-white focus:border-cyan-500 outline-none" />
            <button onClick={handleAutoFill} disabled={isGenerating} className="bg-cyan-600 hover:bg-cyan-500 text-white px-3 py-1.5 rounded text-xs font-bold flex items-center gap-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-cyan-900/20">
              {isGenerating ? <Loader2 className="animate-spin" size={14} /> : <Globe size={14} />} AUTO-FILL
            </button>
          </div>
          <button onClick={handleGenerateTile} disabled={isGenerating} className="bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2 rounded-lg shadow-lg shadow-indigo-900/20 flex items-center gap-2 font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed border border-indigo-400/20 ml-2">
            {isGenerating ? <Loader2 className="animate-spin" size={18} /> : <Zap size={18} />} Generate Tile
          </button>
        </div>
        <div className="flex-1 bg-[#020617] relative overflow-hidden cursor-crosshair" ref={dropTargetRef} onDrop={handleDrop} onDragOver={handleDragOver}>
          <TransformWrapper ref={transformComponentRef} initialScale={1} minScale={0.1} maxScale={4} centerOnInit limitToBounds={false} wheel={{ step: 0.1 }} panning={{ disabled: selectedTool !== 'select' }}>
            <TransformComponent wrapperClass="w-full h-full" contentClass="w-full h-full">
              <div style={{ width: WORLD_SIZE, height: WORLD_SIZE, position: 'relative', background: 'radial-gradient(circle at center, #1e293b 1px, transparent 1px)', backgroundSize: '40px 40px' }} onMouseDown={handleMouseDown} onMouseMove={handleMouseMove}>
                <MapCanvas width={WORLD_SIZE} height={WORLD_SIZE} scale={1} />
                {nodes.map(node => (
                  <div key={node.id} onClick={(e) => { e.stopPropagation(); selectNode(node.id); }} onContextMenu={(e) => handleNodeContextMenu(e, node.id)} style={{ position: 'absolute', left: node.x * TILE_SIZE + WORLD_SIZE / 2, top: node.y * TILE_SIZE + WORLD_SIZE / 2, width: TILE_SIZE, height: TILE_SIZE, transform: 'translate(0, 0)' }} className={`group transition-transform hover:scale-110 z-20 ${selectedNodeId === node.id ? 'z-30' : ''}`}>
                    <div className={`w-8 h-8 rounded-full shadow-lg flex items-center justify-center border-2 ${selectedNodeId === node.id ? 'bg-blue-600 border-white shadow-blue-500/50' : 'bg-slate-800 border-slate-600 hover:border-blue-400'}`}>
                      {node.type === 'spawn' && <Target size={16} className="text-white" />}
                      {node.type === 'enemy' && <Sword size={16} className="text-red-400" />}
                      {node.type === 'npc' && <User size={16} className="text-green-400" />}
                      {node.type === 'loot' && <Box size={16} className="text-purple-400" />}
                      {node.type === 'poi' && <Map size={16} className="text-yellow-400" />}
                    </div>
                    <div className={`absolute -top-6 left-1/2 -translate-x-1/2 whitespace-nowrap px-2 py-0.5 bg-black/80 text-white text-[10px] rounded pointer-events-none ${selectedNodeId === node.id ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}>
                      {node.name}
                    </div>
                  </div>
                ))}
                <div className="absolute left-1/2 top-1/2 w-4 h-4 -ml-2 -mt-2 border border-red-500/50 rounded-full pointer-events-none" />
              </div>
            </TransformComponent>
          </TransformWrapper>
        </div>
      </div>
    </div>
  );
};
