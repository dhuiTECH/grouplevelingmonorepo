"use client";

import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { Plus, Loader2, ArrowLeft, Home, ZoomIn, ZoomOut, Maximize2 } from 'lucide-react';

interface MapRecord {
  id: string;
  name: string;
  image_url: string;
  global_x: number;
  global_y: number;
}

interface NodeRecord {
  id: string;
  name: string;
  icon_url: string;
  x: number;
  y: number;
  map_id: string;
}

interface WorldGridMapProps {
  focusedTile: { global_x: number; global_y: number } | null;
  onFocusTile: (global_x: number, global_y: number) => void;
  onUnfocus: () => void;
  onSelectEmptySlot: (x: number, y: number) => void;
  onMapClick: (x: number, y: number, mapId: string) => void;
  onNodeDrop?: (nodeId: string, mapId: string, x: number, y: number) => void;
  nodes: NodeRecord[];
  readOnly?: boolean;
  spawnPoint?: { mapId: string; x: number; y: number } | null;
}

const FOCUSED_TILE_SIZE = 400;
const OVERVIEW_CELL_SIZE = 100;
const VIEWPORT_HEIGHT = 420;

const WorldGridMap: React.FC<WorldGridMapProps> = ({
  focusedTile,
  spawnPoint = null,
  onFocusTile,
  onUnfocus,
  onSelectEmptySlot,
  onMapClick,
  onNodeDrop,
  nodes,
  readOnly = false,
}) => {
  const [maps, setMaps] = useState<MapRecord[]>([]);
  const [gridBounds, setGridBounds] = useState({ minX: 0, maxX: 0, minY: 0, maxY: 0 });
  const [loading, setLoading] = useState(true);
  const [focusedZoom, setFocusedZoom] = useState(1);
  const FOCUSED_ZOOM_MIN = 0.5;
  const FOCUSED_ZOOM_MAX = 2.5;
  const FOCUSED_ZOOM_STEP = 0.25;

  useEffect(() => {
    if (focusedTile === null) setFocusedZoom(1);
  }, [focusedTile]);

  useEffect(() => {
    const fetchMaps = async () => {
      setLoading(true);
      const { data, error } = await supabase.from('maps').select('*');
      if (error) {
        console.error('Error fetching maps:', error);
      } else {
        setMaps(data || []);
        if (data && data.length > 0) {
          const xCoords = data.map(m => m.global_x);
          const yCoords = data.map(m => m.global_y);
          setGridBounds({
            minX: Math.min(...xCoords),
            maxX: Math.max(...xCoords),
            minY: Math.min(...yCoords),
            maxY: Math.max(...yCoords),
          });
        }
      }
      setLoading(false);
    };
    fetchMaps();
  }, []);

  const handleGridClick = (e: React.MouseEvent<HTMLDivElement>, map: MapRecord) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const gridX = Math.floor((x * 50) / rect.width) - 25;
    const gridY = 25 - Math.floor((y * 50) / rect.height);
    onMapClick(gridX, gridY, map.id);
  };

  if (loading) {
    return (
      <div className="text-center p-6 flex items-center justify-center rounded-xl bg-black/50 border border-cyan-900/50" style={{ minHeight: VIEWPORT_HEIGHT }}>
        <Loader2 className="animate-spin text-cyan-400" /> Loading World Map...
      </div>
    );
  }

  const occupied = new Set(maps.map(m => `${m.global_x},${m.global_y}`));
  const displayMinX = maps.length > 0 ? gridBounds.minX - 1 : 0;
  const displayMaxX = maps.length > 0 ? gridBounds.maxX + 1 : 0;
  const displayMinY = maps.length > 0 ? gridBounds.minY - 1 : 0;
  const displayMaxY = maps.length > 0 ? gridBounds.maxY + 1 : 0;

  // ——— FOCUSED MODE: single tile at full size ———
  if (focusedTile !== null) {
    const { global_x: gx, global_y: gy } = focusedTile;
    const focusedMap = maps.find(m => m.global_x === gx && m.global_y === gy);
    const isOccupied = occupied.has(`${gx},${gy}`);

    return (
      <div className="w-full rounded-xl bg-black/50 border-2 border-cyan-900/50 overflow-hidden flex flex-col">
        <div className="flex items-center justify-between gap-2 px-3 py-2 bg-cyan-950/50 border-b border-cyan-900/50 shrink-0">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onUnfocus}
              className="p-2 rounded-lg bg-cyan-800/60 hover:bg-cyan-600 text-cyan-200 transition-colors flex items-center gap-1.5"
              title="Back to grid"
            >
              <ArrowLeft size={16} /> Back to grid
            </button>
            <span className="text-[10px] font-bold uppercase text-cyan-400/90">
              Tile ({gx}, {gy}) · WASD to move · Esc to unselect
            </span>
          </div>
          <div className="flex items-center gap-1">
            <button type="button" onClick={() => setFocusedZoom(z => Math.max(FOCUSED_ZOOM_MIN, z - FOCUSED_ZOOM_STEP))} className="p-2 rounded-lg bg-cyan-800/60 hover:bg-cyan-600 text-cyan-200 transition-colors" title="Zoom out"><ZoomOut size={16} /></button>
            <span className="text-[10px] font-mono text-cyan-300 min-w-[3rem] text-center">{Math.round(focusedZoom * 100)}%</span>
            <button type="button" onClick={() => setFocusedZoom(z => Math.min(FOCUSED_ZOOM_MAX, z + FOCUSED_ZOOM_STEP))} className="p-2 rounded-lg bg-cyan-800/60 hover:bg-cyan-600 text-cyan-200 transition-colors" title="Zoom in"><ZoomIn size={16} /></button>
            <button type="button" onClick={() => setFocusedZoom(1)} className="p-2 rounded-lg bg-cyan-800/60 hover:bg-cyan-600 text-cyan-200 transition-colors" title="Reset 100%"><Maximize2 size={16} /></button>
          </div>
        </div>
        <div
          className={`flex-1 overflow-auto p-4 ${focusedZoom <= 1 ? 'flex items-center justify-center' : ''}`}
          style={{ minHeight: VIEWPORT_HEIGHT }}
        >
          {/* Make scrollbars match zoom by sizing the wrapper to the scaled dimensions */}
          <div
            className="relative"
            style={{
              width: FOCUSED_TILE_SIZE * focusedZoom,
              height: FOCUSED_TILE_SIZE * focusedZoom,
              margin: focusedZoom <= 1 ? '0 auto' : undefined,
            }}
          >
            <div
              className="relative"
              style={{
                width: FOCUSED_TILE_SIZE,
                height: FOCUSED_TILE_SIZE,
                transform: `scale(${focusedZoom})`,
                transformOrigin: 'top left',
              }}
            >
            {focusedMap ? (
              <>
                <img
                  src={focusedMap.image_url}
                  className="w-full h-full object-cover rounded-lg"
                  alt={focusedMap.name}
                />
                <div
                  className={`absolute inset-0 grid grid-cols-50 grid-rows-50 rounded-lg ${onNodeDrop ? 'cursor-crosshair' : 'cursor-crosshair'}`}
                  onClick={(e) => handleGridClick(e, focusedMap)}
                  onDragOver={onNodeDrop ? (e) => { e.preventDefault(); e.dataTransfer.dropEffect = 'move'; } : undefined}
                  onDrop={onNodeDrop ? (e) => {
                    e.preventDefault();
                    const raw = e.dataTransfer.getData('application/json');
                    if (!raw) return;
                    try {
                      const { nodeId } = JSON.parse(raw);
                      const rect = e.currentTarget.getBoundingClientRect();
                      const px = e.clientX - rect.left;
                      const py = e.clientY - rect.top;
                      const gridX = Math.floor((px * 50) / rect.width) - 25;
                      const gridY = 25 - Math.floor((py * 50) / rect.height);
                      onNodeDrop(nodeId, focusedMap.id, gridX, gridY);
                    } catch (_) { /* ignore */ }
                  } : undefined}
                >
                  {Array.from({ length: 2500 }).map((_, i) => (
                    <div key={i} className="border-[0.5px] border-white/10 hover:bg-cyan-500/20" />
                  ))}
                </div>
                {nodes.filter(n => n.map_id === focusedMap.id).map(node => {
                  const nodeLeft = ((node.x + 25) / 50) * 100;
                  const nodeTop = ((25 - node.y) / 50) * 100;
                  const handleDropOnGrid = (e: React.DragEvent) => {
                    e.preventDefault();
                    const raw = e.dataTransfer.getData('application/json');
                    if (!raw || !onNodeDrop) return;
                    try {
                      const { nodeId } = JSON.parse(raw);
                      const parent = (e.currentTarget as HTMLElement).parentElement;
                      const gridEl = (parent?.children[1] ?? parent?.querySelector('.grid')) as HTMLElement | null;
                      const rect = gridEl?.getBoundingClientRect();
                      if (!rect) return;
                      const px = e.clientX - rect.left;
                      const py = e.clientY - rect.top;
                      const gridX = Math.floor((px * 50) / rect.width) - 25;
                      const gridY = 25 - Math.floor((py * 50) / rect.height);
                      onNodeDrop(nodeId, focusedMap.id, gridX, gridY);
                    } catch (_) { /* ignore */ }
                  };
                  return (
                    <div
                      key={node.id}
                      className="absolute pointer-events-auto cursor-grab active:cursor-grabbing touch-none"
                      style={{ left: `${nodeLeft}%`, top: `${nodeTop}%`, transform: 'translate(-50%, -50%)' }}
                      draggable={!!onNodeDrop}
                      onDragStart={onNodeDrop ? (e) => {
                        e.dataTransfer.setData('application/json', JSON.stringify({ nodeId: node.id }));
                        e.dataTransfer.effectAllowed = 'move';
                      } : undefined}
                      onDragOver={onNodeDrop ? (e) => { e.preventDefault(); e.dataTransfer.dropEffect = 'move'; } : undefined}
                      onDrop={onNodeDrop ? handleDropOnGrid : undefined}
                      title={onNodeDrop ? `Drag to move · ${node.name} (${node.x}, ${node.y})` : `${node.name} (${node.x}, ${node.y})`}
                    >
                      <img
                        src={node.icon_url || '/default-node.png'}
                        className="w-5 h-5 object-contain drop-shadow-lg pointer-events-none select-none"
                        alt=""
                        draggable={false}
                      />
                    </div>
                  );
                })}
                {spawnPoint && spawnPoint.mapId === focusedMap.id && (
                  <div
                    className="absolute pointer-events-none flex flex-col items-center"
                    style={{
                      left: `${((spawnPoint.x + 25) / 50) * 100}%`,
                      top: `${((25 - spawnPoint.y) / 50) * 100}%`,
                      transform: 'translate(-50%, -50%)',
                    }}
                    title="Global spawn (safehouse)"
                  >
                    <div className="rounded-full bg-amber-500/90 p-1.5 shadow-lg ring-2 ring-amber-300 ring-offset-2 ring-offset-black/50 animate-pulse">
                      <Home className="w-6 h-6 text-amber-950" strokeWidth={2.5} />
                    </div>
                    <span className="text-[9px] font-bold uppercase text-amber-400 mt-0.5 drop-shadow-[0_1px_2px_rgba(0,0,0,0.9)]">Spawn</span>
                  </div>
                )}
              </>
            ) : readOnly ? (
              <div
                className="absolute inset-0 border-2 border-dashed border-cyan-700/50 bg-gray-900/80 rounded-lg flex flex-col items-center justify-center gap-3"
                title={`Uncharted (${gx}, ${gy})`}
              >
                <span className="text-sm font-bold text-gray-500">Uncharted</span>
                <span className="text-[10px] text-gray-600">({gx}, {gy})</span>
              </div>
            ) : (
              <div
                className="absolute inset-0 border-2 border-dashed border-cyan-700/50 bg-gray-900/80 rounded-lg flex flex-col items-center justify-center gap-3 cursor-pointer hover:bg-cyan-900/30 transition-colors"
                onClick={() => onSelectEmptySlot(gx, gy)}
                title={`Empty slot (${gx}, ${gy}) – click to upload new map`}
              >
                <Plus className="text-cyan-500/70 w-12 h-12" />
                <span className="text-sm font-bold text-cyan-400/80">Upload map at ({gx}, {gy})</span>
              </div>
            )}
          </div>
          </div>
        </div>
      </div>
    );
  }

  // ——— OVERVIEW MODE: small grid, click to focus ———
  const cols = displayMaxX - displayMinX + 1;
  const rows = displayMaxY - displayMinY + 1;
  const totalWidth = cols * OVERVIEW_CELL_SIZE;
  const totalHeight = rows * OVERVIEW_CELL_SIZE;

  return (
    <div className="w-full rounded-xl bg-black/50 border-2 border-cyan-900/50 overflow-hidden flex flex-col">
      <div className="flex items-center justify-between gap-2 px-3 py-2 bg-cyan-950/50 border-b border-cyan-900/50 shrink-0">
        <span className="text-[10px] font-bold uppercase text-cyan-400/90">Select a tile to zoom in · Click to focus</span>
      </div>
      <div className="flex-1 overflow-auto flex items-center justify-center p-4" style={{ minHeight: VIEWPORT_HEIGHT }}>
        <div
          className="relative flex flex-wrap content-start gap-0"
          style={{ width: totalWidth, height: totalHeight }}
        >
          {Array.from({ length: rows }, (_, j) => displayMaxY - j).flatMap(gy =>
            Array.from({ length: cols }, (_, i) => displayMinX + i).map(gx => {
              const key = `${gx},${gy}`;
              const map = maps.find(m => m.global_x === gx && m.global_y === gy);
              const isEmpty = !occupied.has(key);
              const left = (gx - displayMinX) * OVERVIEW_CELL_SIZE;
              const top = (displayMaxY - gy) * OVERVIEW_CELL_SIZE;

              if (isEmpty) {
                return (
                  <div
                    key={key}
                    className="absolute border-2 border-dashed border-cyan-700/50 bg-gray-900/80 hover:bg-cyan-900/40 flex items-center justify-center cursor-pointer transition-colors"
                    style={{
                      left,
                      top,
                      width: OVERVIEW_CELL_SIZE - 2,
                      height: OVERVIEW_CELL_SIZE - 2,
                    }}
                    onClick={() => onFocusTile(gx, gy)}
                    title={`(${gx}, ${gy}) – click to focus or upload`}
                  >
                    <Plus className="text-cyan-500/70 w-6 h-6" />
                  </div>
                );
              }

              const isSpawnMap = spawnPoint && spawnPoint.mapId === map!.id;
              return (
                <div
                  key={key}
                  className="absolute border-2 border-cyan-600/60 bg-gray-900 hover:border-cyan-400 hover:bg-cyan-950/40 cursor-pointer transition-all overflow-hidden"
                  style={{
                    left,
                    top,
                    width: OVERVIEW_CELL_SIZE - 2,
                    height: OVERVIEW_CELL_SIZE - 2,
                  }}
                  onClick={() => onFocusTile(gx, gy)}
                  title={`${map?.name ?? ''} (${gx}, ${gy})${isSpawnMap ? ' · Spawn' : ''} – click to focus`}
                >
                  <img src={map!.image_url} className="w-full h-full object-cover" alt={map!.name} />
                  {isSpawnMap && (
                    <div className="absolute top-0.5 right-0.5 rounded bg-amber-500/95 px-1 py-0.5 flex items-center gap-0.5 shadow-lg" title="Global spawn">
                      <Home className="w-3 h-3 text-amber-950" strokeWidth={2.5} />
                      <span className="text-[8px] font-bold uppercase text-amber-950">Spawn</span>
                    </div>
                  )}
                  <span className="absolute bottom-0 left-0 right-0 bg-black/70 text-[9px] text-cyan-300 px-1 truncate text-center">
                    ({gx},{gy})
                  </span>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};

export default WorldGridMap;
